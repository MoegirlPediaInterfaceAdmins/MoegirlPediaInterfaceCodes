import console from "../modules/console.js";
import { git } from "../modules/git.js";
import { exportVariable } from "@actions/core";
import { isInGithubActions, isPush } from "../modules/octokit.js";

/**
 * 
 * @param {string} message 
 * @returns {Promise<CommitResult & { commit_long: string } | false>}
 */
export default async (message) => {
    if (!isInGithubActions) {
        console.info("Not running in github actions, exit.");
        return false;
    }
    if (!isPush) {
        console.info("Not running in push event, exit.");
        return false;
    }
    console.info("[createCommit] Running in github actions in push event, try to create commit.");
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
        const changedFilesFromEnv = JSON.parse(process.env.changedFiles || "[]");
        console.info("[createCommit] changedFilesFromEnv:", changedFilesFromEnv);
        const conbineChangedFiles = [...new Set([...Array.isArray(changedFilesFromEnv) ? changedFilesFromEnv : [], ...changedFiles])];
        console.info("[createCommit] conbinedChangedFiles:", conbineChangedFiles);
        exportVariable("changedFiles", JSON.stringify(conbineChangedFiles));
    } catch (e) {
        console.error("[createCommit] processing env error, discarded", e);
        exportVariable("changedFiles", JSON.stringify(changedFiles));
    }
    const data = await git.commit(message);
    console.info("[createCommit] commit_sha:", data.commit);
    data.commit_long = await git.revparse(data.commit);
    console.info("[createCommit] commit_long_sha:", data.commit_long);
    console.info("[createCommit] Done.");
    return data;
};
