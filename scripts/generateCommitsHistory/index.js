import artifactClient from "@actions/artifact";
import { endGroup, exportVariable, startGroup } from "@actions/core";
import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import exitIf from "../modules/exitIf.js";
import git from "../modules/git.js";
import jsonModule from "../modules/jsonModule.js";
import mailmap from "../modules/mailmap.js";
import mkdtmp from "../modules/mkdtmp.js";
import { debugConsole, debugLoggingEnabled, isInGithubActions, isInMasterBranch, isInMoegirlPediaInterfaceCodes, octokit } from "../modules/octokit.js";
import yamlModule from "../modules/yamlModule.js";
import { isFromGithubWebInterface, parseCoAuthor, removeSplitter } from "./attribution.js";
import countCommitChanges from "./countCommitChanges.js";
import { parseNumstatPaths, renamePathValidator } from "./pathValidators.js";

const execFile = promisify(execFileCallback);

exportVariable("linguist-generated-generateCommitsHistory", JSON.stringify(["src/global/zh/GHIAHistory.json"]));

exitIf(!isInMoegirlPediaInterfaceCodes, "Not running in MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes, exit.");
exitIf(!isInMasterBranch, "Not running in master branch, exit.");
console.info("Initialization done.");
const tempPath = await mkdtmp();
const rawHistoryPath = path.join(tempPath, "rawHistory.json");
/**
 * 判定「提交是否来自 GitHub 网页界面」必须靠密码学签名验证，而不能只看 %GK（%GK 只是
 * 签名里声明的签发者 ID，可以伪造：手工构造 gpgsig 即可让 %GK 等于 web-flow 的密钥 ID）。
 * 这里拉取 web-flow 当前公布的全部公钥（含已过期的旧密钥，历史提交正是用它们签名的——
 * 实测 2024-01-16 前的 912 个提交 %G? 为 Y，即「签名有效但密钥现已过期」，若按
 * expires_at/revoked 过滤会把这批提交全部误判为非网页提交而静默丢失）。
 */
console.info("Start to fetch GitHub web-flow GPG keys");
const githubWebFlowKeys = (await octokit.rest.users.listGpgKeysForUser({ username: "web-flow" })).data;
console.info("GitHub web-flow GPG keys:", githubWebFlowKeys.map(({ key_id }) => key_id));
if (githubWebFlowKeys.length === 0) {
    throw new Error("No GitHub web-flow GPG key found, refuse to continue to avoid mis-attributing commits.");
}
// 导入独立的 GNUPGHOME，既不污染 runner 上可能存在的用户 keyring，也不受其状态影响
const gpgHome = await mkdtmp();
await fs.promises.chmod(gpgHome, 0o700);
for (const { key_id, raw_key } of githubWebFlowKeys) {
    if (!raw_key) {
        throw new Error(`GitHub web-flow GPG key ${key_id} has no raw_key, cannot verify commit signatures.`);
    }
    const keyPath = path.join(gpgHome, `${key_id}.asc`);
    await fs.promises.writeFile(keyPath, raw_key);
    await execFile("gpg", ["--batch", "--import", keyPath], { env: { ...process.env, GNUPGHOME: gpgHome } });
}
console.info("GPG home:", gpgHome);
// 之后所有 git 调用都带上此 env，%G? / %GS 才有密钥可供验证
git.env({ GNUPGHOME: gpgHome });
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
        _signatureStatus: "%G?",
        _signatureSigner: "%GS",
        parents: "%P",
        coAuthors: "%(trailers:key=Co-authored-by)",
    },
    "--numstat": null,
    "-M": null,
});
console.info("Successfully fetched raw history, it has", rawHistory.length, "items.");
const signatureStatuses = {};
for (const { _signatureStatus } of rawHistory) {
    signatureStatuses[_signatureStatus] = (signatureStatuses[_signatureStatus] || 0) + 1;
}
console.info("Signature status distribution:", signatureStatuses);
/**
 * git log --numstat 对合并提交默认不输出任何改动（diff 为 null），因此合并提交的
 * 「冲突解决产物」会被整体漏掉。这里对每个合并提交单独求「与所有父提交都不同」的
 * src/ 文件集合——只有这些文件才是合并提交自身的贡献。
 *
 * 不能用 --cc/-c：实测二者输出等于「相对第一父的 diff」，会把被并入分支的改动
 * 重复计入合并提交（本仓库实测多算 1160 个文件条目，而真正独有的仅 69 个）。
 * 不能用 -m：会为每个父各输出一份，重复更严重。
 */
