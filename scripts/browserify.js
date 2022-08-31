"use strict";
const console = require("./console.js");
console.info("Start initialization...");
const browserify = require("browserify");
const minifyStream = require("minify-stream");
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
    for (const { module, entry, file, exports } of browserifyTargets) {
        console.info("target:", { module, entry, file, exports });
        await fsPromises.rm(inputPath, {
            recursive: true,
            force: true,
        });
        await fsPromises.rm(outputPath, {
            recursive: true,
            force: true,
        });
        const inputs = [];
        const hasExports = Array.isArray(exports) && exports.length > 0;
        if (!hasExports) {
            inputs.push(`import m from "${module}";`);
            inputs.push(`global["${entry}"] = m`);
        } else {
            inputs.push(`import {${exports.join(",")}} from "${module}";`);
            inputs.push(`global["${entry}"] = {${exports.join(",")}}`);
        }
        await fsPromises.writeFile(inputPath, inputs.join("\n"));
        await new Promise((res) => {
            const fileStream = fs.createWriteStream(outputPath);
            fileStream.addListener("close", res);
            console.info(`[${module}]`, "start generating...");
            const codeStream = browserify(inputPath).plugin("esmify").transform("unassertify", { global: true }).transform("envify", { global: true }).plugin("common-shakeify").plugin("browser-pack-flat/plugin").bundle();
            if (hasExports) {
                codeStream.pipe(minifyStream()).pipe(fileStream);
            } else {
                codeStream.pipe(fileStream);
            }
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