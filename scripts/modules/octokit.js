"use strict";
const consoleWithTime = require("../modules/console.js");
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
consoleWithTime.log("octokitBaseOptions:", octokitBaseOptions);
const closeRelativeIssue = async (issueTitle, labels) => {
    consoleWithTime.info("Searching current opened issue with labels:", labels);
    const issues = (await octokit.rest.issues.listForRepo({
        ...octokitBaseOptions,
        creator: process.env.GITHUB_ACTOR,
        labels,
    })).data.map(({ number, title }) => ({ number, title }));
    consoleWithTime.info("Current opened issue:", issues);
    for (const { number, title } of issues) {
        if (title !== issueTitle) {
            consoleWithTime.info("issue is not relative, ignore:", { number, title });
            continue;
        }
        consoleWithTime.info("issue is relative, close:", { number, title }, await octokit.rest.issues.update({
            ...octokitBaseOptions,
            issue_number: number,
            state: "closed",
            state_reason: "Duplicated",
        }));
    }
};
module.exports = { octokit, octokitBaseOptions, closeRelativeIssue };
