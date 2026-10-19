import { exportVariable } from "@actions/core";
import { createHash } from "node:crypto";
import path from "node:path";
import semver from "semver";
import assertResponseOk from "../modules/assertResponseOk.js";
import console, { dump } from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import fetchNPMPackageInfo from "../modules/fetchNPMPackageInfo.js";
import { buildGeneratedFileHeader, writeGadgetArtifact } from "../modules/gadgetArtifact.js";
import modulePath from "../modules/modulePath.js";
import { createIssue, octokit } from "../modules/octokit.js";
import yamlModule from "../modules/yamlModule.js";
import parseSha256Sums from "./parseSha256Sums.js";
import { buildJsDelivrUrl, isValidRepoFormat, transformFetchedCode } from "./targetHelpers.js";
console.info("Initialization done.");

const labels = ["ci:prefetch"];

const prefetchTargetsPath = "scripts/prefetch/targets.yaml";
/**
 * @typedef { { gadget: { name: string, fileName: string }, appendCode?: string, removeCode?: string[] } } prefetchTargetBase
 */
/**
 * @typedef { prefetchTargetBase & { type: "npm", moduleName: string, distFilePath: string, version?: string, ignoreSemverDiff?: semver.ReleaseType[] } } prefetchTargetFromNPM
 */
/**
 * @typedef { prefetchTargetBase & { type: "custom", url: string } } prefetchTargetFromCustom
 */
/**
 * @typedef { prefetchTargetBase & { type: "github-release", repo: string, asset: string } } prefetchTargetFromGitHubRelease
 */
/**
 * @type {(prefetchTargetFromNPM | prefetchTargetFromCustom | prefetchTargetFromGitHubRelease)[]}
 */
