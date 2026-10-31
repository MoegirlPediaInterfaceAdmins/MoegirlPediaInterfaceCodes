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

const yamlState = vi.hoisted(() => ({ files: {} }));
vi.mock("../../modules/yamlModule.js", () => ({
    "default": {
        readFile: vi.fn((filePath) => {
            const entry = yamlState.files[filePath];
            if (entry === undefined) {
                return Promise.reject(new Error(`ENOENT: no such file '${filePath}'`));
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
});
