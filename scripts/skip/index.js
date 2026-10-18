import console, { dump } from "../modules/console.js";
console.info("Initialization done.");
import exitIf from "../modules/exitIf.js";
import yamlModule from "../modules/yamlModule.js";
import { setOutput } from "@actions/core";
import { isInGithubActions, isPullRequest, isInMasterBranch, octokit } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";
import { checkConditions } from "./conditions.js";
exitIf(!isInGithubActions, "Not running in github actions, exit.");
exitIf(isPullRequest, "Running in a PR, exit.");
exitIf(!isInMasterBranch, "Not running in master branch, exit.");
/**
 * @typedef { { property: string, operator: "equal" | "startsWith", value: string } } condition
 */
/**
 * @type { { skipConditions: { name: string, conditions: condition[] }[]} }
 */
const { skipConditions } = await yamlModule.readFile("scripts/skip/config.yaml");
exitIf(skipConditions.length === 0, "No skip condition, exit.");
const { head_commit } = await readWorkflowEvent();
exitIf(!head_commit, "No head commit, exit.");
const workflows = await octokit.rest.actions.listWorkflowRuns({
    workflow_id: "postCommit.yaml",
    status: "queued",
    exclude_pull_requests: true,
    branch: "master",
    per_page: 100,
});
const { data: { workflow_runs } } = workflows;
exitIf(workflow_runs.length === 0, "No queued workflow, exit.");
workflow_runs.sort(({ created_at: a }, { created_at: b }) => new Date(a) - new Date(b));
for (const skipCondition of skipConditions) {
    console.info("Start checking skip condition:", skipCondition.name);
    console.info("Current head commit:", head_commit);
    const result = checkConditions(head_commit, skipCondition.conditions);
    if (!result) {
        console.info("Condition not met against current head commit, skip.");
        continue;
    }
    console.info("Condition met, start to find matched runs.");
    const matchedRuns = workflow_runs.filter(({ head_commit }) => {
        console.info("Run's head commit:", head_commit);
        return checkConditions(head_commit, skipCondition.conditions);
    });
    if (matchedRuns.length === 0) {
        console.info("No matched runs, skip.");
        continue;
    }
    dump("Found matched runs:", JSON.stringify(matchedRuns, null, 4));
    console.info('Set output as "true" and exit.');
    setOutput("skip", "true");
    process.exit(0);
}
