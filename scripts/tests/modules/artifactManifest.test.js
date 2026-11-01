import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// artifactManifest 经 yamlModule 读三个声明文件、经 fs 枚举 packages/ 目录；
// mock 两者使断言不依赖仓库真实清单内容，也不产生任何磁盘读取
const fsState = vi.hoisted(() => ({ dirs: {} }));
vi.mock("node:fs", () => ({
    "default": {
        promises: {
            readdir: vi.fn((dirPath) => Promise.resolve(fsState.dirs[dirPath] ?? [])),
        },
    },
}));

const yamlState = vi.hoisted(() => ({ files: {}, errors: {} }));
vi.mock("../../modules/yamlModule.js", () => ({
    "default": {
        readFile: vi.fn((filePath) => {
            const error = yamlState.errors[filePath];
            if (error) {
                return Promise.reject(error);
            }
            const entry = yamlState.files[filePath];
            if (entry === undefined) {
                // 与真实 fs.readFile 的 ENOENT 同构（带 code），被测实现的
                // 「仅 ENOENT 放行」分支依赖该字段
                return Promise.reject(Object.assign(new Error(`ENOENT: no such file '${filePath}'`), { code: "ENOENT" }));
            }
            return Promise.resolve(structuredClone(entry));
        }),
    },
}));

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    fsState.dirs = {};
    yamlState.files = {};
    yamlState.errors = {};
});

describe("artifactManifest", () => {
    it("三类来源汇总为 gadget 名到产物文件名列表的映射", async () => {
        const { artifactManifest } = await import("../../modules/artifactManifest.js");

        yamlState.files = {
            "scripts/browserify/targets.yaml": [
                { gadget: { name: "libHashwasm", fileName: "Gadget-libHashwasm.js" } },
            ],
            "scripts/vendor/targets.yaml": [
                { moduleName: "json5", distFilePath: "dist/index.js", gadget: { name: "libJSON5", fileName: "Gadget-libJSON5.js" } },
            ],
            "packages/HotCat/artifacts.yaml": ["Gadget-HotCat.js"],
        };
        fsState.dirs = {
            packages: [{ name: "HotCat", isDirectory: () => true }],
        };

        await expect(artifactManifest()).resolves.toEqual(new Map([
            ["libHashwasm", ["Gadget-libHashwasm.js"]],
            ["libJSON5", ["Gadget-libJSON5.js"]],
            ["HotCat", ["Gadget-HotCat.js"]],
        ]));
    });

    it("同一 gadget 的多个产物聚在同一列表", async () => {
        const { artifactManifest } = await import("../../modules/artifactManifest.js");

        yamlState.files = {
            "scripts/browserify/targets.yaml": [],
            "scripts/vendor/targets.yaml": [
                { gadget: { name: "prism-core", fileName: "Gadget-prism-core.js" } },
                { gadget: { name: "prism-core", fileName: "Gadget-prism-line-numbers.js" } },
                { gadget: { name: "prism-core", fileName: "Gadget-prism-line-numbers.css" } },
            ],
        };
        fsState.dirs = { packages: [] };

        await expect(artifactManifest()).resolves.toEqual(new Map([
            ["prism-core", ["Gadget-prism-core.js", "Gadget-prism-line-numbers.js", "Gadget-prism-line-numbers.css"]],
        ]));
    });

    it("packages 下无 artifacts.yaml 的目录（非 gadget 包）跳过，packages 内的文件条目忽略", async () => {
        const { artifactManifest } = await import("../../modules/artifactManifest.js");

        yamlState.files = {
            "scripts/browserify/targets.yaml": [],
            "scripts/vendor/targets.yaml": [],
        };
        fsState.dirs = {
            packages: [
                { name: "tsconfig.json", isDirectory: () => false },
                { name: "someToolPackage", isDirectory: () => true },
                { name: "UserMessages", isDirectory: () => true },
            ],
        };
        // someToolPackage 与 UserMessages 都读不到 artifacts.yaml —— 前者演示非 gadget 包被
        // 跳过的容错路径，后者演示：gadget 包缺声明同样跳过（声明文件是唯一事实来源）
        await expect(artifactManifest()).resolves.toEqual(new Map());
    });

    it("声明文件读取失败且非 ENOENT（如 YAML 语法错误、权限错误）时抛出而非跳过", async () => {
        const { artifactManifest } = await import("../../modules/artifactManifest.js");

        yamlState.files = {
            "scripts/browserify/targets.yaml": [],
            "scripts/vendor/targets.yaml": [],
        };
        yamlState.errors = {
            "packages/HotCat/artifacts.yaml": new Error("YAMLParseError: bad indentation"),
        };
        fsState.dirs = { packages: [{ name: "HotCat", isDirectory: () => true }] };

        // 静默跳过会让 manifest 缺条目，generateGadgetsDefinition 的 _files 对账将
        // 产物判为不存在而误删条目（gadget 注册丢失），必须让错误立即暴露
        await expect(artifactManifest()).rejects.toThrow("YAMLParseError");
    });

    it("声明结构不是字符串数组时抛出", async () => {
        const { artifactManifest } = await import("../../modules/artifactManifest.js");

        yamlState.files = {
            "scripts/browserify/targets.yaml": [],
            "scripts/vendor/targets.yaml": [],
            "packages/HotCat/artifacts.yaml": { files: ["Gadget-HotCat.js"] },
        };
        fsState.dirs = { packages: [{ name: "HotCat", isDirectory: () => true }] };

        await expect(artifactManifest()).rejects.toThrow("packages/HotCat/artifacts.yaml");
    });

    it("声明数组含非字符串元素时抛出", async () => {
        const { artifactManifest } = await import("../../modules/artifactManifest.js");

        yamlState.files = {
            "scripts/browserify/targets.yaml": [],
            "scripts/vendor/targets.yaml": [],
            "packages/HotCat/artifacts.yaml": ["Gadget-HotCat.js", 42],
        };
        fsState.dirs = { packages: [{ name: "HotCat", isDirectory: () => true }] };

        await expect(artifactManifest()).rejects.toThrow("packages/HotCat/artifacts.yaml");
    });
});

