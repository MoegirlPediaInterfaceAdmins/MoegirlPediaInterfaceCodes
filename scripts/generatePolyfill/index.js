"use strict";
const consoleWithTime = require("../modules/console.js");
consoleWithTime.info("Start initialization...");
const exec = require("../modules/exec.js");
const fetch = require("../modules/fetch.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const unflaggableFeatures = require("./unflaggableFeatures.js");

const TARGET_CHROMIUM_VERSION = "70.0.3538.0";
const TARGET_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${TARGET_CHROMIUM_VERSION} Safari/537.36`;

const findPolyfillFiles = async () => (await fs.promises.readdir("src/gadgets/libPolyfill/")).filter((file) => file.startsWith("MediaWiki:Gadget-libPolyfill"));

(async () => {
    try {
        await fs.promises.rm("tmp", {
            recursive: true,
            force: true,
        });
        await fs.promises.mkdir("tmp", {
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
        await exec("npx tsc --project tsconfig.json --outFile tmp/bundle.js");
        consoleWithTime.info("\tDone.");
        consoleWithTime.info("Start to analyse the temporary bundle file...");
        const analysisReport = [...new Set(JSON.parse(await exec("npx @financial-times/js-features-analyser analyse --file tmp/bundle.js")))];
        const features = analysisReport.filter((feature) => !unflaggableFeatures.includes(feature));
        consoleWithTime.info("\tDone.");
        consoleWithTime.info("\tfeatures", JSON.stringify(features, null, 4));
        const newUnflaggableFeatures = [];
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
        consoleWithTime.info("\tDone.");
        consoleWithTime.info("Start to find unrecognized features...");
        let isUnrecognised = false;
        if (data.includes("These features were not recognised")) {
            const match = data.match(/(?<=\n \* These features were not recognised:\n \* - )[^\n]+?(?=\s*\*\/)/)?.[0]?.split?.(/,-\s*/);
            if (Array.isArray(match)) {
                newUnflaggableFeatures.push(...match);
            } else {
                isUnrecognised = true;
            }
        }
        const { Octokit } = require("@octokit/rest");
        const { retry } = require("@octokit/plugin-retry");
        const octokit = new (Octokit.plugin(retry))({});
        octokit.hook.wrap("request", (request, options) => request({
            owner: process.env.GITHUB_REPOSITORY_OWNER,
            repo: process.env.GITHUB_REPOSITORY.split("/")[1],
            ...options,
        }));
        if (newUnflaggableFeatures.length === 0 && !isUnrecognised) {
            consoleWithTime.info("\tNone, done.");
        } else {
            if (newUnflaggableFeatures.length > 0) {
                consoleWithTime.info("New unflaggable features found:", newUnflaggableFeatures);
                if (process.env.GITHUB_REF === "refs/heads/master") {
                    await octokit.rest.issues.create({
                        title: "New unflaggable features detected from polyfill.io",
                        body: `These new unflaggable features detected from polyfill.io:\n\`\`\` json\n${JSON.stringify(newUnflaggableFeatures, null, 4)}\n\`\`\``,
                    });
                }
            }
            if (isUnrecognised) {
                const codePath = path.join(process.env.RUNNER_TEMP, crypto.randomUUID());
                await fs.promises.mkdir(codePath, {
                    recursive: true,
                });
                const codeFilePath = path.join(codePath, "polyfillGeneratedCode.js");
                await fs.promises.writeFile(codeFilePath, data, {
                    encoding: "utf-8",
                });
                const artifactClient = require("@actions/artifact").create();
                await artifactClient.uploadArtifact("polyfillGeneratedCode.js", [codeFilePath], codePath);
                consoleWithTime.info("New unrecognised unflaggable features found, uploaded as artifact.");
                if (process.env.GITHUB_REF === "refs/heads/master") {
                    const workflowRun = await octokit.rest.actions.getWorkflowRun({
                        run_id: process.env.GITHUB_RUN_ID,
                    });
                    await octokit.rest.issues.create({
                        title: "New unrecognised unflaggable features detected from polyfill.io",
                        body: `Found new unrecognised unflaggable features detected from polyfill.io, please check it manually: ${workflowRun.data.html_url}`,
                    });
                }
            }
        }
        consoleWithTime.info("Start to write polyfill file to gadget-libPolyfill ...");
        const flaggableFeatures = features.filter((feature) => !newUnflaggableFeatures.includes(feature));
        const code = [
            "/**",
            " * Generated by scripts/generatePolyfill.js",
            " * Options:",
            ` *     targetChromiumVersion: "${TARGET_CHROMIUM_VERSION}"`,
            ` *     targetUA: "${TARGET_UA}"`,
            " *     unflaggableFeatures: \"scripts/generatePolyfill/unflaggableFeatures.js\"",
            ` *     flaggableFeatures: ${JSON.stringify(flaggableFeatures, null, 1).replace(/\n */g, " ")}`,
            " */",
            `${await fs.promises.readFile("scripts/generatePolyfill/template.js")}`.replace("$$$UA$$$", encodeURIComponent(TARGET_UA)).replace("$$$FEATURES$$$", encodeURIComponent(flaggableFeatures.join(","))),
        ];
        await fs.promises.writeFile("src/gadgets/libPolyfill/MediaWiki:Gadget-libPolyfill.js", code.join("\n"));
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
