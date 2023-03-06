import console from "../modules/console.js";
console.info("Start initialization...");
import exec from "../modules/exec.js";
import { git } from "../modules/git.js";
import { octokit, isInGithubActions } from "../modules/octokit.js";
import { startGroup, endGroup } from "@actions/core";
import { exit } from "process";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    exit(0);
}
console.info("Running in github actions, start to check unpushed commits...");
const unpushedCommits = await exec("git cherry -v");
if (unpushedCommits.length === 0) {
    console.info("No unpushed commit, exit!");
    exit(0);
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
    exit(0);
}
if (changedFilesFromEnv.filter((file) => file.startsWith("src/")).length === 0) {
    console.info("No src file changed, exit!");
    exit(0);
}
console.info("Start to trigger linter test...");
const result = await octokit.rest.actions.createWorkflowDispatch({
    workflow_id: "Linter test.yml",
    ref: process.env.GITHUB_REF,
});
startGroup("Successfully triggered the linter test:");
console.info(result);
endGroup();
