import { endGroup, exportVariable, startGroup } from "@actions/core";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import semver from "semver";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import fetchNPMPackageInfo from "../modules/fetchNPMPackageInfo.js";
import modulePath from "../modules/modulePath.js";
import { createIssue, octokit } from "../modules/octokit.js";
import yamlModule from "../modules/yamlModule.js";
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
startGroup("prefetchTargets:");
console.info(prefetchTargets);
endGroup();
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
            const packageName = `${moduleName}${typeof version === "string" ? `@${version}` : ""}`;
            const filePath = path.posix.join("npm", packageName, distFilePath);
            const url = new URL(filePath, "https://cdn.jsdelivr.net/");
            console.info(`[${name}]`, `url: ${url}`);
            prefetchTarget.jsdelivrUrl = url;
            const response = await fetch(url, {
                method: "GET",
            });
            if (!response.ok) {
                throw new Error(`[${name}] Failed to fetch file from jsDelivr: ${response.status} ${response.statusText}`, { cause: await response.text() });
            }
            return await response.text();
        }
        if (type === "custom") {
            console.info(`[${name}]`, `url: ${url}`);
            const response = await fetch(url, {
                method: "GET",
            });
            if (!response.ok) {
                throw new Error(`[${name}] Failed to fetch file from custom URL: ${response.status} ${response.statusText}`, { cause: await response.text() });
            }
            return await response.text();
        }
        if (type === "github-release") {
            // getLatestRelease 只返回最新的正式 release，草稿与 prerelease 天然被排除；
            // owner/repo 必须显式传入，否则 URL 中的占位符会被 octokit 模块改写为本仓库
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
                if (!response.ok) {
                    throw new Error(`[${name}] Failed to fetch asset from GitHub release: ${response.status} ${response.statusText}`, { cause: await response.text() });
                }
            }
            // 产物跨仓库传输，按 release 自带的 sha256sums.txt 校验完整性，防止损坏或被中途替换的内容落盘；
            // 对原始字节取哈希后再解码为文本，避免文本解码往返造成哈希不一致
            const buffer = Buffer.from(await assetResponse.arrayBuffer());
            const sha256 = createHash("sha256").update(buffer).digest("hex");
            const expectedSha256 = (await sumsResponse.text()).trim().split("\n").map((line) => line.trim().split(/\s+/)).find(([, fileName]) => fileName === asset)?.[0];
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
    const code = [
        "/**",
        ` * Generated by ${modulePath(import.meta)}`,
        " * Options:",
    ];
    for (const [k, v] of Object.entries(prefetchTarget)) {
        code.push(` *     ${k}: ${JSON.stringify(v, null, 1).replace(/\n */g, " ")}`);
    }
    code.push(" */", removeCode.reduce((p, c) => p.replaceAll(c, ""), data.replace(/(?<=\n)\/\/\/ *<reference [^\n]+\n?/ig, "")));
    if (typeof appendCode === "string") {
        code.push(appendCode);
    }
    code.push("");
    if (await fs.promises.readFile(file, { encoding: "utf-8" }).catch(() => null) === code.join("\n")) {
        console.info(`[${name}]`, "Nothing changed, continue.");
        continue;
    }
    const folder = path.dirname(file);
    const filename = path.basename(file);
    const eslintrcName = path.join(folder, ".eslintrc.yaml");
    await fs.promises.mkdir(folder, {
        recursive: true,
    });
    await fs.promises.writeFile(file, code.join("\n"));
    if (path.extname(file) === ".js") {
        const eslintrc = await yamlModule.readFile(eslintrcName).catch(() => ({}));
        if (!Array.isArray(eslintrc.ignorePatterns)) {
            eslintrc.ignorePatterns = [];
        }
        if (!eslintrc.ignorePatterns.includes(filename)) {
            eslintrc.ignorePatterns.push(filename);
            await yamlModule.writeFile(eslintrcName, eslintrc);
        }
    }
    console.info(`[${name}]`, "wrote the code file and eslintrc successfully.");
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
