import console from "../modules/console.js";
console.info("Initialization done.");
import { startGroup, endGroup } from "@actions/core";
import { isInGithubActions, octokit, octokitBaseOptions, workflowLink } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}

const owner = octokitBaseOptions.owner;
const repo = octokitBaseOptions.repo;
const runId = process.env.GITHUB_RUN_ID;
const runNumber = process.env.GITHUB_RUN_NUMBER;
const runLink = workflowLink;
const failedJobNames = ["postCommit", "linter_test"].filter((jobName) => JSON.parse(process.env.NEEDS || "{}")?.[jobName]?.result === "failure");

if (failedJobNames.length === 0) {
    console.info("No failed jobs found in needs, exit.");
    process.exit(0);
}
startGroup("Failed jobs:");
console.info(failedJobNames);
endGroup();

const event = await readWorkflowEvent();
let pullNumber = typeof event?.pull_request?.number === "number" ? event.pull_request.number : null;
if (typeof pullNumber !== "number" && process.env.GITHUB_EVENT_NAME === "push") {
    startGroup("Find the associated pull request:");
    const { data: associatedPullRequests } = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner,
        repo,
        commit_sha: process.env.GITHUB_SHA,
    });
    console.info("associatedPullRequests:", associatedPullRequests);
    endGroup();
    pullNumber = associatedPullRequests.find((pullRequest) => pullRequest.head.sha === process.env.GITHUB_SHA)?.number
        ?? associatedPullRequests[0]?.number
        ?? null;
}
if (typeof pullNumber !== "number") {
    console.info("No associated pull request found, skip commenting.");
    process.exit(0);
}
console.info("Associated pull request number:", pullNumber);

const getLogTail = async (jobId, maxLines = 200) => {
    try {
        const response = await octokit.rest.actions.getJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: jobId,
        });
        let logText = typeof response.data === "string" ? response.data : "";
        if (logText.length === 0 && response.headers.location) {
            logText = await (await fetch(response.headers.location)).text();
        }
        return logText.split("\n").slice(-maxLines).join("\n");
    } catch (error) {
        console.warn("[getLogTail]", "Failed to get the job log:", error);
        return "";
    }
};

const buildSection = (jobName, failedSteps, logTail) => {
    const lines = [
        `### ${jobName} 失败`,
        "",
        "失败步骤：",
        "",
        ...failedSteps.length > 0 ? failedSteps : ["- （无法获取失败步骤）"],
        "",
    ];
    if (logTail.length > 0) {
        lines.push(
            "<details>",
            "<summary>报错日志（末尾 200 行）</summary>",
            "",
            "```text",
            logTail,
            "```",
            "",
            "</details>",
        );
    }
    return lines.join("\n");
};

startGroup("Collecting failure details:");
const { data: { jobs } } = await octokit.rest.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
});
const sections = [];
for (const job of jobs.filter(({ name }) => failedJobNames.includes(name))) {
    const failedSteps = (job.steps ?? [])
        .filter(({ conclusion }) => conclusion === "failure")
        .map((step) => `- \`#${step.number}\` ${step.name}`);
    const logTail = await getLogTail(job.id);
    sections.push(buildSection(job.name, failedSteps, logTail));
}
endGroup();

const body = [
    "## ❌ CI 检查失败",
    "",
    `工作流运行 [post commit CI #${runNumber}](${runLink}) 失败，与 PR [#${pullNumber}](https://github.com/${owner}/${repo}/pull/${pullNumber}) 相关联。`,
    "",
    ...sections.flatMap((section) => [section, ""]),
    "> 本评论由 GitHub Actions 自动生成。请修复上述报错后重新推送。",
].join("\n");

startGroup("Comment to the pull request:");
try {
    await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
    });
    console.info(`Successfully commented to the pull request #${pullNumber}.`);
} catch (error) {
    console.error("[createComment]", "Failed to comment to the pull request:", error);
}
endGroup();
console.info("Done.");
process.exit(0);
