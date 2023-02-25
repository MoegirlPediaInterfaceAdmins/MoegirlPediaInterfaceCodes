"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const { git, log } = require("../modules/git.js");

(async () => {
    const name = process.env.GITHUB_ACTOR;
    const email = `${process.env.GITHUB_ACTOR}@users.noreply.github.com`;
    console.info("name:", name);
    console.info("email:", email);
    await git.add(".");
    await git
        .addConfig("user.email", email, undefined, log)
        .addConfig("user.name", name, undefined, log)
        .addConfig("author.email", email, undefined, log)
        .addConfig("author.name", name, undefined, log)
        .addConfig("committer.email", "GitHub Actions", undefined, log)
        .addConfig("committer.name", "actions@github.com", undefined, log)
        .fetch(["--tags", "--force"]);
    process.exit(0);
})();
