"use strict";
const consoleWithTimestamp = require("../modules/console.js");
const toLocalTimeZoneStrings = require("../modules/toLocalTimeZoneStrings.js");
consoleWithTimestamp.info("Start initialization...");
const exec = require("../modules/exec.js");
const actions = [
    {
        name: "Auto browserify generator",
        command: "node scripts/browserify/index.js",
    },
    {
        name: "Conventional Commits scopes generator",
        command: "node scripts/conventionalCommitsScopesGenerator/index.js",
    },
    {
        name: "Auto prefetch",
        command: "node scripts/prefetch/index.js",
    },
    {
        name: "Gadgets-definition Generator",
        command: "node scripts/gadgetsDefinitionGenerator/index.js",
    },
    {
        name: "Gadget-polyfill generator",
        command: "node scripts/generatePolyfill/index.js",
    },
];
consoleWithTimestamp.info("Start executing commands...");
Promise.all(actions.map(async ({ name, command }) => {
    try {
        return { name, result: await exec(command) || "(empty string)" };
    } catch (error) {
        return { name, error };
    }
})).then((results) => {
    consoleWithTimestamp.info("Commands executed:");
    let exitCode = 0;
    for (const { name, result, error } of results) {
        console.info(`::group::[${toLocalTimeZoneStrings.ISO()}]`, name);
        if (result) {
            consoleWithTimestamp.info(result);
        } else {
            consoleWithTimestamp.error(error);
            exitCode = 1;
        }
        console.info("::endgroup::");
    }
    process.exit(exitCode);
});
