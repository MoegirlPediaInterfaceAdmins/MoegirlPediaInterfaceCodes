import console, { dump } from "../modules/console.js";
console.info("Initialization done.");
import exitIf from "../modules/exitIf.js";
import yamlModule from "../modules/yamlModule.js";
import { isInGithubActions, octokit } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";

exitIf(!isInGithubActions, "Not in github actions, exit.");
const event = await readWorkflowEvent();
const { action, number, pull_request: { draft } = {} } = event;
// draft PR 创建时即以 opened 触发，但 GitHub 拒绝对 draft PR 请求评审（422），
// 必须等 ready_for_review 再指派；draft 守卫因此放在 action 判断之前，两种触发都会被拦截
exitIf(draft === true, "The pull request is a draft, exit.");
exitIf(action !== "opened" && action !== "ready_for_review", "The pull request action is not `opened` or `ready_for_review`, exit.");
exitIf(typeof number !== "number", "The number of the pull request is not `number`, exit.");
const config = await yamlModule.readFile(".github/auto_assign.yaml");
dump("config:", config);
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
