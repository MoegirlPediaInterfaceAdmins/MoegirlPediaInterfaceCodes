import console from "../modules/console.js";
console.info("Initialization done.");
import mailmap from "../modules/mailmap.js";
import git from "../modules/git.js";
import { startGroup, endGroup } from "@actions/core";
import { isInGithubActions, isPullRequest, isPush, octokit, octokitBaseOptions } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";

// GitHub API 的 commit.commit.author / committer 类型是 nullable-git-user，其 name / email 也可能缺失，
// 故这里与 isMapped 都对缺值做兜底：缺失时按「未映射」上报，而不是抛 TypeError 让整个检查崩溃。
const detectIfBot = (name, email) => (name ?? "").endsWith("[bot]") || (email ?? "").split("@")[1] === "github.com";
// mailmap.js 解析时把邮箱键统一转成小写，而 git / GitHub API 返回的邮箱大小写不固定，查询前必须同样归一化。
const isMapped = (email) => typeof email === "string" && Reflect.has(mailmap, email.toLowerCase());

/**
 * @param {string[]} types
 * @returns {Promise<{ type: string; email: string; name: string | null; }[]>}
 */
const getGitConfigs = async (types) => (await Promise.all(types.map(async (type) => ({ type, email: (await git.getConfig(`${type}.email`)).value, name: (await git.getConfig(`${type}.name`)).value })))).filter(({ email }) => email);
const localGitConfigs = await getGitConfigs(["user", "author", "committer"]);
if (!isInGithubActions && localGitConfigs.length === 0) {
    console.info("No email found, exit.");
    process.exit(0);
}
/**
 * @param {{ author: { name?: string; email?: string; } | null; committer: { name?: string; email?: string; } | null; id: string; message: string; url: string; }[]} allCommits
 * @returns {never}
 */
const checkCommits = (allCommits) => {
    const failures = [];
    startGroup("Running in github actions, commits input:");
    console.info(allCommits);
    endGroup();
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
    if (failures.length === 0) {
        console.info("All the emails are in .mailmap, exit.");
        process.exit(0);
    }
    console.error("Found emails not in .mailmap, please add it:", failures);
    process.exit(1);
};
if (isInGithubActions) {
    const workflowEvent = await readWorkflowEvent();
    if (isPush) {
        // push 事件的事件载荷自带本次推送的全部 commit（含 author/committer 的 name、email），
        // 无需依赖已被删除的 postCommit job output。
        const { commits } = workflowEvent;
        if (!Array.isArray(commits) || commits.length === 0) {
            console.info("Running in github actions push event, but no commit in payload, exit.");
            process.exit(0);
        }
        checkCommits(commits);
    } else if (isPullRequest) {
        // pull_request 事件载荷不含 commit 列表，只能通过 API 拉取；分页取满，避免漏检靠后的提交。
        const pull_number = workflowEvent.pull_request.number;
        startGroup("Running in github actions pull request event, fetching commits:");
        // octokit.paginate 不会经过 octokit.js 里补全 {owner}/{repo} 的 request 钩子，必须显式传入。
        const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
            ...octokitBaseOptions,
            pull_number,
            per_page: 100,
        });
        endGroup();
        if (commits.length === 0) {
            console.info("Running in github actions pull request event, but no commit found, exit.");
            process.exit(0);
        }
        checkCommits(commits.map((commit) => ({
            id: commit.sha,
            message: commit.commit.message,
            url: commit.html_url,
            author: commit.commit.author,
            committer: commit.commit.committer,
        })));
    } else {
        console.info(`Running in github actions, but event "${process.env.GITHUB_EVENT_NAME}" has no commit list, exit.`);
        process.exit(0);
    }
} else {
    const failures = [];
    startGroup("Running in local, localGitConfigs:");
    console.info(localGitConfigs);
    endGroup();
    for (const { type, email, name } of localGitConfigs) {
        // 与 CI 分支保持一致地豁免 bot：CI 的自动提交使用 github-actions[bot]，
        // 该身份在本地跑 test:mailmap 时同样不应被判为未映射。
        if (!detectIfBot(name ?? "", email) && !isMapped(email)) {
            failures.push({ type, failure: `${name} <${email}>` });
        }
    }
    if (failures.length === 0) {
        console.info("All the emails are in .mailmap, exit.");
        process.exit(0);
    }
    console.error("Found emails not in .mailmap, please add it:", failures);
    process.exit(1);
}
