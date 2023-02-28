"use strict";
const fs = require("fs");
const console = require("../modules/console.js");
const { git } = require("../modules/git.js");
const core = require("@actions/core");
const { isInGithubActions, octokit } = require("../modules/octokit.js");

/**
 * 
 * @param {string} message 
 */
module.exports = async (message) => {
    if (!isInGithubActions) {
        console.info("Not running in github actions, exit.");
        return false;
    }
    console.info("[createCommit] Running in github actions, try to create commit.");
    console.info("[createCommit] message:", message);
    await git.add(".");
    const changedFiles = (await git.diffSummary(["--cached"])).files.map(({ file }) => file);
    if (changedFiles.length === 0) {
        console.info("[createCommit] Working tree clean. Nothing to commit.");
        return false;
    }
    try {
        console.info("[createCommit] process.env.changedFiles:", process.env.changedFiles || "[]");
        /**
             * @type {string[] | undefined}
             */
        const changedFilesFromEnv = JSON.parse(process.env.changedFiles);
        console.info("[createCommit] changedFilesFromEnv:", changedFilesFromEnv);
        const conbineChangedFiles = [...new Set([...Array.isArray(changedFilesFromEnv) ? changedFilesFromEnv : [], ...changedFiles])];
        console.info("[createCommit] conbineChangedFiles:", conbineChangedFiles);
        core.exportVariable("changedFiles", JSON.stringify(conbineChangedFiles));
    } catch (e) {
        console.error("[createCommit] processing env error, discarded", e);
        core.exportVariable("changedFiles", JSON.stringify(changedFiles));
    }
    let i = 1;
    for (const file of changedFiles) {
        console.info("Start to upload", file);
        const result = await octokit.rest.repos.createOrUpdateFileContents({
            path: file,
            message: `${changedFiles.length > 1 ? `[${i++}/${changedFiles.length}] ` : ""}${message}`,
            content: await fs.promises.readFile(file, { encoding: "base64" }),
            sha: await git.revparse([`${process.env.GITHUB_REF}:${file}`]),
            branch: process.env.GITHUB_REF,
            committer: {
                name: process.env.COMMITTER_NAME,
                email: process.env.COMMITTER_EMAIL,
            },
            author: {
                name: process.env.AUTHOR_NAME,
                email: process.env.AUTHOR_EMAIL,
            },
        });
        core.startGroup("[createCommit] Upload result:");
        console.info(result);
        core.endGroup();
    }
    console.info("[createCommit] Start to pull back the repo.");
    await git.pull(undefined, undefined, ["--rebase"]);
    console.info("[createCommit] Done.");
    return true;
};
