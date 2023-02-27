"use strict";
const consoleWithTime = require("../modules/console.js");
const { Octokit } = require("@octokit/rest");
const { retry } = require("@octokit/plugin-retry");
const octokitBaseOptions = {
    owner: process.env.GITHUB_REPOSITORY_OWNER,
    repo: process.env.GITHUB_REPOSITORY.split("/")[1],
};
const octokit = new (Octokit.plugin(retry))({
    authStrategy: require("@octokit/auth-action").createActionAuth(),
});
consoleWithTime.log("octokitBaseOptions:", octokitBaseOptions);
module.exports = { octokit, octokitBaseOptions };
