import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js
const fsState = vi.hoisted(() => ({ dirs: {} }));
vi.mock("node:fs", () => ({
    "default": {
        promises: {
            readdir: vi.fn((dirPath) => Promise.resolve(fsState.dirs[dirPath] ?? [])),
        },
    },
}));

// readFile 返回深拷贝：脚本会对读到的 definition/list 原地修改，不能让用例间共享可变状态
const yamlState = vi.hoisted(() => ({ files: {} }));
vi.mock("../../modules/yamlModule.js", () => {
    yamlState.writeFile = vi.fn();
    return {
        "default": {
            readFile: vi.fn((filePath) => {
                const entry = yamlState.files[filePath];
                if (entry === undefined) {
                    return Promise.reject(new Error(`ENOENT: no such file '${filePath}'`));
                }
                return Promise.resolve(structuredClone(entry));
            }),
            writeFile: yamlState.writeFile,
        },
    };
});

const createCommitMock = vi.hoisted(() => ({}));
vi.mock("../../modules/createCommit.js", () => {
    createCommitMock.fn = vi.fn();
    return { "default": createCommitMock.fn };
});

const importScript = async () => {
    try {
        await import("../../generateGadgetsDefinition/index.js");
        return null;
    } catch (error) {
        return error;
    }
};

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    fsState.dirs = {};
    yamlState.files = {};
});

// index.js 会经 artifactManifest 读 browserify/vendor 的 targets.yaml 并枚举 packages/；
// 既有用例不涉及产物对账，统一登记空来源（packages/ 未登记时 readdir mock 返回 []）
const emptyManifestSources = {
    "scripts/browserify/targets.yaml": [],
    "scripts/vendor/targets.yaml": [],
};

describe("generateGadgetsDefinition", () => {
    it("gadget 枚举显式排序，生成列表不依赖 readdir 返回顺序", async () => {
        // 目录按与期望相反的顺序登记；definition 的 _files 与磁盘文件一致，聚焦排序行为本身
        fsState.dirs = {
            "src/gadgets": [
                { name: "B-gadget", isDirectory: () => true },
                { name: "A-gadget", isDirectory: () => true },
            ],
            "src/gadgets/A-gadget": ["Gadget-A-gadget.js"],
            "src/gadgets/B-gadget": ["Gadget-B-gadget.js"],
        };
        yamlState.files = {
            ...emptyManifestSources,
            "src/gadgets/Gadgets-definition-list.yaml": [{ name: "S", gadgets: [] }],
            "src/gadgets/A-gadget/definition.yaml": { _section: "S", _files: ["Gadget-A-gadget.js"] },
            "src/gadgets/B-gadget/definition.yaml": { _section: "S", _files: ["Gadget-B-gadget.js"] },
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const listPath = Object.keys(yamlState.files).find((key) => key.endsWith("Gadgets-definition-list.yaml"));
        expect(yamlState.writeFile).toHaveBeenCalledWith(
            listPath,
            [{ name: "S", gadgets: ["A-gadget", "B-gadget"] }],
        );
        expect(createCommitMock.fn).toHaveBeenCalledOnce();
    });

    it("gadget 内文件列表显式排序，未登记文件按稳定顺序追加进 definition.yaml", async () => {
        // 目录内文件逆序返回，模拟跨环境 readdir 顺序差异；definition 已登记主文件，
        // 两个未登记文件应按排序顺序追加，而不是照 readdir 顺序
        fsState.dirs = {
            "src/gadgets": [{ name: "A-gadget", isDirectory: () => true }],
            "src/gadgets/A-gadget": ["zeta.css", "main.js", "Gadget-A-gadget.js"],
        };
        yamlState.files = {
            ...emptyManifestSources,
            "src/gadgets/Gadgets-definition-list.yaml": [{ name: "S", gadgets: [] }],
            "src/gadgets/A-gadget/definition.yaml": { _section: "S", _files: ["Gadget-A-gadget.js"] },
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(yamlState.writeFile).toHaveBeenCalledWith(
            "src/gadgets/A-gadget/definition.yaml",
            { _section: "S", _files: ["Gadget-A-gadget.js", "main.js", "zeta.css"] },
        );
    });

    it("manifest 声明的产物文件不在目录中时，_files 既有条目不判为 unexist", async () => {
        // 产物不入库：libHashwasm 目录下只剩 definition.yaml，产物文件名仅存在于 manifest
        fsState.dirs = {
            "src/gadgets": [{ name: "libHashwasm", isDirectory: () => true }],
            "src/gadgets/libHashwasm": [],
        };
        yamlState.files = {
            "scripts/browserify/targets.yaml": [
                { gadget: { name: "libHashwasm", fileName: "Gadget-libHashwasm.js" } },
            ],
            "scripts/vendor/targets.yaml": [],
            "src/gadgets/Gadgets-definition-list.yaml": [{ name: "S", gadgets: [] }],
            "src/gadgets/libHashwasm/definition.yaml": { _section: "S", _files: ["Gadget-libHashwasm.js"] },
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        // _files 与「目录 ∪ manifest」一致：definition.yaml 无变更，不触发对它的写入与提交
        const definitionWrite = yamlState.writeFile.mock.calls.filter(([filePath]) => filePath.endsWith("definition.yaml"));
        expect(definitionWrite).toEqual([]);
    });

    it("definition.yaml 缺登记的 manifest 产物按未登记文件追加", async () => {
        fsState.dirs = {
            "src/gadgets": [{ name: "libHashwasm", isDirectory: () => true }],
            "src/gadgets/libHashwasm": [],
        };
        yamlState.files = {
            "scripts/browserify/targets.yaml": [
                { gadget: { name: "libHashwasm", fileName: "Gadget-libHashwasm.js" } },
            ],
            "scripts/vendor/targets.yaml": [],
            "src/gadgets/Gadgets-definition-list.yaml": [{ name: "S", gadgets: [] }],
            "src/gadgets/libHashwasm/definition.yaml": { _section: "S", _files: [] },
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(yamlState.writeFile).toHaveBeenCalledWith(
            "src/gadgets/libHashwasm/definition.yaml",
            { _section: "S", _files: ["Gadget-libHashwasm.js"] },
        );
    });
});
