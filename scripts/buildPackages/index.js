import { exportVariable } from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import spawnAsync, { commandForPlatform } from "../modules/spawnAsync.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

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
const packagesDirents = await fs.promises.readdir("packages", { withFileTypes: true });
const packageNames = packagesDirents.filter((dirent) => dirent.isDirectory()).map(({ name }) => name);
console.info("packages:", packageNames, checkOnly ? "(check mode)" : "(build mode)");
if (packageNames.length === 0) {
    throw new Error("No package found under packages/");
}

const { excluded = [] } = await yamlModule.readFile("scripts/buildPackages/exclusions.yaml").catch(() => ({}));

/**
 * 产物清单约定：src/gadgets/<包名>/ 下以 Gadget- 开头的文件即该包的构建产物，
 * 用于 linguist 登记与 auto commit 范围判断，新增包无需在本脚本登记任何配置。
 * 例外在 exclusions.yaml 的 excluded 中列出。
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
            await spawnAsync("node", [path.join(packageDir, "scripts", buildScript), ...checkOnly ? ["--check-idempotent"] : []]);
        }
    }
    if (checkOnly) {
        // 门禁脚本：部署链等价检查（terser 可压缩性 + tsc es2020 emit）
        if (scriptNames.includes("terser-check.js")) {
            console.info(`[${name}]`, "running terser-check.js");
            await spawnAsync("node", [path.join(packageDir, "scripts", "terser-check.js")]);
        }
        // 单元测试：以包目录为 vitest root，读取包内 vitest.config.ts；
        // --coverage 启用包内配置的 coverage 100% 阈值门禁
        if (await fileExists(path.join(packageDir, "vitest.config.ts"))) {
            console.info(`[${name}]`, "running vitest");
            await spawnAsync(commandForPlatform("npx"), ["vitest", "run", "--coverage", "--root", packageDir]);
        }
    }
    const gadgetDir = path.join("src", "gadgets", name);
    const gadgetFiles = await fs.promises.readdir(gadgetDir);
    artifactFiles.push(
        ...gadgetFiles
            .filter((fileName) => fileName.startsWith("Gadget-"))
            .map((fileName) => path.posix.join("src", "gadgets", name, fileName))
            .filter((srcPath) => !excluded.includes(srcPath)),
    );
    if (!checkOnly) {
        await createCommit(`auto(Gadget-${name}): rebuild artifacts from packages/${name}`);
    }
}
exportVariable("linguist-generated-packages", JSON.stringify(artifactFiles));
console.info("artifactFiles:", artifactFiles);
console.info("Done.");
