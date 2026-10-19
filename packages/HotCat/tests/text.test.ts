import { beforeEach, describe, expect, it, vi } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { site } from "../src/runtime.ts";
import { capitalize, escapeRE, param, replaceShortcuts, substitute, wikiPagePath, title } from "../src/util/text.ts";
import { evtKeys, evtKill } from "../src/util/events.ts";
import { resetSite } from "./helpers/site.ts";

beforeEach(() => {
    resetSite();
});

describe("substitute", () => {
    it("替换 $1 / $2 数字占位符", () => {
        expect(substitute("$1 categories", { 1: "3" })).toBe("3 categories");
        expect(substitute("$1 $2", { 1: "a", 2: "b" })).toBe("a b");
    });

    // eslint-disable-next-line no-template-curly-in-string -- 用例名描述的就是占位符字面量
    it("支持 ${key} 与 $key 两种命名占位符", () => {
        // eslint-disable-next-line no-template-curly-in-string -- 字面量就是待替换的占位符
        expect(substitute("${foo}", { foo: "F" })).toBe("F");
        expect(substitute("$foo", { foo: "F" })).toBe("F");
    });

    it("$$ 转义为字面 $", () => {
        expect(substitute("$$foo", { foo: "F" })).toBe("$foo");
    });

    it("缺失的键保留原占位符", () => {
        expect(substitute("$missing", {})).toBe("$missing");
    });

    it("map 为空时原样返回", () => {
        expect(substitute("$1", null)).toBe("$1");
    });

    it("函数值以 (match, key) 调用", () => {
        expect(substitute("$x", { x: (match, key) => `${key}:${match}` })).toBe("x:$x");
    });
});

describe("replaceShortcuts", () => {
    beforeEach(() => {
        HC.shortcuts = { foo: "Alpha", bar: "Beta" };
    });

    it("替换 #name 与 #[name]", () => {
        expect(replaceShortcuts("#foo", HC.shortcuts)).toBe("Alpha");
        expect(replaceShortcuts("#[foo]", HC.shortcuts)).toBe("Alpha");
    });

    it("未知快捷键原样保留", () => {
        expect(replaceShortcuts("#missing", HC.shortcuts)).toBe("#missing");
    });

    it("按站点规则决定是否首字母大写", () => {
        HC.shortcuts = { foo: "alpha" };
        HC.capitalizePageNames = true;
        expect(replaceShortcuts("#foo", HC.shortcuts)).toBe("Alpha");
        HC.capitalizePageNames = false;
        expect(replaceShortcuts("#foo", HC.shortcuts)).toBe("alpha");
    });
});

describe("capitalize / escapeRE", () => {
    it("只大写首字符", () => {
        expect(capitalize("foo")).toBe("Foo");
        expect(capitalize("éclair")).toBe("Éclair");
        expect(capitalize("")).toBe("");
    });

    it("转义正则元字符", () => {
        expect(escapeRE("a.b(c)[d]")).toBe("a\\.b\\(c\\)\\[d\\]");
        expect(escapeRE("plain")).toBe("plain");
    });
});

describe("param / title / wikiPagePath", () => {
    it("从查询串取参数并解码", () => {
        expect(param("title", "https://x.test/index.php?title=Foo%20Bar&action=edit")).toBe("Foo Bar");
        expect(param("action", "https://x.test/index.php?title=Foo&action=edit")).toBe("edit");
        expect(param("missing", "https://x.test/index.php?title=Foo")).toBeNull();
    });

    it("识别 /index.php 与 /wiki/ 两种链接", () => {
        expect(title("https://zh.moegirl.org.cn/index.php?title=Foo")).toBe("Foo");
        expect(title("https://zh.moegirl.org.cn/wiki/Bar%20Baz")).toBe("Bar Baz");
        expect(title("https://example.org/wiki/Other")).toBeNull();
        expect(title("")).toBeNull();
    });

    it("页面名保留冒号与斜杠", () => {
        expect(wikiPagePath("Category:Foo/Bar")).toBe("/wiki/Category:Foo/Bar");
        expect(wikiPagePath("Foo Bar")).toBe("/wiki/Foo%20Bar");
    });

    it("依赖入口注入的两个前缀", () => {
        site.expandedScriptPrefix = "https://zh.moegirl.org.cn/index.php";
        site.expandedArticlePrefix = "https://zh.moegirl.org.cn/wiki/";
        expect(title("https://zh.moegirl.org.cn/wiki/Foo")).toBe("Foo");
    });
});

describe("evtKeys / evtKill", () => {
    it("Ctrl 为 1，Shift 为 2", () => {
        expect(evtKeys({ ctrlKey: false, shiftKey: false, metaKey: false })).toBe(0);
        expect(evtKeys({ ctrlKey: true, shiftKey: false, metaKey: false })).toBe(1);
        expect(evtKeys({ ctrlKey: true, shiftKey: true, metaKey: false })).toBe(3);
        expect(evtKeys({ ctrlKey: false, shiftKey: true, metaKey: true })).toBe(0);
    });

    it("阻止默认行为并返回 false", () => {
        const event = new Event("click", { cancelable: true });
        const stop = vi.spyOn(event, "stopPropagation");
        expect(evtKill(event)).toBe(false);
        expect(event.defaultPrevented).toBe(true);
        expect(stop).toHaveBeenCalled();
    });
});
