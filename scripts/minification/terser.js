import fs from "node:fs";
import path from "node:path";
import prettyBytes from "pretty-bytes";
import { minify } from "terser";
import console from "../modules/console.js";
import options from "./options.js";
console.info("Initialization done.");

const compiledFolder = "dist/_compiled";
// 压缩产物直接落到 dist 根路径，与 postcss 的 CSS 输出同层：部署端取 dist 根即可拿到
// 全部部署物（js + css），不再需要 _minified 这一层。dist 在 build 开头已由 clean 清空，
// 这里无需再做输出目录的陈旧清理
const outputFolder = "dist";

console.info("Minifying JavaScript files...");
console.info(`Compiled folder: ${compiledFolder}`);
console.info(`Output folder: ${outputFolder}`);
console.info("Terser options:", options);

const files = (await fs.promises.readdir(compiledFolder, {
    recursive: true,
    withFileTypes: true,
})).filter((file) => file.isFile() && path.extname(file.name) === ".js");
for (const { parentPath, name } of files) {
    const filePath = path.join(parentPath, name);
    const minifiedFilePath = path.join(outputFolder, path.relative(compiledFolder, filePath));
    console.info(`\tMinifying file: ${filePath} -> ${minifiedFilePath}`);
    try {
        const code = await fs.promises.readFile(filePath, { encoding: "utf-8" });
        const result = await minify(code, options);
        await fs.promises.mkdir(path.dirname(minifiedFilePath), { recursive: true });
        await fs.promises.writeFile(minifiedFilePath, result.code, { encoding: "utf-8" });
        console.info(`\t\tSuccessfully minified, size reduced from ${prettyBytes(Buffer.byteLength(code, "utf-8"), { binary: true })} to ${prettyBytes(Buffer.byteLength(result.code, "utf-8"), { binary: true })}.`);
    } catch (error) {
        console.error(`\t\tError minifying file ${filePath}:`, error);
        // 单文件失败不能让整体构建显示成功：标记非零退出码，但继续压缩剩余文件
        process.exitCode = 1;
    }
}
console.info("JavaScript minification completed.");
