import console from "../modules/console.js";
console.info("Initialization done.");
import exitIf from "../modules/exitIf.js";
import lintMessage from "./lintMessage.js";
import { isInGithubActions } from "../modules/octokit.js";
import readWorkflowEvent from "../modules/workflowEvent.js";
import getWorkflowCommits from "../modules/getWorkflowCommits.js";

const modes = ["commits", "title"];
const mode = process.argv[2];
if (!modes.includes(mode)) {
    console.error(`Usage: node scripts/commitLint/index.js <${modes.join("|")}>`);
    process.exit(1);
}
exitIf(!isInGithubActions, "Not running in github actions, exit.");

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
    exitIf(failures.length === 0, `All ${items.length} message(s) are valid, exit.`);
    console.error(`Found ${failures.length} invalid message(s):`);
    for (const { subject, errors, url } of failures) {
        printErrors(subject, errors);
        if (url) {
            console.error(`    ${url}`);
        }
    }
    process.exit(1);
};

if (mode === "title") {
    // 仅在 PR 场景校验标题；正文编辑（changes 中无 title）不应触发，故交由 workflow 的 if 过滤，
    // 此处只做兜底：标题不存在时视为无内容可查。
    const title = (await readWorkflowEvent())?.pull_request?.title;
    exitIf(typeof title !== "string" || title.length === 0, "No pull request title in payload, exit.");
    await checkAll([{ subject: `PR title: ${title}`, message: title }]);
} else {
    await checkAll((await getWorkflowCommits()).map(({ id, message, url }) => ({
        subject: `${id.slice(0, 7)}: ${message.split("\n")[0]}`,
        message,
        url,
    })));
}
