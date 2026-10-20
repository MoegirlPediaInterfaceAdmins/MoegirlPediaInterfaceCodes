import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const terserEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../minification/terser.js");

// 入口脚本 import 即执行全部构建动作，无法像纯模块那样直接单测；
// 在临时目录里布置最小 dist/_compiled 场景后以子进程运行整个脚本，
// 直接断言「单文件失败 → 退出码非零、其余文件照常产出」这一集成行为
let workingDir;

beforeEach(async () => {
    workingDir = await fs.mkdtemp(path.join(os.tmpdir(), "terser-test-"));
    await fs.mkdir(path.join(workingDir, "dist", "_compiled"), { recursive: true });
    await fs.writeFile(
        path.join(workingDir, "dist", "_compiled", "good.js"),
        "function greet(name) { const message = 'hello ' + name; return message; }\n",
    );
    // 语法错误会让 terser 的 minify reject，用于构造单文件失败场景
    await fs.writeFile(
        path.join(workingDir, "dist", "_compiled", "bad.js"),
        "const 1 = syntax error;\n",
    );
});

afterEach(async () => {
    await fs.rm(workingDir, { recursive: true, force: true });
});

describe("minification/terser", () => {
    it("任一文件压缩失败时以非零退出码结束，其余文件仍被产出", async () => {
        let failure;
        try {
            await execFileAsync(process.execPath, [terserEntry], { cwd: workingDir, timeout: 60_000 });
            failure = null;
        } catch (error) {
            failure = error;
        }
        expect(failure).toBeInstanceOf(Error);
        expect(failure.code).toBe(1);
        expect(failure.stderr).toContain("Error minifying file");
        const minifiedGood = await fs.readFile(path.join(workingDir, "dist", "_minified", "good.js"), "utf8");
        expect(minifiedGood.length).toBeGreaterThan(0);
        await expect(fs.access(path.join(workingDir, "dist", "_minified", "bad.js"))).rejects.toThrow();
    });

    it("全部文件压缩成功时以退出码 0 结束", async () => {
        await fs.rm(path.join(workingDir, "dist", "_compiled", "bad.js"));
        await expect(execFileAsync(process.execPath, [terserEntry], { cwd: workingDir, timeout: 60_000 })).resolves.toBeDefined();
        const minifiedGood = await fs.readFile(path.join(workingDir, "dist", "_minified", "good.js"), "utf8");
        expect(minifiedGood.length).toBeGreaterThan(0);
    });
});