const numstatFiles = async (from, to) => parseNumstatPaths(await git.raw(["diff", "--numstat", "-M", from, to]));
const mergeChangedFiles = new Map();
let mergeCandidates = 0;
for (const { hash, parents } of rawHistory) {
    const parentList = parents.trim().split(/\s+/).filter(Boolean);
    if (parentList.length < 2) {
        continue;
    }
    // 预筛：相对第一父没有 src/ 改动就直接跳过，避免对全部合并提交都发起 git 调用
    const firstParentSrcFiles = (await numstatFiles(parentList[0], hash)).filter(renamePathValidator);
    if (firstParentSrcFiles.length === 0) {
        continue;
    }
    mergeCandidates++;
    let intersection = new Set(firstParentSrcFiles);
    for (const parent of parentList.slice(1)) {
        const parentFiles = new Set((await numstatFiles(parent, hash)).filter(renamePathValidator));
        intersection = new Set([...intersection].filter((file) => parentFiles.has(file)));
    }
    if (intersection.size > 0) {
        mergeChangedFiles.set(hash, intersection.size);
        console.info(`Merge commit ${hash.slice(0, 8)} has ${intersection.size} file(s) differing from all parents:`, [...intersection]);
    }
}
console.info("Merge commits with src/ first-parent changes:", mergeCandidates, "| with unique resolution changes:", mergeChangedFiles.size);
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
const bots = await yamlModule.readFile("scripts/generateCommitsHistory/bots.yaml");
const history = {};
const parser = ({ username, changedFiles, hash, date, indent }) => {
    if (username.endsWith("[bot]") || bots.includes(username)) {
        debugConsole.info(`${"\t".repeat(indent + 1)}This commit came from a bot (${username}), skip.`);
        return;
    }
    // 主作者与 co-author 可能把同一人解析到同一用户名（别名邮箱都命中 mailmap，
    // 或同名且均未入 mailmap），按 username+hash 去重，同一提交对同一人只计一次
    if (Array.isArray(history[username]) && history[username].some(({ commit }) => commit === hash)) {
        debugConsole.info(`${"\t".repeat(indent + 1)}${username} already attributed for commit ${hash}, skip.`);
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
if (debugLoggingEnabled) {
    startGroup("Raw history parsing:");
}
for (const { hash, _date, authorName, _authorEmail, _signatureKey, _signatureStatus, _signatureSigner, committerName, _committerEmail, diff, coAuthors } of rawHistory) {
    const date = new Date(_date).toISOString();
    const authorEmail = _authorEmail.toLowerCase();
    const committerEmail = removeSplitter(_committerEmail).toLowerCase();
    const signatureKey = removeSplitter(_signatureKey);
    debugConsole.log("Parsing:", { date, hash, authorName, authorEmail, committerName, committerEmail, signatureKey, signatureStatus: _signatureStatus, signatureSigner: _signatureSigner, coAuthors, diff });
    const { changedFiles, touchedSrc } = countCommitChanges(diff, hash, mergeChangedFiles);
    if (!touchedSrc) {
        debugConsole.log("\tNothing in src/ has been changed, skip.");
        continue;
    }
    const fromGithubWebInterface = isFromGithubWebInterface({ signatureStatus: _signatureStatus, signatureSigner: _signatureSigner, committerName, committerEmail });
    debugConsole.log("\tisFromGithubWebInterface:", fromGithubWebInterface);
    const name = fromGithubWebInterface ? authorName : committerName;
    const email = (fromGithubWebInterface ? authorEmail : committerEmail).toLowerCase();
    debugConsole.log("\tname:", name);
    debugConsole.log("\temail:", email);
    // 与 co-author 路径（attribution.js 的 parseCoAuthor）保持一致：U: 后跟 mailmap 规范名，
    // 避免 GitHub 显示名与萌百名不一致时同一用户分裂成 U:规范名 / U:GitHub名 两个条目
    const username = Reflect.has(mailmap, email) ? `U:${mailmap[email]}` : `GH:${name}`;
    debugConsole.log("\tusername:", username);
    parser({ username, changedFiles, hash, date, indent: 1 });
    for (const coAuthorInfo of coAuthors.split(/\r*\n/).filter(({ length }) => length > 0)) {
        debugConsole.log("\tFound co-author:", coAuthorInfo);
        const { name: coAuthorName, email: coAuthorEmail, username: coAuthorUsername } = parseCoAuthor(coAuthorInfo);
        debugConsole.log("\t\tcoAuthorName:", coAuthorName);
        debugConsole.log("\t\tcoAuthorEmail:", coAuthorEmail);
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
