"use strict";
const consoleWithTimestamp = require("../modules/console.js");
const toLocalTimeZoneStrings = require("../modules/toLocalTimeZoneStrings.js");
consoleWithTimestamp.info("Start initialization...");
const exec = require("../modules/exec.js");
const actions = [
    {
        name: "Check eslint environment",
        command: "npx eslint --env-info && ls -lhA .cache",
    },
    {
        name: "Run eslint",
        command: 'npx eslint --exit-on-fatal-error --max-warnings 0 --cache --cache-strategy content --cache-location ".cache/" --ext js ./src',
    },
    {
        name: "Run stylelint",
        command: 'npx stylelint --max-warnings 0 --cache --cache-location ".cache/" "src/**/*.css"',
    },
    {
        name: "Run v8r",
        command: "npx -y v8r@latest src/**/definition.json --schema .vscode/json-schemas/gadget-definition.json",
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
            console.info(result);
        } else {
            consoleWithTimestamp.error(error);
            exitCode = 1;
        }
        console.info("::endgroup::");
    }
    process.exit(exitCode);
});
