"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const { git } = require("../modules/git.js");
const { isInGithubActions } = require("../modules/octokit.js");

(async () => {
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
        console.info("name:", name);
        console.info("email:", email);
        await git
            .add(".")
            .addConfig("user.email", email)
            .addConfig("user.name", name)
            .addConfig("author.email", email)
            .addConfig("author.name", name)
            .addConfig("committer.email", "actions@github.com")
            .addConfig("committer.name", "GitHub Actions")
            .fetch(["--tags", "--force"]);
    } else {
        console.info("Not running in github actions, exit.");
    }
    process.exit(0);
})();
