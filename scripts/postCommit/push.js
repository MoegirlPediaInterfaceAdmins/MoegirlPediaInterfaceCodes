import console from "../modules/console.js";
console.info("Start initialization...");
import { exit } from "process";
import { startGroup, endGroup } from "@actions/core";
import exec from "../modules/exec.js";
import { git } from "../modules/git.js";
import { octokit, isInGithubActions } from "../modules/octokit.js";
import jsonModule from "../modules/jsonModule.js";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    exit(0);
}
const isPushRequest = ["push"].includes(process.env.GITHUB_EVENT_NAME);
console.info("isPushRequest:", isPushRequest);
console.info("process.env.GITHUB_SHA:", process.env.GITHUB_SHA);
const changedFilesInLastCommit = (await git.raw(["diff-tree", "-c", "-r", "--no-commit-id", "--name-only", process.env.GITHUB_SHA])).trim();
startGroup("changedFilesInLastCommit:");
console.info(changedFilesInLastCommit);
endGroup();
const triggerLinterTest = async (force = false) => {
    if (!isPushRequest && !force) {
        console.info("This workflow is not triggered by `push` or `pull_request`, exit.");
        exit(0);
    }
    if (changedFilesInLastCommit.split("\n").filter((file) => file.startsWith("src/")).length === 0 && !force) {
        console.info("Nothing need to lint, exit.");
        exit(0);
    }
    const { commits, head_commit } = await jsonModule.readFile(process.env.GITHUB_EVENT_PATH);
    const allCommits = Array.isArray(commits) ? commits : [];
    if (head_commit && !allCommits.map(({ id }) => id).includes(head_commit.id)) {
        allCommits.push(head_commit);
    }
    startGroup("Found commits:");
    console.info(allCommits);
    endGroup();
    console.info("Start to trigger linter test...");
    const result = await octokit.rest.actions.createWorkflowDispatch({
        workflow_id: "Linter test.yml",
        ref: process.env.GITHUB_REF,
        inputs: {
            commits: JSON.stringify(allCommits),
        },
    });
    startGroup("Successfully triggered the linter test:");
    console.info(result);
    endGroup();
    console.info("Done.");
    exit(0);
};
console.info("Running in github actions, start to check unpushed commits...");
const unpushedCommits = await exec("git cherry -v");
if (unpushedCommits.length === 0) {
    console.info("No unpushed commit.");
    await triggerLinterTest();
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
    console.info("Unable to get changed files.");
    await triggerLinterTest();
}
await triggerLinterTest(changedFilesFromEnv.filter((file) => file.startsWith("src/")).length > 0);
