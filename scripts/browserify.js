"use strict";
const console = require("./console.js");
console.info("Start initialization...");
const browserify = require("browserify");
const browserifyTargets = require("./browserifyTargets.js");
const fs = require("fs");
const fsPromises = require("fs/promises");
const inputPath = "tmp/input.js";
const outputPath = "tmp/output.js";
(async () => {
    console.info("browserifyTargets:", browserifyTargets);
    await fsPromises.mkdir("tmp", {
        recursive: true,
    });
    for (const { module, entry, file } of browserifyTargets) {
        console.info("target:", { module, entry, file });
        await fsPromises.rm(inputPath, {
            recursive: true,
            force: true,
        });
        await fsPromises.rm(outputPath, {
            recursive: true,
            force: true,
        });
        await fsPromises.writeFile(inputPath, `global.${entry} = require("${module}");`, {});
        await new Promise((res) => {
            const stream = fs.createWriteStream(outputPath);
            stream.addListener("close", res);
            console.info(`[${module}]`, "start generating...");
            browserify(inputPath).transform("unassertify", { global: true }).transform("envify", { global: true }).plugin("common-shakeify").plugin("browser-pack-flat/plugin").bundle().pipe(stream);
        });
        console.info(`[${module}]`, "generated successfully.");
        await fsPromises.rm(file, {
            recursive: true,
            force: true,
        });
        await fsPromises.cp(outputPath, file);
    }
    console.info("Done.");
    process.exit(0);
})();