import console from "../modules/console.js";
console.info("Start initialization...");
import { exit } from "process";
import exec from "../modules/exec.js";
import { git } from "../modules/git.js";
import { isInGithubActions } from "../modules/octokit.js";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    exit(0);
}
console.info("Running in github actions, start to check unpushed commits...");
const unpushedCommits = await exec("git cherry -v");
if (unpushedCommits.length === 0) {
    console.info("No unpushed commit.");
    process.exit(0);
}
console.info("Found unpushed commits:", unpushedCommits.split("\n"));
console.info("Pulling new commits...");
console.info("Successfully pulled the commits:", await git.pull(undefined, undefined, ["--rebase"]));
console.info("Pushing these commits...");
console.info("Successfully pushed the commits:", await git.push());
