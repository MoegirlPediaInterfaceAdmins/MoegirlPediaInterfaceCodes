import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js。
// semver 与 extractHardcodedPackages 保持真实实现——被测行为正是两者的交互
const fsState = vi.hoisted(() => ({ source: "" }));
vi.mock("node:fs", () => ({
    "default": {
        promises: {
            readFile: vi.fn(() => Promise.resolve(fsState.source)),
        },
    },
}));

vi.mock("../../modules/readDir.js", () => ({
    "default": () => ["src/gadgets/Fake/Gadget-Fake.js"],
}));

const yamlState = vi.hoisted(() => ({ whitelist: {} }));
vi.mock("../../modules/yamlModule.js", () => ({
    "default": { readFile: () => ({ whitelist: yamlState.whitelist }) },
}));

const packageInfoState = vi.hoisted(() => ({ latest: "5.0.0" }));
vi.mock("../../modules/fetchNPMPackageInfo.js", () => ({
    "default": () => ({ "dist-tags": { latest: packageInfoState.latest } }),
}));

const octokitMocks = vi.hoisted(() => ({}));
vi.mock("../../modules/octokit.js", () => {
    octokitMocks.createIssue = vi.fn();
    return {
        createIssue: octokitMocks.createIssue,
        octokitBaseOptions: { owner: "MoegirlPediaInterfaceAdmins", repo: "MoegirlPediaInterfaceCodes" },
    };
});

const importScript = async () => {
    try {
        await import("../../detectHardcodedOutdatedNPMPackages/index.js");
        return null;
    } catch (error) {
        return error;
    }
};

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    fsState.source = "";
    packageInfoState.latest = "5.0.0";
});

describe("detectHardcodedOutdatedNPMPackages", () => {
    it("不完整版本号（@3）经补全后参与比较，不再让整个扫描崩溃", async () => {
        fsState.source = "const url = \"https://npm.elemecdn.com/wikiplus-core@3/dist/Main.js\";\n";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).toHaveBeenCalledOnce();
        // 报告里保留原始引用的版本写法（3），补全只用于比较
        const replyBody = octokitMocks.createIssue.mock.calls[0][3];
        expect(replyBody).toContain("wikiplus-core): 3 -> 5.0.0");
    });

    it("本地版本不落后时（@5.0.0 对 latest 5.0.0）不建 issue", async () => {
        fsState.source = "const url = \"https://npm.elemecdn.com/wikiplus-core@5.0.0/dist/Main.js\";\n";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).not.toHaveBeenCalled();
    });

    it("完整预发布版本原样参与比较：@5.0.0-beta 对 latest 5.0.0 视为过时并建 issue", async () => {
        // coerce 会把 5.0.0-beta 剥成 5.0.0，与 latest 相等而漏报；完整版本必须不经补全直接比较
        fsState.source = "const url = \"https://npm.elemecdn.com/wikiplus-core@5.0.0-beta/dist/Main.js\";\n";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).toHaveBeenCalledOnce();
        const replyBody = octokitMocks.createIssue.mock.calls[0][3];
        expect(replyBody).toContain("wikiplus-core): 5.0.0-beta -> 5.0.0");
    });
});
