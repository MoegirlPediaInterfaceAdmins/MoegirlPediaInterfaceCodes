import { beforeEach, describe, expect, it } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { filterAndSortTitles, suggestionConfigs, suggestionEngines } from "../src/api/suggestions.ts";
import { state } from "../src/runtime.ts";
import { resetSite } from "./helpers/site.ts";
import type { TitleList } from "../src/types.ts";

const titles = (...items: string[]): TitleList => [...items] as TitleList;

beforeEach(() => {
    resetSite();
});

describe("opensearch handler", () => {
    it("剥离命名空间前缀、剔除非分类结果，并标记已存在", () => {
        const result = suggestionEngines.opensearch.handler(["Category:Foo", ["Category:Foo", "Category:Bar", "Template:X"], [], []], "Foo");
        expect([...result!]).toEqual(["Foo", "Bar"]);
        expect(result?.exists).toBe(true);
        expect(result?.normalized).toBeUndefined();
    });

    it("查询串被规范化时写入 normalized", () => {
        const result = suggestionEngines.opensearch.handler(["Category:Foo", ["Category:Foo"], [], []], "foo");
        expect(result?.normalized).toBe("Foo");
        expect(result?.exists).toBe(true);
    });

    it("响应过短时返回 null", () => {
        expect(suggestionEngines.opensearch.handler(["Category:Foo"], "Foo")).toBeNull();
        expect(suggestionEngines.opensearch.handler(null, "Foo")).toBeNull();
    });

    it("缓存命名空间前缀正则", () => {
        expect(state.cat_prefix).toBeNull();
        suggestionEngines.opensearch.handler(["Category:Foo", [], [], []], "Foo");
        expect(state.cat_prefix).toBeInstanceOf(RegExp);
    });
});

describe("其它引擎", () => {
    it("internalsearch 取 allpages", () => {
        expect(suggestionEngines.internalsearch.handler({ query: { allpages: [{ title: "Category:Foo" }, { title: "Category:Bar" }] } })).toEqual(["Foo", "Bar"]);
        expect(suggestionEngines.internalsearch.handler({})).toBeNull();
    });

    it("exists 在页面存在时返回规范化标题", () => {
        const result = suggestionEngines.exists.handler({ query: { pages: { 1: { title: "Category:Foo" } } } }, "foo");
        expect([...result!]).toEqual(["Foo"]);
        expect(result?.exists).toBe(true);
        expect(result?.normalized).toBe("Foo");
    });

    it("exists 对缺失页面（key=-1）返回 null", () => {
        expect(suggestionEngines.exists.handler({ query: { pages: { "-1": { title: "Category:Foo" } } } }, "Foo")).toBeNull();
    });

    it("subcategories / parentcategories 取标题", () => {
        expect(suggestionEngines.subcategories.handler({ query: { categorymembers: [{ title: "Category:Sub" }] } })).toEqual(["Sub"]);
        expect(suggestionEngines.parentcategories.handler({ query: { pages: { 1: { categories: [{ title: "Category:Parent" }] } } } })).toEqual(["Parent"]);
    });

    it("每个方案引用的引擎都存在", () => {
        for (const config of Object.values(suggestionConfigs)) {
            for (const engine of config.engines) {
                expect(suggestionEngines[engine]).toBeDefined();
            }
        }
    });
});

describe("filterAndSortTitles", () => {
    it("前缀匹配优先，其次字典序", () => {
        const list = titles("Xfoo", "Foobar", "Foo");
        filterAndSortTitles(list, "Fo");
        expect(list).toEqual(["Foo", "Foobar", "Xfoo"]);
    });

    it("短前缀排在其扩展之前（b 是 a 的前缀则 b 在前）", () => {
        const list = titles("Foobar", "Foo");
        filterAndSortTitles(list, "Foo");
        expect(list).toEqual(["Foo", "Foobar"]);
    });

    it("相邻重复项去重", () => {
        const list = titles("Foo", "Foo", "Bar");
        filterAndSortTitles(list, "Foo");
        expect(list).toEqual(["Foo", "Bar"]);
    });

    it("剔除黑名单命中项", () => {
        HC.blacklist = /隐藏分类/;
        const list = titles("Foo", "隐藏分类页");
        filterAndSortTitles(list, "Foo");
        expect(list).toEqual(["Foo"]);
    });

    it("分类命名空间下排除当前页面自身", () => {
        resetSite({ wgNamespaceNumber: 14, wgTitle: "Foo" });
        const list = titles("Foo", "Bar");
        filterAndSortTitles(list, "Foo");
        expect(list).toEqual(["Bar"]);
    });

    it("大小写不敏感的前缀优先", () => {
        const list = titles("xfoo", "Foo");
        filterAndSortTitles(list, "foo");
        expect(list).toEqual(["Foo", "xfoo"]);
    });
});
