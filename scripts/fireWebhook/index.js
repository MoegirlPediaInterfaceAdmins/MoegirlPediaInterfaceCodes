import { endGroup, startGroup } from "@actions/core";
import console from "../modules/console.js";
import exitIf from "../modules/exitIf.js";
import assertResponseOk from "../modules/assertResponseOk.js";
import generateHMACSignature from "../modules/generateHMACSignature.js";
import git from "../modules/git.js";
import { isInGithubActions, isInMasterBranch, workflowLink } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";
import summarizeNeeds from "./summarizeNeeds.js";
exitIf(!isInGithubActions, "Not running in github actions, exit.");
exitIf(!isInMasterBranch, "Not running in non-master branch, exit.");
if (!process.env.ANN_SERVER_SECRET_API_KEY) {
    console.info("Api key not found, exit.");
    process.exit(0);
}
const summary = summarizeNeeds(JSON.parse(process.env.needs));
exitIf(summary.exitResult !== null, `Job has been ${summary.exitResult}, exit.`);
const data = {
    success: summary.success,
    workflowRunPage: workflowLink,
};
if (summary.failedJobs.length > 0) {
    data.failedJobs = summary.failedJobs;
}
console.info("data.success:", data.success);
if (data.success) {
    try {
        const GITHUB_EVENT = await readWorkflowEvent();
        const headCommit = Reflect.has(GITHUB_EVENT, "head_commit")
            ? GITHUB_EVENT.head_commit
            : (await git.log({
                format: {
                    id: "%H",
                    message: "%B",
                },
                maxCount: 1,
            })).latest;
        data.headCommitId = headCommit.id;
        data.headCommitMessage = headCommit.message;
    } catch (error) {
        // head_commit 缺失且 git log 失败时降级为不带 headCommit 字段；留日志便于核对降级原因
        console.warn("[fireWebhook]", "Failed to get head commit, continue without it:", error);
    }
}
console.info("data:", data);
const body = Buffer.from(JSON.stringify(data), "utf-8");
for (let retryTime = 0; retryTime < 10; retryTime++) {
    console.info(`Attempt #${retryTime} running...`);
    // 每轮重置：上一轮响应的 Retry-After 不应带进下一轮
    let retryAfterSeconds = 0;
    try {
        const response = await fetch("https://webhook.annangela.cn/custom?from=MoegirlPediaInterfaceCodes", {
            headers: {
                "Content-Type": "application/json",
                "x-signature": generateHMACSignature(process.env.ANN_SERVER_SECRET_API_KEY, body),
            },
            method: "POST",
            body,
        });
        // Retry-After 允许「延迟秒数」或「HTTP 日期」两种形式（RFC 9110），两种都要解析；
        // 解析不出（缺失/非法/日期已过）保持 0，落到 catch 里的指数退避
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter !== null) {
            const asSeconds = +retryAfter;
            if (!Number.isNaN(asSeconds)) {
                retryAfterSeconds = asSeconds;
            } else {
                const retryAt = new Date(retryAfter).getTime();
                retryAfterSeconds = Number.isNaN(retryAt) ? 0 : Math.ceil((retryAt - Date.now()) / 1000);
            }
        }
        await assertResponseOk(response, "Failed to fire webhook");
        const result = await response.json();
        console.info(`Attempt #${retryTime} success, result:`, result);
        console.info("Done.");
        process.exit(0);
    } catch (e) {
        startGroup(`Fail at attempt #${retryTime}:`);
        console.error(e);
        endGroup();
        // 指数退避（1s 起步、上限 60s），服务端返回 Retry-After 时优先采用；
        // 零间隔连打 10 次会在服务端瞬时故障时放大压力。所有延迟统一封顶 60s：
        // setTimeout 的延迟超过 2^31-1ms 会被 Node 折叠成 1ms，超大 Retry-After
        // 反而变成立即连打；封顶后若服务端要求更久，下一轮 429 会再次读到并退避
        const delaySeconds = Math.min(retryAfterSeconds > 0 ? retryAfterSeconds : 2 ** retryTime, 60);
        if (retryTime < 9) {
            console.info(`Retry after ${delaySeconds}s...`);
            await new Promise((resolve) => {
                setTimeout(resolve, delaySeconds * 1000);
            });
        }
        continue;
    }
}
console.error("Maximum retries exceeded, failed.");
process.exit(1);
