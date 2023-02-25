"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const { git } = require("../modules/git.js");

(async () => {
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
    process.exit(0);
})();
