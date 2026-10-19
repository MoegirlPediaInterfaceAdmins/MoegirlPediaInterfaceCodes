import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import mkdtmp, { mkdlocaltmp } from "../../modules/mkdtmp.js";

// 收集每次创建出的临时目录，统一清理，避免测试中断时遗留
const createdDirs = [];

afterEach(() => {
    vi.unstubAllEnvs();
});

afterAll(async () => {
    for (const dir of createdDirs) {
        await fs.promises.rm(dir, { recursive: true, force: true });
    }
});

describe("mkdtmp", () => {
    it("RUNNER_TEMP 已设置时在其下创建 mgp- 前缀目录", async () => {
        const runnerTemp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "runner-"));
        createdDirs.push(runnerTemp);
        vi.stubEnv("RUNNER_TEMP", runnerTemp);

        const dir = await mkdtmp();
        createdDirs.push(dir);

        expect(dir.startsWith(path.join(runnerTemp, "mgp-"))).toBe(true);
        expect((await fs.promises.stat(dir)).isDirectory()).toBe(true);
    });

    it("RUNNER_TEMP 未设置时回退到 os.tmpdir", async () => {
        // 空字符串为假值，与未设置等价（避免依赖宿主环境变量状态）
        vi.stubEnv("RUNNER_TEMP", "");

        const dir = await mkdtmp();
        createdDirs.push(dir);

        expect(dir.startsWith(path.join(os.tmpdir(), "mgp-"))).toBe(true);
        expect((await fs.promises.stat(dir)).isDirectory()).toBe(true);
    });
});

describe("mkdlocaltmp", () => {
    it("在仓库 .tmp/ 目录下创建 mgp- 前缀目录", async () => {
        const dir = await mkdlocaltmp();

        // 落点绑定仓库根的 .tmp/（该目录被 .gitignore 忽略）；创建出的目录用完即删
        const repoTmpRoot = path.resolve(import.meta.dirname, "../../../.tmp");
        expect(dir.startsWith(path.join(repoTmpRoot, "mgp-"))).toBe(true);
        expect((await fs.promises.stat(dir)).isDirectory()).toBe(true);

        await fs.promises.rm(dir, { recursive: true, force: true });
    });
});
