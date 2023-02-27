"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const { git } = require("../modules/git.js");

(async () => {
    if (process.env.GITHUB_ACTIONS === "true") {
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
            .addConfig("committer.email", "GitHub Actions")
            .addConfig("committer.name", "actions@github.com")
            .fetch(["--tags", "--force"]);
    } else {
        console.info("Not running in github actions, exit.");
    }
    process.exit(0);
})();
