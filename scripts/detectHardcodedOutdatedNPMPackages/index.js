import console, { dump } from "../modules/console.js";
console.info("Initialization done.");
import readDir from "../modules/readDir.js";
import yamlModule from "../modules/yamlModule.js";
import fs from "node:fs";
import path from "node:path";
import fetchNPMPackageInfo from "../modules/fetchNPMPackageInfo.js";
import semver from "semver";
import { createIssue, octokitBaseOptions } from "../modules/octokit.js";
import extractHardcodedPackages from "./extractHardcodedPackages.js";
const { owner, repo } = octokitBaseOptions;

const labels = ["ci:detectHardcodedOutdatedNPMPackages"];

const { whitelist } = await yamlModule.readFile("scripts/detectHardcodedOutdatedNPMPackages/whitelist.yaml");
console.info("whitelist:", whitelist);
const scripts = (await readDir("src")).filter((n) => n.endsWith(".js"));
dump("scripts:", JSON.stringify(scripts, null, 4));
const failedPackages = [];
for (const src of scripts) {
    // await libCachedCode.injectCachedCode("https://testingcf.jsdelivr.net/npm/wikiplus-core@4.0.11/dist/Main.js", "script");
    // 白名单键与 issue 链接统一用仓库相对的正斜杠路径，Windows 本地与 Linux CI 行为一致
    const srcPath = src.replaceAll("\\", "/");
    const content = await fs.promises.readFile(src, { encoding: "utf-8" });
    const packages = extractHardcodedPackages(content);
    if (packages === null) {
        continue;
    }
    console.info("Found", packages.length, "package(s) in", path.relative("src", src), ":", packages);
    const outdatedPackages = [];
    for (const match of packages) {
        console.info("Analysing the package", match, "...");
        if (Reflect.has(whitelist, srcPath) && Array.isArray(whitelist[srcPath]) && whitelist[srcPath].includes(match)) {
            console.info("The package is in the whitelist, skip.");
            continue;
        }
        // 用最后一个 @ 切分：作用域包名本身以 @ 开头（`@scope/pkg@1.0.0`）
        const atIndex = match.lastIndexOf("@");
        const pkg = match.slice(0, atIndex);
        const version = match.slice(atIndex + 1);
        let packageInfo;
        try {
            packageInfo = await fetchNPMPackageInfo(pkg);
        } catch (error) {
            // registry 单点故障不应中断整轮扫描：记录后继续检查其余包，末尾统一以非零退出码收尾
            console.error("Failed to fetch package info for", pkg, ", skip it:", error);
            failedPackages.push(match);
            continue;
        }
        /**
         * @type { string }
         */
        const latestVersion = packageInfo["dist-tags"].latest;
        console.info(pkg, "latestVersion:", latestVersion);
        // 抽取规则允许 @3、@3.2 这类不完整版本（semver.compare 对其抛 Invalid Version，
        // 会让整个扫描终止），coerce 补全为 3.0.0 / 3.2.0 后再比较；完整版本（含预发布）
        // 必须原样参与比较——coerce 会剥掉 -beta 标识，5.0.0-beta 会被当成 5.0.0 而漏报；
        // 报告里仍保留原始写法
        const pinnedVersion = semver.valid(version) ?? semver.coerce(version);
        if (semver.compare(latestVersion, pinnedVersion) !== 1) {
            console.info("latestVersion is not greater than local version, continue.");
            continue;
        }
        console.info("latestVersion is greater than local version.");
        outdatedPackages.push({ pkg, latestVersion, version });
    }
    if (outdatedPackages.length === 0) {
        console.info("No outdated package, continue.");
        continue;
    }
    console.info("Outdated package:", outdatedPackages);
    await createIssue(
        "Found harcoded-outdated NPM packages.",
        `The harcoded-outdated NPM packages are found in [\`${srcPath}\`](https://github.com/${owner}/${repo}/blob/master/${srcPath}).`,
        labels,
        `The harcoded-outdated NPM packages:\n${outdatedPackages.map(({ pkg, latestVersion, version }) => `- [${pkg}](https://www.npmjs.com/package/${pkg}): ${version} -> ${latestVersion}`).join("\n")}`,
    );
}
if (failedPackages.length > 0) {
    console.error(`Failed to analyse ${failedPackages.length} package(s):`, failedPackages);
    process.exitCode = 1;
}
console.info("Done.");
