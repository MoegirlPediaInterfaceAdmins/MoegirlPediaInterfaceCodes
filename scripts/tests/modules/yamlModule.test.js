import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readDocumentFile, readFile, syncSeq, writeFile, writeDocumentFile } from "../../modules/yamlModule.js";

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

describe("yamlModule.readDocumentFile", () => {
    it("保留注释与空行结构", async () => {
        const file = path.join(tmpDir, "doc-comment.yaml");
        await fs.promises.writeFile(file, "# 顶部注释\n\na: 1\n\n# b 的说明\nb:\n  - x\n", "utf-8");

        const doc = await readDocumentFile(file);

        expect(doc.get("a")).toBe(1);
        expect(doc.toString()).toBe("# 顶部注释\n\na: 1\n\n# b 的说明\nb:\n  - x\n");
    });

    it("损坏的 YAML 经 errors 抛错而不是静默返回", async () => {
        const file = path.join(tmpDir, "doc-broken.yaml");
        await fs.promises.writeFile(file, "a: [unclosed\n", "utf-8");

        await expect(readDocumentFile(file)).rejects.toThrow();
    });

    it("文件不存在时抛出 ENOENT 错误", async () => {
        const file = path.join(tmpDir, "doc-not-exist.yaml");

        await expect(readDocumentFile(file)).rejects.toMatchObject({ code: "ENOENT" });
    });
});

describe("yamlModule.writeDocumentFile", () => {
    it("写出内容以单个换行结尾、不重复插入空行", async () => {
        const file = path.join(tmpDir, "doc-write.yaml");
        const doc = await readDocumentFile(
            await (async () => {
                const src = path.join(tmpDir, "doc-write-src.yaml");
                await fs.promises.writeFile(src, "a: 1\n\nb:\n  - x\n", "utf-8");
                return src;
            })(),
        );

        await writeDocumentFile(file, doc);

        expect(await fs.promises.readFile(file, "utf-8")).toBe("a: 1\n\nb:\n  - x\n");
    });

    it("空 flow 序列保持 [] 内联（flow 归一化跳过空序列）", async () => {
        const file = path.join(tmpDir, "doc-empty-seq.yaml");
        const src = path.join(tmpDir, "doc-empty-seq-src.yaml");
        await fs.promises.writeFile(src, "skins: []\nfiles:\n  - a.js\n", "utf-8");
        const doc = await readDocumentFile(src);

        await writeDocumentFile(file, doc);

        expect(await fs.promises.readFile(file, "utf-8")).toBe("skins: []\nfiles:\n  - a.js\n");
    });

    it("空 flow 序列 add 后归一化为 block 风格", async () => {
        const file = path.join(tmpDir, "doc-add-empty.yaml");
        const src = path.join(tmpDir, "doc-add-empty-src.yaml");
        await fs.promises.writeFile(src, "gadgets: []\n", "utf-8");
        const doc = await readDocumentFile(src);
        doc.get("gadgets").add("A");

        await writeDocumentFile(file, doc);

        expect(await fs.promises.readFile(file, "utf-8")).toBe("gadgets:\n  - A\n");
    });

    it("非空 flow 序列归一化为 block 风格且注释保留", async () => {
        const file = path.join(tmpDir, "doc-flow.yaml");
        const src = path.join(tmpDir, "doc-flow-src.yaml");
        await fs.promises.writeFile(src, "# 注释\nitems: [a, b]\nother: []\n", "utf-8");
        const doc = await readDocumentFile(src);

        await writeDocumentFile(file, doc);

        expect(await fs.promises.readFile(file, "utf-8")).toBe("# 注释\nitems:\n  - a\n  - b\nother: []\n");
    });

    it("嵌套 flow 序列也归一化（含深层）", async () => {
        const file = path.join(tmpDir, "doc-deep-flow.yaml");
        const src = path.join(tmpDir, "doc-deep-flow-src.yaml");
        await fs.promises.writeFile(src, "top:\n  - nested: [x, y]\n", "utf-8");
        const doc = await readDocumentFile(src);

        await writeDocumentFile(file, doc);

        expect(await fs.promises.readFile(file, "utf-8")).toBe("top:\n  - nested:\n      - x\n      - y\n");
    });

    it("写出后可再次读回且注释仍在", async () => {
        const file = path.join(tmpDir, "doc-reread.yaml");
        const src = path.join(tmpDir, "doc-reread-src.yaml");
        await fs.promises.writeFile(src, "# 顶部注释\nignoreFiles:\n  # 产物目录\n  - dist/**/*.css\n", "utf-8");
        const doc = await readDocumentFile(src);

        await writeDocumentFile(file, doc);
        const reread = await readDocumentFile(file);

        expect(reread.toString()).toBe("# 顶部注释\nignoreFiles:\n  # 产物目录\n  - dist/**/*.css\n");
    });
});

