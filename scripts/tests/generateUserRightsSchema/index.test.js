import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js
const createCommitMock = vi.hoisted(() => ({}));
vi.mock("../../modules/createCommit.js", () => {
    createCommitMock.fn = vi.fn(() => ({ commit: "abc1234" }));
    return { "default": createCommitMock.fn };
});

// jsonModule 若不 mock，成功路径会真实读写 .vscode/json-schemas/ 下的仓库文件
const jsonModuleMock = vi.hoisted(() => ({}));
vi.mock("../../modules/jsonModule.js", () => {
    jsonModuleMock.writeFile = vi.fn();
    return {
        "default": {
            // 脚本会写 schema.definitions.userRights.enum，mock 必须提供完整的嵌套层级
            readFile: vi.fn(() => ({ definitions: { userRights: {} } })),
            writeFile: jsonModuleMock.writeFile,
        },
    };
});

// getUpstream 是 import 即执行 git rev-parse 的雷模块；两个用例都需要它放行
vi.mock("../../modules/getUpstream.js", () => ({ "default": true }));

// 用抛哨兵异常代替真实退出，使动态 import 以该异常 reject，退出码可从异常上断言
class ExitSentinel extends Error {
    constructor(code) {
        super(`process.exit(${code})`);
        this.exitCode = code;
    }
}

let exitSpy;

beforeEach(() => {
    vi.resetModules();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
        throw new ExitSentinel(code);
    });
});

afterEach(() => {
    exitSpy.mockRestore();
    vi.unstubAllGlobals();
});

const importScript = async () => {
    try {
        await import("../../generateUserRightsSchema/index.js");
        return null;
    } catch (error) {
        return error;
    }
};

describe("generateUserRightsSchema", () => {
    it("抓取失败时以退出码 1 结束，不写 schema 也不提交", async () => {
        // 脚本对 fetch 的返回值直接链 .catch，mock 必须返回真正的 Promise
        vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            text: () => "upstream busy",
        })));
        const rejection = await importScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(1);
        expect(jsonModuleMock.writeFile).not.toHaveBeenCalled();
        expect(createCommitMock.fn).not.toHaveBeenCalled();
    });

    it("抓取成功时合并去重权限写入 schema 并提交", async () => {
        // 响应形状对齐自建聚合接口：结构与 api.php 的 siprop=usergroups 完全一致（含 query 包裹），仅顶层额外附带 fetchedAt
        vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
            ok: true,
            json: () => ({
                fetchedAt: "2026-10-20T15:47:43.406+08:00",
                query: { usergroups: [{ rights: ["read", "edit"] }, { rights: ["edit", "move"] }] },
            }),
        })));
        expect(await importScript()).toBeNull();
        expect(exitSpy).not.toHaveBeenCalled();
        expect(jsonModuleMock.writeFile).toHaveBeenCalledWith(
            ".vscode/json-schemas/user-rights-definition.json",
            expect.objectContaining({ definitions: { userRights: { "enum": ["edit", "move", "read"] } } }),
        );
        expect(createCommitMock.fn).toHaveBeenCalledOnce();
    });
});
