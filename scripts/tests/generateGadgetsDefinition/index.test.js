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
});
