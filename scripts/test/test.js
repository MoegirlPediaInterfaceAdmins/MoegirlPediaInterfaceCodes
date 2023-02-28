"use strict";
const core = require("@actions/core");
(() => {
    core.startGroup("process.env");
    console.info(process.env);
    core.endGroup();
    core.startGroup("process.env.GITHUB_EVENT_PATH");
    console.info(require(process.env.GITHUB_EVENT_PATH));
    core.endGroup();
})();
