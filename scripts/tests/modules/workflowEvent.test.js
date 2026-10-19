import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

// octokit.js 是「import 即读 yaml 并初始化」的雷模块；factory 用 getter 按 GITHUB_ACTIONS env
// 动态派生 isInGithubActions，与真实实现一致，各用例通过 stubEnv 切换运行环境
vi.mock("../../modules/octokit.js", () => ({
    get isInGithubActions() {
        return process.env.GITHUB_ACTIONS === "true";
    },
}));

import readWorkflowEvent from "../../modules/workflowEvent.js";

// 临时事件文件统一放在 os.tmpdir() 下的自建目录，测试结束递归清理
const tmpDir = await fs.promises.mkdtemp(join(os.tmpdir(), "workflowevent-test-"));

afterAll(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("readWorkflowEvent", () => {
    it("不在 GitHub Actions 中时直接返回 false，不读取事件文件", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "false");
        await expect(readWorkflowEvent()).resolves.toBe(false);
    });

    it("在 GitHub Actions 中时解析 GITHUB_EVENT_PATH 指向的事件载荷", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        const eventFile = join(tmpDir, "event.json");
        // eslint-disable-next-line camelcase -- GitHub API 事件载荷字段为 snake_case
        await fs.promises.writeFile(eventFile, JSON.stringify({ pull_request: { number: 7, title: "feat: x" } }), "utf-8");
        vi.stubEnv("GITHUB_EVENT_PATH", eventFile);
        // eslint-disable-next-line camelcase -- GitHub API 事件载荷字段为 snake_case
        await expect(readWorkflowEvent()).resolves.toEqual({ pull_request: { number: 7, title: "feat: x" } });
    });

    it("事件文件内容不是合法 JSON 时抛出 SyntaxError", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        const eventFile = join(tmpDir, "invalid.json");
        await fs.promises.writeFile(eventFile, "not a json", "utf-8");
        vi.stubEnv("GITHUB_EVENT_PATH", eventFile);
        await expect(readWorkflowEvent()).rejects.toThrow(SyntaxError);
    });

    it("GITHUB_EVENT_PATH 指向不存在的文件时抛出 ENOENT", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        vi.stubEnv("GITHUB_EVENT_PATH", join(tmpDir, "missing.json"));
        await expect(readWorkflowEvent()).rejects.toThrow(/ENOENT/);
    });
});
