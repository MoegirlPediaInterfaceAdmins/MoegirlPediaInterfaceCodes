"use strict";
const { octokit, octokitBaseOptions } = require("../modules/octokit.js");
const core = require("@actions/core");
(async () => {
    core.info(JSON.stringify(await octokit.rest.issues.create({
        ...octokitBaseOptions,
        title: "test",
        body: "test",
        labels: "ci:generatePolyfill",
    })));
    core.startGroup("process.env");
    core.info(JSON.stringify(process.env, null, 4));
    core.endGroup();
})();
