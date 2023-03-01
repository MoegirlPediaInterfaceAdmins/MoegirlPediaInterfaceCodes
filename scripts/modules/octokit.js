"use strict";
const console = require("../modules/console.js");
const fs = require("fs");
const YAML = require("yaml");
const { assignees } = YAML.parse(fs.readFileSync(".github/auto_assign.yml", { encoding: "utf-8" }));
const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");
const { retry } = require("@octokit/plugin-retry");
const isInGithubActions = process.env.GITHUB_ACTIONS === "true";
const isInMasterBranch = process.env.GITHUB_REF === "refs/heads/master";
const octokitBaseOptions = {
    owner: isInGithubActions ? process.env.GITHUB_REPOSITORY_OWNER : undefined,
    repo: isInGithubActions ? process.env.GITHUB_REPOSITORY.split("/")[1] : undefined,
};
const octokit = new (Octokit.plugin(retry))({
    authStrategy: isInGithubActions && process.env.GITHUB_TOKEN ? require("@octokit/auth-action").createActionAuth : require("@octokit/auth-unauthenticated").createUnauthenticatedAuth,
    auth: isInGithubActions ? process.env.GITHUB_TOKEN ? {} : { reason: "Running in github actions, but the `GITHUB_TOKEN` env variable is unset, unable to get any auth." } : { reason: "Not running in github actions, unable to get any auth." },
});
// 非常神必，直接给 request 传入 { ...octokitBaseOptions, ...options } 没有任何作用，只能修改地址了
octokit.hook.wrap("request", (request, options) => {
    const url = options.url.split("/");
    options.url = url.map((part) => part === "{owner}" ? octokitBaseOptions.owner || part : part === "{repo}" ? octokitBaseOptions.repo || part : part).join("/");
    return request(options);
});
octokit.auth().then((auth) => {
    core.startGroup("octokit initialization:");
    console.log("isInGithubActions:", isInGithubActions);
    console.log("isInMasterBranch:", isInMasterBranch);
    console.log("octokitBaseOptions:", octokitBaseOptions);
    console.log("auth:", auth);
    core.endGroup();
});
const createIssue = async (issueTitle, issueBody, labels) => {
    if (isInMasterBranch) {
        console.info("[createIssue] Running in the master branch, searching current opened issue with labels:", labels);
        const issues = (await octokit.rest.issues.listForRepo({
            labels: labels.join(","),
        })).data;
        core.startGroup("[createIssue] Current opened issue:");
        console.info(issues);
        core.endGroup();
        for (const { number, title, body } of issues) {
            console.info("[createIssue] Checking issue:", { number, title, body });
            if (title !== issueTitle || body !== issueBody) {
                console.info("[createIssue] Issue is not relative, ignore.");
                continue;
            }
            console.info("[createIssue] Issue is relative, start to close issue...");
            const result = await octokit.rest.issues.update({
                issue_number: number,
                state: "closed",
                state_reason: "completed",
            });
            core.startGroup("[createIssue] Successfully closed the issue:");
            console.info(result);
            core.endGroup();
        }
        const options = {
            title: issueTitle,
            body: issueBody,
            labels,
            assignees,
        };
        console.info("[createIssue] Start to create issue:", options);
        const result = await octokit.rest.issues.create(options);
        core.startGroup("[createIssue] Successfully created the issue:");
        console.info(result);
        core.endGroup();
        return result;
    }
    console.info("Not running in the master branch, exit.");
};
module.exports = { octokit, isInMasterBranch, octokitBaseOptions, createIssue, isInGithubActions };
