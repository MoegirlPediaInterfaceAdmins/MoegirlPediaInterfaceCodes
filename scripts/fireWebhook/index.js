import console from "../modules/console.js";
import { startGroup, endGroup } from "@actions/core";
import { isInMasterBranch, isInGithubActions, workflowLink } from "../modules/octokit.js";
import jsonModule from "../modules/jsonModule.js";
import generateHMACSignature from "../modules/generateHMACSignature.js";
import git from "../modules/git.js";
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
    //process.exit(0);
}
const exitResult = ["skipped", "cancelled"];
const data = {
    success: true,
    workflowRunPage: workflowLink,
};
const NEEDS = JSON.parse(process.env.needs);
for (const [job, { result }] of Object.entries(NEEDS)) {
    console.info({ job, result });
    if (exitResult.includes(result)) {
        console.info(`Job has been ${result}, exit.`);
        continue;//process.exit(0);
    }
    if (result === "failed") {
        data.success = false;
        if (!Array.isArray(data.failedJobs)) {
            data.failedJobs = [];
        }
        data.failedJobs.push(job);
        continue;
    }
}
if (data.success) {
    try {
        const GITHUB_EVENT = await jsonModule.readFile(process.env.GITHUB_EVENT_PATH);
        const head_commit = Reflect.has(GITHUB_EVENT, "head_commit") ? GITHUB_EVENT.head_commit : (await git.log({
            format: {
                id: "%H",
                message: "%B",
            },
            maxCount: 1,
        })).latest;
        data.headCommitId = head_commit.id;
        data.headCommitMessage = head_commit.message;
    } catch { }
}
console.info("Data:", data);
const body = Buffer.from(JSON.stringify(data), "utf-8");
for (let retryTime = 0; retryTime < 10; retryTime++) {
    try {
        const result = await (await fetch("https://echo.zuplo.io/", {
            headers: {
                Authorization: `Bearer ${"asd"}`,
                "Content-Type": "application/json",
                "x-signature": generateHMACSignature("asd", body),
            },
            method: "POST",
            body,
        })).json();
        startGroup("Result:");
        console.info(result);
        endGroup();
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
