import { beforeEach, describe, expect, it } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { changeCategory, changeCategoryJson, changeCategoryWikitext } from "../src/wikitext/change.ts";
import { findCategory, findCategoryJson, findCategoryWikitext } from "../src/wikitext/find.ts";
import { listCategorys } from "../src/wikitext/list.ts";
import { site, state } from "../src/runtime.ts";
import { initLocalization } from "../src/wikitext/patterns.ts";
import { resetSite } from "./helpers/site.ts";

beforeEach(() => {
    resetSite();
});

describe("changeCategoryWikitext：新增", () => {
    it("空页面直接写出分类链接", () => {
        expect(changeCategoryWikitext("", null, "Foo", null, false)).toEqual({
            text: "[[Category:Foo]]",
            summary: ["添加[[分类:Foo]]"],
            error: null,
        });
    });

    it("无分类的正文末尾补空行后追加（legacy 固定留一行分隔）", () => {
        expect(changeCategoryWikitext("text", null, "Foo", null, false).text).toBe("text\n\n[[Category:Foo]]");
        expect(changeCategoryWikitext("text\n", null, "Foo", null, false).text).toBe("text\n\n[[Category:Foo]]");
    });

    it("已有分类时接在最后一个分类之后", () => {
        expect(changeCategoryWikitext("text\n[[Category:Bar]]", null, "Foo", null, false).text).toBe("text\n[[Category:Bar]]\n[[Category:Foo]]");
    });

    it("带索引时写成 [[Category:X|key]]", () => {
        expect(changeCategoryWikitext("text\n[[Category:Bar]]", null, "Foo", "K", false).text).toBe("text\n[[Category:Bar]]\n[[Category:Foo|K]]");
    });

    it("已存在同名分类时返回错误且不改文本", () => {
        expect(changeCategoryWikitext("[[Category:Foo]]", null, "Foo", null, false)).toEqual({
            text: "[[Category:Foo]]",
            summary: [],
            error: "分类“Foo”已存在，不执行添加操作",
        });
    });

    it("忽略注释与 nowiki 里的同名分类", () => {
        const commented = "<!-- [[Category:Foo]] -->\n<nowiki>[[Category:Foo]]</nowiki>";
        expect(changeCategoryWikitext(commented, null, "Foo", null, false).error).toBeNull();
    });
});

describe("changeCategoryWikitext：删除", () => {
    it("整页只有一条分类时删成空串", () => {
        expect(changeCategoryWikitext("[[Category:Foo]]", "Foo", null, null, false)).toEqual({
            text: "",
            summary: ["移除[[分类:Foo]]"],
            error: null,
        });
    });

    it("保留正文与残留换行（legacy 的边界行为）", () => {
        expect(changeCategoryWikitext("text\n[[Category:Foo]]\n", "Foo", null, null, false).text).toBe("text\n");
    });

    it("同一分类多条时全部删除", () => {
        expect(changeCategoryWikitext("[[Category:Foo|a]]\n[[Category:Foo|b]]", "Foo", null, null, false).text).toBe("");
    });

    it("找不到分类时返回错误", () => {
        expect(changeCategoryWikitext("text", "Foo", null, null, false).error).toBe("分类“Foo”未找到");
    });

    it("模板形式的分类给出 template_removed 摘要", () => {
        HC.template_categories = { Foo: "Foo" };
        expect(changeCategoryWikitext("{{Foo}}\ntext", "Foo", null, null, false)).toEqual({
            text: "text",
            summary: ["移除{{[[分类:Foo]]}}"],
            error: null,
        });
    });
});

describe("changeCategoryWikitext：修改与改索引", () => {
    it("改名 = 删旧 + 加新", () => {
        expect(changeCategoryWikitext("[[Category:Foo]]", "Foo", "Bar", null, false)).toEqual({
            text: "[[Category:Bar]]",
            summary: ["移除[[分类:Foo]]", "添加[[分类:Bar]]"],
            error: null,
        });
    });

    it("同名改索引只产生 keychange 摘要", () => {
        expect(changeCategoryWikitext("[[Category:Foo]]", "Foo", "Foo", "K", false)).toEqual({
            text: "[[Category:Foo|K]]",
            summary: ["为[[分类:Foo]]设定新索引：“K”"],
            error: null,
        });
    });
});

