"use strict";
const consoleWithTime = require("../modules/console.js");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const cpPaths = ["node_modules", "package-lock.json", "package.json"];

module.exports = async (needNodeModules = false) => {
    const tempPath = path.join(process.env.RUNNER_TEMP || os.tmpdir(), crypto.randomUUID());
    consoleWithTime.log("tempPath:", tempPath);
    await fs.promises.mkdir(tempPath, {
        recursive: true,
    });
    if (needNodeModules) {
        consoleWithTime.log("Start to copy:", cpPaths);
        await Promise.all(cpPaths.map((cpPath) => fs.promises.cp(cpPath, path.join(tempPath, cpPath), {
            force: true,
            recursive: true,
            preserveTimestamps: true,
            dereference: true,
        })));
    }
    return tempPath;
};
