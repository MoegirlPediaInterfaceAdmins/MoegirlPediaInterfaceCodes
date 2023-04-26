import console from "../modules/console.js";
console.info("Initialization done.");
import mailmap from "../modules/mailmap.js";
import { git } from "../modules/git.js";
import { startGroup, endGroup } from "@actions/core";
import { isInGithubActions } from "../modules/octokit.js";

const detectIfBot = (name, email) => name.endsWith("[bot]") || email.split("@")[1] === "github.com";

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
if (isInGithubActions) {
    const { commits } = process.env;
    if (typeof commits !== "string" || commits.length === 0) {
        console.info("Running in github actions, but no commit input, exit.");
        process.exit(0);
    }
    const failures = [];
    const allCommits = JSON.parse(commits);
    startGroup("Running in github actions, commits input:");
    console.info(allCommits);
    endGroup();
    for (const { author: { email: authorEmail, name: authorName }, committer: { email: committerEmail, name: committerName }, id, message, url } of allCommits) {
        const failure = [];
        if (!detectIfBot(authorName, authorEmail) && !Reflect.has(mailmap, authorEmail)) {
            failure.push(`author: ${authorName} <${authorEmail}>`);
        }
        if (!detectIfBot(committerName, committerEmail) && !Reflect.has(mailmap, committerEmail)) {
            failure.push(`committer: ${committerName} <${committerEmail}>`);
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
} else {
    const failures = [];
    startGroup("Running in local, localGitConfigs:");
    console.info(localGitConfigs);
    endGroup();
    for (const { type, email, name } of localGitConfigs) {
        if (!Reflect.has(mailmap, email)) {
            failures.push({ type, failure: `${name} <${email}>` });
        }
    }
    if (failures.length === 0) {
        console.info("All the emails are in .mailmap, exit.");
        process.exit(0);
    }
    console("Found emails not in .mailmap, please add it:", failures);
    process.exit(1);
}
