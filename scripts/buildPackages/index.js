import { exportVariable } from "@actions/core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
console.info("Initialization done.");

/**
 * 执行子进程，并把子进程的标准输出与错误输出直接接到当前进程，
 * 保证构建与测试的输出实时可见。
 *
 * @param {string} command - 要执行的命令
 * @param {string[]} args - 参数列表
 * @returns {Promise<void>} 退出码非 0 时 reject
 */
const run = (command, args) => new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
        if (code === 0) {
            resolve();
        } else {
            reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
        }
    });
});

/**
 * @param {string} filePath - 要检查的路径
 * @returns {Promise<boolean>} 路径存在时为 true
 */
const fileExists = async (filePath) => {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
};

const checkOnly = process.argv.includes("--check");
const nodeBin = (name) => process.platform === "win32" ? `${name}.cmd` : name;
const packagesDirents = await fs.promises.readdir("packages", { withFileTypes: true });
const packageNames = packagesDirents.filter((dirent) => dirent.isDirectory()).map(({ name }) => name);
console.info("packages:", packageNames, checkOnly ? "(check mode)" : "(build mode)");
if (packageNames.length === 0) {
    throw new Error("No package found under packages/");
}

/**
 * 产物清单约定：src/gadgets/<包名>/ 下以 Gadget- 开头的文件即该包的构建产物，
 * 用于 linguist 登记与 auto commit 范围判断，新增包无需在本脚本登记任何配置。
 *
 * @type {string[]}
 */
const artifactFiles = [];
for (const name of packageNames) {
    const packageDir = path.join("packages", name);
    const scriptEntries = await fs.promises.readdir(path.join(packageDir, "scripts"), { withFileTypes: true });
    const scriptNames = scriptEntries.filter((dirent) => dirent.isFile()).map(({ name: fileName }) => fileName);
    // 构建脚本：build.js（JS）与 build-css.js（CSS）各自独立产出，不存在的脚本会被跳过
    for (const buildScript of ["build.js", "build-css.js"]) {
        if (scriptNames.includes(buildScript)) {
            console.info(`[${name}]`, "running", buildScript, checkOnly ? "(--check-idempotent)" : "");
            await run("node", [path.join(packageDir, "scripts", buildScript), ...checkOnly ? ["--check-idempotent"] : []]);
        }
    }
    if (checkOnly) {
        // 门禁脚本：部署链等价检查（terser 可压缩性 + tsc es2020 emit）
        if (scriptNames.includes("terser-check.js")) {
            console.info(`[${name}]`, "running terser-check.js");
            await run("node", [path.join(packageDir, "scripts", "terser-check.js")]);
        }
        // 单元测试：以包目录为 vitest root，读取包内 vitest.config.ts；
        // --coverage 启用包内配置的 coverage 100% 阈值门禁
        if (await fileExists(path.join(packageDir, "vitest.config.ts"))) {
            console.info(`[${name}]`, "running vitest");
            await run(nodeBin("npx"), ["vitest", "run", "--coverage", "--root", packageDir]);
        }
    }
    const gadgetDir = path.join("src", "gadgets", name);
    const gadgetFiles = await fs.promises.readdir(gadgetDir);
    artifactFiles.push(
        ...gadgetFiles
            .filter((fileName) => fileName.startsWith("Gadget-"))
            .map((fileName) => path.posix.join("src", "gadgets", name, fileName)),
    );
    if (!checkOnly) {
        await createCommit(`auto(Gadget-${name}): rebuild artifacts from packages/${name}`);
    }
}
exportVariable("linguist-generated-packages", JSON.stringify(artifactFiles));
console.info("artifactFiles:", artifactFiles);
console.info("Done.");
