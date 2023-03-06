import console from "../modules/console.js";
console.info("Start initialization...");
import { isInGithubActions } from "../modules/octokit.js";
import jsonModule from "../modules/jsonModule.js";
import { exportVariable } from "@actions/core";
import { exit } from "process";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    exit(0);
}
console.info("Running in github actions, preparing git...");
const { commit, head_commit, pusher, sender } = await jsonModule.readFile(process.env.GITHUB_EVENT_PATH);
const tmpMap = {};
for (const { author: { email: authorEmail, name: authorName, username: authorUsername }, committer: { email: committerEmail, name: committerName, username: committerUsername } } of [...Array.isArray(commit) ? commit : [], ...head_commit ? [head_commit] : []]) {
    tmpMap[authorName] = tmpMap[authorUsername] = authorEmail;
    tmpMap[committerName] = tmpMap[committerUsername] = committerEmail;
}
const name = pusher ? pusher.name : sender ? sender.login : process.env.GITHUB_ACTOR;
const email = pusher ? pusher.email : sender ? tmpMap[sender.login] || `${sender.login}@users.noreply.github.com` : `${process.env.GITHUB_ACTOR}@users.noreply.github.com`;
console.info("AUTHOR_NAME:", name);
console.info("AUTHOR_EMAIL:", email);
exportVariable("AUTHOR_NAME", name);
exportVariable("AUTHOR_EMAIL", email);
exportVariable("COMMITTER_NAME", "GitHub Actions");
exportVariable("COMMITTER_EMAIL", "actions@github.com");
