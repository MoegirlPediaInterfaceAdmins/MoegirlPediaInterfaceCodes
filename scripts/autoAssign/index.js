import console from "../modules/console.js";
console.info("Initialization done.");
import yamlModule from "../modules/yamlModule.js";
import { isInGithubActions, octokit } from "../modules/octokit.js";
import { startGroup, endGroup } from "@actions/core";
import readWorkflowEvent from "../modules/workflowEvent.js";

if (!isInGithubActions) {
    console.info("Not in github actions, exit.");
    process.exit(0);
}
const event = await readWorkflowEvent();
const { action, number } = event;
if (action !== "opened") {
    console.info("The pull request is not opened, exit.");
    process.exit(0);
}

if (typeof number !== "number") {
    console.info("The number of the pull request is not `number`, exit.");
    process.exit(0);
}
const config = await yamlModule.readFile(".github/auto_assign.yaml");
startGroup("config:");
console.info(config);
endGroup();
const { addReviewers, reviewers, addAssignees, assignees } = config;
if (addReviewers) {
    if (Array.isArray(reviewers) && reviewers.length > 0) {
        try {
            const { pull_request: { user: { login } } } = event;
            if (reviewers.includes(login)) {
                console.info("[addReviewers]", "The author is in the reviewers list, remove it.");
                reviewers.splice(reviewers.indexOf(login), 1);
            }
        } catch { }
        if (reviewers.length > 0) {
            console.info("[addReviewers]", "config.addReviewers is true, requesting reviews from these users:", reviewers);
            await octokit.rest.pulls.requestReviewers({
                pull_number: number,
                reviewers,
            });
            console.info("[addReviewers]", "Done.");
        } else {
            console.info("[addReviewers]", "config.addReviewers is true, but no reviewer found after removing the author, skip.");
        }
    } else {
        console.info("[addReviewers]", "config.addReviewers is true, but no reviewer found, skip.");
    }
}
if (addAssignees) {
    if (Array.isArray(assignees) && assignees.length > 0) {
        console.info("[addAssignees]", "config.addAssignees is true, adding these users as assignees:", assignees);
        await octokit.rest.issues.addAssignees({
            issue_number: number,
            assignees,
        });
        console.info("[addAssignees]", "Done.");
    } else {
        console.info("[addAssignees]", "config.addAssignees is true, but no assignee found, skip.");
    }
}
console.info("Done.");
process.exit(0);
