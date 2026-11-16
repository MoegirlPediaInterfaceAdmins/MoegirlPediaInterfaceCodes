import { beforeEach, describe, expect, it } from "vitest";
import {
    buildCategoryRegex,
    computeNewWikitext,
    normalizeCatName,
    sameCategory,
    validateCategoryTitle,
    verifyCommittedOnServer,
} from "../src/wikitext.ts";
import { installMw } from "./helpers/mw.ts";

beforeEach(() => {
    installMw();
});

describe("normalizeCatName", () => {
    it("去首尾空白、下划线转空格并去掉命名空间前缀", () => {
        expect(normalizeCatName(" Category:Foo ")).toBe("Foo");
        expect(normalizeCatName("cat: Foo_bar")).toBe("Foo bar");
        expect(normalizeCatName("分類:Bar")).toBe("Bar");
        expect(normalizeCatName("Foo_bar")).toBe("Foo bar");
    });

    it("空输入返回空串", () => {
        expect(normalizeCatName("")).toBe("");
        expect(normalizeCatName("   ")).toBe("");
    });

    it("折叠连续空白与下划线", () => {
        expect(normalizeCatName(" Category :  Foo__bar   baz ")).toBe("Foo bar baz");
        expect(normalizeCatName("Foo\tBar")).toBe("Foo Bar");
    });
});

describe("validateCategoryTitle", () => {
    it("规范化分类名并返回主文本（首字母大写）", () => {
        expect(validateCategoryTitle("Foo")).toBe("Foo");
        expect(validateCategoryTitle("foo")).toBe("Foo");
        expect(validateCategoryTitle("Category:Foo")).toBe("Foo");
        expect(validateCategoryTitle("分类:foo_bar")).toBe("Foo bar");
    });

    it("空标题返回 null", () => {
        expect(validateCategoryTitle("")).toBeNull();
        expect(validateCategoryTitle("Category:")).toBeNull();
    });

    it("包含非法字符返回 null", () => {
        expect(validateCategoryTitle("Foo|Bar")).toBeNull();
        expect(validateCategoryTitle("Foo#Bar")).toBeNull();
        expect(validateCategoryTitle("[[Foo]]")).toBeNull();
        expect(validateCategoryTitle("Foo{bar}")).toBeNull();
        expect(validateCategoryTitle("Foo\u0001Bar")).toBeNull();
    });

    it("其他命名空间的标题返回 null", () => {
        expect(validateCategoryTitle("File:Foo")).toBeNull();
        expect(validateCategoryTitle("Template:Foo")).toBeNull();
    });
});

describe("buildCategoryRegex", () => {
    /** 每次 test 前复位 lastIndex：正则有 g 标志，直接连续 test 会受上一次匹配位置影响。 */
    const isMatch = (regex: RegExp | null, text: string): boolean => {
        if (!regex) {
            return false;
        }
        regex.lastIndex = 0;
        return regex.test(text);
    };

    it("空分类名返回 null", () => {
        expect(buildCategoryRegex("")).toBeNull();
        expect(buildCategoryRegex("Category:")).toBeNull();
    });

    it("不用 i 标志，命名空间前缀逐字母兼容大小写", () => {
        const regex = buildCategoryRegex("Foo");
        expect(regex).not.toBeNull();
        expect(regex?.flags).not.toContain("i");
        expect(isMatch(regex, "[[Category:Foo]]")).toBe(true);
        expect(isMatch(regex, "[[category:Foo]]")).toBe(true);
        expect(isMatch(regex, "[[CATEGORY:Foo]]")).toBe(true);
        expect(isMatch(regex, "[[Cat:Foo]]")).toBe(true);
        expect(isMatch(regex, "[[cAt:Foo]]")).toBe(true);
        expect(isMatch(regex, "[[分类:Foo]]")).toBe(true);
        expect(isMatch(regex, "[[分類:Foo]]")).toBe(true);
    });

    it("只兼容首字母大小写，其余字符严格区分", () => {
        const regex = buildCategoryRegex("Foo");
        expect(isMatch(regex, "[[Category:foo]]")).toBe(true);
        expect(isMatch(regex, "[[Category:FOO]]")).toBe(false);
        expect(isMatch(regex, "[[Category:FOo]]")).toBe(false);
        const mixed = buildCategoryRegex("FBar");
        expect(isMatch(mixed, "[[Category:fBar]]")).toBe(true);
        expect(isMatch(mixed, "[[Category:fbar]]")).toBe(false);
    });

    it("空格与下划线等价", () => {
        const regex = buildCategoryRegex("Foo bar");
        expect(isMatch(regex, "[[Category:Foo bar]]")).toBe(true);
        expect(isMatch(regex, "[[Category:Foo_bar]]")).toBe(true);
        expect(isMatch(regex, "[[Category:Foo  bar]]")).toBe(true);
    });

    it("捕获 sortkey", () => {
        const regex = buildCategoryRegex("Foo");
        const match = regex?.exec("text [[Category:Foo|Key]]");
        expect(match?.[1]).toBe("|Key");
    });

    it("不匹配其他命名空间", () => {
        const regex = buildCategoryRegex("Foo");
        expect(isMatch(regex, "[[File:Foo]]")).toBe(false);
        expect(isMatch(regex, "Category:Foo")).toBe(false);
    });
});

