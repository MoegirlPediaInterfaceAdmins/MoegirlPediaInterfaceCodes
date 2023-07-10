import console from "../modules/console.js";
console.info("Initialization done.");
import yamlModule from "../modules/yamlModule.js";
import { startGroup, endGroup, setOutput } from "@actions/core";
import { isInGithubActions, isPullRequest, isInMasterBranch, octokit } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";
if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}
if (isPullRequest) {
    console.info("Running in a PR, exit.");
    process.exit(0);
}
if (!isInMasterBranch) {
    console.info("Not running in master branch, exit.");
    process.exit(0);
}
/**
 * @typedef { { property: string, operator: "equal" | "startsWith", value: string } } condition
 */
/**
 * @type { { skipConditions: { name: string, conditions: condition[] }[]} }
 */
const { skipConditions } = await yamlModule.readFile("scripts/skip/config.yaml");
if (skipConditions.length === 0) {
    console.info("No skip condition, exit.");
    process.exit();
}
const { head_commit } = await readWorkflowEvent();
if (!head_commit) {
    console.info("No head commit, exit.");
    process.exit(0);
}
const workflows = await octokit.rest.actions.listWorkflowRuns({
    workflow_id: "postCommit.yaml",
    status: "queued",
    exclude_pull_requests: true,
    branch: "master",
    per_page: 100,
});
const { data: { workflow_runs } } = workflows;
if (workflow_runs.length === 0) {
    console.info("No queued workflow, exit.");
    process.exit(0);
}
workflow_runs.sort(({ created_at: a }, { created_at: b }) => new Date(a) - new Date(b));
/**
 * @param {any} object
 * @param {string} camelCaseName
 */
const getPropertyFromCamelCase = (object, camelCaseName) => camelCaseName.split(".").reduce((obj, name) => obj[name], object);
const checkCondition = (head_commit, { property, operator, value }) => {
    console.info("Checking condition:", { property, operator, value });
    const commitValue = getPropertyFromCamelCase(head_commit, property);
    if (operator === "equal") {
        if (commitValue !== value) {
            console.info("Condition not met, skip.");
            return false;
        }
    } else if (operator === "startsWith") {
        if (!commitValue.startsWith(value)) {
            console.info("Condition not met, exit.");
            return false;
        }
    }
};
for (const skipCondition of skipConditions) {
    console.info("Start checking skip condition:", skipCondition.name);
    console.info("Current head commit:", head_commit);
    const result = skipCondition.conditions.reduce((previousResult, { property, operator, value }) => !previousResult ? previousResult : checkCondition(head_commit, { property, operator, value }), true);
    if (!result) {
        console.info("Condition not met against current head commit, skip.");
        continue;
    }
    console.info("Condition met, start to find matched runs.");
    const matchedRuns = workflow_runs.filter(({ head_commit }) => {
        console.info("Run's head commit:", head_commit);
        return skipCondition.conditions.reduce((previousResult, { property, operator, value }) => !previousResult ? previousResult : checkCondition(head_commit, { property, operator, value }), true);
    });
    if (matchedRuns.length === 0) {
        console.info("No matched runs, skip.");
        continue;
    }
    startGroup("Found matched runs:");
    console.info(JSON.stringify(matchedRuns, null, 4));
    endGroup();
    console.info('Set output as "true" and exit.');
    setOutput("skip", "true");
    process.exit(0);
}
