import { endGroup, startGroup } from "@actions/core";
import console from "./console.js";
import exitIf from "./exitIf.js";
import { isPullRequest, isPush, octokit, octokitBaseOptions } from "./octokit.js";
import readWorkflowEvent from "./workflowEvent.js";

/**
 * 读取当前 workflow 事件对应的 commit 列表，归一化为统一形状后返回：
 * push 事件的事件载荷自带本次推送的全部 commit（含 author / committer 的 name、email），无需 API；
 * pull_request 事件载荷不含 commit 列表，只能通过 API 拉取；分页取满，避免漏检靠后的提交；
 * 其余事件没有可检查的 commit，打印消息后以退出码 0 结束。
 * 载荷为空（push 无 commit、PR 无 commit）时同样直接退出。
 * @returns {Promise<{ id: string; message: string; url: string; author: { name?: string; email?: string; } | null; committer: { name?: string; email?: string; } | null; }[]>}
 */
export default async () => {
    const workflowEvent = await readWorkflowEvent();
    if (isPush) {
        const { commits } = workflowEvent;
        exitIf(!Array.isArray(commits) || commits.length === 0, "Running in github actions push event, but no commit in payload, exit.");
        return commits;
    }
    if (isPullRequest) {
        const pull_number = workflowEvent.pull_request.number;
        startGroup("Running in github actions pull request event, fetching commits:");
        // octokit.paginate 不会经过 octokit.js 里补全 {owner}/{repo} 的 request 钩子，必须显式传入。
        const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
            ...octokitBaseOptions,
            pull_number,
            per_page: 100,
        });
        endGroup();
        exitIf(commits.length === 0, "Running in github actions pull request event, but no commit found, exit.");
        return commits.map((commit) => ({
            id: commit.sha,
            message: commit.commit.message,
            url: commit.html_url,
            author: commit.commit.author,
            committer: commit.commit.committer,
        }));
    }
    console.info(`Running in github actions, but event "${process.env.GITHUB_EVENT_NAME}" is not handled, exit.`);
    process.exit(0);
};
