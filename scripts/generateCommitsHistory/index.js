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

import { endGroup, exportVariable, startGroup } from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import artifactClient from "@actions/artifact";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import git from "../modules/git.js";
import jsonModule from "../modules/jsonModule.js";
import mailmap from "../modules/mailmap.js";
import mkdtmp from "../modules/mkdtmp.js";
import { debugConsole, debugLoggingEnabled, isInGithubActions, isInMasterBranch } from "../modules/octokit.js";

/**
 * @param { string } file file path like "src/@types/libBottomRightCorner.d.ts"
 * @returns { boolean }
 */
const pathValidator = (file) => file.startsWith("src/") && ![
    "src/@types/",
].some((blacklist) => file.startsWith(blacklist));

exportVariable("linguist-generated-generateCommitsHistory", JSON.stringify(["src/global/zh/GHIAHistory.json"]));

if (!isInMasterBranch) {
    console.info("Not running in master branch, exit.");
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
console.info("Successfully fetched raw history, it has", rawHistory.length, "items.");
await jsonModule.writeFile(rawHistoryPath, rawHistory);
console.info("Successfully saved to", rawHistoryPath);
console.info(await fs.promises.stat(rawHistoryPath));
if (isInGithubActions) {
    console.info("\tUpload it as a artifact...");
    await artifactClient.uploadArtifact("rawHistory.json", [rawHistoryPath], tempPath);
}
if (debugLoggingEnabled) {
    startGroup("Raw history:");
    debugConsole.log(rawHistory);
    endGroup();
}
const history = {};
const parser = ({ username, changedFiles, hash, date, indent }) => {
    if (username.endsWith("[bot]") || bots.includes(username)) {
        debugConsole.info(`${"\t".repeat(indent + 1)}This commit came from a bot (${username}), skip.`);
        return;
    }
    debugConsole.info(`${"\t".repeat(indent + 1)}${username} changed ${changedFiles} file(s) in commit ${hash} at ${date}.`);
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
for (const { hash, _date, authorName, _authorEmail, _signatureKey, committerName, _committerEmail, diff, coAuthors } of rawHistory) {
    const date = new Date(_date).toISOString();
    const authorEmail = _authorEmail.toLowerCase();
    const committerEmail = removeSplitter(_committerEmail).toLowerCase();
    const signatureKey = removeSplitter(_signatureKey);
    debugConsole.log("Parsing:", { date, hash, authorName, authorEmail, committerName, committerEmail, signatureKey, coAuthors, diff });
    let changedFiles = 0;
    if (Array.isArray(diff?.files)) {
        debugConsole.log("\tdiff.files:", diff.files);
        for (const { file, changes, before, after, binary } of diff.files) {
            if ((binary ? before !== after : changes > 0) && pathValidator(file)) {
                changedFiles++;
            }
        }
        debugConsole.log("\tchangedFiles:", changedFiles);
    } else {
        debugConsole.log("\tNothing changed by this commit.");
    }
    if (changedFiles === 0) {
        debugConsole.log("\tNothing in src/ has been changed, skip.");
        continue;
    }
    const isFromGithubWebInterface = signatureKey === githubWebInterfaceFlowSignature.signatureKey && committerName === githubWebInterfaceFlowSignature.committerName && committerEmail === githubWebInterfaceFlowSignature.committerEmail;
    debugConsole.log("\tisFromGithubWebInterface:", isFromGithubWebInterface);
    const name = isFromGithubWebInterface ? authorName : committerName;
    const email = (isFromGithubWebInterface ? authorEmail : committerEmail).toLowerCase();
    debugConsole.log("\tname:", name);
    debugConsole.log("\temail:", email);
    const username = `${Reflect.has(mailmap, email) ? "U:" : "GH:"}${name}`;
    debugConsole.log("\tusername:", username);
    parser({ username, changedFiles, hash, date, indent: 1 });
    for (const coAuthorInfo of coAuthors.split(/\r*\n/).filter(({ length }) => length > 0)) {
        debugConsole.log("\tFound co-author:", coAuthorInfo);
        const [coAuthorName, ..._coAuthorEmail] = coAuthorInfo.replace(/^Co-authored-by: /i, "").split(" <");
        const coAuthorEmail = _coAuthorEmail.join(" <").replace(/>$/, "").toLowerCase();
        debugConsole.log("\t\tcoAuthorName:", coAuthorName);
        debugConsole.log("\t\tcoAuthorEmail:", coAuthorEmail);
        const coAuthorUsername = Reflect.has(mailmap, coAuthorEmail) ? `U:${mailmap[coAuthorEmail]}` : `GH:${coAuthorName}`;
        debugConsole.log("\t\tcoAuthorUsername:", coAuthorUsername);
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
    debugConsole.info(sortedHistory);
    endGroup();
}
console.info("Parsed done.");
await jsonModule.writeFile("src/global/zh/GHIAHistory.json", sortedHistory);
await createCommit("auto: commit history generated by generateCommitsHistory");
console.info("Done.");
