"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const fs = require("fs");
const { git } = require("../modules/git.js");
const core = require("@actions/core");
const { isInGithubActions } = require("../modules/octokit.js");

const detectIfBot = (name, email) => name.endsWith("[bot]") || email.split("@")[1] === "github.com";

(async () => {
    /**
     * 
     * @param {string[]} types 
     * @returns 
     */
    const getGitConfigs = async (types) => (await Promise.all(types.map(async (type) => ({ type, email: (await git.getConfig(`${type}.email`)).value, name: (await git.getConfig(`${type}.name`)).value })))).filter(({ email }) => email);
    const localGitConfigs = await getGitConfigs(["user", "author", "committer"]);
    if (!isInGithubActions && localGitConfigs.length === 0) {
        console.info("No email found, exit.");
        process.exit(0);
    }
    const mailmap = await fs.promises.readFile(".mailmap", { encoding: "utf-8" });
    core.startGroup(".mailmap:");
    console.info(mailmap);
    core.endGroup();
    const mailSet = mailmap.replace(/#[^\n]*/g, "").match(/(?<=<)[^>\n]+/g);
    core.startGroup("mailSet:");
    console.info(mailSet);
    core.endGroup();
    if (isInGithubActions) {
        const { commits, head_commit } = require(process.env.GITHUB_EVENT_PATH);
        if ((!Array.isArray(commits) || commits.length === 0) && !head_commit) {
            console.info("Running in github actions, but no commit found, exit.");
            process.exit(0);
        }
        const failures = [];
        const allCommits = [...Array.isArray(commits) ? commits : [], ...head_commit ? [head_commit] : []];
        core.startGroup("Running in github actions, commits:");
        console.info(allCommits);
        core.endGroup();
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
            process.exit(0);
        }
        console.error("Found emails not in .mailmap, please add it:", failures);
        process.exit(1);
    } else {
        const failures = [];
        core.startGroup("Running in local, localGitConfigs:");
        console.info(localGitConfigs);
        core.endGroup();
        for (const { type, email, name } of localGitConfigs) {
            if (!mailSet.includes(email)) {
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
})();