describe("yamlModule.syncSeq", () => {
    it("同步后既有条目节点不动（条目旁注释保留）、新条目尾部追加、消失条目删除", async () => {
        const src = [
            "# 键上方的注释",
            "ignoreFiles:",
            "  # 产物目录",
            "  - dist/**/*.css",
            "  # 即将被删除的条目",
            "  - old.css",
        ].join("\n");
        const doc = await readDocumentFile(
            await (async () => {
                const file = path.join(tmpDir, "sync-src.yaml");
                await fs.promises.writeFile(file, `${src}\n`, "utf-8");
                return file;
            })(),
        );

        const changed = syncSeq(doc, "ignoreFiles", ["dist/**/*.css", "new.css"]);

        expect(changed).toBe(true);
        expect(doc.toString()).toBe(`${[
            "# 键上方的注释",
            "ignoreFiles:",
            "  # 产物目录",
            "  - dist/**/*.css",
            "  - new.css",
        ].join("\n")}\n`);
    });

    it("内容一致时返回 false 且文档不变", async () => {
        const file = path.join(tmpDir, "sync-noop.yaml");
        await fs.promises.writeFile(file, "files:\n  - a.js\n  - b.js\n", "utf-8");
        const doc = await readDocumentFile(file);
        const before = doc.toString();

        const changed = syncSeq(doc, "files", ["a.js", "b.js"]);

        expect(changed).toBe(false);
        expect(doc.toString()).toBe(before);
    });

    it("键不存在时整建（返回 true）", async () => {
        const file = path.join(tmpDir, "sync-missing-key.yaml");
        await fs.promises.writeFile(file, "a: 1\n", "utf-8");
        const doc = await readDocumentFile(file);

        const changed = syncSeq(doc, "files", ["a.js"]);

        expect(changed).toBe(true);
        expect(doc.toJS().files).toEqual(["a.js"]);
        expect(doc.toString()).toBe("a: 1\nfiles:\n  - a.js\n");
    });

    it("清空全部条目时输出保持 flow 空序列 []", async () => {
        const file = path.join(tmpDir, "sync-clear.yaml");
        await fs.promises.writeFile(file, "_files:\n  - a.js\n  - b.js\n", "utf-8");
        const doc = await readDocumentFile(file);

        syncSeq(doc, "_files", []);

        expect(doc.toString()).toBe("_files: []\n");
    });

    it("顺序不同但集合相同时无变化（保持旧序，不重排）", async () => {
        const file = path.join(tmpDir, "sync-order.yaml");
        await fs.promises.writeFile(file, "files:\n  - a.js\n  - b.js\n", "utf-8");
        const doc = await readDocumentFile(file);

        const changed = syncSeq(doc, "files", ["b.js", "a.js"]);

        // 集合相同：既有条目全部保留，无新增无删除——文档不变
        expect(changed).toBe(false);
        expect(doc.toString()).toBe("files:\n  - a.js\n  - b.js\n");
    });

    it("对 add() 追加过的序列再次 syncSeq 仍正确（原始字符串条目兼容）", async () => {
        // add() 追加的是原始字符串而非 Scalar 节点，syncSeq 的当前值读取
        // 不能依赖 items[].value（该路径会得到 undefined）
        const file = path.join(tmpDir, "sync-after-add.yaml");
        await fs.promises.writeFile(file, "gadgets: []\n", "utf-8");
        const doc = await readDocumentFile(file);
        doc.get("gadgets").add("A-gadget");

        const changed = syncSeq(doc, "gadgets", ["A-gadget", "B-gadget"]);

        expect(changed).toBe(true);
        expect(doc.toJS().gadgets).toEqual(["A-gadget", "B-gadget"]);
    });

    it("当前值不是序列时抛出指明键名的 TypeError", async () => {
        // 键值被手改成非序列（如标量）时给明确的错误，而不是让后续 items.length
        // 访问报出无法定位的 TypeError（崩溃本身是对的，错误信息须可定位）
        const file = path.join(tmpDir, "sync-scalar.yaml");
        await fs.promises.writeFile(file, "ignoreFiles: dist\n", "utf-8");
        const doc = await readDocumentFile(file);

        expect(() => syncSeq(doc, "ignoreFiles", ["a.css"])).toThrow(TypeError);
        expect(() => syncSeq(doc, "ignoreFiles", ["a.css"])).toThrow(/ignoreFiles/);
    });
});
