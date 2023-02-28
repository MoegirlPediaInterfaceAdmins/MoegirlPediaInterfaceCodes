"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const { git } = require("../modules/git.js");
const { isInGithubActions } = require("../modules/octokit.js");

(async () => {
    if (isInGithubActions) {
        console.info("Running in github actions, preparing git...");
        const name = process.env.GITHUB_ACTOR;
        const email = `${process.env.GITHUB_ACTOR}@users.noreply.github.com`;
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
