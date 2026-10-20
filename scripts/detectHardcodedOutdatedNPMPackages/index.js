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
for (const src of scripts) {
    // await libCachedCode.injectCachedCode("https://npm.elemecdn.com/wikiplus-core@4.0.11/dist/Main.js", "script");
    const content = await fs.promises.readFile(src, { encoding: "utf-8" });
    const packages = extractHardcodedPackages(content);
    if (packages === null) {
        continue;
    }
    console.info("Found", packages.length, "package(s) in", path.relative("src", src), ":", packages);
    const outdatedPackages = [];
    for (const match of packages) {
        console.info("Analysing the package", match, "...");
        if (Reflect.has(whitelist, src) && Array.isArray(whitelist[src]) && whitelist[src].includes(match)) {
            console.info("The package is in the whitelist, skip.");
            continue;
        }
        const [pkg, version] = match.split("@");
        const packageInfo = await fetchNPMPackageInfo(pkg);
        /**
         * @type { string }
         */
        const latestVersion = packageInfo["dist-tags"].latest;
        console.info(pkg, "latestVersion:", latestVersion);
        // 抽取正则允许 @3、@3.2 这类不完整版本（semver.compare 对其抛 Invalid Version，
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
        `The harcoded-outdated NPM packages are found in [\`${src}\`](https://github.com/${owner}/${repo}/blob/master/${src}).`,
        labels,
        `The harcoded-outdated NPM packages:\n${outdatedPackages.map(({ pkg, latestVersion, version }) => `- [${pkg}](https://www.npmjs.com/package/${pkg}): ${version} -> ${latestVersion}`).join("\n")}`,
    );
}
console.info("Done.");
