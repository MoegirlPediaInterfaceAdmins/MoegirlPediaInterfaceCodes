const githubWebInterfaceCommitter = {
    committerName: "GitHub",
    committerEmail: "noreply@github.com",
};

import artifactClient from "@actions/artifact";
import { endGroup, exportVariable, startGroup } from "@actions/core";
import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import git from "../modules/git.js";
import jsonModule from "../modules/jsonModule.js";
import mailmap from "../modules/mailmap.js";
import mkdtmp from "../modules/mkdtmp.js";
import { debugConsole, debugLoggingEnabled, isInGithubActions, isInMasterBranch, isInMoegirlPediaInterfaceCodes, octokit } from "../modules/octokit.js";
import yamlModule from "../modules/yamlModule.js";

/**
 * @param { string } file file path like "src/@types/libBottomRightCorner.d.ts"
 * @returns { boolean }
 */
const pathValidator = (file) => file.startsWith("src/") && ![
    "src/@types/",
].some((blacklist) => file.startsWith(blacklist));
/**
 * 处理 --numstat -M 的两种重命名写法：`{a => b}`（同目录/部分相同）与 `a => b`（完全不同）。
 * 重命名两侧只要任一侧位于 src/ 就算改动，否则跨目录重命名（如 scripts/x => src/x）会被漏计。
 * @param { string } raw 形如 "src/gadgets/{A.js => B.js}" 或 "scripts/a.js => src/a.js"
 * @returns { boolean }
 */
const renamePathValidator = (raw) => {
    if (pathValidator(raw)) {
        return true;
    }
    if (!raw.includes("=>")) {
        return false;
    }
    const braceMatch = /^(.*?)\{(.*?) => (.*?)\}(.*)$/.exec(raw);
    if (braceMatch) {
        return pathValidator(braceMatch[1] + braceMatch[2] + braceMatch[4]) || pathValidator(braceMatch[1] + braceMatch[3] + braceMatch[4]);
    }
    const [from, to] = raw.split(" => ");
    return pathValidator(from.trim()) || pathValidator(to.trim());
};
const execFile = promisify(execFileCallback);

exportVariable("linguist-generated-generateCommitsHistory", JSON.stringify(["src/global/zh/GHIAHistory.json"]));

if (!isInMoegirlPediaInterfaceCodes) {
    console.info("Not running in MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes, exit.");
    process.exit(0);
}
if (!isInMasterBranch) {
    console.info("Not running in master branch, exit.");
    process.exit(0);
}
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
const numstatFiles = async (from, to) => (await git.raw(["diff", "--numstat", "-M", from, to])).split("\n").filter((line) => line.trim().length > 0).map((line) => line.split("\t").pop());
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
for (const { hash, _date, authorName, _authorEmail, _signatureKey, _signatureStatus, _signatureSigner, committerName, _committerEmail, diff, coAuthors } of rawHistory) {
    const date = new Date(_date).toISOString();
    const authorEmail = _authorEmail.toLowerCase();
    const committerEmail = removeSplitter(_committerEmail).toLowerCase();
    const signatureKey = removeSplitter(_signatureKey);
    debugConsole.log("Parsing:", { date, hash, authorName, authorEmail, committerName, committerEmail, signatureKey, signatureStatus: _signatureStatus, signatureSigner: _signatureSigner, coAuthors, diff });
    let changedFiles = 0;
    let touchedSrc = false;
    if (Array.isArray(diff?.files)) {
        debugConsole.log("\tdiff.files:", diff.files);
        // 计数与入选必须解耦：changedFiles 会被 Gadget-queryContributions 直接求和成
        // GHIA 编辑数，须保持修复前口径——纯重命名（`0 0 路径`）不计权，否则重命名
        // 密集提交会显著膨胀该统计；但入选判定用 touchedSrc（含纯重命名），否则纯
        // 重命名提交会重新被整体丢弃（#1065 实测漏掉 6 个此类提交），以
        // changedFiles: 0 入库即可两全。
        // binary 条目没有行数（changes 为 undefined），且 simple-git 的 numstat 解析
        // 把 before/after 恒置为 0，无法沿用修复前的 before !== after 判定；而会
        // 出现在 diff 输出里的 binary 文件必然发生过变化，故直接计权。
        for (const { file, changes, binary } of diff.files) {
            if (!renamePathValidator(file)) {
                continue;
            }
            touchedSrc = true;
            if (binary || changes > 0) {
                changedFiles++;
            }
        }
        debugConsole.log("\tchangedFiles:", changedFiles, "| touchedSrc:", touchedSrc);
    } else if (mergeChangedFiles.has(hash)) {
        // 合并提交：仅计入「与所有父提交都不同」的冲突解决产物
        touchedSrc = true;
        changedFiles = mergeChangedFiles.get(hash);
        debugConsole.log("\tchangedFiles (merge, differing from all parents):", changedFiles);
    } else {
        debugConsole.log("\tNothing changed by this commit.");
    }
    if (!touchedSrc) {
        debugConsole.log("\tNothing in src/ has been changed, skip.");
        continue;
    }
    // %G? 的 G/U/X/Y/R 均为「签名密码学有效」，其中 Y 表示签名有效但密钥现已过期——
    // 必须接受，否则会丢掉旧密钥（2024-01-16 前冻结）签名的全部历史提交；
    // N/E/B 分别表示无签名、无法验证（密钥缺失）、签名损坏，均不可信。
    const isFromGithubWebInterface = ["G", "U", "X", "Y", "R"].includes(_signatureStatus) && _signatureSigner.endsWith(`<${githubWebInterfaceCommitter.committerEmail}>`) && committerName === githubWebInterfaceCommitter.committerName && committerEmail === githubWebInterfaceCommitter.committerEmail;
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
