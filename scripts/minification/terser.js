import fs from "node:fs";
import path from "node:path";
import prettyBytes from "pretty-bytes";
import { minify } from "terser";
import console from "../modules/console.js";
import options from "./options.js";
console.info("Initialization done.");

const compiledFolder = "dist/_compiled";
// 压缩产物直接落到 dist 根路径，与 postcss 的 CSS 输出同层：部署端取 dist 根即可拿到
// 全部部署物（js + css），不再需要 _minified 这一层
const outputFolder = "dist";
// 上一次输出的清单文件：单独执行 build:js（不经完整 build 开头的 clean）时，
// 源文件删除/改名后重建会让旧输出残留并作为陈旧文件继续被部署，据此清单
// 删除「上一次有、本次无」的输出。不能反着用「dist 根下所有不在本次清单内的
// js」做判定——dist 根还存在非 terser 的产物（如本地 test:tsc 的 dev emit），
// 越界删除会破坏它们；清单缺失（首次运行或 clean 之后 dist 为空）时无从
// 判定历史，保守跳过。清单放在 .cache/（gitignore 覆盖）：放 dist 内会被
// postbuild:js 尾部的 clean:intermediate 连同中间目录一起清掉，活不到下一次运行
const outputManifestPath = path.join(".cache", "terser-output-manifest.json");

console.info("Minifying JavaScript files...");
console.info(`Compiled folder: ${compiledFolder}`);
console.info(`Output folder: ${outputFolder}`);
console.info("Terser options:", options);

const files = (await fs.promises.readdir(compiledFolder, {
    recursive: true,
    withFileTypes: true,
})).filter((file) => file.isFile() && path.extname(file.name) === ".js");
const compiledRelPaths = new Set(files.map(({ parentPath, name }) => path.relative(compiledFolder, path.join(parentPath, name))));

const previousRelPaths = await fs.promises.readFile(outputManifestPath, "utf-8").then(JSON.parse).catch(() => null);
if (Array.isArray(previousRelPaths)) {
    for (const relPath of previousRelPaths) {
        if (compiledRelPaths.has(relPath)) {
            continue;
        }
        // dist 可能已被 clean 清空：文件不存在视同已清理（force）
        await fs.promises.rm(path.join(outputFolder, relPath), { force: true });
        // 删掉陈旧文件后清理因此变空的父目录（逐级向上，目录非空即止），
        // 避免源目录整个消失后在 dist 根留下空目录骨架
        let dir = path.resolve(outputFolder, path.dirname(relPath));
        const outputRootAbs = path.resolve(outputFolder);
        while (dir !== outputRootAbs) {
            try {
                await fs.promises.rmdir(dir);
            } catch {
                break;
            }
            dir = path.dirname(dir);
        }
        console.info(`\tRemoved stale output: ${relPath}`);
    }
}

const writtenRelPaths = [];
for (const { parentPath, name } of files) {
    const filePath = path.join(parentPath, name);
    const relPath = path.relative(compiledFolder, filePath);
    const minifiedFilePath = path.join(outputFolder, relPath);
    console.info(`\tMinifying file: ${filePath} -> ${minifiedFilePath}`);
    try {
        const code = await fs.promises.readFile(filePath, { encoding: "utf-8" });
        const result = await minify(code, options);
        await fs.promises.mkdir(path.dirname(minifiedFilePath), { recursive: true });
        await fs.promises.writeFile(minifiedFilePath, result.code, { encoding: "utf-8" });
        // 清单只登记成功写出的文件：失败的文件没有输出，登记了会被下一次误判为陈旧
        writtenRelPaths.push(relPath);
        console.info(`\t\tSuccessfully minified, size reduced from ${prettyBytes(Buffer.byteLength(code, "utf-8"), { binary: true })} to ${prettyBytes(Buffer.byteLength(result.code, "utf-8"), { binary: true })}.`);
    } catch (error) {
        console.error(`\t\tError minifying file ${filePath}:`, error);
        // 单文件失败不能让整体构建显示成功：标记非零退出码，但继续压缩剩余文件
        process.exitCode = 1;
    }
}
await fs.promises.mkdir(path.dirname(outputManifestPath), { recursive: true });
await fs.promises.writeFile(outputManifestPath, `${JSON.stringify(writtenRelPaths.sort(), null, 4)}\n`, "utf-8");
console.info("JavaScript minification completed.");
