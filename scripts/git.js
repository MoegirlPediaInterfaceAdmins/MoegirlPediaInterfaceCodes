"use strict";
const consoleWithTime = require("./console.js");
consoleWithTime.info("Start initialization...");
const exec = require("./exec.js");
(async () => {
    try {
        consoleWithTime.info("Start checking unpushed commits...");
        const unpushedCommits = await exec("git cherry -v");
        if (unpushedCommits.length === 0) {
            consoleWithTime.info("No unpushed commit, exit!");
            process.exit(0);
        }
        consoleWithTime.info("Found unpushed commits:", unpushedCommits.split("\n"));
        consoleWithTime.info("Pushing these commits...");
        const result = await exec("git push");
        consoleWithTime.info("Successfully pushed the commits:", result);
        consoleWithTime.info("Start triggering linter test...");
        const result2 = await exec("gh workflow run \"Linter test\" --field from=postCommit");
        consoleWithTime.info("Successfully triggered the linter test:", result2);
        process.exit(0);
    } catch (e) {
        consoleWithTime.error(e);
        process.exit(1);
    }
})();
