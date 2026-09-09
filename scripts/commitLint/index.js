import console from "../modules/console.js";
console.info("Initialization done.");
import lintMessage from "./lintMessage.js";
import { endGroup, startGroup } from "@actions/core";
import { isInGithubActions, isPullRequest, isPush, octokit, octokitBaseOptions } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";

const modes = ["commits", "title"];
const mode = process.argv[2];
if (!modes.includes(mode)) {
    console.error(`Usage: node scripts/commitLint/index.js <${modes.join("|")}>`);
    process.exit(1);
}
if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}

/**
 * @param {string} subject
 * @param {{ name: string; message: string; }[]} errors
 */
const printErrors = (subject, errors) => {
    console.error(`- ${subject}`);
    for (const { name, message } of errors) {
        console.error(`    ${name}: ${message}`);
    }
};

/**
 * 逐条校验，全部通过才返回；失败时打印明细并 exit 1。
 * @param {{ subject: string; message: string; url?: string; }[]} items
 */
const checkAll = async (items) => {
    const failures = [];
    for (const { subject, message, url } of items) {
        const { valid, errors } = await lintMessage(message);
        if (!valid) {
            failures.push({ subject, errors, url });
        }
    }
    if (failures.length === 0) {
        console.info(`All ${items.length} message(s) are valid, exit.`);
        process.exit(0);
    }
    console.error(`Found ${failures.length} invalid message(s):`);
    for (const { subject, errors, url } of failures) {
        printErrors(subject, errors);
        if (url) {
            console.error(`    ${url}`);
        }
    }
    process.exit(1);
};

const workflowEvent = await readWorkflowEvent();

if (mode === "title") {
    // 仅在 PR 场景校验标题；正文编辑（changes 中无 title）不应触发，故交由 workflow 的 if 过滤，
    // 此处只做兜底：标题不存在时视为无内容可查。
    const title = workflowEvent?.pull_request?.title;
    if (typeof title !== "string" || title.length === 0) {
        console.info("No pull request title in payload, exit.");
        process.exit(0);
    }
    await checkAll([{ subject: `PR title: ${title}`, message: title }]);
} else if (isPush) {
    // push 事件载荷自带本次推送的 commit，无需 API；与 emailmapChecker 的取数方式保持一致。
    const { commits } = workflowEvent;
    if (!Array.isArray(commits) || commits.length === 0) {
        console.info("Running in github actions push event, but no commit in payload, exit.");
        process.exit(0);
    }
    await checkAll(commits.map(({ id, message, url }) => ({ subject: `${id.slice(0, 7)}: ${message.split("\n")[0]}`, message, url })));
} else if (isPullRequest) {
    // pull_request 载荷不含 commit 列表，只能通过 API 拉取；分页取满，避免漏检靠后的提交。
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
    await checkAll(commits.map((commit) => ({
        subject: `${commit.sha.slice(0, 7)}: ${commit.commit.message.split("\n")[0]}`,
        message: commit.commit.message,
        url: commit.html_url,
    })));
} else {
    console.info(`Running in github actions, but event "${process.env.GITHUB_EVENT_NAME}" is not handled, exit.`);
    process.exit(0);
}
