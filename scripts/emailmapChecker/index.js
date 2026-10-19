import console, { dump } from "../modules/console.js";
console.info("Initialization done.");
import exitIf from "../modules/exitIf.js";
import git from "../modules/git.js";
import getWorkflowCommits from "../modules/getWorkflowCommits.js";
import { isInGithubActions } from "../modules/octokit.js";
import { detectIfBot, isMapped } from "./detectIfBot.js";

/**
 * @param {string[]} types
 * @returns {Promise<{ type: string; email: string; name: string | null; }[]>}
 */
const getGitConfigs = async (types) => (await Promise.all(types.map(async (type) => ({ type, email: (await git.getConfig(`${type}.email`)).value, name: (await git.getConfig(`${type}.name`)).value })))).filter(({ email }) => email);
const localGitConfigs = await getGitConfigs(["user", "author", "committer"]);
exitIf(!isInGithubActions && localGitConfigs.length === 0, "No email found, exit.");
/**
 * @param {{ author: { name?: string; email?: string; } | null; committer: { name?: string; email?: string; } | null; id: string; message: string; url: string; }[]} allCommits
 * @returns {never}
 */
const checkCommits = (allCommits) => {
    const failures = [];
    dump("Running in github actions, commits input:", allCommits);
    for (const { author, committer, id, message, url } of allCommits) {
        const { email: authorEmail, name: authorName } = author ?? {};
        const { email: committerEmail, name: committerName } = committer ?? {};
        const failure = [];
        if (!detectIfBot(authorName, authorEmail) && !isMapped(authorEmail)) {
            failure.push(`author: ${authorName ?? "unknown name"} <${authorEmail ?? "missing email"}>`);
        }
        if (!detectIfBot(committerName, committerEmail) && !isMapped(committerEmail)) {
            failure.push(`committer: ${committerName ?? "unknown name"} <${committerEmail ?? "missing email"}>`);
        }
        if (failure.length > 0) {
            failures.push({ id, message, url, failure });
        }
    }
    exitIf(failures.length === 0, "All the emails are in .mailmap, exit.");
    console.error("Found emails not in .mailmap, please add it:", failures);
    process.exit(1);
};
if (isInGithubActions) {
    checkCommits(await getWorkflowCommits());
} else {
    const failures = [];
    dump("Running in local, localGitConfigs:", localGitConfigs);
    for (const { type, email, name } of localGitConfigs) {
        // 与 CI 分支保持一致地豁免 bot：CI 的自动提交使用 github-actions[bot]，
        // 该身份在本地跑 test:mailmap 时同样不应被判为未映射。
        if (!detectIfBot(name ?? "", email) && !isMapped(email)) {
            failures.push({ type, failure: `${name} <${email}>` });
        }
    }
    exitIf(failures.length === 0, "All the emails are in .mailmap, exit.");
    console.error("Found emails not in .mailmap, please add it:", failures);
    process.exit(1);
}
