import fs from "node:fs";
import path from "node:path";
import prettyBytes from "pretty-bytes";
import { minify } from "terser";
import options from "../minification/options.js";
import console from "../modules/console.js";
import git from "../modules/git.js";
import { obfuscate } from "../modules/javascript-obfuscator.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

const config = await yamlModule.readFile("scripts/injection/config.yaml");
console.info("build config:", config);
const { target } = await yamlModule.readFile("scripts/injection/targets.yaml");
console.info("build targets:", target);

const { latest: { hash } } = await git.log({
    file: "src",
    format: "%H",
    maxCount: 1,
});
const seed = parseInt(hash.substring(0, 13), 16);
console.info('git hash of "src":', hash, "seed:", seed);

const compiledPath = path.join("dist/_compiled", target);
const injectionPath = "dist/_compiled/injection";
const injectionFiles = await fs.promises.readdir(injectionPath);
console.info("injection files:", injectionFiles);

const injectionCodes = [];
for (const injectionFile of injectionFiles) {
    console.info(`Reading ${injectionFile}...`);
    const injectionFilePath = path.join(injectionPath, injectionFile);
    const injectionCode = await fs.promises.readFile(injectionFilePath, { encoding: "utf-8" });
    console.info("injectionCode length:", prettyBytes(injectionCode.length, { binary: true }));
    injectionCodes.push(injectionCode);
    await fs.promises.rm(injectionFilePath, { force: true });
}
await fs.promises.rm(injectionPath, { force: true, recursive: true });

const injectionCode = injectionCodes.join("\n");
console.info("Total injection code length:", prettyBytes(injectionCode.length, { binary: true }));
console.info("Obfuscating injection codes...");
const obfuscatedCode = obfuscate(injectionCode, {
    ...config,
    seed,
}).getObfuscatedCode();
console.info("obfuscatedCode length:", prettyBytes(obfuscatedCode.length, { binary: true }));

/**
 * @type { import("terser").MinifyOptions }
 */
const minificationOptions = {
    ...options,
    /* eslint-disable camelcase -- Terser options use snake_case */
    compress: {
        ...options.compress,
        toplevel: true,
    },
    mangle: {
        ...options.mangle,
        keep_classnames: false,
        keep_fnames: false,
        toplevel: true,
        properties: {
            ...options.mangle.properties,
            keep_quoted: "strict",
            regex: null,
        },
    },
    toplevel: true,
    /* eslint-enable camelcase */
};
const result = await minify(obfuscatedCode, minificationOptions);
console.info("Minified code length:", prettyBytes(result.code.length, { binary: true }));

await fs.promises.appendFile(compiledPath, result.code, { encoding: "utf-8" });
