"use strict";
const consoleWithTime = require("../modules/console.js");
consoleWithTime.info("Start initialization...");
const exec = require("../modules/exec.js");
const { git } = require("../modules/git.js");
const { octokit } = require("../modules/octokit.js");
const core = require("@actions/core");
(async () => {
    if (process.env.GITHUB_ACTIONS === "true") {
        try {
            consoleWithTime.info("Running in github actions, start to check unpushed commits...");
            const unpushedCommits = await exec("git cherry -v");
            if (unpushedCommits.length === 0) {
                consoleWithTime.info("No unpushed commit, exit!");
                process.exit(0);
            }
            consoleWithTime.info("Found unpushed commits:", unpushedCommits.split("\n"));
            consoleWithTime.info("Pulling new commits...");
            consoleWithTime.info("Successfully pulled the commits:", await git.pull());
            consoleWithTime.info("Pushing these commits...");
            consoleWithTime.info("Successfully pushed the commits:", await git.push());
            console.info("process.env.changedFiles:", process.env.changedFiles);
            /**
             * @type {string[] | undefined}
             */
            const changedFilesFromEnv = JSON.parse(process.env.changedFiles || "[]");
            console.info("changedFilesFromEnv:", changedFilesFromEnv);
            if (!Array.isArray(changedFilesFromEnv) || changedFilesFromEnv.length === 0) {
                consoleWithTime.info("Unable to get changed files, exit!");
                process.exit(0);
            }
            if (changedFilesFromEnv.filter((file) => file.startsWith("src/")).length === 0) {
                consoleWithTime.info("No src file changed, exit!");
                process.exit(0);
            }
            consoleWithTime.info("Start to trigger linter test...");
            const result = await octokit.rest.actions.createWorkflowDispatch({
                workflow_id: "Linter test",
                ref: process.env.GITHUB_REF,
            });
            core.startGroup("Successfully triggered the linter test:");
            consoleWithTime.info(result);
            core.endGroup();
            process.exit(0);
        } catch (e) {
            consoleWithTime.error(e);
            process.exit(1);
        }
    } else {
        console.info("Not running in github actions, exit.");
    }
})();
