import { endGroup, exportVariable, startGroup } from "@actions/core";
import browserify from "browserify";
import fs from "node:fs";
import path from "node:path";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import exec from "../modules/exec.js";
import minifyStream from "../modules/minify-stream.js";
import mkdtmp from "../modules/mkdtmp.js";
import modulePath from "../modules/modulePath.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

/**
 * @type {{ module: string; entry: string; gadget: { name: string, fileName: string }; exportValues?: string[], removePlugins?: string[], prependCode?: string }[]}
 */
const browserifyTargets = await yamlModule.readFile("scripts/browserify/targets.yaml");
startGroup("browserifyTargets:");
console.info(browserifyTargets);
endGroup();
const tempPath = await mkdtmp({
    local: true,
});
const inputPath = path.join(tempPath, "input.js");
const jsonOutput = await exec("npm ls --json");
/**
 * @type {{ [name: string]: { version: string } }}
 */
const localPackageVersions = JSON.parse(jsonOutput).dependencies;
console.info("npm ls:", ["", ...Object.entries(localPackageVersions).map(([name, { version }]) => `* ${name}@${version}`)].join("\n"));
const fileList = [];
for (const browserifyTarget of browserifyTargets) {
    console.info("target:", browserifyTarget);
    const { module, entry, gadget: { name, fileName }, exportValues, removePlugins, prependCode, namespaceImport } = browserifyTarget;
    const file = path.join("src/gadgets", name, fileName);
    fileList.push(file);
    await fs.promises.rm(inputPath, {
        recursive: true,
        force: true,
    });
    const hasExports = Array.isArray(exportValues) && exportValues.length > 0;
    const exportReference = namespaceImport ? "* as m" : hasExports ? `{ ${exportValues.join(", ")} }` : "m";
    const importReference = namespaceImport ? "m" : hasExports ? `{ ${exportValues.join(", ")} }` : "m";
    await fs.promises.writeFile(inputPath, [
        `import ${exportReference} from "${module}";`,
        `global["${entry}"] = ${importReference};`,
    ].join("\n"));
    const codes = await new Promise((res, rej) => {
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
        const codeStream = codeObject.bundle().pipe(minifyStream({
            mangle: false,
            output: {
                beautify: true,
                width: 1024 * 10,
            },
        }));
        const chunks = [];
        codeStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        codeStream.on("error", (err) => rej(err));
        codeStream.on("end", () => res(Buffer.concat(chunks).toString("utf8")));
    });
    const output = [
        "/**",
        ` * Generated by ${modulePath(import.meta)}`,
        " * Options:",
    ];
    for (const [k, v] of Object.entries(browserifyTarget)) {
        output.push(` *     ${k}: ${JSON.stringify(v, null, 1).replace(/\n */g, " ")}`);
    }
    output.push(" */");
    if (typeof prependCode === "string") {
        output.push(prependCode);
    }
    output.push(codes.trim(), "");
    const code = output.join("\n");
    if (code === await fs.promises.readFile(file, { encoding: "utf-8" }).catch(() => null)) {
        console.info(`[${module}]`, "No change, continue to next one.");
        continue;
    }
    await fs.promises.writeFile(file, code);
    if (path.extname(file) === ".js") {
        const filename = path.basename(file);
        const eslintrcName = path.join(path.dirname(file), ".eslintrc.yaml");
        const eslintrc = await yamlModule.readFile(eslintrcName).catch(() => ({}));
        if (!Array.isArray(eslintrc.ignorePatterns)) {
            eslintrc.ignorePatterns = [];
        }
        if (!eslintrc.ignorePatterns.includes(filename)) {
            eslintrc.ignorePatterns.push(filename);
            await yamlModule.writeFile(eslintrcName, eslintrc);
        }
    }
    console.info(`[${module}]`, "generated successfully.");
    await createCommit(`auto(Gadget-${name}): bump ${module} to ${localPackageVersions[module].version} by browserify`);
}
exportVariable("linguist-generated-browserify", JSON.stringify(fileList));
console.info("Done.");
