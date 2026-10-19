import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parse } from "acorn";
import { minify } from "terser";
import options from "../../../scripts/minification/options.js";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");
const artifact = path.join(repoRoot, "src", "gadgets", "HotCat", "Gadget-HotCat.js");
const rawCode = await fs.promises.readFile(artifact, "utf8");

// Gate 1：产物必须是合法 es2020。
try {
    parse(rawCode, { ecmaVersion: 2020 });
} catch (error) {
    throw new Error(`产物不是合法 es2020（检查 build.js 的 target）：${error.message}`, { cause: error });
}

// Gate 2：编译后再压缩。
// 直接跑 tsc 的 JS 入口：Windows 下 execFile 调用 .cmd 会 EINVAL
const tscBin = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");
const gateDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "hotcat-terser-gate-"));
// 忽略工程配置
await execFileAsync(process.execPath, [tscBin, "--ignoreConfig", "--allowJs", "--target", "es2020", "--module", "preserve", "--outDir", gateDir, artifact]);
const compiledPath = path.join(gateDir, "Gadget-HotCat.js");
try {
    const compiled = await fs.promises.readFile(compiledPath, "utf8");
    const result = await minify(compiled, options);
    if (typeof result.code !== "string" || result.code.length === 0) {
        throw new Error("terser 返回空输出");
    }
    console.log(`es2020 parse OK (${Buffer.byteLength(rawCode, "utf8")} bytes); tsc-es2020 + terser OK: ${Buffer.byteLength(compiled, "utf8")} -> ${Buffer.byteLength(result.code, "utf8")} bytes (output discarded)`);
} finally {
    await fs.promises.rm(gateDir, { recursive: true, force: true });
}
