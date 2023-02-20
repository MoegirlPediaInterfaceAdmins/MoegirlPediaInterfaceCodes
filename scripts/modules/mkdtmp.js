"use strict";
const consoleWithTime = require("../modules/console.js");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
module.exports = async () => {
    const tempPath = path.join(process.env.RUNNER_TEMP || os.tmpdir(), crypto.randomUUID());
    consoleWithTime.log("tempPath:", tempPath);
    await fs.promises.mkdir(tempPath, {
        recursive: true,
    });
    return tempPath;
};
