"use strict";
const consoleWithTimestamp = require("../modules/console.js");
const toLocalTimeZoneStrings = require("../modules/toLocalTimeZoneStrings.js");
consoleWithTimestamp.info("Start initialization...");
const exec = require("../modules/exec.js");
/**
 * @param {{ name: string, command: string}[]} actions
 */
module.exports = async (actions) => {
    consoleWithTimestamp.info("Start executing commands...");
    const start = Date.now();
    const results = await Promise.all(actions.map(async ({ name, command }) => {
        try {
            return { name, result: await exec(command) || "(empty string)", end: Date.now() };
        } catch (error) {
            return { name, error };
        }
    }));
    consoleWithTimestamp.info("Commands executed:");
    let exitCode = 0;
    for (const { name, result, end, error } of results) {
        if (typeof end === "number") {
            console.info(`::group::[${toLocalTimeZoneStrings.ISO()}]`, name, "success in", end - start, "ms");
            console.info(result);
        } else {
            console.info(`::group::[${toLocalTimeZoneStrings.ISO()}]`, name, "failed");
            consoleWithTimestamp.error(error);
            exitCode = 1;
        }
        console.info("::endgroup::");
    }
    process.exit(exitCode);
};
