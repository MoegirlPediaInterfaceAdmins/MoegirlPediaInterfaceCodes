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
    for (const browserifyTarget of browserifyTargets) {
        console.info("target:", browserifyTarget);
        const { module, entry, file, exports, removePlugins, prependCode } = browserifyTarget;
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
            if (typeof prependCode === "string") {
                fileStream.write(`${prependCode}\n`);
            }
            console.info(`[${module}]`, "start generating...");
            const plugins = new Set([
                "esmify",
                "common-shakeify",
                "browser-pack-flat/plugin",
            ]);
            if (Array.isArray(removePlugins)) {
                for (const removePlugin of removePlugins) {
                    plugins.delete(removePlugin);
                }
            }
            let codeObject = browserify(inputPath).transform("unassertify", { global: true }).transform("envify", { global: true });
            for (const plugin of plugins) {
                codeObject = codeObject.plugin(plugin);
            }
            const codeStream = codeObject.bundle();
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