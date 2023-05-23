import console from "../modules/console.js";
console.info("Initialization done.");
import readDir from "../modules/readDir.js";
import yamlModule from "../modules/yamlModule.js";
import fs from "fs";
import path from "path";
import fetchNPMPackageInfo from "../modules/fetchNPMPackageInfo.js";
import semver from "semver";
import { createIssue } from "../modules/octokit.js";
import { startGroup, endGroup } from "@actions/core";

const labels = ["ci:detectHardcodedOutdatedNPMPackages"];

const { whitelist } = await yamlModule.readFile("scripts/detectHardcodedOutdatedNPMPackages/whitelist.yaml");
console.info("whitelist:", whitelist);
const scripts = (await readDir("src")).filter((n) => n.endsWith(".js"));
startGroup("scripts:");
console.info(JSON.stringify(scripts, null, 4));
endGroup();
for (const src of scripts) {
    // await libCachedCode.injectCachedCode("https://npm.elemecdn.com/wikiplus-core@4.0.11/dist/Main.js", "script");
    const content = await fs.promises.readFile(src, { encoding: "utf-8" });
    const matches = content.match(/(?<=npm\.elemecdn\.com\/)[^@/]+@v?\d+(?:\.\d+)*[^/]*/g);
    if (!Array.isArray(matches)) {
        continue;
    }
    const packages = [...new Set(matches)];
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
        const latestVersion = packageInfo["dist-tags"].latest;
        console.info(pkg, "latestVersion:", latestVersion);
        if (semver.compare(latestVersion, version) !== 1) {
            console.info("latestVersion is not greater than local version, continue.");
            continue;
        }
        console.info("latestVersion is greater than local version.");
        outdatedPackages.push({ latestVersion, version });
    }
    if (outdatedPackages.length === 0) {
        console.info("No outdated package, continue.");
        continue;
    }
    console.info("Outdated package:", outdatedPackages);
    await createIssue(
        "Found harcoded-outdated NPM packages.",
        `The harcoded-outdated NPM packages are found in [\`${src}\`](${src}).`,
        labels,
        `The harcoded-outdated NPM packages:\n\`\`\`json\n${JSON.stringify(outdatedPackages, null, 4)}\n\``,
    );
}
console.info("Done.");
