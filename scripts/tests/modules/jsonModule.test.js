import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile, writeFile } from "../../modules/jsonModule.js";

let tmpDir;

beforeAll(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "test-"));
});

afterAll(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

describe("jsonModule.readFile", () => {
    it("读取合法 JSON 文件返回解析后的对象", async () => {
        const file = path.join(tmpDir, "plain.json");
        await fs.promises.writeFile(file, JSON.stringify({ a: 1, b: [2, 3] }), "utf-8");

        await expect(readFile(file)).resolves.toEqual({ a: 1, b: [2, 3] });
    });

    it("type=jsonc 时容忍行注释与块注释", async () => {
        const file = path.join(tmpDir, "comment.jsonc");
        await fs.promises.writeFile(file, "{\n    // 行注释\n    \"a\": /* 块注释 */ 1,\n}\n", "utf-8");

        await expect(readFile(file, "jsonc")).resolves.toEqual({ a: 1 });
    });

    it("type=jsonc 时容忍尾随逗号（jsonc-parser 默认 allowTrailingComma）", async () => {
        const file = path.join(tmpDir, "trailing.jsonc");
        await fs.promises.writeFile(file, "{\"list\": [1, 2,],}", "utf-8");

        await expect(readFile(file, "jsonc")).resolves.toEqual({ list: [1, 2] });
    });

    it("type=jsonc 的纯注释空文档解析为 undefined（按 jsonc-parser 语义，不抛错）", async () => {
        const file = path.join(tmpDir, "only-comment.jsonc");
        await fs.promises.writeFile(file, "// nothing\n", "utf-8");

        await expect(readFile(file, "jsonc")).resolves.toBeUndefined();
    });

    it("type=jsonc 语法错误时不抛异常而是返回部分结果（jsonc-parser 容错行为）", async () => {
        const file = path.join(tmpDir, "broken.jsonc");
        await fs.promises.writeFile(file, "{ \"a\": ", "utf-8");

        await expect(readFile(file, "jsonc")).resolves.toEqual({});
    });

    it("type=json 遇到非法 JSON 时抛出 SyntaxError", async () => {
        const file = path.join(tmpDir, "broken.json");
        await fs.promises.writeFile(file, "{ \"a\": ", "utf-8");

        await expect(readFile(file)).rejects.toThrow(SyntaxError);
    });

    it("文件不存在时抛出 ENOENT 错误", async () => {
        const file = path.join(tmpDir, "not-exist.json");

        await expect(readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
    });
});

describe("jsonModule.writeFile", () => {
    it("默认以 4 空格缩进写盘并追加结尾换行", async () => {
        const file = path.join(tmpDir, "write-default.json");

        await writeFile(file, { a: 1 });

        expect(await fs.promises.readFile(file, "utf-8")).toBe("{\n    \"a\": 1\n}\n");
    });

    it("space 参数可自定义缩进宽度", async () => {
        const file = path.join(tmpDir, "write-space2.json");

        await writeFile(file, { a: 1 }, 2);

        expect(await fs.promises.readFile(file, "utf-8")).toBe("{\n  \"a\": 1\n}\n");
    });

    it("写后读往返得到原对象", async () => {
        const file = path.join(tmpDir, "round-trip.json");
        const value = { name: "萌百", nested: { list: [1, null, true] } };

        await writeFile(file, value);

        await expect(readFile(file)).resolves.toEqual(value);
    });
});
