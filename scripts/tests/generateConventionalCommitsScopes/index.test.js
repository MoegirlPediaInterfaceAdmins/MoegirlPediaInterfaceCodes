import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js
const fsState = vi.hoisted(() => ({ dirs: {} }));
vi.mock("node:fs", () => ({
    "default": {
        promises: {
            // readdir 按路径查表；未登记的路径按 ENOTDIR 拒绝，用于模拟「把文件当目录读」
            readdir: vi.fn((dirPath) => {
                const entry = fsState.dirs[dirPath];
                if (entry === undefined) {
                    const error = new Error(`ENOTDIR: not a directory, readdir '${dirPath}'`);
                    error.code = "ENOTDIR";
                    return Promise.reject(error);
                }
                return Promise.resolve(entry);
            }),
        },
    },
}));

const jsonModuleMock = vi.hoisted(() => ({}));
vi.mock("../../modules/jsonModule.js", () => {
    jsonModuleMock.writeFile = vi.fn();
    return {
        "default": {
            readFile: vi.fn(() => ({ settings: true })),
            writeFile: jsonModuleMock.writeFile,
        },
    };
});

vi.mock("../../modules/createCommit.js", () => ({ "default": vi.fn() }));

const dirent = (name, isDirectory = true) => ({ name, isDirectory: () => isDirectory });

const importScript = async () => {
    try {
        await import("../../generateConventionalCommitsScopes/index.js");
        return null;
    } catch (error) {
        return error;
    }
};

const getScopes = () => jsonModuleMock.writeFile.mock.calls[0][1]["conventionalCommits.scopes"];

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    fsState.dirs = {};
});

describe("generateConventionalCommitsScopes", () => {
    it("sites 目录中的杂项文件被忽略，不会触发 ENOTDIR 崩溃", async () => {
        fsState.dirs = {
            src: [dirent("alpha")],
            "src/alpha": [dirent("alpha-site"), dirent("README.md", false)],
            "src/alpha/alpha-site": ["Item1.js"],
            packages: [],
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(getScopes()).toEqual(["Alpha/Item1"]);
    });

    it("顶层类型与包列表显式排序，不依赖 readdir 返回顺序", async () => {
        // src 与 packages 都按与期望相反的顺序登记，若代码沿用枚举顺序，生成结果即随之颠倒
        fsState.dirs = {
            src: [dirent("zeta"), dirent("alpha")],
            "src/zeta": [dirent("zeta-site")],
            "src/zeta/zeta-site": ["Item2.js"],
            "src/alpha": [dirent("alpha-site")],
            "src/alpha/alpha-site": ["Item1.js"],
            packages: [dirent("pkg-b"), dirent("pkg-a")],
        };
        const rejection = await importScript();
        expect(rejection).toBeNull();
        expect(getScopes()).toEqual(["Alpha/Item1", "Zeta/Item2", "Package/pkg-a", "Package/pkg-b"]);
    });
});
