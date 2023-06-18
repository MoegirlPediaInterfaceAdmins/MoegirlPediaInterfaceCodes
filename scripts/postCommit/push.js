import console from "../modules/console.js";
console.info("Initialization done.");
import { startGroup, endGroup, setOutput } from "@actions/core";
import git from "../modules/git.js";
import { isInGithubActions, isPullRequest } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";

const contentConfigs = [
    "src/gadgets/Gadgets-definition-list.yaml",
    ".github/linter test/action.yaml",
    ".vscode/json-schemas/gadget-definition.json",
    ".browserslistrc",
    "package-lock.json",
];
/**
 * @type {(files: string[]) => boolean}
 */
const detectContentChanged = (files) => files.filter((file) => file.startsWith("src/") || contentConfigs.includes(file) || /^\.[^./]+\.yaml$/.test(file)).length > 0;
if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
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
/**
 * @return {never} 
 */
const triggerLinterTest = (force = false) => {
    if (!detectContentChanged(changedFiles.split("\n")) && !force) {
        console.info("Nothing need to lint, exit.");
        process.exit(0);
    }
    const { commits, head_commit } = GITHUB_EVENT;
    const allCommits = Array.isArray(commits) ? commits : [];
    if (head_commit && !allCommits.map(({ id }) => id).includes(head_commit.id)) {
        allCommits.push(head_commit);
    }
    const foundCommits = allCommits.map((commit) => {
        commit.author.email = commit.author.email.toLowerCase();
        commit.committer.email = commit.committer.email.toLowerCase();
        return commit;
    });
    startGroup("Found commits:");
    console.info(foundCommits);
    endGroup();
    setOutput("commits", JSON.stringify(foundCommits));
    setOutput("linterTest", "true");
    console.info('Exposed outputs "commits" and "linterTest" , exit.');
    console.info("Done.");
    process.exit(0);
};
if (isPullRequest) {
    console.info("Running in github actions, but in pull request event, skip checking unpushed commits...");
    triggerLinterTest();
}
console.info("Running in github actions, start to check unpushed commits...");
const unpushedCommits = (await git.raw(["cherry", "-v"])).trim();
if (unpushedCommits.length === 0) {
    console.info("No unpushed commit.");
    triggerLinterTest();
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
    triggerLinterTest();
}
triggerLinterTest(detectContentChanged(changedFilesFromEnv));
