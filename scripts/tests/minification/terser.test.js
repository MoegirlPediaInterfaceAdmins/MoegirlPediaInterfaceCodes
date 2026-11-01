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
        // 压缩产物直接落 dist 根路径（与 postcss 的 CSS 同层），不再有 _minified 层
        const minifiedGood = await fs.readFile(path.join(workingDir, "dist", "good.js"), "utf8");
        expect(minifiedGood.length).toBeGreaterThan(0);
        await expect(fs.access(path.join(workingDir, "dist", "bad.js"))).rejects.toThrow();
    });

    it("全部文件压缩成功时以退出码 0 结束", async () => {
        await fs.rm(path.join(workingDir, "dist", "_compiled", "bad.js"));
        await expect(execFileAsync(process.execPath, [terserEntry], { cwd: workingDir, timeout: 60_000 })).resolves.toBeDefined();
        const minifiedGood = await fs.readFile(path.join(workingDir, "dist", "good.js"), "utf8");
        expect(minifiedGood.length).toBeGreaterThan(0);
    });

    it("第二次运行时按上一次的输出清单清理已无对应编译产物的陈旧 js", async () => {
        // 单独执行 build:js（不经完整 build 开头的 clean）时，源文件删除/改名后重建，
        // 上一次压缩的输出会残留在 dist 根并作为陈旧文件继续被部署；terser 以
        // .cache/terser-output-manifest.json 记录每次实际写出的文件（放 .cache 是
        // 为了不被 postbuild:js 尾部的 clean:intermediate 清掉），下一次运行据此删除
        await fs.rm(path.join(workingDir, "dist", "_compiled", "bad.js"));
        await expect(execFileAsync(process.execPath, [terserEntry], { cwd: workingDir, timeout: 60_000 })).resolves.toBeDefined();
        // 模拟源文件改名：good.js -> renamed.js（跨目录，父目录随之消失）
        await fs.rm(path.join(workingDir, "dist", "_compiled", "good.js"));
        await fs.mkdir(path.join(workingDir, "dist", "_compiled", "gadgets", "demo"), { recursive: true });
        await fs.writeFile(
            path.join(workingDir, "dist", "_compiled", "gadgets", "demo", "renamed.js"),
            "function f() { return 1; }\n",
        );
        await expect(execFileAsync(process.execPath, [terserEntry], { cwd: workingDir, timeout: 60_000 })).resolves.toBeDefined();
        // 上一次的输出被清理（连同变空的父目录）
        await expect(fs.access(path.join(workingDir, "dist", "good.js"))).rejects.toThrow();
        // 本次输出正常落盘，且清单更新为本次的输出集合
        const renamed = await fs.readFile(path.join(workingDir, "dist", "gadgets", "demo", "renamed.js"), "utf8");
        expect(renamed.length).toBeGreaterThan(0);
        const manifest = JSON.parse(await fs.readFile(path.join(workingDir, ".cache", "terser-output-manifest.json"), "utf8"));
        expect(manifest).toEqual([path.join("gadgets", "demo", "renamed.js")]);
    });

    it("dist 根下不在输出清单内的其他 js（非 terser 产物）不被清理", async () => {
        // 清理判定只依据自身输出的历史清单，不能反推「不在本次清单内的都删」——
        // dist 根还有别的产物来源（如本地 test:tsc 的 dev emit）
        const foreign = path.join(workingDir, "dist", "src", "dev-only.js");
        await fs.mkdir(path.dirname(foreign), { recursive: true });
        await fs.writeFile(foreign, "// not a terser output\n");
        await fs.rm(path.join(workingDir, "dist", "_compiled", "bad.js"));
        await expect(execFileAsync(process.execPath, [terserEntry], { cwd: workingDir, timeout: 60_000 })).resolves.toBeDefined();
        // 首次运行无历史清单，不触发清理；外部文件原样保留
        await expect(fs.access(foreign)).resolves.toBeUndefined();
    });
});
