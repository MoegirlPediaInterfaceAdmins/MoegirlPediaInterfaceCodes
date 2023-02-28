"use strict";
const core = require("@actions/core");
(() => {
    core.startGroup("process.env");
    console.info(process.env);
    core.endGroup();
})();
