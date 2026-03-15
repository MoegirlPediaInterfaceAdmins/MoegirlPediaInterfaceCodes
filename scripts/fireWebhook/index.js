import { endGroup, startGroup } from "@actions/core";
import console from "../modules/console.js";
import generateHMACSignature from "../modules/generateHMACSignature.js";
import git from "../modules/git.js";
import { isInGithubActions, isInMasterBranch, workflowLink } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";
if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}
if (!isInMasterBranch) {
    console.info("Not running in non-master branch, exit.");
    process.exit(0);
}
if (!process.env.ANN_SERVER_SECRET_API_KEY) {
    console.info("Api key not found, exit.");
    process.exit(0);
}
const exitResult = ["skipped", "cancelled"];
const data = {
    success: true,
    workflowRunPage: workflowLink,
};
const NEEDS = JSON.parse(process.env.needs);
for (const [job, { result }] of Object.entries(NEEDS)) {
    console.info("Job", job, ":", result);
    if (exitResult.includes(result)) {
        console.info(`Job has been ${result}, exit.`);
        process.exit(0);
    }
    if (result === "failure") {
        data.success = false;
        if (!Array.isArray(data.failedJobs)) {
            data.failedJobs = [];
        }
        data.failedJobs.push(job);
        continue;
    }
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
    } catch { }
}
console.info("data:", data);
const body = Buffer.from(JSON.stringify(data), "utf-8");
for (let retryTime = 0; retryTime < 10; retryTime++) {
    console.info(`Attempt #${retryTime} running...`);
    try {
        const response = await fetch("https://webhook.annangela.cn/custom?from=MoegirlPediaInterfaceCodes", {
            headers: {
                "Content-Type": "application/json",
                "x-signature": generateHMACSignature(process.env.ANN_SERVER_SECRET_API_KEY, body),
            },
            method: "POST",
            body,
        });
        if (!response.ok) {
            throw new Error(`Failed to fire webhook: ${response.status} ${response.statusText}`, { cause: await response.text() });
        }
        const result = await response.json();
        console.info(`Attempt #${retryTime} success, result:`, result);
        console.info("Done.");
        process.exit(0);
    } catch (e) {
        startGroup(`Fail at attempt #${retryTime}:`);
        console.error(e);
        endGroup();
        continue;
    }
}
console.error("Maximum retries exceeded, failed.");
process.exit(1);
