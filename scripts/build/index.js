import fs from "node:fs";
import path from "node:path";
import console from "../modules/console.js";
import git from "../modules/git.js";
import { obfuscate } from "../modules/javascript-obfuscator.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

const config = await yamlModule.readFile("scripts/build/config.yaml");
console.info("build config:", config);
const { target } = await yamlModule.readFile("scripts/build/targets.yaml");
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
    console.info("injectionCode length:", injectionCode.length);
    injectionCodes.push(injectionCode);
    await fs.promises.rm(injectionFilePath, { force: true });
}
await fs.promises.rm(injectionPath, { force: true, recursive: true });

const injectionCode = injectionCodes.join("\n");
console.info("Total injection code length:", injectionCode.length);
console.info("Obfuscating injection codes...");
const obfuscatedCode = obfuscate(injectionCode, {
    ...config,
    seed,
}).getObfuscatedCode();
console.info("obfuscatedCode length:", obfuscatedCode.length);
await fs.promises.appendFile(compiledPath, obfuscatedCode);
