import { beforeEach, describe, expect, it } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { changeCategory } from "../src/wikitext/change.ts";
import { findCategoryWikitext } from "../src/wikitext/find.ts";
import { listCategorys } from "../src/wikitext/list.ts";
import { site, state } from "../src/runtime.ts";
import { initLocalization } from "../src/wikitext/patterns.ts";
import { resetSite } from "./helpers/site.ts";

beforeEach(() => {
    resetSite();
});

describe("changeCategoryWikitext：新增", () => {
    it("空页面直接写出分类链接", () => {
        expect(changeCategory("", null, "Foo", null)).toEqual({
            text: "[[Category:Foo]]",
            summary: ["添加[[分类:Foo]]"],
            error: null,
        });
    });

    it("无分类的正文末尾补空行后追加（legacy 固定留一行分隔）", () => {
        expect(changeCategory("text", null, "Foo", null).text).toBe("text\n\n[[Category:Foo]]");
        expect(changeCategory("text\n", null, "Foo", null).text).toBe("text\n\n[[Category:Foo]]");
    });

    it("已有分类时接在最后一个分类之后", () => {
        expect(changeCategory("text\n[[Category:Bar]]", null, "Foo", null).text).toBe("text\n[[Category:Bar]]\n[[Category:Foo]]");
    });

    it("带索引时写成 [[Category:X|key]]", () => {
        expect(changeCategory("text\n[[Category:Bar]]", null, "Foo", "K").text).toBe("text\n[[Category:Bar]]\n[[Category:Foo|K]]");
    });

    it("已存在同名分类时返回错误且不改文本", () => {
        expect(changeCategory("[[Category:Foo]]", null, "Foo", null)).toEqual({
            text: "[[Category:Foo]]",
            summary: [],
            error: "分类“Foo”已存在，不执行添加操作",
        });
    });

    it("忽略注释与 nowiki 里的同名分类", () => {
        const commented = "<!-- [[Category:Foo]] -->\n<nowiki>[[Category:Foo]]</nowiki>";
        expect(changeCategory(commented, null, "Foo", null).error).toBeNull();
    });

    it("未闭合注释里的分类不算已存在", () => {
        expect(changeCategory("<!-- [[Category:Foo]]", null, "Foo", null).error).toBeNull();
    });
});

describe("changeCategoryWikitext：删除", () => {
    it("整页只有一条分类时删成空串", () => {
        expect(changeCategory("[[Category:Foo]]", "Foo", null, null)).toEqual({
            text: "",
            summary: ["移除[[分类:Foo]]"],
            error: null,
        });
    });

    it("保留正文与残留换行（legacy 的边界行为）", () => {
        expect(changeCategory("text\n[[Category:Foo]]\n", "Foo", null, null).text).toBe("text\n");
    });

    it("同一分类多条时全部删除", () => {
        expect(changeCategory("[[Category:Foo|a]]\n[[Category:Foo|b]]", "Foo", null, null).text).toBe("");
    });

    it("找不到分类时返回错误", () => {
        expect(changeCategory("text", "Foo", null, null).error).toBe("分类“Foo”未找到");
    });

    it("模板形式的分类给出 template_removed 摘要", () => {
        HC.template_categories = { Foo: "Foo" };
        expect(changeCategory("{{Foo}}\ntext", "Foo", null, null)).toEqual({
            text: "text",
            summary: ["移除{{[[分类:Foo]]}}"],
            error: null,
        });
    });
});

describe("changeCategoryWikitext：修改与改索引", () => {
    it("改名 = 删旧 + 加新", () => {
        expect(changeCategory("[[Category:Foo]]", "Foo", "Bar", null)).toEqual({
            text: "[[Category:Bar]]",
            summary: ["移除[[分类:Foo]]", "添加[[分类:Bar]]"],
            error: null,
        });
    });

    it("同名改索引只产生 keychange 摘要", () => {
        expect(changeCategory("[[Category:Foo]]", "Foo", "Foo", "K")).toEqual({
            text: "[[Category:Foo|K]]",
            summary: ["为[[分类:Foo]]设定新索引：“K”"],
            error: null,
        });
    });
});

describe("changeCategoryWikitext：跨语言链接", () => {
    it("没有分类时插在跨语言链接之前", () => {
        expect(changeCategory("text\n\n[[en:Foo]]", null, "Bar", null).text).toBe("text\n\n[[Category:Bar]]\n\n[[en:Foo]]");
    });
});

describe("findCategory", () => {
    it("返回匹配下标与两个分组", () => {
        const match = findCategoryWikitext("text [[Category:Foo|K]]", "Foo", true);
        expect(match?.[0]).toBe("[[Category:Foo|K]]");
        expect(match?.index).toBe(5);
        // 分组 1 是命名空间，分组 2 是 `|key`（list_categorys 的正则分组不同）
        expect(match?.[1]).toBe("Category");
        expect(match?.[2]).toBe("|K");
    });

    it("首字母大小写折叠受 capitalizePageNames 控制", () => {
        expect(findCategoryWikitext("[[category:foo]]", "Foo", true)).not.toBeNull();
        HC.capitalizePageNames = false;
        expect(findCategoryWikitext("[[category:foo]]", "Foo", true)).toBeNull();
    });

    it("批量模式屏蔽注释与 nowiki，once 模式不屏蔽", () => {
        const text = "<!-- [[Category:Foo]] -->\n<nowiki>[[Category:Foo]]</nowiki>";
        expect(findCategoryWikitext(text, "Foo")).toHaveLength(0);
        expect(findCategoryWikitext(text, "Foo", true)).not.toBeNull();
    });

    it("未闭合注释里的分类不匹配（批量模式）", () => {
        expect(findCategoryWikitext("text <!-- [[Category:Foo]]", "Foo")).toHaveLength(0);
    });

    it("识别中文命名空间别名", () => {
        site.conf.wgNamespaceIds = { ...site.conf.wgNamespaceIds, 分类: 14 };
        initLocalization();
        expect(findCategoryWikitext("[[分类:Foo]]", "Foo", true)).not.toBeNull();
    });
});

describe("listCategorys", () => {
    it("列出全部分类并附带产生它的正则", () => {
        state.pageText = "a\n[[Category:Foo]]\n[[Category:Bar|K]]";
        state.cleanedText = null;
        const list = listCategorys();
        expect(list.map((entry) => entry.match[2])).toEqual(["Foo", "Bar"]);
        expect(list.re).toBeInstanceOf(RegExp);
    });

    it("剔除注释与 nowiki 内容", () => {
        state.pageText = "[[Category:Foo]]<!-- [[Category:Hidden]] --><nowiki>[[Category:No]]</nowiki>";
        state.cleanedText = null;
        expect(listCategorys().map((entry) => entry.match[2])).toEqual(["Foo"]);
    });

    it("未闭合注释吞到文末，--!> 不结束注释", () => {
        state.pageText = "[[Category:Foo]]<!-- [[Category:Hidden]] --!> [[Category:Also]]";
        state.cleanedText = null;
        expect(listCategorys().map((entry) => entry.match[2])).toEqual(["Foo"]);
    });

    it("pageText 为 null 时返回空表", () => {
        state.pageText = null;
        expect(listCategorys()).toEqual([]);
    });
});
