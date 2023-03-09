import console from "../modules/console.js";
console.info("Start initialization...");
import fs from "fs";
import { git } from "../modules/git.js";
import { startGroup, endGroup } from "@actions/core";
import { isInGithubActions } from "../modules/octokit.js";
import jsonModule from "../modules/jsonModule.js";
import { exit } from "process";

const detectIfBot = (name, email) => name.endsWith("[bot]") || email.split("@")[1] === "github.com";

/**
 * 
 * @param {string[]} types 
 * @returns 
 */
const getGitConfigs = async (types) => (await Promise.all(types.map(async (type) => ({ type, email: (await git.getConfig(`${type}.email`)).value, name: (await git.getConfig(`${type}.name`)).value })))).filter(({ email }) => email);
const localGitConfigs = await getGitConfigs(["user", "author", "committer"]);
if (!isInGithubActions && localGitConfigs.length === 0) {
    console.info("No email found, exit.");
    exit(0);
}
const mailmap = await fs.promises.readFile(".mailmap", { encoding: "utf-8" });
startGroup(".mailmap:");
console.info(mailmap);
endGroup();
const mailSet = mailmap.replace(/#[^\n]*/g, "").match(/(?<=<)[^>\n]+/g);
startGroup("mailSet:");
console.info(mailSet);
endGroup();
if (isInGithubActions) {
    const { commits, head_commit } = await jsonModule.readFile(process.env.GITHUB_EVENT_PATH);
    if ((!Array.isArray(commits) || commits.length === 0) && !head_commit) {
        console.info("Running in github actions, but no commit found, exit.");
        exit(0);
    }
    const failures = [];
    const allCommits = [...Array.isArray(commits) ? commits : [], ...head_commit ? [head_commit] : []];
    startGroup("Running in github actions, commits:");
    console.info(allCommits);
    endGroup();
    for (const { author: { email: authorEmail, name: authorName }, committer: { email: committerEmail, name: committerName }, id, message, url } of allCommits) {
        const failure = [];
        if (!detectIfBot(authorName, authorEmail) && !mailSet.includes(authorEmail)) {
            failure.push(`author: ${authorName} <${authorEmail}>`);
        }
        if (!detectIfBot(committerName, committerEmail) && !mailSet.includes(committerEmail)) {
            failure.push(`committer: ${committerName} <${committerEmail}>`);
        }
        if (failure.length > 0) {
            failures.push({ id, message, url, failure });
        }
    }
    if (failures.length === 0) {
        console.info("All the emails are in .mailmap, exit.");
        exit(0);
    }
    console.error("Found emails not in .mailmap, please add it:", failures);
    exit(1);
} else {
    const failures = [];
    startGroup("Running in local, localGitConfigs:");
    console.info(localGitConfigs);
    endGroup();
    for (const { type, email, name } of localGitConfigs) {
        if (!mailSet.includes(email)) {
            failures.push({ type, failure: `${name} <${email}>` });
        }
    }
    if (failures.length === 0) {
        console.info("All the emails are in .mailmap, exit.");
        exit(0);
    }
    console("Found emails not in .mailmap, please add it:", failures);
    exit(1);
}
