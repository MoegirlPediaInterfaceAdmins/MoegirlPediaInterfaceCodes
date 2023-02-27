"use strict";
const consoleWithTime = require("../modules/console.js");
const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");
const { retry } = require("@octokit/plugin-retry");
const octokitBaseOptions = {
    owner: process.env.GITHUB_REPOSITORY_OWNER,
    repo: process.env.GITHUB_REPOSITORY.split("/")[1],
};
const octokit = new (Octokit.plugin(retry))({
    authStrategy: require("@octokit/auth-action").createActionAuth,
    auth: {},
});
// 非常神必，直接给 request 传入 { ...octokitBaseOptions, ...options } 没有任何作用，只能修改地址了
octokit.hook.wrap("request", (request, options) => {
    const url = options.url.split("/");
    options.url = url.map((part) => part === "{owner}" ? octokitBaseOptions.owner : part === "{repo}" ? octokitBaseOptions.repo : part).join("/");
    return request(options);
});
consoleWithTime.log("octokitBaseOptions:", octokitBaseOptions);
const isInMasterBranch = process.env.GITHUB_REF === "refs/heads/master";
consoleWithTime.log("isInMasterBranch:", octokitBaseOptions);
const createIssue = async (issueTitle, issueBody, labels) => {
    if (isInMasterBranch) {
        consoleWithTime.info("[createIssue] Running in the master branch, searching current opened issue with labels:", labels);
        const issues = (await octokit.rest.issues.listForRepo({
            labels: labels.join(","),
        })).data;
        core.startGroup("[createIssue] Current opened issue:");
        consoleWithTime.info(issues);
        core.endGroup();
        for (const { number, title, body } of issues) {
            console.info("[createIssue] Checking issue:", { number, title, body });
            if (title !== issueTitle || body !== issueBody) {
                consoleWithTime.info("[createIssue] Issue is not relative, ignore.");
                continue;
            }
            consoleWithTime.info("[createIssue] Issue is relative, start to close issue...");
            const result = await octokit.rest.issues.update({
                issue_number: number,
                state: "closed",
                state_reason: "Duplicated",
            });
            core.startGroup("[createIssue] Successfully closed the issue:");
            consoleWithTime.info(result);
            core.endGroup();
        }
        const options = {
            title: issueTitle,
            body: issueBody,
            labels,
        };
        consoleWithTime.info("[createIssue] Start to create issue:", options);
        const result = await octokit.rest.issues.create({
            title: issueTitle,
            body: issueBody,
            labels,
        });
        core.startGroup("[createIssue] Successfully created the issue:");
        consoleWithTime.info(result);
        core.endGroup();
        return result;
    }
    console.info("Not running in the master branch, exit.");
};
module.exports = { octokit, isInMasterBranch, octokitBaseOptions, createIssue };
