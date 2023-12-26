import console from "./console.js";
import git from "./git.js";
import { isInGithubActions } from "./octokit.js";
if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}
/**
 * @type { string | false } when false, it means the current branch is not tracking any remote branch.
 */
let result;
try {
    result = await git.revparse(["--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
} catch (e) {
    console.error(e);
    result = false;
}
export default result;
