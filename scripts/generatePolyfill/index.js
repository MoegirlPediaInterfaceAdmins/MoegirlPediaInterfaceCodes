import console from "../modules/console.js";
console.info("Initialization done.");
import exec from "../modules/exec.js";
import mkdtmp from "../modules/mkdtmp.js";
import createCommit from "../modules/createCommit.js";
import fs from "fs";
import path from "path";
import jsonModule from "../modules/jsonModule.js";
import yamlModule from "../modules/yamlModule.js";
import { exportVariable } from "@actions/core";
import { octokit, createIssue, isInMasterBranch, isInGithubActions } from "../modules/octokit.js";
import { create as createArtifactClient } from "@actions/artifact";

const unrecognizableFeatures = await jsonModule.readFile("scripts/generatePolyfill/unrecognizableFeatures.json");

const TARGET_CHROMIUM_VERSION = "70.0.3538.0";
const TARGET_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${TARGET_CHROMIUM_VERSION} Safari/537.36`;
const labels = ["ci:generatePolyfill"];

const findPolyfillFiles = async () => (await fs.promises.readdir("src/gadgets/libPolyfill/")).filter((file) => file.startsWith("MediaWiki:Gadget-libPolyfill"));

console.info("Start to delete old polyfill files:");
const tempPath = await mkdtmp();
for (const file of await findPolyfillFiles()) {
    console.info("\tDeleteting", file);
    await fs.promises.rm(path.join("src/gadgets/libPolyfill/", file), {
        force: true,
        recursive: true,
    });
    console.info("\tDeleteting", file, "done.");
}
console.info("Start to compile src/ to temporary bundle file...");
const bundlePath = path.join(tempPath, "bundle.js");
console.log("bundlePath:", bundlePath);
await exec(`npx tsc --project tsconfig.json --outFile ${bundlePath}`);
console.info("\tDone.");
console.info("Start to analyse the temporary bundle file...");
const analysisReport = [...new Set(JSON.parse(await exec(`npx @financial-times/js-features-analyser analyse --file ${path.relative(".", bundlePath)}`)))].sort();
const features = analysisReport.filter((feature) => !unrecognizableFeatures.includes(feature));
console.info("\tDone.");
console.info("\tfeatures", JSON.stringify(features, null, 4));
const newUnrecognizableFeatures = [];
console.info("Start to download polyfill file...");
const url = new URL("https://polyfill.io/v3/polyfill.js");
url.searchParams.set("features", features.join(","));
url.searchParams.set("ua", TARGET_UA);
const dataResponse = await fetch(url, {
    method: "GET",
    headers: {
        "user-agent": TARGET_UA,
    },
});
const data = await dataResponse.text();
const codeFilePath = path.join(tempPath, "polyfillGeneratedCode.js");
await fs.promises.writeFile(codeFilePath, data, {
    encoding: "utf-8",
});
if (isInGithubActions) {
    const artifactClient = createArtifactClient();
    await artifactClient.uploadArtifact("polyfillGeneratedCode.js", [codeFilePath], tempPath);
}
console.info("\tDone.");
console.info("Start to find unrecognizable features...");
let hasUnparsableUnrecognizableFeatures = false;
if (data.includes("These features were not recognised")) {
    const match = data.match(/(?<=\n \* These features were not recognised:\n \* - )[^\n]+?(?=\s*\*\/)/)?.[0]?.split?.(/,-\s*/);
    if (Array.isArray(match)) {
        newUnrecognizableFeatures.push(...match);
    } else {
        hasUnparsableUnrecognizableFeatures = true;
    }
}

if (newUnrecognizableFeatures.length === 0 && !hasUnparsableUnrecognizableFeatures) {
    console.info("\tNone, done.");
} else {
    if (newUnrecognizableFeatures.length > 0) {
        console.info("New unrecognizable features found:", newUnrecognizableFeatures);
        await createIssue(
            "[generatePolyfill] New unrecognizable features detected from polyfill.io",
            `These new unrecognizable features detected from polyfill.io:\n\`\`\` json\n${JSON.stringify(newUnrecognizableFeatures, null, 4)}\n\`\`\``,
            labels,
        );
    }
    if (hasUnparsableUnrecognizableFeatures) {
        console.info("New unparsable unrecognizable features found.");
        if (isInMasterBranch) {
            const workflowRun = await octokit.rest.actions.getWorkflowRun({
                run_id: process.env.GITHUB_RUN_ID,
            });
            await createIssue(
                "[generatePolyfill] New unparsable unrecognizable features detected from polyfill.io",
                `Found new unparsable unrecognizable features detected from polyfill.io, please check it manually: ${workflowRun.data.html_url}`,
                labels,
            );
        }
    }
}
console.info("Start to write polyfill file to gadget-libPolyfill ...");
const flaggableFeatures = features.filter((feature) => !newUnrecognizableFeatures.includes(feature));
await fs.promises.writeFile("src/gadgets/libPolyfill/MediaWiki:Gadget-libPolyfill.js", `${await fs.promises.readFile("scripts/generatePolyfill/template.js")}`.replace("$$$TARGET_CHROMIUM_VERSION$$$", TARGET_CHROMIUM_VERSION).replace("$$$TARGET_UA$$$", TARGET_UA).replace("$$$FLAGGABLE_FEATURES$$$", JSON.stringify(flaggableFeatures, null, 1).replace(/\n */g, " ")).replace("$$$FEATURES$$$", encodeURIComponent(flaggableFeatures.join(","))));
console.info("\tDone.");
console.info("Start to generate .eslintrc.yaml ...");
const eslintrc = await yamlModule.readFile("src/gadgets/libPolyfill/.eslintrc.yaml").catch(() => ({}));
eslintrc.ignorePatterns = await findPolyfillFiles();
console.info("New .eslintrc.yaml:", eslintrc);
await yamlModule.writeFile("src/gadgets/libPolyfill/.eslintrc.yaml", eslintrc);
exportVariable("linguist-generated-generatePolyfill", JSON.stringify(["src/gadgets/libPolyfill/MediaWiki:Gadget-libPolyfill.js"]));
await createCommit("auto(Gadget-libPolyfill): new polyfill generated by generatePolyfill");
console.info("Done.");
