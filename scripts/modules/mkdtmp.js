"use strict";
const console = require("../modules/console.js");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

module.exports = async (local = false) => {
    const tempPath = path.join(local ? ".tmp" : process.env.RUNNER_TEMP || os.tmpdir(), crypto.randomUUID());
    console.log("tempPath:", tempPath);
    await fs.promises.mkdir(tempPath, {
        recursive: true,
    });
    return tempPath;
};
