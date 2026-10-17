// diff 解析域单元测试：行序列配对（diff）、交叉计数（countCrossings）、
// diff 字符串渲染（diffString）与首尾裁剪（shortenDiffString）、单元换算
// （textOf/entryOf）。
// 行为基准 = legacy src/modules/diff.ts（commit 02c8dec）；全部期望值经
// stub 依赖驱动 legacy 原文件实测取得，怪癖逐条标注「照搬勿修」。
import { describe, expect, it, vi } from "vitest";
import { countCrossings, diff, diffString, entryOf, shortenDiffString, textOf } from "../../../src/preview/diff.ts";

describe("textOf / entryOf", () => {
    it("textOf：字符串取自身，对象取 text，缺 text 时兜空串（legacy 私有兜底）", () => {
        expect(textOf("abc")).toBe("abc");
        expect(textOf({ text: "t" })).toBe("t");
        expect(textOf({})).toBe("");
        expect(textOf({ row: 3, paired: true })).toBe("");
    });

    it("entryOf：字符串包成 { text }，对象原样返回（同一引用）", () => {
        expect(entryOf("s")).toEqual({ text: "s" });
        const entry = { text: "t", row: 1, paired: true };
        expect(entryOf(entry)).toBe(entry);
    });
});

describe("diffString", () => {
    it("完全相同：原样输出（无标签）", () => {
        expect(diffString("hello", "hello")).toBe("hello");
        expect(diffString("a<b", "a<b")).toBe("a&lt;b");
    });

    it("纯新增/纯删除：空的一侧仍输出空标签对（照搬勿修：delFmt/insFmt 只判数组长度）", () => {
        expect(diffString("", "abc")).toBe("<del class='popupDiff'></del><ins class='popupDiff'>abc</ins>");
        expect(diffString("abc", "")).toBe("<del class='popupDiff'>abc</del><ins class='popupDiff'></ins>");
    });

    it("两侧都空：空串", () => {
        expect(diffString("", "")).toBe("");
    });

    it("文本单元先经 entify 转义 & < > \"", () => {
        expect(diffString('a&b<c>d"e', "x")).toBe("<del class='popupDiff'>a&amp;b&lt;c&gt;d&quot;e</del><ins class='popupDiff'>x</ins>");
    });

    it("wikitext 分割：只在词元间插入 ins/del，结构符号保留", () => {
        expect(diffString("[[Foo|bar]] baz {{tpl}}", "[[Foo|qux]] baz {{tpl}}")).toBe("[[Foo|<del class='popupDiff'>bar</del><ins class='popupDiff'>qux</ins>]] baz {{tpl}}");
    });

    it("换行内容：行边界原样保留", () => {
        expect(diffString("a\nb\nc", "a\nB\nc")).toBe("a\n<del class='popupDiff'>b</del><ins class='popupDiff'>B</ins>\nc");
    });

    it("交叉配对：配对行号回退时拆回未配对（maxOutputPair 递减分支）", () => {
        expect(diffString("one two three", "three two one")).toBe("<del class='popupDiff'>one two </del>three<ins class='popupDiff'> two one</ins>");
    });

    it("simpleSplit=true：按 \\b 分割（不保留分隔符），仍可配对", () => {
        expect(diffString("alpha beta", "alpha gamma", true)).toBe("alpha <del class='popupDiff'>beta</del><ins class='popupDiff'>gamma</ins>");
    });

    it("保留字单元：文本加 <!-- --> 后缀规避原型链（照搬勿修）", () => {
        expect(diffString("constructor", "constructor")).toBe("<del class='popupDiff'>constructor<!-- --></del><ins class='popupDiff'>constructor<!-- --></ins>");
        expect(diffString("valueOf", "x")).toBe("<del class='popupDiff'>valueOf<!-- --></del><ins class='popupDiff'>x</ins>");
        expect(diffString("toSource", "toSource")).toBe("toSource<!-- -->");
    });

    it("isPrototypeOf 走哈希表 push 抛错分支且静默（不在保留字表内，diffBugAlert 因原型链命中而不告警）", () => {
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        expect(diffString("isPrototypeOf", "isPrototypeOf")).toBe("<del class='popupDiff'>isPrototypeOf</del><ins class='popupDiff'>isPrototypeOf</ins>");
        expect(alertMock).not.toHaveBeenCalled();
    });
});

