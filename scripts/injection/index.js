import fs from "node:fs";
import path from "node:path";
import prettyBytes from "pretty-bytes";
import { minify } from "terser";
import options from "../minification/options.js";
import console, { split } from "../modules/console.js";
import git from "../modules/git.js";
import { obfuscate } from "../modules/javascript-obfuscator.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

const config = await yamlModule.readFile("scripts/injection/config.yaml");
console.info("build config:", config);
const { targets } = await yamlModule.readFile("scripts/injection/targets.yaml");
console.info("build targets:", targets);

const { latest: { hash } } = await git.log({
    file: "src",
    format: "%H",
    maxCount: 1,
});
const seed = parseInt(hash.substring(0, 13), 16);
console.info('git hash of "src":', hash, "seed:", seed);

for (const target of targets) {
    const compiledPath = path.join("dist/_compiled", target);
    console.info(`Processing target ${target}...`);
    console.info("compiledPath:", compiledPath);

    const code = await fs.promises.readFile(compiledPath, { encoding: "utf-8" });

    console.info("Compiled code length:", prettyBytes(code.length, { binary: true }));
    console.info("Obfuscating compiled code...");
    const obfuscatedCode = obfuscate(code, {
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

    await fs.promises.writeFile(compiledPath, result.code, { encoding: "utf-8" });
}
console.info("All targets processed, done.");
split();