describe("sameCategory", () => {
    it("规范化后首字母不区分大小写", () => {
        expect(sameCategory("Foo", "foo")).toBe(true);
        expect(sameCategory("Category:Foo", "Foo")).toBe(true);
        expect(sameCategory("Foo bar", "Foo_bar")).toBe(true);
    });

    it("非首字母严格区分大小写", () => {
        expect(sameCategory("Foo", "FOO")).toBe(false);
        expect(sameCategory("Foo", "Fooo")).toBe(false);
    });

    it("空分类名不相等", () => {
        expect(sameCategory("", "")).toBe(false);
        expect(sameCategory("Foo", "")).toBe(false);
    });
});

describe("computeNewWikitext：add", () => {
    it("空文本追加分类时不产生前导换行", () => {
        expect(computeNewWikitext({ text: "", mode: "add", sourceCat: "", targetCat: "Foo" })).toEqual({
            status: "ok",
            text: "[[Category:Foo]]\n",
        });
        expect(computeNewWikitext({ text: " \n\t", mode: "add", sourceCat: "", targetCat: "Foo" })).toEqual({
            status: "ok",
            text: "[[Category:Foo]]\n",
        });
    });

    it("正文末尾追加分类", () => {
        expect(computeNewWikitext({ text: "text", mode: "add", sourceCat: "", targetCat: "Foo" })).toEqual({
            status: "ok",
            text: "text\n[[Category:Foo]]\n",
        });
        expect(computeNewWikitext({ text: "text\n\n", mode: "add", sourceCat: "", targetCat: "Foo" })).toEqual({
            status: "ok",
            text: "text\n[[Category:Foo]]\n",
        });
    });

    it("已在目标分类时跳过", () => {
        const text = "text\n[[Category:Foo]]";
        expect(computeNewWikitext({ text, mode: "add", sourceCat: "", targetCat: "Foo" })).toEqual({
            status: "skipped-already",
            text,
        });
    });

    it("目标分类非法时返回 invalid-target", () => {
        const text = "text";
        expect(computeNewWikitext({ text, mode: "add", sourceCat: "", targetCat: "Foo|Bar" })).toEqual({
            status: "invalid-target",
            text,
        });
    });
});

describe("computeNewWikitext：copy", () => {
    it("在第一条源分类链接后插入目标分类", () => {
        const text = "text\n[[Category:Source]]";
        expect(computeNewWikitext({ text, mode: "copy", sourceCat: "Source", targetCat: "Target" }).text)
            .toBe("text\n[[Category:Source]]\n[[Category:Target]]");
    });

    it("保留源分类的 sortkey 不变", () => {
        const text = "[[Category:Source|Key]]";
        expect(computeNewWikitext({ text, mode: "copy", sourceCat: "Source", targetCat: "Target" }).text)
            .toBe("[[Category:Source|Key]]\n[[Category:Target]]");
    });

    it("找不到源分类时追加到页尾", () => {
        expect(computeNewWikitext({ text: "text", mode: "copy", sourceCat: "Source", targetCat: "Target" }).text)
            .toBe("text\n[[Category:Target]]\n");
    });

    it("目标分类已存在时跳过", () => {
        const text = "[[Category:Target]]";
        expect(computeNewWikitext({ text, mode: "copy", sourceCat: "Source", targetCat: "Target" })).toEqual({
            status: "skipped-already",
            text,
        });
    });
});

