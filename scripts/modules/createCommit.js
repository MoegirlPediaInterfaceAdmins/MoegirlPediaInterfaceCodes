"use strict";
const console = require("../modules/console.js");
const { git } = require("../modules/git.js");
const core = require("@actions/core");
const { isInGithubActions } = require("../modules/octokit.js");

/**
 * 
 * @param {string} message 
 * @returns {CommitResult & { commit_long: string }}
 */
module.exports = async (message) => {
    if (isInGithubActions) {
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
        const data = await git.commit(message);
        console.info("[createCommit] commit_sha:", data.commit);
        data.commit_long = await git.revparse(data.commit);
        console.info("[createCommit] commit_long_sha:", data.commit_long);
        console.info("[createCommit] Done.");
        return data;
    }
    console.info("Not running in github actions, exit.");
};
