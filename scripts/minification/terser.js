import fs from "node:fs";
import path from "node:path";
import prettyBytes from "pretty-bytes";
import { minify } from "terser";
import console from "../modules/console.js";
import options from "./options.js";
console.info("Initialization done.");

const compiledFolder = "dist/_compiled";
const minifiedFolder = "dist/_minified";

console.info("Minifying JavaScript files...");
console.info(`Compiled folder: ${compiledFolder}`);
console.info(`Minified folder: ${minifiedFolder}`);
console.info("Terser options:", options);

await fs.promises.rm(minifiedFolder, { recursive: true, force: true });
const files = (await fs.promises.readdir(compiledFolder, {
    recursive: true,
    withFileTypes: true,
})).filter((file) => file.isFile() && path.extname(file.name) === ".js");
for (const { parentPath, name } of files) {
    const filePath = path.join(parentPath, name);
    const minifiedFilePath = path.join(minifiedFolder, path.relative(compiledFolder, filePath));
    console.info(`\tMinifying file: ${filePath} -> ${minifiedFilePath}`);
    try {
        const code = await fs.promises.readFile(filePath, { encoding: "utf-8" });
        const result = await minify(code, options);
        await fs.promises.mkdir(path.dirname(minifiedFilePath), { recursive: true });
        await fs.promises.writeFile(minifiedFilePath, result.code, { encoding: "utf-8" });
        console.info(`\t\tSuccessfully minified, size reduced from ${prettyBytes(Buffer.byteLength(code, "utf-8"), { binary: true })} to ${prettyBytes(Buffer.byteLength(result.code, "utf-8"), { binary: true })}.`);
    } catch (error) {
        console.error(`\t\tError minifying file ${filePath}:`, error);
    }
}
console.info("JavaScript minification completed.");
