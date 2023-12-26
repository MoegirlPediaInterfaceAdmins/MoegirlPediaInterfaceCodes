import console from "../modules/console.js";
console.info("Initialization done.");
import { startGroup, endGroup } from "@actions/core";
import git from "../modules/git.js";
import { isInGithubActions } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";
import upstream from "../modules/getUpstream.js";
if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}
if (!upstream) {
    console.info("Running in github actions, but HEAD does not point to a branch, exit.");
    process.exit(0);
}
const GITHUB_EVENT = await readWorkflowEvent();
const { before, after } = GITHUB_EVENT;
const isBeforeExists = before && after && (await git.branch(["--contains", before]).catch(() => ({ current: "" }))).current.length > 0;
console.info("commits:", { before, after, isBeforeExists });
const commits = [after || "HEAD"];
if (isBeforeExists) {
    commits.unshift(before);
}
console.info("final commits:", commits);
const changedFiles = before && after ? (await git.raw(["diff-tree", "-c", "-r", "--no-commit-id", "--name-only", ...commits])).trim() : "";
startGroup("changedFiles:");
console.info(changedFiles);
endGroup();
console.info("Running in github actions, start to check unpushed commits...");
const unpushedCommits = (await git.raw(["cherry", "-v", upstream])).trim();
if (unpushedCommits.length === 0) {
    console.info("No unpushed commit.");
    process.exit(0);
}
console.info("Found unpushed commits:", unpushedCommits.split("\n"));
console.info("Pulling new commits...");
console.info("Successfully pulled the commits:", await git.pull(undefined, undefined, ["--rebase"]));
console.info("Pushing these commits...");
console.info("Successfully pushed the commits:", await git.push());
