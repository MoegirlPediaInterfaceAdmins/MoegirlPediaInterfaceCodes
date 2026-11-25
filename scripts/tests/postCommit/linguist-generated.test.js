import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js
const fsState = vi.hoisted(() => ({ files: {}, writes: {} }));
vi.mock("node:fs", () => ({
    "default": {
        promises: {
            readFile: vi.fn((filePath) => {
                const entry = fsState.files[filePath];
                if (entry === undefined) {
                    return Promise.reject(Object.assign(new Error(`ENOENT: no such file '${filePath}'`), { code: "ENOENT" }));
                }
                return Promise.resolve(entry);
            }),
            writeFile: vi.fn((filePath, content) => {
                fsState.writes[filePath] = content;
                return Promise.resolve();
            }),
        },
    },
}));

const yamlState = vi.hoisted(() => ({ files: {} }));
vi.mock("../../modules/yamlModule.js", async (importOriginal) => {
    const { parseDocument } = await import("yaml");
    const { syncSeq } = await importOriginal();
    const readDocumentFile = vi.fn((filePath) => {
        const entry = yamlState.files[filePath];
        if (typeof entry !== "string") {
            return Promise.reject(new Error(`ENOENT: no such file '${filePath}'`));
        }
        return Promise.resolve(parseDocument(entry));
    });
    yamlState.writeDocumentFile = vi.fn();
    return {
        "default": {
            readFile: vi.fn(),
            writeFile: vi.fn(),
            readDocumentFile,
            writeDocumentFile: yamlState.writeDocumentFile,
        },
        readFile: vi.fn(),
        writeFile: vi.fn(),
        readDocumentFile,
        syncSeq,
        writeDocumentFile: yamlState.writeDocumentFile,
    };
});

// buildManagedLines 返回固定产物（其自身行为由 linguist-generated-utils.test.js 覆盖），
// stripManagedBlocks 保持真实实现（脚本用它剥离旧生成段）
vi.mock("../../postCommit/linguist-generated-utils.js", async (importOriginal) => ({
    ...await importOriginal(),
    buildManagedLines: vi.fn(() => ({
        managedLines: ["# From fixtures", "src/gadgets/Foo/x.css linguist-generated=true"],
        cssFiles: ["src/gadgets/Foo/x.css"],
        foldersForCodeQL: ["src/gadgets/Foo", "src/gadgets/Bar"],
    })),
}));

const createCommitMock = vi.hoisted(() => ({}));
vi.mock("../../modules/createCommit.js", () => {
    createCommitMock.fn = vi.fn(() => Promise.resolve(false));
    return { "default": createCommitMock.fn };
});

const importScript = async () => {
    try {
        await import("../../postCommit/linguist-generated.js");
        return null;
    } catch (error) {
        return error;
    }
};

beforeEach(() => {
    vi.resetModules();
    fsState.files = { ".gitattributes": "*.js text\n" };
    fsState.writes = {};
    yamlState.files = {
        ".stylelintrc.yaml": [
            "extends: stylelint-config-standard",
            "",
            "ignoreFiles:",
            "  - dist/**/*.css",
            "",
            "rules:",
            "  # rb 已被 HTML 规范弃用，但站内 Ruby 模板仍会输出 rb 标记",
            "  selector-no-deprecated: null",
            "",
        ].join("\n"),
        ".github/codeql-config.yaml": [
            "paths-ignore:",
            "  - src/gadgets/Foo",
            "  - src/gadgets/Baz",
            "",
        ].join("\n"),
    };
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("postCommit/linguist-generated", () => {
    it("stylelintrc 的 ignoreFiles 同步为 cssFiles，其余注释原样保留", async () => {
        const rejection = await importScript();
        expect(rejection).toBeNull();

        const [path, doc] = yamlState.writeDocumentFile.mock.calls.find(([p]) => p === ".stylelintrc.yaml");
        expect(path).toBe(".stylelintrc.yaml");
        expect(doc.toJS().ignoreFiles).toEqual(["src/gadgets/Foo/x.css"]);
        const written = doc.toString();
        // dist 旧条目被移除；rules 段的注释与键序不受 ignoreFiles 同步影响
        expect(written).toContain("# rb 已被 HTML 规范弃用，但站内 Ruby 模板仍会输出 rb 标记");
        expect(written).not.toContain("dist/**/*.css");
    });

    it("codeql-config 的 paths-ignore 只追加缺失的目录，既有条目不重复", async () => {
        const rejection = await importScript();
        expect(rejection).toBeNull();

        const [, doc] = yamlState.writeDocumentFile.mock.calls.find(([p]) => p === ".github/codeql-config.yaml");
        expect(doc.toJS()["paths-ignore"]).toEqual([
            "src/gadgets/Foo",
            "src/gadgets/Baz",
            "src/gadgets/Bar",
        ]);
    });

    it(".gitattributes 在手工内容之后重建生成段围栏", async () => {
        const rejection = await importScript();
        expect(rejection).toBeNull();

        const written = fsState.writes[".gitattributes"];
        expect(written).toContain("*.js text");
        expect(written).toContain("# >>> managed by scripts/postCommit/linguist-generated.js >>>");
        expect(written).toContain("src/gadgets/Foo/x.css linguist-generated=true");
        expect(written).toContain("# <<< managed <<<");
    });

    it("两个生成文件各自走一次写入与提交", async () => {
        const rejection = await importScript();
        expect(rejection).toBeNull();

        expect(yamlState.writeDocumentFile).toHaveBeenCalledTimes(2);
        expect(createCommitMock.fn).toHaveBeenCalledTimes(3);
    });
});
