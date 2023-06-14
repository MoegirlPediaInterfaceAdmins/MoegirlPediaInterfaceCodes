import jsonModule from "../modules/jsonModule.js";
import { isInGithubActions } from "../modules/octokit.js";
import console from "../modules/console.js";

const readWorkflowEvent = async () => {
    if (!isInGithubActions) {
        console.info("[workflowEvent]", "Not in Github Actions, exit.");
        return false;
    }
    return await jsonModule.readFile(process.env.GITHUB_EVENT_PATH);
};

export { readWorkflowEvent };
export default readWorkflowEvent;
