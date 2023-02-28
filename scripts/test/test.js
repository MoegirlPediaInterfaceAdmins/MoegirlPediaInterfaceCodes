"use strict";
const { octokit } = require("../modules/octokit.js");
const core = require("@actions/core");
(() => {
    core.startGroup("process.env");
    console.info(process.env);
    core.endGroup();
})();
