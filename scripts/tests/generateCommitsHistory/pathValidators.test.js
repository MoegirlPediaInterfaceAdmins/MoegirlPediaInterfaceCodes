import { describe, expect, it } from "vitest";
import { parseNumstatPaths, pathValidator, renamePathValidator } from "../../generateCommitsHistory/pathValidators.js";

describe("pathValidator", () => {
    it("src/ 下的路径通过校验", () => {
        expect(pathValidator("src/gadgets/Wikiplus/Gadget-Wikiplus.js")).toBe(true);
    });

    it("非 src/ 前缀的路径不通过", () => {
        expect(pathValidator("scripts/main.js")).toBe(false);
    });

    it("src/@types/ 黑名单内的类型声明不通过", () => {
        expect(pathValidator("src/@types/libCachedCode.d.ts")).toBe(false);
    });
});

describe("renamePathValidator", () => {
    it("直接是 src/ 路径时原样通过", () => {
        expect(renamePathValidator("src/gadgets/A.js")).toBe(true);
    });

    it("非 src/ 路径且无重命名标记时不通过", () => {
        expect(renamePathValidator("scripts/a.js")).toBe(false);
    });

    it("同目录花括号重命名（{a => b}）解析后为 src 路径时通过", () => {
        expect(renamePathValidator("src/gadgets/{A.js => B.js}")).toBe(true);
    });

    it("同目录花括号重命名两侧均非 src 时不通过", () => {
        expect(renamePathValidator("scripts/{a.js => b.js}")).toBe(false);
    });

    it("花括号外的公共前缀参与两侧路径拼接", () => {
        expect(renamePathValidator("src/{gadgets/A.js => lib/B.js}")).toBe(true);
    });

    it("完全不同路径的全量重命名（a => b）目标侧为 src 时通过", () => {
        expect(renamePathValidator("scripts/a.js => src/a.js")).toBe(true);
    });

    it("全量重命名来源侧为 src 时通过", () => {
        expect(renamePathValidator("src/a.js => scripts/a.js")).toBe(true);
    });

    it("全量重命名两侧均非 src 时不通过", () => {
        expect(renamePathValidator("scripts/a.js => docs/a.js")).toBe(false);
    });

    it("含 => 但无空格分隔与花括号的 malformed 输入抛出 TypeError", () => {
        expect(() => renamePathValidator("foo=>bar")).toThrow(TypeError);
    });
});

describe("parseNumstatPaths", () => {
    it("解析每行增删之后的路径", () => {
        expect(parseNumstatPaths("1\t2\tsrc/a.js\n0\t0\tsrc/b.js")).toEqual(["src/a.js", "src/b.js"]);
    });

    it("过滤空行与纯空白行", () => {
        expect(parseNumstatPaths("1\t2\tsrc/a.js\n   \n\n3\t4\tsrc/b.js\n")).toEqual(["src/a.js", "src/b.js"]);
    });

    it("含空格的路径按最后一个制表符整体取出", () => {
        expect(parseNumstatPaths("5\t6\tsrc/has space.js")).toEqual(["src/has space.js"]);
    });

    it("重命名行原样返回整段路径", () => {
        expect(parseNumstatPaths("0\t0\tsrc/gadgets/{A.js => B.js}")).toEqual(["src/gadgets/{A.js => B.js}"]);
    });

    it("空字符串返回空数组", () => {
        expect(parseNumstatPaths("")).toEqual([]);
    });
});