describe("shortenDiffString", () => {
    it("空串：空数组", () => {
        expect(shortenDiffString("", 2)).toEqual([]);
    });

    it("短段（< 2*context）与相邻标签整体保留", () => {
        expect(shortenDiffString("<del class='popupDiff'>abc</del>", 40)).toEqual(["<del class='popupDiff'>abc</del>"]);
        expect(shortenDiffString("<ins class='popupDiff'>z</ins>", 2)).toEqual(["<ins class='popupDiff'>z</ins>"]);
    });

    it("长段只留首尾 context 字符，段间以数组元素分隔", () => {
        expect(shortenDiffString(`${"x".repeat(100)}<del class='popupDiff'>abc</del>${"y".repeat(100)}`, 5)).toEqual(["xxxxx<del class='popupDiff'>abc</del>yyyyy"]);
    });

    it("多标签：长段尾部与后一标签合并为下一段（含重叠拼接）", () => {
        expect(shortenDiffString("xxxxxx<ins class='popupDiff'>1</ins>yyyyyy<del class='popupDiff'>2</del>zzzzzz", 2)).toEqual(["xx<ins class='popupDiff'>1</ins>yy", "yy<del class='popupDiff'>2</del>zz"]);
    });

    it("长尾段之后无标签：尾段被丢弃（照搬勿修：else 分支不 push）", () => {
        expect(shortenDiffString("yyyyyyyyyy", 5)).toEqual([]);
        expect(shortenDiffString("aaaaaaaaaa<ins class='popupDiff'>b</ins>cccccccccccccccccccc", 3)).toEqual(["aaa<ins class='popupDiff'>b</ins>ccc"]);
    });

    it("context=0：全部段都不足长（< 0 恒假）→ 走 else，留下前导空段被剔除后为空", () => {
        expect(shortenDiffString("abc", 0)).toEqual([]);
        expect(shortenDiffString("xxx<ins class='popupDiff'>z</ins>yyy", 0)).toEqual(["<ins class='popupDiff'>z</ins>"]);
    });
});

describe("countCrossings", () => {
    it("b[i] 无行号：返回 -1 哨兵", () => {
        expect(countCrossings(["a"], ["b"], 0)).toBe(-1);
        expect(countCrossings(["a"], [{ text: "b" }], 0)).toBe(-1);
    });

    it("行号为 0 的单元不被当作「无行号」（照搬勿修：!row && row !== 0 双判定）", () => {
        expect(countCrossings([{ text: "a", row: 0 }], [{ text: "b", row: 0 }], 0)).toBe(0);
        expect(countCrossings([{ text: "a", row: 1 }], [{ text: "b", row: 0 }], 0)).toBe(0);
    });

    it("交叉计数：行号序关系相反即一次，两侧可多个", () => {
        expect(countCrossings([{ text: "a", row: 2 }, { text: "b", row: 0 }], [{ text: "x", row: 0 }, { text: "y", row: 2 }], 1)).toBe(1);
        expect(countCrossings([{ text: "a", row: 2 }, { text: "b", row: 3 }, { text: "c", row: 0 }], [{ text: "x", row: 0 }, { text: "y", row: 3 }], 1)).toBe(2);
    });

    it("eject=true：见首个交叉即返回 true，不再累计", () => {
        expect(countCrossings([{ text: "a", row: 2 }, { text: "b", row: 0 }], [{ text: "x", row: 0 }, { text: "y", row: 2 }], 1, true)).toBe(true);
    });

    it("a 侧无行号的单元跳过（continue 分支）", () => {
        expect(countCrossings(["z", { text: "b", row: 0 }], [{ text: "x", row: 0 }], 0)).toBe(0);
    });

    it("i 越界：entryOf(undefined) 返回 undefined，其上取 row 抛 TypeError（照搬勿修）", () => {
        expect(() => countCrossings([{ text: "a", row: 0 }], [{ text: "b", row: 0 }], 5)).toThrow(TypeError);
    });
});

