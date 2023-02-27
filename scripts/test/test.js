"use strict";
const consoleWithTime = require("../modules/console.js");
consoleWithTime.info("Start initialization...");
const octokit = require("../modules/octokit.js");
(async () => {
    consoleWithTime.info(await octokit.rest.issues.create({
        title: "test",
        body: "test",
        labels: "ci:generatePolyfill",
    }));
})();
