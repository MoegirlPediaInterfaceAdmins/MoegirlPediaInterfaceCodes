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
 * 将仅包含 type / type(scope) 的首行补全为 `type: `，以便 commitlint 正常校验 type。
 * @param {string} message
 */
const normalizeEmptySubject = (message) => {
    const [firstLine, ...rest] = message.split("\n");
    const trimmed = firstLine.trim();
    if (/^[^\s:]+(?:\([^)]*\))?:?$/.test(trimmed)) {
        return [trimmed.replace(/:?$/, ": "), ...rest].join("\n");
    }
    return message;
};

/**
 * 逐条校验，全部通过才返回；失败时打印明细并 exit 1。
 * @param {{ subject: string; message: string; url?: string; }[]} items
 * @param {{ allowEmptySubject?: boolean; }} [options]
 */
const checkAll = async (items, { allowEmptySubject = false } = {}) => {
    const failures = [];
    for (const { subject, message, url } of items) {
        const targetMessage = allowEmptySubject ? normalizeEmptySubject(message) : message;
        const { valid, errors } = await lintMessage(targetMessage);
        if (valid) {
            continue;
        }
        const remainingErrors = allowEmptySubject
            ? errors.filter(({ name }) => name !== "subject-empty")
            : errors;
        if (remainingErrors.length > 0) {
            failures.push({ subject, errors: remainingErrors, url });
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
    const isPullRequest = Boolean((await readWorkflowEvent())?.pull_request);
    await checkAll(
        (await getWorkflowCommits()).map(({ id, message, url }) => ({
            subject: `${id.slice(0, 7)}: ${message.split("\n")[0]}`,
            message,
            url,
        })),
        { allowEmptySubject: isPullRequest },
    );
}
