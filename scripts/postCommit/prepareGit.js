"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const { isInGithubActions } = require("../modules/octokit.js");
const core = require("@actions/core");

if (isInGithubActions) {
    console.info("Running in github actions, preparing git...");
    const { commit, head_commit, pusher, sender } = require(process.env.GITHUB_EVENT_PATH);
    const tmpMap = {};
    for (const { author: { email: authorEmail, name: authorName, username: authorUsername }, committer: { email: committerEmail, name: committerName, username: committerUsername } } of [...Array.isArray(commit) ? commit : [], ...head_commit ? [head_commit] : []]) {
        tmpMap[authorName] = tmpMap[authorUsername] = authorEmail;
        tmpMap[committerName] = tmpMap[committerUsername] = committerEmail;
    }
    const name = pusher ? pusher.name : sender ? sender.login : process.env.GITHUB_ACTOR;
    const email = pusher ? pusher.email : sender ? tmpMap[sender.login] || `${sender.login}@users.noreply.github.com` : `${process.env.GITHUB_ACTOR}@users.noreply.github.com`;
    console.info("AUTHOR_NAME:", name);
    console.info("AUTHOR_EMAIL:", email);
    core.exportVariable("AUTHOR_NAME", name);
    core.exportVariable("AUTHOR_EMAIL", email);
    core.exportVariable("COMMITTER_NAME", "GitHub Actions");
    core.exportVariable("COMMITTER_EMAIL", "actions@github.com");
} else {
    console.info("Not running in github actions, exit.");
}
process.exit(0);
