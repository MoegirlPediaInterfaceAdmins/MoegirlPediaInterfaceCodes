import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import readDir from "../../modules/readDir.js";

let tmpDir;

// 各用例的目录统一收集，测试结束递归清理；flat / empty 用例必须建在独立根下——
// 若建在 tmpDir 内部，乱序执行时其条目会泄漏进前两个用例的全树断言
const createdDirs = [];

beforeAll(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "test-"));
    createdDirs.push(tmpDir);
    // 结构：
    // tmp/
    //   top.txt
    //   a/
    //     mid.txt
    //     b/
    //       deep.txt
    await fs.promises.mkdir(path.join(tmpDir, "a/b"), { recursive: true });
    await fs.promises.writeFile(path.join(tmpDir, "top.txt"), "");
    await fs.promises.writeFile(path.join(tmpDir, "a/mid.txt"), "");
    await fs.promises.writeFile(path.join(tmpDir, "a/b/deep.txt"), "");
});

afterAll(async () => {
    for (const dir of createdDirs) {
        await fs.promises.rm(dir, { recursive: true, force: true });
    }
});

describe("readDir", () => {
    it("递归读取嵌套目录，返回目录与文件的绝对路径（含目录条目）", async () => {
        const entries = await readDir(tmpDir);

        // readdir 的返回顺序未指定，两侧统一排序后比较
        expect([...entries].sort()).toEqual([
            path.join(tmpDir, "a"),
            path.join(tmpDir, "a/b"),
            path.join(tmpDir, "a/b/deep.txt"),
            path.join(tmpDir, "a/mid.txt"),
            path.join(tmpDir, "top.txt"),
        ].sort());
    });

    it("removePrefix=true 时返回相对路径（保留目录层级与目录条目）", async () => {
        const entries = await readDir(tmpDir, true);

        expect([...entries].sort()).toEqual([
            "a",
            "a/b",
            "a/b/deep.txt",
            "a/mid.txt",
            "top.txt",
        ].sort());
    });

    it("单层目录只返回其中的文件", async () => {
        const flat = await fs.promises.mkdtemp(path.join(os.tmpdir(), "test-"));
        createdDirs.push(flat);
        await fs.promises.writeFile(path.join(flat, "one.txt"), "");
        await fs.promises.writeFile(path.join(flat, "two.txt"), "");

        await expect((await readDir(flat)).sort()).toEqual([
            path.join(flat, "one.txt"),
            path.join(flat, "two.txt"),
        ].sort());
    });

    it("空目录返回空数组", async () => {
        const empty = await fs.promises.mkdtemp(path.join(os.tmpdir(), "test-"));
        createdDirs.push(empty);

        await expect(readDir(empty)).resolves.toEqual([]);
    });
});