describe("diff", () => {
    it("两侧唯一同文的单元互配行号（就地改写，返回同一对数组）", () => {
        const o = ["x", "y"];
        const n = ["y", "x"];
        const out = diff(o, n);
        expect(out.o).toBe(o);
        expect(out.n).toBe(n);
        expect(out).toEqual({
            o: [{ text: "x", row: 1, paired: true }, { text: "y", row: 0, paired: true }],
            n: [{ text: "y", row: 1, paired: true }, { text: "x", row: 0, paired: true }],
        });
    });

    it("相邻补齐：已配对单元的下一行同文时向后配对", () => {
        expect(diff(["a", "b", "c", "d"], ["a", "b2", "c", "d"])).toEqual({
            o: [{ text: "a", row: 0, paired: true }, "b", { text: "c", row: 2, paired: true }, { text: "d", row: 3, paired: true }],
            n: [{ text: "a", row: 0, paired: true }, "b2", { text: "c", row: 2, paired: true }, { text: "d", row: 3, paired: true }],
        });
    });

    it("向前补齐：末段已配对单元的前一行同文时配对（照搬勿修：两条补齐互不递归）", () => {
        expect(diff(["a", "b", "c"], ["a", "b2", "c"])).toEqual({
            o: [{ text: "a", row: 0, paired: true }, "b", { text: "c", row: 2, paired: true }],
            n: [{ text: "a", row: 0, paired: true }, "b2", { text: "c", row: 2, paired: true }],
        });
        expect(diff(["a"], ["b", "a"]).n).toEqual(["b", { text: "a", row: 0, paired: true }]);
    });

    it("重复词不配对（ns/os 长度非 1）", () => {
        expect(diff(["a", "a"], ["a"])).toEqual({ o: ["a", "a"], n: ["a"] });
    });

    it("空侧：原样返回", () => {
        expect(diff([], [])).toEqual({ o: [], n: [] });
        expect(diff(["a"], [])).toEqual({ o: ["a"], n: [] });
        expect(diff([], ["a"])).toEqual({ o: [], n: ["a"] });
    });

    it("保留字单元：文本被追加 <!-- --> 后参与配对（照搬勿修）", () => {
        expect(diff(["eval"], ["eval"])).toEqual({
            o: [{ text: "eval<!-- -->", row: 0, paired: true }],
            n: [{ text: "eval<!-- -->", row: 0, paired: true }],
        });
        expect(diff(["toString", "q"], ["toString", "q"])).toEqual({
            o: [{ text: "toString<!-- -->", row: 0, paired: true }, { text: "q", row: 1, paired: true }],
            n: [{ text: "toString<!-- -->", row: 0, paired: true }, { text: "q", row: 1, paired: true }],
        });
    });

    it("isPrototypeOf：哈希表 push 抛错被吞、不告警、后续单元照常配对", () => {
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        expect(diff(["isPrototypeOf", "x"], ["x"])).toEqual({
            o: ["isPrototypeOf", { text: "x", row: 0, paired: true }],
            n: [{ text: "x", row: 1, paired: true }],
        });
        expect(alertMock).not.toHaveBeenCalled();
    });

    it("__proto__ 键：赋值进原型链不抛错，单元保持未配对（照搬勿修）", () => {
        expect(diff(["__proto__", "q"], ["q"])).toEqual({
            o: ["__proto__", { text: "q", row: 0, paired: true }],
            n: [{ text: "q", row: 1, paired: true }],
        });
    });
});