const prefetchTargets = await yamlModule.readFile(prefetchTargetsPath);
dump("prefetchTargets:", prefetchTargets);
const fileList = [];
for (const prefetchTarget of prefetchTargets) {
    console.info("target:", prefetchTarget);
    const { type, moduleName, gadget: { name, fileName }, distFilePath, appendCode, removeCode = [], ignoreSemverDiff, url, repo, asset } = prefetchTarget;
    let { version } = prefetchTarget;
    const file = path.join("src/gadgets", name, fileName);
    fileList.push(file);
    console.info(`[${name}]`, "Start to fetch...");
    const data = await (async () => {
        if (type === "npm") {
            const url = buildJsDelivrUrl(moduleName, version, distFilePath);
            console.info(`[${name}]`, `url: ${url}`);
            prefetchTarget.jsdelivrUrl = url;
            const response = await fetch(url, {
                method: "GET",
            });
            await assertResponseOk(response, `[${name}] Failed to fetch file from jsDelivr`);
            return await response.text();
        }
        if (type === "custom") {
            console.info(`[${name}]`, `url: ${url}`);
            const response = await fetch(url, {
                method: "GET",
            });
            await assertResponseOk(response, `[${name}] Failed to fetch file from custom URL`);
            return await response.text();
        }
        if (type === "github-release") {
            // octokit 的 request hook 会在参数缺失时把 URL 中的 {owner}/{repo} 占位符替换为本仓库
            // （见 scripts/modules/octokit.js），格式错误的 repo 会静默查询错误仓库并报出难排查的
            // 404，因此先校验「恰好两段非空、以单斜杠分隔」再调用；getLatestRelease 只返回最新的
            // 正式 release，草稿与 prerelease 天然被排除
            if (!isValidRepoFormat(repo)) {
                throw new Error(`[${name}] Invalid \`repo\` value: ${JSON.stringify(repo)}, expected "owner/repository"`);
            }
            const [owner, repository] = repo.split("/");
            const { data: release } = await octokit.rest.repos.getLatestRelease({ owner, repo: repository });
            console.info(`[${name}]`, "release:", release.tag_name);
            const releaseAsset = release.assets.find(({ name }) => name === asset);
            if (!releaseAsset) {
                throw new Error(`[${name}] Asset \`${asset}\` not found in release ${release.tag_name} of ${repo}`, { cause: release.assets.map(({ name }) => name) });
            }
            const sumsAsset = release.assets.find(({ name }) => name === "sha256sums.txt");
            if (!sumsAsset) {
                throw new Error(`[${name}] Asset \`sha256sums.txt\` not found in release ${release.tag_name} of ${repo}`);
            }
            prefetchTarget.releaseTag = release.tag_name;
            prefetchTarget.assetUrl = releaseAsset.browser_download_url;
            console.info(`[${name}]`, `url: ${prefetchTarget.assetUrl}`);
            const [assetResponse, sumsResponse] = await Promise.all([
                fetch(prefetchTarget.assetUrl, {
                    method: "GET",
                }),
                fetch(sumsAsset.browser_download_url, {
                    method: "GET",
                }),
            ]);
            for (const response of [assetResponse, sumsResponse]) {
                await assertResponseOk(response, `[${name}] Failed to fetch asset from GitHub release`);
            }
            // 产物跨仓库传输，按 release 自带的 sha256sums.txt 校验完整性，防止损坏或被中途替换的内容落盘；
            // 对原始字节取哈希后再解码为文本，避免文本解码往返造成哈希不一致
            const buffer = Buffer.from(await assetResponse.arrayBuffer());
            const sha256 = createHash("sha256").update(buffer).digest("hex");
            const expectedSha256 = parseSha256Sums(await sumsResponse.text(), asset);
            if (!expectedSha256) {
                throw new Error(`[${name}] No sha256 record for \`${asset}\` in sha256sums.txt of release ${release.tag_name}`);
            }
            if (sha256 !== expectedSha256) {
                throw new Error(`[${name}] sha256 mismatch for \`${asset}\` of release ${release.tag_name}: expected \`${expectedSha256}\`, got \`${sha256}\``);
            }
            console.info(`[${name}]`, "sha256 verified:", sha256);
            return buffer.toString("utf-8");
        }
    })();
    if (data.startsWith("Couldn't find the requested file")) {
        throw new Error(`[${name}] Couldn't find the requested file.`);
    }
    console.info(`[${name}]`, "Successfully fetched.");
    const code = buildGeneratedFileHeader(modulePath(import.meta), prefetchTarget);
    code.push(transformFetchedCode(data, removeCode));
    if (typeof appendCode === "string") {
        code.push(appendCode);
    }
    code.push("");
    const changed = await writeGadgetArtifact(file, code.join("\n"));
    if (!changed) {
        console.info(`[${name}]`, "Nothing changed, continue.");
        continue;
    }
    console.info(`[${name}]`, "wrote the code file and .eslint-exemptions.yaml successfully.");
    if (type === "npm") {
        const packageInfo = await fetchNPMPackageInfo(moduleName);
        if (Object.hasOwn(packageInfo["dist-tags"], version)) {
            version = packageInfo["dist-tags"][version];
        }
        const distVersions = Object.keys(packageInfo.versions);
        console.info(`[${name}]`, "distVersions:", distVersions);
        const targetVersion = semver.maxSatisfying(distVersions, version || "*");
        console.info(`[${name}]`, "targetVersion:", targetVersion);
        await createCommit(`auto(Gadget-${name}): bump ${moduleName} to ${targetVersion} by prefetch`);
        if (packageInfo["dist-tags"].latest !== targetVersion) {
            const releaseType = semver.diff(packageInfo["dist-tags"].latest, targetVersion);
            if (!Array.isArray(ignoreSemverDiff) || !ignoreSemverDiff.includes(releaseType)) {
                await createIssue(
                    `[prefetch] Found new ${releaseType} verion of ${moduleName}`,
                    `Found new ${releaseType} verion of ${moduleName} that is higher than \`${targetVersion}\`, while [\`${prefetchTargetsPath}\`](${prefetchTargetsPath}) configured as \`${moduleName}@${version || "*"}\`, please consider to upgrade it: ${new URL(path.posix.join("package", name), "https://www.npmjs.com/")}`,
                    labels,
                    `New ${releaseType} verion: \`${moduleName}@${packageInfo["dist-tags"].latest}\``,
                );
            }
        }
    }
    if (type === "github-release") {
        // Release 由管理员手动发布，语义上总是想同步的，因此直接跟随最新版，
        // 不需要 npm 类型那套 dist-tags 比对与越版开 issue 的机制
        await createCommit(`auto(Gadget-${name}): bump ${repo.split("/")[1]} to ${prefetchTarget.releaseTag} by prefetch`);
    }
}
exportVariable("linguist-generated-prefetch", JSON.stringify(fileList));
console.info("Done.");