describe("assertGeneratedArtifactsDeclared", () => {
    it("磁盘产物全部已在清单中声明时通过", async () => {
        const { assertGeneratedArtifactsDeclared } = await import("../../modules/artifactManifest.js");

        yamlState.files = {
            "scripts/browserify/targets.yaml": [],
            "scripts/vendor/targets.yaml": [
                { gadget: { name: "libJSON5", fileName: "Gadget-libJSON5.js" } },
            ],
            "packages/HotCat/artifacts.yaml": ["Gadget-HotCat.js"],
        };
        fsState.dirs = {
            packages: [{ name: "HotCat", isDirectory: () => true }],
            "dist/_generated/gadgets": [{ name: "libJSON5", isDirectory: () => true }, { name: "HotCat", isDirectory: () => true }],
            "dist/_generated/gadgets/libJSON5": [{ name: "Gadget-libJSON5.js", isDirectory: () => false }],
            "dist/_generated/gadgets/HotCat": [{ name: "Gadget-HotCat.js", isDirectory: () => false }],
        };

        await expect(assertGeneratedArtifactsDeclared()).resolves.toBeUndefined();
    });

    it("磁盘产物未在清单中声明时抛错并列出文件与修复入口", async () => {
        const { assertGeneratedArtifactsDeclared } = await import("../../modules/artifactManifest.js");

        // 模拟新增包忘写 packages/NewGadget/artifacts.yaml：构建已写出产物但清单缺条目
        yamlState.files = {
            "scripts/browserify/targets.yaml": [],
            "scripts/vendor/targets.yaml": [],
        };
        fsState.dirs = {
            packages: [{ name: "NewGadget", isDirectory: () => true }],
            "dist/_generated/gadgets": [{ name: "NewGadget", isDirectory: () => true }],
            "dist/_generated/gadgets/NewGadget": [{ name: "Gadget-NewGadget.js", isDirectory: () => false }],
        };

        // 不拦截的话，generateGadgetsDefinition 会把该产物判为 unexist 而静默删条目
        await expect(assertGeneratedArtifactsDeclared()).rejects.toThrow("NewGadget/Gadget-NewGadget.js");
    });

    it("清单中声明但磁盘上不存在的产物不触发报错（只校验磁盘 ⊆ 清单）", async () => {
        const { assertGeneratedArtifactsDeclared } = await import("../../modules/artifactManifest.js");

        // 单独执行 package:build 时磁盘上只有 packages 产物，browserify/vendor 产物尚未生成；
        // 清单 ⊆ 磁盘的方向由构建链完整性保证，不在本校验范围
        yamlState.files = {
            "scripts/browserify/targets.yaml": [
                { gadget: { name: "libHashwasm", fileName: "Gadget-libHashwasm.js" } },
            ],
            "scripts/vendor/targets.yaml": [
                { gadget: { name: "libJSON5", fileName: "Gadget-libJSON5.js" } },
            ],
        };
        fsState.dirs = {
            packages: [],
            "dist/_generated/gadgets": [],
        };

        await expect(assertGeneratedArtifactsDeclared()).resolves.toBeUndefined();
    });
});
