import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// getUpstream 是「import 即执行 git revparse」的雷模块；factory 用 getter 返回可变状态，
// 各用例可以切换 upstream 为分支名或 false（HEAD 不指向分支）。
// 为什么用 getter 而不是重载模块：真实模块的导出是 import 时求值一次的常量，但实测 vitest 5
// 的 vi.resetModules() 不重跑 mock factory（mock 实例缓存在 mock registry，与模块图独立），
// 「每场景重新 import」在 mock 体系下不可行。getter 的求值时机差异（访问时 vs import 时）
// 仅在「被测代码于运行中修改这些 env / 状态」时才会显现，而被测代码不存在此行为，
// 各用例内 env 保持稳定，故行为与「以该 env 启动的真实进程」等价。
const upstreamState = vi.hoisted(() => ({ upstream: "origin/master" }));

// getter 必不可少：被测模块在各用例调用时才读取 default 绑定，切换 upstreamState 即时生效
vi.mock("../../modules/getUpstream.js", () => {
    const mockedModule = {};
    Reflect.defineProperty(mockedModule, "default", {
        enumerable: true,
        get: () => upstreamState.upstream,
    });
    return mockedModule;
});

// octokit.js 同为雷模块；isInGithubActions 按 GITHUB_ACTIONS env 派生，与真实实现一致（取舍同上）
vi.mock("../../modules/octokit.js", () => ({
    get isInGithubActions() {
        return process.env.GITHUB_ACTIONS === "true";
    },
}));

// console.js 也会从 @actions/core 取 startGroup / endGroup，factory 必须一并提供，
// 否则被测路径上的分组打印会因拿到 undefined 而崩溃
vi.mock("@actions/core", () => ({
    exportVariable: vi.fn(),
    startGroup: vi.fn(),
    endGroup: vi.fn(),
}));

import { exportVariable } from "@actions/core";
// git.js 是 import 安全的单例；被测模块持有同一实例，spy 到的方法即被测路径实际调用的方法
import git from "../../modules/git.js";
import createCommit from "../../modules/createCommit.js";

const spies = {};

beforeEach(() => {
    upstreamState.upstream = "origin/master";
    spies.add = vi.spyOn(git, "add").mockResolvedValue(undefined);
    spies.diffSummary = vi.spyOn(git, "diffSummary").mockResolvedValue({ files: [] });
    spies.commit = vi.spyOn(git, "commit").mockResolvedValue({ commit: "abc1234", branch: "master", summary: {} });
    spies.revparse = vi.spyOn(git, "revparse").mockResolvedValue("abc1234deadbeef");
});

afterEach(() => {
    for (const spy of Object.values(spies)) {
        spy.mockRestore();
    }
    exportVariable.mockClear();
    vi.unstubAllEnvs();
});

describe("createCommit", () => {
    it("不在 GitHub Actions 中时返回 false 且不执行任何 git 操作", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "false");
        await expect(createCommit("test: x")).resolves.toBe(false);
        expect(spies.add).not.toHaveBeenCalled();
        expect(spies.diffSummary).not.toHaveBeenCalled();
        expect(spies.commit).not.toHaveBeenCalled();
        expect(spies.revparse).not.toHaveBeenCalled();
        expect(exportVariable).not.toHaveBeenCalled();
    });

    it("upstream 为 false（HEAD 不指向分支）时返回 false 且不执行任何 git 操作", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        upstreamState.upstream = false;
        await expect(createCommit("test: x")).resolves.toBe(false);
        expect(spies.add).not.toHaveBeenCalled();
        expect(spies.diffSummary).not.toHaveBeenCalled();
        expect(spies.commit).not.toHaveBeenCalled();
        expect(spies.revparse).not.toHaveBeenCalled();
    });

    it("暂存区无变更时暂存全部文件后返回 false，不提交也不导出", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        spies.diffSummary.mockResolvedValue({ files: [] });
        await expect(createCommit("auto: 更新构建产物")).resolves.toBe(false);
        expect(spies.add).toHaveBeenCalledWith(".");
        expect(spies.diffSummary).toHaveBeenCalledWith(["--cached"]);
        expect(spies.commit).not.toHaveBeenCalled();
        expect(exportVariable).not.toHaveBeenCalled();
    });

    it("env 与暂存区文件合并去重后 exportVariable，并返回带 commit_long 的提交结果", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        spies.diffSummary.mockResolvedValue({ files: [{ file: "a.txt" }, { file: "b.txt" }] });
        vi.stubEnv("changedFiles", JSON.stringify(["c.txt", "a.txt"]));
        await expect(createCommit("auto: 更新构建产物")).resolves.toEqual({
            commit: "abc1234",
            branch: "master",
            summary: {},
            commit_long: "abc1234deadbeef",
        });
        expect(exportVariable).toHaveBeenCalledWith("changedFiles", JSON.stringify(["c.txt", "a.txt", "b.txt"]));
        expect(spies.commit).toHaveBeenCalledWith("auto: 更新构建产物");
        expect(spies.revparse).toHaveBeenCalledWith("abc1234");
    });

    it("changedFiles env 未设置时仅导出暂存区文件", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        // stubEnv 传 undefined 的语义是从 process.env 删除该键；显式断言防止用例被宿主继承的值干扰
        vi.stubEnv("changedFiles", undefined);
        expect(Reflect.has(process.env, "changedFiles")).toBe(false);
        spies.diffSummary.mockResolvedValue({ files: [{ file: "a.txt" }, { file: "b.txt" }] });
        await expect(createCommit("auto: 更新构建产物")).resolves.toMatchObject({
            commit: "abc1234",
            commit_long: "abc1234deadbeef",
        });
        expect(exportVariable).toHaveBeenCalledWith("changedFiles", JSON.stringify(["a.txt", "b.txt"]));
    });

    it("changedFiles env 为非法 JSON 时降级导出暂存区文件并照常提交", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        spies.diffSummary.mockResolvedValue({ files: [{ file: "a.txt" }] });
        vi.stubEnv("changedFiles", "not a json");
        await expect(createCommit("auto: 更新构建产物")).resolves.toMatchObject({
            commit: "abc1234",
            commit_long: "abc1234deadbeef",
        });
        expect(exportVariable).toHaveBeenCalledWith("changedFiles", JSON.stringify(["a.txt"]));
        expect(spies.commit).toHaveBeenCalledWith("auto: 更新构建产物");
    });

    it("changedFiles env 为非数组 JSON 时忽略 env 值，仅用暂存区文件", async () => {
        vi.stubEnv("GITHUB_ACTIONS", "true");
        spies.diffSummary.mockResolvedValue({ files: [{ file: "a.txt" }, { file: "b.txt" }] });
        vi.stubEnv("changedFiles", JSON.stringify({ file: "x.txt" }));
        await expect(createCommit("auto: 更新构建产物")).resolves.toMatchObject({
            commit: "abc1234",
            commit_long: "abc1234deadbeef",
        });
        expect(exportVariable).toHaveBeenCalledWith("changedFiles", JSON.stringify(["a.txt", "b.txt"]));
    });
});