describe("changeCategoryWikitext：跨语言链接与 uncategorized", () => {
    it("没有分类时插在跨语言链接之前", () => {
        expect(changeCategoryWikitext("text\n\n[[en:Foo]]", null, "Bar", null, false).text).toBe("text\n\n[[Category:Bar]]\n\n[[en:Foo]]");
    });

    it("新增分类时清掉 {{Uncategorized}}", () => {
        const result = changeCategoryWikitext("{{Uncategorized}}\ntext", null, "Foo", null, false);
        expect(result.text).toBe("text\n\n[[Category:Foo]]");
        expect(result.summary).toContain("添加[[分类:Foo]]");
        expect(result.summary).toContain("");
    });

    it("隐藏分类上不清 uncategorized", () => {
        const result = changeCategoryWikitext("{{Uncategorized}}\ntext", null, "Foo", null, true);
        expect(result.text).toContain("{{Uncategorized}}");
    });
});

describe("changeCategoryJson", () => {
    it("新增分类并 pretty-print", () => {
        expect(changeCategoryJson('{"mediawikiCategories":[]}', null, "Baz", null)).toEqual({
            text: '{\n  "mediawikiCategories": [\n    {\n      "name": "Baz",\n      "sort": ""\n    }\n  ]\n}',
            summary: ["添加[[分类:Baz]]"],
            error: null,
        });
    });

    it("已存在时改索引", () => {
        const result = changeCategoryJson('{"mediawikiCategories":[{"name":"Foo","sort":"K"}]}', null, "Foo", "K2");
        expect(result.summary).toEqual(["为[[分类:Foo]]设定新索引：“K2”"]);
        expect(result.text).toContain('"sort": "K2"');
    });

    it("删除分类", () => {
        expect(changeCategoryJson('{"mediawikiCategories":[{"name":"Foo","sort":"K"}]}', "Foo", null, null)).toEqual({
            text: '{\n  "mediawikiCategories": []\n}',
            summary: ["移除[[分类:Foo]]"],
            error: null,
        });
    });

    it("非法 JSON 原样返回并给出错误", () => {
        const result = changeCategoryJson("not json", null, "Foo", null);
        expect(result.text).toBe("not json");
        expect(result.summary).toEqual([]);
        expect(result.error).toContain("Failed to modify JSON categories");
    });

    it("按 contentModel 分派", () => {
        resetSite({ wgPageContentModel: "Tabular.JsonConfig" });
        expect(changeCategory('{"mediawikiCategories":[]}', null, "Foo", null, false).text).toContain('"name": "Foo"');
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

    it("识别中文命名空间别名", () => {
        site.conf.wgNamespaceIds = { ...site.conf.wgNamespaceIds, 分类: 14 };
        initLocalization();
        expect(findCategoryWikitext("[[分类:Foo]]", "Foo", true)).not.toBeNull();
    });

    it("JSON 内容模型按规范化标题比较", () => {
        // JSON 里的 name 是不带命名空间前缀的分类名，比较前经 mw.Title 规范化
        expect(findCategoryJson('{"mediawikiCategories":[{"name":"foo","sort":"K"}]}', "Foo", true)).toEqual({
            match: ["", "", "K"],
        });
        expect(findCategoryJson("{}", "Foo", true)).toBeNull();
        expect(findCategoryJson("not json", "Foo", true)).toBeNull();
    });

    it("按 contentModel 分派", () => {
        resetSite({ wgPageContentModel: "wikitext" });
        expect(findCategory("[[Category:Foo]]", "Foo", true)).not.toBeNull();
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

    it("pageText 为 null 时返回空表", () => {
        state.pageText = null;
        expect(listCategorys()).toEqual([]);
    });
});
