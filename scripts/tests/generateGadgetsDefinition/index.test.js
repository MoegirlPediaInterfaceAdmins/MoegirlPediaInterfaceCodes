import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；这类 import 即执行 I/O 的模块，
// 其 mock 处理惯例见 createCommit.test.js
const fsState = vi.hoisted(() => ({ dirs: {} }));
vi.mock("node:fs", () => ({
    "default": {
        promises: {
            readdir: vi.fn((dirPath) => Promise.resolve(fsState.dirs[dirPath] ?? [])),
        },
    },
}));

const yamlState = vi.hoisted(() => ({ files: {} }));
vi.mock("../../modules/yamlModule.js", async (importOriginal) => {
    const { parseDocument } = await import("yaml");
    const { syncSeq } = await importOriginal();
    // default 与 named 两种导入形态都会被用到（artifactManifest 走 default，index 走 named），
    // 因此两处都挂同一组实现
    const readFile = vi.fn((filePath) => {
        const entry = yamlState.files[filePath];
        if (entry === undefined) {
            return Promise.reject(new Error(`ENOENT: no such file '${filePath}'`));
        }
        return Promise.resolve(structuredClone(entry));
    });
    // definition/list 走源字符串 → parseDocument（天然每次新 doc，用例间无共享状态）
    const readDocumentFile = vi.fn((filePath) => {
        const entry = yamlState.files[filePath];
        if (typeof entry !== "string") {
            return Promise.reject(new Error(`ENOENT: no such file '${filePath}'`));
        }
        return Promise.resolve(parseDocument(entry));
    });
    yamlState.writeDocumentFile = vi.fn((filePath, doc) => {
        yamlState.files[filePath] = doc.toString();
        return Promise.resolve();
    });
    return {
        "default": { readFile, writeFile: vi.fn(), readDocumentFile, writeDocumentFile: yamlState.writeDocumentFile },
        readFile,
        readDocumentFile,
        syncSeq,
        writeDocumentFile: yamlState.writeDocumentFile,
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
            "src/gadgets/Gadgets-definition-list.yaml": "- name: S\n  gadgets: []\n",
            "src/gadgets/A-gadget/definition.yaml": "_section: S\n_files:\n  - Gadget-A-gadget.js\n",
            "src/gadgets/B-gadget/definition.yaml": "_section: S\n_files:\n  - Gadget-B-gadget.js\n",
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const listPath = Object.keys(yamlState.files).find((key) => key.endsWith("Gadgets-definition-list.yaml"));
        const listWrite = yamlState.writeDocumentFile.mock.calls.filter(([filePath]) => filePath === listPath);
        expect(listWrite).toHaveLength(1);
        expect(listWrite[0][1].toJS()).toEqual([{ name: "S", gadgets: ["A-gadget", "B-gadget"] }]);
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
            "src/gadgets/Gadgets-definition-list.yaml": "- name: S\n  gadgets: []\n",
            "src/gadgets/A-gadget/definition.yaml": "_section: S\n_files:\n  - Gadget-A-gadget.js\n",
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const defWrite = yamlState.writeDocumentFile.mock.calls.filter(([filePath]) => filePath === "src/gadgets/A-gadget/definition.yaml");
        expect(defWrite).toHaveLength(1);
        expect(defWrite[0][1].toJS()).toEqual({ _section: "S", _files: ["Gadget-A-gadget.js", "main.js", "zeta.css"] });
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
            "src/gadgets/Gadgets-definition-list.yaml": "- name: S\n  gadgets: []\n",
            "src/gadgets/libHashwasm/definition.yaml": "_section: S\n_files:\n  - Gadget-libHashwasm.js\n",
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        // _files 与「目录 ∪ manifest」一致：definition.yaml 无变更，不触发对它的写入与提交
        const definitionWrite = yamlState.writeDocumentFile.mock.calls.filter(([filePath]) => filePath.endsWith("definition.yaml"));
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
            "src/gadgets/Gadgets-definition-list.yaml": "- name: S\n  gadgets: []\n",
            "src/gadgets/libHashwasm/definition.yaml": "_section: S\n_files: []\n",
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const defWrite = yamlState.writeDocumentFile.mock.calls.filter(([filePath]) => filePath === "src/gadgets/libHashwasm/definition.yaml");
        expect(defWrite).toHaveLength(1);
        expect(defWrite[0][1].toJS()).toEqual({ _section: "S", _files: ["Gadget-libHashwasm.js"] });
    });

    it("definition.yaml 变更只同步 _files，其余键及其注释原样保留", async () => {
        // _files 之外还有带注释的键：写出后 _files 更新、注释仍在
        fsState.dirs = {
            "src/gadgets": [{ name: "A-gadget", isDirectory: () => true }],
            "src/gadgets/A-gadget": ["Gadget-A-gadget.js", "main.js"],
        };
        yamlState.files = {
            ...emptyManifestSources,
            "src/gadgets/Gadgets-definition-list.yaml": "- name: S\n  gadgets: []\n",
            "src/gadgets/A-gadget/definition.yaml": [
                "# skins 为空表示全站生效",
                "skins: []",
                "_section: S",
                "_files:",
                "  - Gadget-A-gadget.js",
                "",
            ].join("\n"),
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const defWrite = yamlState.writeDocumentFile.mock.calls.filter(([filePath]) => filePath === "src/gadgets/A-gadget/definition.yaml");
        expect(defWrite).toHaveLength(1);
        const written = yamlState.files["src/gadgets/A-gadget/definition.yaml"];
        // 断言注释位置：仍在所述键上方，而不是仅存在于文件某处
        expect(written.indexOf("# skins 为空表示全站生效")).toBeLessThan(written.indexOf("skins: []"));
        expect(written).toContain("- main.js");
    });

    it("Gadgets-definition-list.yaml 既有 section 内注释在追加 gadget 后保留", async () => {
        // section 已含 B-gadget 且带注释；A-gadget 追加后注释与既有条目均不变
        // （B-gadget 的目录必须存在，否则清理段会把它当作失效条目删除）
        fsState.dirs = {
            "src/gadgets": [
                { name: "A-gadget", isDirectory: () => true },
                { name: "B-gadget", isDirectory: () => true },
            ],
            "src/gadgets/A-gadget": ["Gadget-A-gadget.js"],
            "src/gadgets/B-gadget": ["Gadget-B-gadget.js"],
        };
        yamlState.files = {
            ...emptyManifestSources,
            "src/gadgets/Gadgets-definition-list.yaml": [
                "- name: S",
                "  # 浏览类小工具",
                "  gadgets:",
                "    - B-gadget",
                "",
            ].join("\n"),
            "src/gadgets/A-gadget/definition.yaml": "_section: S\n_files:\n  - Gadget-A-gadget.js\n",
            "src/gadgets/B-gadget/definition.yaml": "_section: S\n_files:\n  - Gadget-B-gadget.js\n",
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const written = yamlState.files["src/gadgets/Gadgets-definition-list.yaml"];
        // 断言注释位置：仍在 gadgets 键上方，而不是仅存在于文件某处
        expect(written.indexOf("# 浏览类小工具")).toBeLessThan(written.indexOf("gadgets:"));
        expect(written).toContain("- B-gadget");
        expect(written).toContain("- A-gadget");
    });
});
