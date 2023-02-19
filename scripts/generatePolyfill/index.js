"use strict";
const consoleWithTime = require("../modules/console.js");
consoleWithTime.info("Start initialization...");
const exec = require("../modules/exec.js");
const fetch = require("../modules/fetch.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const unrecognizableFeatures = require("./unrecognizableFeatures.json");
const { Octokit } = require("@octokit/rest");
const { retry } = require("@octokit/plugin-retry");
const octokit = new (Octokit.plugin(retry))({
    authStrategy: require("@octokit/auth-action").createActionAuth(),
});
const octokitBaseOptions = {
    owner: process.env.GITHUB_REPOSITORY_OWNER,
    repo: process.env.GITHUB_REPOSITORY.split("/")[1],
};
octokit.hook.wrap("request", (request, options) => request({
    ...octokitBaseOptions,
    ...options,
}));

const TARGET_CHROMIUM_VERSION = "70.0.3538.0";
const TARGET_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${TARGET_CHROMIUM_VERSION} Safari/537.36`;

const findPolyfillFiles = async () => (await fs.promises.readdir("src/gadgets/libPolyfill/")).filter((file) => file.startsWith("MediaWiki:Gadget-libPolyfill"));

(async () => {
    try {
        consoleWithTime.log("process.env.GITHUB_REF:", process.env.GITHUB_REF);
        consoleWithTime.log("process.env.GITHUB_RUN_ID:", process.env.GITHUB_RUN_ID);
        consoleWithTime.log("octokitBaseOptions:", octokitBaseOptions);
        const tempPath = path.join(process.env.RUNNER_TEMP, crypto.randomUUID());
        consoleWithTime.log("tempPath:", tempPath);
        await fs.promises.mkdir(tempPath, {
            recursive: true,
        });
        consoleWithTime.info("Start to delete old polyfill files:");
        for (const file of await findPolyfillFiles()) {
            consoleWithTime.info("\tDeleteting", file);
            await fs.promises.rm(path.join("src/gadgets/libPolyfill/", file), {
                force: true,
                recursive: true,
            });
            consoleWithTime.info("\tDeleteting", file, "done.");
        }
        consoleWithTime.info("Start to compile src/ to temporary bundle file...");
        const bundlePath = path.join(tempPath, "bundle.js");
        consoleWithTime.log("bundlePath:", bundlePath);
        await exec(`npx tsc --project tsconfig.json --outFile ${bundlePath}`);
        consoleWithTime.info("\tDone.");
        consoleWithTime.info("Start to analyse the temporary bundle file...");
        const analysisReport = [...new Set(JSON.parse(await exec(`npx @financial-times/js-features-analyser analyse --file ${path.relative(".", bundlePath)}`)))];
        const features = analysisReport.filter((feature) => !unrecognizableFeatures.includes(feature));
        consoleWithTime.info("\tDone.");
        consoleWithTime.info("\tfeatures", JSON.stringify(features, null, 4));
        const newUnrecognizableFeatures = [];
        consoleWithTime.info("Start to download polyfill file...");
        const url = new URL("https://polyfill.io/v3/polyfill.js");
        url.searchParams.set("features", features.join(","));
        url.searchParams.set("ua", TARGET_UA);
        const data = await fetch.text(url, {
            method: "GET",
            headers: {
                "user-agent": TARGET_UA,
            },
        });
        const codeFilePath = path.join(tempPath, "polyfillGeneratedCode.js");
        await fs.promises.writeFile(codeFilePath, data, {
            encoding: "utf-8",
        });
        const artifactClient = require("@actions/artifact").create();
        await artifactClient.uploadArtifact("polyfillGeneratedCode.js", [codeFilePath], tempPath);
        consoleWithTime.info("\tDone.");
        consoleWithTime.info("Start to find unrecognizable features...");
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
            consoleWithTime.info("\tNone, done.");
        } else {
            if (newUnrecognizableFeatures.length > 0) {
                consoleWithTime.info("New unrecognizable features found:", newUnrecognizableFeatures);
                if (process.env.GITHUB_REF === "refs/heads/master") {
                    await octokit.rest.issues.create({
                        title: "New unrecognizable features detected from polyfill.io",
                        body: `These new unrecognizable features detected from polyfill.io:\n\`\`\` json\n${JSON.stringify(newUnrecognizableFeatures, null, 4)}\n\`\`\``,
                    });
                }
            }
            if (hasUnparsableUnrecognizableFeatures) {
                consoleWithTime.info("New unparsable unrecognizable features found.");
                if (process.env.GITHUB_REF === "refs/heads/master") {
                    const workflowRun = await octokit.rest.actions.getWorkflowRun({
                        run_id: process.env.GITHUB_RUN_ID,
                    });
                    await octokit.rest.issues.create({
                        title: "New unparsable unrecognizable features detected from polyfill.io",
                        body: `Found new unparsable unrecognizable features detected from polyfill.io, please check it manually: ${workflowRun.data.html_url}`,
                    });
                }
            }
        }
        consoleWithTime.info("Start to write polyfill file to gadget-libPolyfill ...");
        const flaggableFeatures = features.filter((feature) => !newUnrecognizableFeatures.includes(feature));
        await fs.promises.writeFile("src/gadgets/libPolyfill/MediaWiki:Gadget-libPolyfill.js", `${await fs.promises.readFile("scripts/generatePolyfill/template.js")}`.replace("$$$TARGET_CHROMIUM_VERSION$$$", TARGET_CHROMIUM_VERSION).replace("$$$TARGET_UA$$$", TARGET_UA).replace("$$$FLAGGABLE_FEATURES$$$", JSON.stringify(flaggableFeatures, null, 1).replace(/\n */g, " ")).replace("$$$FEATURES$$$", encodeURIComponent(flaggableFeatures.join(","))));
        consoleWithTime.info("\tDone.");
        consoleWithTime.info("Start to generate .eslintrc ...");
        const eslintrc = JSON.parse(await fs.promises.readFile("src/gadgets/libPolyfill/.eslintrc", {
            encoding: "utf-8",
        }));
        eslintrc.ignorePatterns = await findPolyfillFiles();
        consoleWithTime.info("New .eslintrc:", eslintrc);
        await fs.promises.writeFile("src/gadgets/libPolyfill/.eslintrc", JSON.stringify(eslintrc, null, 4), {
            encoding: "utf-8",
        });
        process.exit(0);
    } catch (e) {
        consoleWithTime.error(e);
        process.exit(1);
    }
})();
