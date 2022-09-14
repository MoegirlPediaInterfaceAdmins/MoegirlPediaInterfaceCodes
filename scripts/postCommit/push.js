"use strict";
const consoleWithTime = require("../modules/console.js");
consoleWithTime.info("Start initialization...");
const exec = require("../modules/exec.js");
(async () => {
    try {
        consoleWithTime.info("Start checking unpushed commits...");
        const unpushedCommits = await exec("git cherry -v");
        if (unpushedCommits.length === 0) {
            consoleWithTime.info("No unpushed commit, exit!");
            process.exit(0);
        }
        consoleWithTime.info("Found unpushed commits:", unpushedCommits.split("\n"));
        consoleWithTime.info("Pulling new commits...");
        consoleWithTime.info("Successfully pulled the commits:", await exec("git pull"));
        consoleWithTime.info("Pushing these commits...");
        consoleWithTime.info("Successfully pushed the commits:", await exec("git push"));
        consoleWithTime.info("Start triggering linter test...");
        consoleWithTime.info("Successfully triggered the linter test:", await exec("gh workflow run \"Linter test\" --field from=postCommit"));
        process.exit(0);
    } catch (e) {
        consoleWithTime.error(e);
        process.exit(1);
    }
})();
