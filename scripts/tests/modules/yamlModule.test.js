import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile, writeFile } from "../../modules/yamlModule.js";

let tmpDir;

beforeAll(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "test-"));
});

afterAll(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

describe("yamlModule.readFile", () => {
    it("读取 YAML 文件返回解析后的对象", async () => {
        const file = path.join(tmpDir, "plain.yaml");
        await fs.promises.writeFile(file, "a: 1\nb:\n  - x\n  - y\n", "utf-8");

        await expect(readFile(file)).resolves.toEqual({ a: 1, b: ["x", "y"] });
    });

    it("对文件扩展名没有要求（按实现直接读任意路径）", async () => {
        const file = path.join(tmpDir, "data.conf");
        await fs.promises.writeFile(file, "key: value\n", "utf-8");

        await expect(readFile(file)).resolves.toEqual({ key: "value" });
    });

    it("文件不存在时抛出 ENOENT 错误", async () => {
        const file = path.join(tmpDir, "not-exist.yaml");

        await expect(readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
    });
});

describe("yamlModule.writeFile", () => {
    it("单个顶层键直接紧凑写出并以换行结尾", async () => {
        const file = path.join(tmpDir, "single.yaml");

        await writeFile(file, { a: 1 });

        expect(await fs.promises.readFile(file, "utf-8")).toBe("a: 1\n");
    });

    it("多个顶层键之间插入空行（实现的分节格式化行为）", async () => {
        const file = path.join(tmpDir, "multi.yaml");

        await writeFile(file, { a: 1, b: 2 });

        expect(await fs.promises.readFile(file, "utf-8")).toBe("a: 1\n\nb: 2\n");
    });

    it("嵌套结构保持原缩进不被插入空行", async () => {
        const file = path.join(tmpDir, "nested.yaml");

        await writeFile(file, { c: { d: 2 } });

        expect(await fs.promises.readFile(file, "utf-8")).toBe("c:\n  d: 2\n");
    });

    it("数组与嵌套混合时仅顶层键分节、子项保持紧凑", async () => {
        const file = path.join(tmpDir, "mixed.yaml");

        await writeFile(file, { a: 1, b: [1, 2], c: { d: "x" } });

        expect(await fs.promises.readFile(file, "utf-8")).toBe("a: 1\n\nb:\n  - 1\n  - 2\n\nc:\n  d: x\n");
    });

    it("标量值原样单行写出", async () => {
        const file = path.join(tmpDir, "scalar.yaml");

        await writeFile(file, "plain");

        expect(await fs.promises.readFile(file, "utf-8")).toBe("plain\n");
    });

    it("写后读往返得到原对象", async () => {
        const file = path.join(tmpDir, "round-trip.yaml");
        const value = { name: "萌百", list: [1, 2], nested: { flag: true, deep: { k: null } } };

        await writeFile(file, value);

        await expect(readFile(file)).resolves.toEqual(value);
    });
});
