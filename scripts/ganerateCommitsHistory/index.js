const bots = [
    "GH:github-actions",
    "GH:GitHub",
    "GH:GitHub Actions",
];
const githubWebInterfaceFlowSignature = {
    committerName: "GitHub",
    committerEmail: "noreply@github.com",
    signatureKey: "4AEE18F83AFDEB23",
};

import console from "../modules/console.js";
import mailmap from "../modules/mailmap.js";
import { startGroup, endGroup, exportVariable } from "@actions/core";
import { isInMasterBranch, debugLoggingEnabled, isInGithubActions } from "../modules/octokit.js";
import mkdtmp from "../modules/mkdtmp.js";
import jsonModule from "../modules/jsonModule.js";
import { create as createArtifactClient } from "@actions/artifact";
import git from "../modules/git.js";
import createCommit from "../modules/createCommit.js";
import path from "path";

exportVariable("linguist-generated-ganerateCommitsHistory", JSON.stringify(["src/global/zh/MediaWiki:GHIAHistory.json"]));

if (!isInMasterBranch) {
    console.info("Not running in non-master branch, exit.");
    process.exit(0);
}
console.info("Initialization done.");
const tempPath = await mkdtmp();
const rawHistoryPath = path.join(tempPath, "rawHistory.json");
console.info("Start to fetch raw history");
const { all: rawHistory } = await git.log({
    format: {
        hash: "%H",
        _date: "%aI",
        authorName: "%aN",
        _authorEmail: "%aE",
        committerName: "%cN",
        _committerEmail: "%cE",
        _signatureKey: "%GK",
        coAuthors: "%(trailers:key=Co-authored-by)",
    },
    "--stat": "10000",
});
console.info("Successfully fetched raw history, upload it as a artifact...");
await jsonModule.writeFile(rawHistoryPath, rawHistory);
if (isInGithubActions) {
    const artifactClient = createArtifactClient();
    await artifactClient.uploadArtifact("rawHistory.json", [rawHistoryPath], tempPath);
}
if (debugLoggingEnabled) {
    startGroup("Raw history:");
    console.info(rawHistory);
    endGroup();
}
const history = {};
const parser = ({ username, changedFiles, hash, date, indent }) => {
    if (username.endsWith("[bot]") || bots.includes(username)) {
        console.info(`${"\t".repeat(indent + 1)}This commit came from a bot, skip.`);
        return;
    }
    console.info(`${"\t".repeat(indent + 1)}${username} changed ${changedFiles} file(s) in commit ${hash} at ${date}.`);
    if (!Array.isArray(history[username])) {
        history[username] = [];
    }
    history[username].push({
        commit: hash,
        datetime: date,
        changedFiles,
    });
};
const removeSplitter = (str) => str.replace(/ò$/, "").trim();
if (debugLoggingEnabled) {
    startGroup("Raw history parsing:");
}
const debugLog = (...args) => {
    if (debugLoggingEnabled) {
        console.info(...args);
    }
};
for (const { hash, _date, authorName, _authorEmail, _signatureKey, committerName, _committerEmail, diff, coAuthors } of rawHistory) {
    const date = new Date(_date).toISOString();
    const authorEmail = _authorEmail.toLowerCase();
    const committerEmail = removeSplitter(_committerEmail).toLowerCase();
    const signatureKey = removeSplitter(_signatureKey);
    debugLog("Parsing:", { date, hash, authorName, authorEmail, committerName, committerEmail, signatureKey, coAuthors, diff });
    let changedFiles = 0;
    if (Array.isArray(diff?.files)) {
        debugLog("\tdiff.files:", diff.files);
        for (const { file, changes, before, after, binary } of diff.files) {
            if ((binary ? before !== after : changes > 0) && file.startsWith("src/")) {
                changedFiles++;
            }
        }
        debugLog("\tchangedFiles:", changedFiles);
    } else {
        debugLog("\tNothing changed by this commit.");
    }
    if (changedFiles === 0) {
        debugLog("\tNothing in src/ has been changed, skip.");
        continue;
    }
    const isFromGithubWebInterface = signatureKey === githubWebInterfaceFlowSignature.signatureKey && committerName === githubWebInterfaceFlowSignature.committerName && committerEmail === githubWebInterfaceFlowSignature.committerEmail;
    debugLog("\tisFromGithubWebInterface:", isFromGithubWebInterface);
    const name = isFromGithubWebInterface ? authorName : committerName;
    const email = (isFromGithubWebInterface ? authorEmail : committerEmail).toLowerCase();
    debugLog("\tname:", name);
    debugLog("\temail:", email);
    const username = `${Reflect.has(mailmap, email) ? "U:" : "GH:"}${name}`;
    debugLog("\tusername:", username);
    parser({ username, changedFiles, hash, date, indent: 1 });
    for (const coAuthorInfo of coAuthors.split(/\r*\n/).filter(({ length }) => length > 0)) {
        debugLog("\tFound co-author:", coAuthorInfo);
        const [coAuthorName, ..._coAuthorEmail] = coAuthorInfo.replace(/^Co-authored-by: /i, "").split(" <");
        const coAuthorEmail = _coAuthorEmail.join(" <").replace(/>$/, "").toLowerCase();
        debugLog("\t\tcoAuthorName:", coAuthorName);
        debugLog("\t\tcoAuthorEmail:", coAuthorEmail);
        const coAuthorUsername = Reflect.has(mailmap, coAuthorEmail) ? `U:${mailmap[coAuthorEmail]}` : `GH:${coAuthorName}`;
        debugLog("\t\tcoAuthorUsername:", coAuthorUsername);
        parser({ username: coAuthorUsername, changedFiles, hash, date, indent: 2 });
    }
}
if (debugLoggingEnabled) {
    endGroup();
}
const usernames = Object.keys(history).sort();
const sortedHistory = Object.fromEntries(Object.entries(history).sort(([a], [b]) => usernames.indexOf(a) - usernames.indexOf(b)));
if (debugLoggingEnabled) {
    startGroup("Parsed history:");
    console.info(sortedHistory);
    endGroup();
}
await jsonModule.writeFile("src/global/zh/MediaWiki:GHIAHistory.json", sortedHistory);
await createCommit("auto: commit history generated by ganerateCommitsHistory");
console.info("Done.");
