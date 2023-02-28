"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const exec = require("../modules/exec.js");
const { git } = require("../modules/git.js");
const { octokit, isInGithubActions } = require("../modules/octokit.js");
const core = require("@actions/core");
(async () => {
    if (isInGithubActions) {
        try {
            console.info("Running in github actions, start to check unpushed commits...");
            const unpushedCommits = await exec("git cherry -v");
            if (unpushedCommits.length === 0) {
                console.info("No unpushed commit, exit!");
                process.exit(0);
            }
            console.info("Found unpushed commits:", unpushedCommits.split("\n"));
            console.info("Pulling new commits...");
            console.info("Successfully pulled the commits:", await git.pull(undefined, undefined, ["--rebase"]));
            console.info("Pushing these commits...");
            console.info("Successfully pushed the commits:", await git.push());
            console.info("process.env.changedFiles:", process.env.changedFiles);
            /**
             * @type {string[] | undefined}
             */
            const changedFilesFromEnv = JSON.parse(process.env.changedFiles || "[]");
            console.info("changedFilesFromEnv:", changedFilesFromEnv);
            if (!Array.isArray(changedFilesFromEnv) || changedFilesFromEnv.length === 0) {
                console.info("Unable to get changed files, exit!");
                process.exit(0);
            }
            if (changedFilesFromEnv.filter((file) => file.startsWith("src/")).length === 0) {
                console.info("No src file changed, exit!");
                process.exit(0);
            }
            console.info("Start to trigger linter test...");
            const result = await octokit.rest.actions.createWorkflowDispatch({
                workflow_id: "Linter test.yml",
                ref: process.env.GITHUB_REF,
            });
            core.startGroup("Successfully triggered the linter test:");
            console.info(result);
            core.endGroup();
            process.exit(0);
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    } else {
        console.info("Not running in github actions, exit.");
    }
})();
