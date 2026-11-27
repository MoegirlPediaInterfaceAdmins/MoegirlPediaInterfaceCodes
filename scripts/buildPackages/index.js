import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import console from "../modules/console.js";
import spawnAsync, { commandForPlatform } from "../modules/spawnAsync.js";
import { runPool } from "../modules/runPool.js";
import { assertGeneratedArtifactsDeclared } from "../modules/artifactManifest.js";
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

/**
 * 递归统计 tests/ 下的测试文件数，用于决定启动顺序：测试最多的包先启动，
 * 它的 vitest 是整条链的关键路径（4 核 CI 上 Navigation_popups 一个包占六成用时）。
 * @param {string} dir
 * @returns {Promise<number>}
 */
const countTestFiles = async (dir) => {
    let count = 0;
    for (const dirent of await fs.promises.readdir(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            count += await countTestFiles(entryPath);
        } else if (dirent.name.endsWith(".test.ts")) {
            count++;
        }
    }
    return count;
};

const checkOnly = process.argv.includes("--check");
// 产物由各包构建脚本写到 dist/_generated/gadgets（gitignore 覆盖，不进入仓库），
// 全程无任何提交动作（linter_test 无 git 身份亦不受影响，取代 #1162 的 --no-commit 方案）；
// check 模式的幂等对比也读同一目录，需先经 npm run build:artifacts 生成。
// 包之间只读写自己名下的产物与缓存目录，因此可以并行；并发上限取可用核数的一半：
// 4 核 CI 上 2 个并行比 7 个全并行和逐个串行都快（实测 30.5s → 23s）。
const packagesDirents = await fs.promises.readdir("packages", { withFileTypes: true });
const packageNames = packagesDirents.filter((dirent) => dirent.isDirectory()).map(({ name }) => name);
if (packageNames.length === 0) {
    throw new Error("No package found under packages/");
}
const testCounts = new Map();
for (const name of packageNames) {
    // 没有 tests/ 目录的包按 0 计，排到队尾即可，不应打断整条链
    const count = await countTestFiles(path.join("packages", name, "tests")).catch((error) => {
        if (error?.code !== "ENOENT") {
            throw error;
        }
        return 0;
    });
    testCounts.set(name, count);
}
const orderedNames = packageNames.toSorted((a, b) => testCounts.get(b) - testCounts.get(a) || a.localeCompare(b));
const concurrency = Math.min(Math.max(2, Math.floor(os.availableParallelism() / 2)), orderedNames.length);
console.info("packages:", orderedNames.map((name) => `${name}(${testCounts.get(name)})`), checkOnly ? "(check mode)" : "(build mode)", `concurrency: ${concurrency}`);

/**
 * 执行单个包的完整链。子进程输出按包收集、整块打印：多包并行时直接继承 stdio
 * 会让不同包的日志行交错，CI 上无法阅读。
 * @param {string} name
 * @returns {Promise<void>}
 */
const runPackage = async (name) => {
    const packageDir = path.join("packages", name);
    const scriptEntries = await fs.promises.readdir(path.join(packageDir, "scripts"), { withFileTypes: true });
    const scriptNames = scriptEntries.filter((dirent) => dirent.isFile()).map(({ name: fileName }) => fileName);
    const steps = [];
    // 构建脚本：build.js（JS）与 build-css.js（CSS）各自独立产出，不存在的脚本会被跳过
    for (const buildScript of ["build.js", "build-css.js"]) {
        if (scriptNames.includes(buildScript)) {
            steps.push({
                label: checkOnly ? `${buildScript} (--check-idempotent)` : buildScript,
                command: "node",
                args: [path.join(packageDir, "scripts", buildScript), ...checkOnly ? ["--check-idempotent"] : []],
            });
        }
    }
    if (checkOnly) {
        // 门禁脚本：部署链等价检查（terser 可压缩性 + tsc es2020 emit）
        if (scriptNames.includes("terser-check.js")) {
            steps.push({ label: "terser-check.js", command: "node", args: [path.join(packageDir, "scripts", "terser-check.js")] });
        }
        // 单元测试：以包目录为 vitest root，读取包内 vitest.config.ts；
        // --coverage 启用包内配置的 coverage 100% 阈值门禁
        if (await fileExists(path.join(packageDir, "vitest.config.ts"))) {
            steps.push({ label: "vitest", command: commandForPlatform("npx"), args: ["vitest", "run", "--coverage", "--root", packageDir] });
        }
    }
    const blocks = [];
    let currentLabel = "";
    try {
        for (const { label, command, args } of steps) {
            currentLabel = label;
            console.info(`[${name}]`, "running", label);
            const { stdout, stderr } = await spawnAsync(command, args, { capture: true });
            blocks.push({ label, stdout, stderr });
        }
    } catch (error) {
        // 失败的步骤同样整块输出，error 上的 stdout / stderr 是子进程在崩溃前已写出的内容
        blocks.push({ label: currentLabel, stdout: String(error?.stdout ?? ""), stderr: String(error?.stderr ?? "") });
        throw error;
    } finally {
        for (const { label, stdout, stderr } of blocks) {
            console.info(`[${name}] ${label} output:`);
            if (stdout !== "") {
                console.info(stdout);
            }
            if (stderr !== "") {
                console.error(stderr);
            }
        }
    }
};

const failures = await runPool(orderedNames, concurrency, runPackage);
if (failures.length > 0) {
    console.error(`以下包的步骤失败（${failures.length} 个）：`);
    for (const { item, error } of failures) {
        console.error(`- ${item}: ${error instanceof Error ? error.message : error}`);
    }
    throw new AggregateError(failures.map(({ error }) => error), `${failures.length} 个包的步骤失败`);
}
// 链尾反向对账（build 与 package:test 两种模式的公共出口）：磁盘产物必须全部已声明，
// 拦截「忘写 artifacts.yaml 导致 generateGadgetsDefinition 静默删除 `_files` 产物条目」
await assertGeneratedArtifactsDeclared();
console.info("Done.");
