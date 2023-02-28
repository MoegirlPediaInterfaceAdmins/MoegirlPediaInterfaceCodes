"use strict";
const fs = require("fs");
const core = require("@actions/core");
(async () => {
    core.startGroup("process.env");
    console.info(process.env);
    core.endGroup();
    core.startGroup("process.env.GITHUB_EVENT_PATH");
    console.info(await fs.promises.readFile(process.env.GITHUB_EVENT_PATH, { encoding: "utf-8" }));
    core.endGroup();
})();