describe("computeNewWikitext：move", () => {
    it("替换源分类并保留 sortkey", () => {
        const text = "text\n[[Category:Source|Key]]";
        expect(computeNewWikitext({ text, mode: "move", sourceCat: "Source", targetCat: "Target" })).toEqual({
            status: "ok",
            text: "text\n[[Category:Target|Key]]",
        });
    });

    it("删除其余重复的源分类", () => {
        const text = "[[Category:Source|A]]\n[[Category:Source|B]]";
        expect(computeNewWikitext({ text, mode: "move", sourceCat: "Source", targetCat: "Target" }).text)
            .toBe("[[Category:Target|A]]\n");
    });

    it("找不到源分类时 skipped-not-found", () => {
        const text = "text";
        expect(computeNewWikitext({ text, mode: "move", sourceCat: "Source", targetCat: "Target" })).toEqual({
            status: "skipped-not-found",
            text,
        });
    });

    it("目标分类已在页面中时只删除源分类", () => {
        const text = "[[Category:Source]]\n\n\n[[Category:Target]]";
        expect(computeNewWikitext({ text, mode: "move", sourceCat: "Source", targetCat: "Target" })).toEqual({
            status: "ok",
            text: "\n\n[[Category:Target]]",
        });
    });

    it("A3：移动到同一分类是 no-op，不删除源链接", () => {
        const text = "text\n[[Category:Foo|Key]]";
        expect(computeNewWikitext({ text, mode: "move", sourceCat: "Foo", targetCat: "foo" })).toEqual({
            status: "skipped-already",
            text,
        });
        expect(computeNewWikitext({ text, mode: "move", sourceCat: "Category:Foo", targetCat: "Foo" })).toEqual({
            status: "skipped-already",
            text,
        });
    });
});

describe("computeNewWikitext：remove", () => {
    it("删除全部分类链接并压缩空行", () => {
        const text = "a\n[[Category:Source]]\n\n\nb\n[[Category:Source|Key]]\n";
        expect(computeNewWikitext({ text, mode: "remove", sourceCat: "Source", targetCat: "" })).toEqual({
            status: "ok",
            text: "a\n\nb\n\n",
        });
    });

    it("找不到源分类时 skipped-not-found", () => {
        const text = "text";
        expect(computeNewWikitext({ text, mode: "remove", sourceCat: "Source", targetCat: "" })).toEqual({
            status: "skipped-not-found",
            text,
        });
    });

    it("remove 模式忽略 targetCat", () => {
        const text = "[[Category:Source]]";
        expect(computeNewWikitext({ text, mode: "remove", sourceCat: "Source", targetCat: "Target" })).toEqual({
            status: "ok",
            text: "",
        });
    });
});

describe("verifyCommittedOnServer", () => {
    it("add / copy：目标分类已出现即视为提交成功", () => {
        expect(verifyCommittedOnServer({
            latestText: "[[Category:Target]]",
            mode: "add",
            sourceCat: "",
            targetCat: "Target",
        })).toBe(true);
        expect(verifyCommittedOnServer({
            latestText: "[[Category:Source]]",
            mode: "copy",
            sourceCat: "Source",
            targetCat: "Target",
        })).toBe(false);
    });

    it("move：目标出现且源分类消失才算提交成功", () => {
        expect(verifyCommittedOnServer({
            latestText: "[[Category:Target]]",
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
        })).toBe(true);
        expect(verifyCommittedOnServer({
            latestText: "[[Category:Source]]\n[[Category:Target]]",
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
        })).toBe(false);
    });

    it("remove：源分类消失即视为提交成功", () => {
        expect(verifyCommittedOnServer({
            latestText: "text",
            mode: "remove",
            sourceCat: "Source",
            targetCat: "",
        })).toBe(true);
        expect(verifyCommittedOnServer({
            latestText: "[[Category:Source]]",
            mode: "remove",
            sourceCat: "Source",
            targetCat: "",
        })).toBe(false);
    });
});
