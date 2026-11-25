import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js。
// semver 与 extractHardcodedPackages 保持真实实现——被测行为正是两者的交互
const state = vi.hoisted(() => ({
    fsSource: "",
    sources: {},
    readDirFiles: ["src/gadgets/Fake/Gadget-Fake.js"],
    whitelist: {},
    latest: "5.0.0",
}));

vi.mock("node:fs", () => ({
    "default": {
        promises: {
            readFile: vi.fn((filePath) => Promise.resolve(state.sources[filePath] ?? state.fsSource)),
        },
    },
}));

vi.mock("../../modules/readDir.js", () => ({
    "default": () => state.readDirFiles,
}));

vi.mock("../../modules/yamlModule.js", () => ({
    "default": { readFile: () => ({ whitelist: state.whitelist }) },
}));

const fetchNPMPackageInfo = vi.hoisted(() => vi.fn());
vi.mock("../../modules/fetchNPMPackageInfo.js", () => ({
    "default": fetchNPMPackageInfo,
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
    fetchNPMPackageInfo.mockImplementation(() => ({ "dist-tags": { latest: state.latest } }));
    process.exitCode = 0;
});

afterEach(() => {
    state.fsSource = "";
    state.sources = {};
    state.readDirFiles = ["src/gadgets/Fake/Gadget-Fake.js"];
    state.whitelist = {};
    state.latest = "5.0.0";
    fetchNPMPackageInfo.mockReset();
    octokitMocks.createIssue.mockReset();
    process.exitCode = 0;
});

describe("detectHardcodedOutdatedNPMPackages", () => {
    it("不完整版本号（@3）经补全后参与比较，不再让整个扫描崩溃", async () => {
        state.fsSource = "const url = \"https://npm.elemecdn.com/wikiplus-core@3/dist/Main.js\";\n";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).toHaveBeenCalledOnce();
        // 报告里保留原始引用的版本写法（3），补全只用于比较
        const replyBody = octokitMocks.createIssue.mock.calls[0][3];
        expect(replyBody).toContain("wikiplus-core): 3 -> 5.0.0");
    });

    it("本地版本不落后时（@5.0.0 对 latest 5.0.0）不建 issue", async () => {
        state.fsSource = "const url = \"https://npm.elemecdn.com/wikiplus-core@5.0.0/dist/Main.js\";\n";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).not.toHaveBeenCalled();
    });

    it("完整预发布版本原样参与比较：@5.0.0-beta 对 latest 5.0.0 视为过时并建 issue", async () => {
        // coerce 会把 5.0.0-beta 剥成 5.0.0，与 latest 相等而漏报；完整版本必须不经补全直接比较
        state.fsSource = "const url = \"https://npm.elemecdn.com/wikiplus-core@5.0.0-beta/dist/Main.js\";\n";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).toHaveBeenCalledOnce();
        const replyBody = octokitMocks.createIssue.mock.calls[0][3];
        expect(replyBody).toContain("wikiplus-core): 5.0.0-beta -> 5.0.0");
    });

    it("jsDelivr 的固定版本引用能端到端建 issue", async () => {
        state.fsSource = "await libCachedCode.injectCachedCode(\"https://testingcf.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js\", \"script\");\n";
        state.latest = "6.1.0";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).toHaveBeenCalledOnce();
        const replyBody = octokitMocks.createIssue.mock.calls[0][3];
        expect(replyBody).toContain("echarts): 5.5.1 -> 6.1.0");
    });

    it("作用域包以完整包名查询 registry 并正确报告", async () => {
        state.fsSource = "const url = \"https://cdn.jsdelivr.net/npm/@scope/pkg@1.0.0/dist/index.js\";\n";
        state.latest = "2.0.0";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(fetchNPMPackageInfo).toHaveBeenCalledWith("@scope/pkg");
        expect(octokitMocks.createIssue).toHaveBeenCalledOnce();
        const replyBody = octokitMocks.createIssue.mock.calls[0][3];
        expect(replyBody).toContain("@scope/pkg): 1.0.0 -> 2.0.0");
    });

    it("白名单命中的包不查询 registry、不建 issue", async () => {
        state.fsSource = "const url = \"https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js\";\n";
        state.latest = "6.1.0";
        state.whitelist = { "src/gadgets/Fake/Gadget-Fake.js": ["echarts@5.5.1"] };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(fetchNPMPackageInfo).not.toHaveBeenCalled();
        expect(octokitMocks.createIssue).not.toHaveBeenCalled();
    });

    it("源码路径为反斜杠时白名单仍按正斜杠路径命中", async () => {
        state.readDirFiles = ["src\\gadgets\\Fake\\Gadget-Fake.js"];
        state.fsSource = "const url = \"https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js\";\n";
        state.latest = "6.1.0";
        state.whitelist = { "src/gadgets/Fake/Gadget-Fake.js": ["echarts@5.5.1"] };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).not.toHaveBeenCalled();
    });

    it("仅含 tag 引用（@latest）的文件不查询 registry、不建 issue", async () => {
        state.fsSource = "const url = \"https://npm.elemecdn.com/wikiplus-core@latest\";\n";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(fetchNPMPackageInfo).not.toHaveBeenCalled();
        expect(octokitMocks.createIssue).not.toHaveBeenCalled();
    });

    it("单个包查询 registry 失败时跳过该包、继续扫描其余文件，并以非零退出码收尾", async () => {
        state.readDirFiles = ["src/gadgets/Fake/A.js", "src/gadgets/Fake/B.js"];
        state.sources = {
            "src/gadgets/Fake/A.js": "const url = \"https://cdn.jsdelivr.net/npm/broken@1.0.0/index.js\";\n",
            "src/gadgets/Fake/B.js": "const url = \"https://cdn.jsdelivr.net/npm/healthy@1.0.0/index.js\";\n",
        };
        state.latest = "2.0.0";
        fetchNPMPackageInfo.mockImplementation((pkg) => pkg === "broken"
            ? Promise.reject(new Error("registry down"))
            : Promise.resolve({ "dist-tags": { latest: state.latest } }));
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(fetchNPMPackageInfo).toHaveBeenCalledTimes(2);
        expect(octokitMocks.createIssue).toHaveBeenCalledOnce();
        expect(octokitMocks.createIssue.mock.calls[0][3]).toContain("healthy): 1.0.0 -> 2.0.0");
        expect(process.exitCode).toBe(1);
    });

    it("所有包查询成功时不设置非零退出码", async () => {
        state.fsSource = "const url = \"https://cdn.jsdelivr.net/npm/healthy@1.0.0/index.js\";\n";
        state.latest = "2.0.0";
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(octokitMocks.createIssue).toHaveBeenCalledOnce();
        expect(process.exitCode).toBe(0);
    });
});
