// 导航链接域单元测试：wikiLink（动作特判矩阵 / oldid 置空规则 / hint 装配）、
// titledWikiLink（actionName 回填、className 三态、oldid 追加）、generalLink
// （newWin 回落 popupNewWindows、noPopup/title/onclick 序列化怪癖）、
// generalNavLink（className === null 回落 popupNavLink）、
// appendParamsToLink（href 引号内追加参数）、changeLinkTargetLink（autoedit
// 命令串构造与转义、minor/watch 省参）、redirLink（重定向导航条两形态）。
// 行为基准 = legacy src/modules/links.ts（commit 02c8dec）；legacy 怪癖
// 无用户可见差异的逐字照搬用例名标注「照搬勿修」。
//
// 断言形态说明：
// - generalLink 产物经 jsdom outerHTML 序列化（属性双引号、href 中的 & 转义
//   为 &amp;、noPopup 属性名小写化为 nopopup）；期望串用 expectedAnchor 以
//   同一 DOM 序列化机制构造，另以 toContain 字面量钉住关键内容。
// - changeLinkTargetLink 的返回值是 appendParamsToLink 的纯字符串手术结果：
//   generalLink 序列化段（& 已转义为 &amp;）与追加参数段（raw &）混合，
//   须手工拼期望串（见对应用例注释）。
// - jsdom 30 的 HTMLElement.innerText setter 不物化 DOM 文本子节点（outerHTML
//   仍为空）；generalLink 依赖真实浏览器「setter 物化为文本子节点」的语义，
//   测试内把原型补齐为 textContent 读写（对纯文本与真实浏览器等价）。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { TITLEBASE, buildTitleWikiFixtures } from "../../helpers/wikiFixtures.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as LinksNs from "../../../src/navlinks/links.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as StringsNs from "../../../src/core/strings.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type EventsModule = typeof EventsNs;
type LinksModule = typeof LinksNs;
type NamespacesModule = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type StringsModule = typeof StringsNs;
type TitleModule = typeof TitleNs;

interface Fresh {
    links: LinksModule;
    namespaces: NamespacesModule;
    options: OptionsModule;
    strings: StringsModule;
    title: TitleModule;
    events: EventsModule;
}

// 见文件头说明：innerText 原型补齐（jsdom 30 的 setter 不物化 DOM 文本子节点，
// outerHTML 仍为空；真实浏览器对纯文本赋值等价于 textContent）
Reflect.defineProperty(HTMLElement.prototype, "innerText", {
    get(this: HTMLElement): string {
        // TS 6 的 lib.dom 把 textContent getter 建模为 string（元素空内容读 ""，
        // 不返回 null），无需兜底
        return this.textContent;
    },
    set(this: HTMLElement, value: string): void {
        this.textContent = value;
    },
    configurable: true,
});

// 期望串构造器：与 generalLink 相同的属性写入顺序（href → title → onclick →
// noPopup → target → class），经同一 DOM 序列化机制产出
const expectedAnchor = (opts: {
    href: string;
    title: string;
    onclick?: string;
    noPopup?: boolean;
    target?: boolean;
    className?: string;
    text: string;
}): string => {
    const elem = document.createElement("a");
    elem.href = opts.href;
    elem.title = opts.title;
    elem.setAttribute("onclick", opts.onclick ?? "undefined");
    if (opts.noPopup) {
        elem.setAttribute("noPopup", "1");
    }
    if (opts.target) {
        elem.target = "_blank";
    }
    if (opts.className) {
        elem.className = opts.className;
    }
    elem.innerText = opts.text;
    return elem.outerHTML;
};

// 本文件写到 window 上的选项覆盖，用例间统一摘除（getValueOf 首读固化缓存，
// 不同选项组合经 resetModules 各自重载 + 各自覆盖）
let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw();
    const [links, namespaces, options, strings, title, events] = await Promise.all([
        import("../../../src/navlinks/links.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/strings.ts"),
        import("../../../src/title/title.ts"),
        import("../../../src/core/events.ts"),
    ]);
    options.setOptions();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { links, namespaces, options, strings, title, events };
};

// wikiLink 用例通用：修订版本串（萌百译文以 $1/$2 就位，$1=oldid、$2=条目）
const revStr = (f: Fresh, oldid: string, article: string): string =>
    f.strings.tprintf("revision %s of %s", [oldid, article]);

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    document.body.innerHTML = "";
});

describe("wikiLink", () => {
    it("article 未定义返回 null", async () => {
        const f = await fresh();
        expect(f.links.wikiLink({ action: "edit", text: "t" } as Partial<LinksNs.LinkSpec> as LinksNs.LinkSpec)).toBeNull();
    });

    it("action 未定义返回 null", async () => {
        const f = await fresh();
        expect(f.links.wikiLink({ article: new f.title.Title("Foo"), text: "t" })).toBeNull();
    });

    it("text 未定义返回 null", async () => {
        const f = await fresh();
        expect(f.links.wikiLink({ article: new f.title.Title("Foo"), action: "edit" })).toBeNull();
    });

    it("view 带 oldid：url 只出条目地址 + oldid，hint 用修订版本串", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "view", text: "查看", oldid: "12345" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&oldid=12345`,
            title: f.strings.simplePrintf(f.strings.popupString("viewHint"), [revStr(f, "12345", "Foo")]),
            text: "查看",
        }));
        expect(html).not.toContain("action=");
        expect(html).toContain("前往 页面 Foo 的修订版本 12345");
    });

    it("edit：追加 wpChangeTags 且 oldid 保留", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "edit", text: "编辑", oldid: "12345" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=edit&wpChangeTags=Popups%2CAutomation%20tool&oldid=12345`,
            title: f.strings.simplePrintf(f.strings.popupString("editHint"), [revStr(f, "12345", "Foo")]),
            text: "编辑",
        }));
        expect(html).toContain("修改 页面 Foo 的修订版本 12345 的内容");
    });

    it("edit&section=new：hint 换 newSectionHint、无 wpChangeTags、oldid 丢弃", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "edit&section=new", text: "新话题", oldid: "999" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=edit&section=new`,
            title: f.strings.simplePrintf(f.strings.popupString("newSectionHint"), ["Foo"]),
            text: "新话题",
        }));
        expect(html).not.toContain("oldid=");
        expect(html).toContain("在 Foo 增加新的讨论话题");
    });

    it("edit&undo= 带 diff 与 oldid：展开 undo 与 undoafter", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "edit&undo=", diff: "123", oldid: "456", text: "撤销" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=edit&undo=123&undoafter=456`,
            title: f.strings.simplePrintf(f.strings.popupString("undoHint"), ["Foo"]),
            text: "撤销",
        }));
    });

    it("edit&undo= 无 diff 有 oldid：action=edit&undo=<oldid>", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "edit&undo=", oldid: "456", text: "撤销" });
        expect(html).toContain("&amp;action=edit&amp;undo=456");
        expect(html).not.toContain("undoafter=");
    });

    it("edit&undo= 且 diff=prev：同样走 undo=<oldid> 分支", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "edit&undo=", diff: "prev", oldid: "456", text: "撤销" });
        expect(html).toContain("&amp;action=edit&amp;undo=456");
        expect(html).not.toContain("undoafter=");
    });

    it("edit&undo= 无 oldid：action 原样保留（空 undo=，照搬勿修）", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "edit&undo=", diff: "123", text: "撤销" });
        // savedOldid 为空 → diff 不展开、oldid 不追加，action 原样进 URL；hint 的
        // simplePrintf 走无 oldid 分支（用条目名占位）
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=edit&undo=`,
            title: f.strings.simplePrintf(f.strings.popupString("undoHint"), ["Foo"]),
            text: "撤销",
        }));
        expect(html).not.toContain("undoafter=");
        expect(html).not.toContain("oldid=");
    });

    it("raw&ctype=text/css：oldid 保留（^raw 命中）", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "raw&ctype=text/css", text: "源码", oldid: "12345" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=raw&ctype=text/css&oldid=12345`,
            title: f.strings.simplePrintf(f.strings.popupString("rawHint"), [revStr(f, "12345", "Foo")]),
            text: "源码",
        }));
    });

    it("revert（无当前链接）：popupQueriedRevertSummary + autorv + oldid", async () => {
        const f = await fresh();
        // 无当前悬停链接：parseParams("") 的 p.diff 为 undefined，走非 prev 摘要
        expect(f.events.eventsState.current.link).toBeNull();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "revert", text: "回退", oldid: "456" });
        const summary = `${f.options.getValueOf("popupQueriedRevertSummary") as string}&autorv=456`;
        // "revert" 命中 oldid 保留正则，titledWikiLink 在 action 之后追加 &oldid
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=edit&autoclick=wpSave&actoken=mock-session-id&autoimpl=np20140416&autosummary=${summary}&oldid=456`,
            title: f.strings.simplePrintf(f.strings.popupString("revertHint"), [revStr(f, "456", "Foo")]),
            text: "回退",
        }));
        expect(html).not.toContain("direction=prev");
        expect(html).not.toContain("autosummaryprompt");
        expect(html).not.toContain("autominor");
    });

    it("revert（当前链接 diff=prev）：direction=prev + 上一个版本摘要与提示串", async () => {
        const f = await fresh();
        const anchor = document.createElement("a");
        anchor.href = `${TITLEBASE}Foo&diff=prev&oldid=456`;
        f.events.eventsState.current.link = anchor;
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "revert", text: "回退", oldid: "456" });
        const summary = `${f.options.getValueOf("popupQueriedRevertToPreviousSummary") as string}&autorv=456`;
        // direction=prev 追加在 action 内，oldid 仍由 titledWikiLink 追加在最后
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=edit&autoclick=wpSave&actoken=mock-session-id&autoimpl=np20140416&autosummary=${summary}&direction=prev&oldid=456`,
            title: f.strings.simplePrintf(f.strings.popupString("revertHint"), [f.strings.tprintf("the revision prior to revision %s of %s", ["456", "Foo"])]),
            text: "回退",
        }));
        expect(html).toContain("&amp;direction=prev");
    });

    it("revert 且 popupRevertSummaryPrompt=true：追加 autosummaryprompt", async () => {
        const f = await fresh({ popupRevertSummaryPrompt: true });
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "revert", text: "回退", oldid: "456" });
        expect(html).toContain("&amp;autosummaryprompt=true");
    });

    it("revert 且 popupMinorReverts=true：追加 autominor", async () => {
        const f = await fresh({ popupMinorReverts: true });
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "revert", text: "回退", oldid: "456" });
        expect(html).toContain("&amp;autominor=true");
    });

    it("nullEdit：autosummary 取 nullEditSummary 译文", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "nullEdit", text: "零编辑" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=edit&autoclick=wpSave&actoken=mock-session-id&autoimpl=np20140416&autosummary=${f.strings.popupString("nullEditSummary")}`,
            title: f.strings.simplePrintf(f.strings.popupString("nullEditHint"), ["Foo"]),
            text: "零编辑",
        }));
    });

    it("historyfeed：action 改写为 history&feed=rss", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "historyfeed", text: "rss" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=history&feed=rss`,
            title: f.strings.simplePrintf(f.strings.popupString("historyfeedHint"), ["Foo"]),
            text: "rss",
        }));
    });

    it("markpatrolled：action 展开 rcid", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "markpatrolled", text: "巡查", rcid: "777" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=markpatrolled&rcid=777`,
            title: f.strings.simplePrintf(f.strings.popupString("markpatrolledHint"), ["Foo"]),
            text: "巡查",
        }));
        // rcid 缺省时 String(undefined) 进 URL（照搬勿修）
        const noRcid = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "markpatrolled", text: "巡查" });
        expect(noRcid).toContain("&amp;rcid=undefined");
    });

    it("默认分支（history）：hint 用 historyHint 且丢弃 oldid", async () => {
        const f = await fresh();
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "history", text: "历史", oldid: "999" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo&action=history`,
            title: f.strings.simplePrintf(f.strings.popupString("historyHint"), ["Foo"]),
            text: "历史",
        }));
        expect(html).not.toContain("oldid=");
        expect(html).toContain("Foo 的修订历史");
    });

    it("newWin 缺省：popupNewWindows=true 时补 target=_blank", async () => {
        const f = await fresh({ popupNewWindows: true });
        const html = f.links.wikiLink({ article: new f.title.Title("Foo"), action: "view", text: "查看" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Foo`,
            title: f.strings.simplePrintf(f.strings.popupString("viewHint"), ["Foo"]),
            target: true,
            text: "查看",
        }));
    });
});

describe("titledWikiLink", () => {
    it("article 未定义返回 null", async () => {
        const f = await fresh();
        expect(f.links.titledWikiLink({ action: "edit", text: "t" } as Partial<LinksNs.LinkSpec> as LinksNs.LinkSpec)).toBeNull();
    });

    it("action 未定义返回 null", async () => {
        const f = await fresh();
        expect(f.links.titledWikiLink({ article: new f.title.Title("Foo"), text: "t" })).toBeNull();
    });

    it("actionName 缺省回填 action", async () => {
        const f = await fresh();
        const html = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "history", text: "h" });
        expect(html).toBe(expectedAnchor({ href: `${TITLEBASE}Foo&action=history`, title: "null", text: "h" }));
    });

    it("actionName 空串同样回填 action（照搬勿修）", async () => {
        const f = await fresh();
        const html = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "history", actionName: "", text: "h" });
        expect(html).toBe(expectedAnchor({ href: `${TITLEBASE}Foo&action=history`, title: "null", text: "h" }));
    });

    it("自定义 actionName 进 URL 参数名", async () => {
        const f = await fresh();
        const html = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "cur", actionName: "diff", text: "cur" });
        expect(html).toContain("&amp;diff=cur");
    });

    it("action=edit 追加 wpChangeTags", async () => {
        const f = await fresh();
        const html = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "edit", text: "e" });
        expect(html).toBe(expectedAnchor({ href: `${TITLEBASE}Foo&action=edit&wpChangeTags=Popups%2CAutomation%20tool`, title: "null", text: "e" }));
    });

    it("oldid 三态：真值追加，null 与缺省不追加", async () => {
        const f = await fresh();
        const withOldid = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "view", text: "v", oldid: "123" });
        expect(withOldid).toContain("&amp;oldid=123");
        const nullOldid = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "view", text: "v", oldid: null });
        expect(nullOldid).not.toContain("oldid=");
        const noOldid = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "view", text: "v" });
        expect(noOldid).not.toContain("oldid=");
    });

    it("className 三态：覆盖 / null 与缺省均无 class（照搬勿修）", async () => {
        const f = await fresh();
        const overridden = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "view", text: "v", className: "myClass" });
        expect(overridden).toBe(expectedAnchor({ href: `${TITLEBASE}Foo`, title: "null", className: "myClass", text: "v" }));
        // cssClass 初值取自恒 undefined 的 wiki.misc.defaultNavlinkClassname，
        // null 不满足 truthy 赋值条件 → 传给 generalNavLink 的是 undefined，
        // 不命中其 === null 回落分支（legacy 原样，popupNavLink 回落在
        // generalNavLink 直调用例覆盖）
        const nullClass = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "view", text: "v", className: null });
        expect(nullClass).toBe(expectedAnchor({ href: `${TITLEBASE}Foo`, title: "null", text: "v" }));
        expect(nullClass).not.toContain("class=");
        const noClass = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "view", text: "v" });
        expect(noClass).not.toContain("class=");
    });

    it("title/text 未定义：序列化为字面 null（照搬勿修）", async () => {
        const f = await fresh();
        const html = f.links.titledWikiLink({ article: new f.title.Title("Foo"), action: "history" });
        expect(html).toBe(expectedAnchor({ href: `${TITLEBASE}Foo&action=history`, title: "null", text: "null" }));
    });
});

describe("generalLink", () => {
    const testUrl = "https://example.org/x";

    it("url 未定义返回 null", async () => {
        const f = await fresh();
        expect(f.links.generalLink({} as Partial<LinksNs.GeneralLinkSpec> as LinksNs.GeneralLinkSpec)).toBeNull();
    });

    it("newWin 缺省：默认 popupNewWindows=false 无 target", async () => {
        const f = await fresh();
        expect(f.links.generalLink({ url: testUrl, title: "t", text: "x" })).toBe(expectedAnchor({ href: testUrl, title: "t", text: "x" }));
    });

    it("newWin 缺省回落 popupNewWindows=true：补 target=_blank", async () => {
        const f = await fresh({ popupNewWindows: true });
        expect(f.links.generalLink({ url: testUrl, title: "t", text: "x" })).toBe(expectedAnchor({ href: testUrl, title: "t", text: "x", target: true }));
    });

    it("newWin=null 同样回落", async () => {
        const f = await fresh({ popupNewWindows: true });
        expect(f.links.generalLink({ url: testUrl, newWin: null, title: "t", text: "x" })).toBe(expectedAnchor({ href: testUrl, title: "t", text: "x", target: true }));
    });

    it("newWin=false 显式关闭（覆盖 popupNewWindows=true）", async () => {
        const f = await fresh({ popupNewWindows: true });
        expect(f.links.generalLink({ url: testUrl, newWin: false, title: "t", text: "x" })).toBe(expectedAnchor({ href: testUrl, title: "t", text: "x" }));
    });

    it("noPopup 置属性（jsdom 序列化小写为 nopopup=1）", async () => {
        const f = await fresh();
        expect(f.links.generalLink({ url: testUrl, noPopup: 1, title: "t", text: "x" })).toBe(expectedAnchor({ href: testUrl, noPopup: true, title: "t", text: "x" }));
    });

    it("onclick 透传", async () => {
        const f = await fresh();
        const onclick = "pg.fn.x();return false;";
        expect(f.links.generalLink({ url: testUrl, onclick, title: "t", text: "x" })).toBe(expectedAnchor({ href: testUrl, onclick, title: "t", text: "x" }));
    });

    it("className 设置", async () => {
        const f = await fresh();
        expect(f.links.generalLink({ url: testUrl, className: "c", title: "t", text: "x" })).toBe(expectedAnchor({ href: testUrl, className: "c", title: "t", text: "x" }));
    });

    it("title/onclick 缺省序列化为字面 undefined（照搬勿修）", async () => {
        const f = await fresh();
        expect(f.links.generalLink({ url: testUrl, text: "x" })).toBe(expectedAnchor({ href: testUrl, title: "undefined", text: "x" }));
    });

    it("text 经 unescapeQuotesHTML 反解后写入（实体还原）", async () => {
        const f = await fresh();
        const html = f.links.generalLink({ url: testUrl, title: "t", text: "a&amp;b &lt;c&gt;" });
        expect(html).toBe(expectedAnchor({ href: testUrl, title: "t", text: "a&b <c>" }));
    });
});

// legacy 未导出 generalNavLink；重写版导出仅为可直调覆盖 className === null
// 回落分支（titledWikiLink 传入的 undefined 不命中，见 className 三态用例）
describe("generalNavLink", () => {
    const testUrl = "https://example.org/x";

    it("className 为 null：回落 popupNavLink（照搬勿修）", async () => {
        const f = await fresh();
        expect(f.links.generalNavLink({ url: testUrl, className: null, title: "t", text: "x" }))
            .toBe(expectedAnchor({ href: testUrl, className: "popupNavLink", title: "t", text: "x" }));
    });

    it("className 缺省：不进 class 属性（undefined 不命中严格 null 比较）", async () => {
        const f = await fresh();
        const html = f.links.generalNavLink({ url: testUrl, title: "t", text: "x" });
        expect(html).toBe(expectedAnchor({ href: testUrl, title: "t", text: "x" }));
        expect(html).not.toContain("class=");
    });
});

describe("appendParamsToLink", () => {
    it("linkstr 为 null 返回 null", async () => {
        const f = await fresh();
        expect(f.links.appendParamsToLink(null, "autoedit=1")).toBeNull();
    });

    it("串内无 href 命中返回 null", async () => {
        const f = await fresh();
        expect(f.links.appendParamsToLink("<span>无锚点</span>", "autoedit=1")).toBeNull();
    });

    it("参数追加进 href 引号内、其余原样", async () => {
        const f = await fresh();
        // eslint-disable-next-line @stylistic/quotes -- 输入输出锁定含双引号 href 的字符串手术形态
        expect(f.links.appendParamsToLink(`<a href="https://x.org/w/index.php?title=A">t</a>`, "autoedit=1&autoclick=wpSave"))
            // eslint-disable-next-line @stylistic/quotes -- 同上
            .toBe(`<a href="https://x.org/w/index.php?title=A&autoedit=1&autoclick=wpSave">t</a>`);
    });
});

describe("changeLinkTargetLink", () => {
    it("newTarget 分支：完整 autoedit 命令串转义后追加进 href", async () => {
        const f = await fresh();
        const out = f.links.changeLinkTargetLink({
            newTarget: "Bar",
            oldTarget: "Foo",
            title: "Foo",
            text: "改链",
            hint: "改链提示",
            clickButton: "wpDiff",
            minor: true,
            watch: null,
            summary: "S",
        });
        const cmd = "s~\\[\\[\\s*([Ff]oo(?:#[^\\[\\|]*)?)\\s*\\]\\]~[[Bar|$1]]~g;s~\\[\\[\\s*([Ff]oo(?:#[^\\[\\|]*)?)\\s*[|]~[[Bar|~g;s~\\[\\[Bar\\|Bar\\]\\]~[[Bar]]~g";
        // appendParamsToLink 是纯字符串手术：generalLink 序列化段的 & 已转义为
        // &amp;，追加参数段保持 raw &——混合转义形态为 legacy 原样
        const expected = `<a href="${TITLEBASE}Foo&amp;action=edit&amp;wpChangeTags=Popups%2CAutomation%20tool&autoedit=${encodeURIComponent(cmd)}&autoclick=wpDiff&actoken=mock-session-id&autominor=true&autosummary=S&autoimpl=np20140416" title="改链提示" onclick="undefined" class="popup_change_title_link">改链</a>`;
        expect(out).toBe(expected);
    });

    it("alsoChangeLabel=true：直替为 [[新目标]]（不带 |$1）", async () => {
        const f = await fresh();
        const out = f.links.changeLinkTargetLink({
            newTarget: "Bar",
            oldTarget: "Foo",
            title: "Foo",
            text: "改链与标签",
            hint: "h",
            clickButton: "wpDiff",
            minor: null,
            watch: null,
            summary: "S",
            alsoChangeLabel: true,
        });
        expect(out).toContain(encodeURIComponent("[[Bar]]~g"));
        expect(out).not.toContain(encodeURIComponent("[[Bar|$1]]"));
        expect(out).not.toContain("autominor=");
        expect(out).not.toContain("autowatch=");
    });

    it("无 newTarget：解链命令以 $1/$2 展开", async () => {
        const f = await fresh();
        const out = f.links.changeLinkTargetLink({
            oldTarget: "Foo",
            title: "Foo",
            text: "解链",
            clickButton: "wpSave",
            minor: null,
            watch: null,
            summary: "R",
        });
        expect(out).toContain(encodeURIComponent("$1~g"));
        expect(out).toContain(encodeURIComponent("$2~g"));
    });

    it("minor/watch 非 null 时各自入参（false/字符串同样编码）", async () => {
        const f = await fresh();
        const out = f.links.changeLinkTargetLink({
            oldTarget: "Foo",
            title: "Foo",
            text: "t",
            clickButton: "wpDiff",
            minor: false,
            watch: "preferences",
            summary: "S",
        });
        // 追加参数段不经 DOM 序列化，& 保持原样
        expect(out).toContain("&autominor=false");
        expect(out).toContain("&autowatch=preferences");
    });

    it("title 缺省回落 wgPageName（下划线转空格后作条目名）", async () => {
        const f = await fresh();
        const out = f.links.changeLinkTargetLink({
            oldTarget: "Main Page",
            text: "t",
            clickButton: "wpDiff",
            minor: null,
            watch: null,
            summary: "S",
        });
        expect(out).toContain("title=Main_Page&amp;action=edit");
    });

    it("oldTarget 百分号编码时不影响产出（走 debug 日志路径）", async () => {
        const f = await fresh();
        const out = f.links.changeLinkTargetLink({
            oldTarget: "Foo%20Bar",
            title: "Foo",
            text: "t",
            clickButton: "wpDiff",
            minor: null,
            watch: null,
            summary: "S",
        });
        expect(out).toContain("&autoedit=");
        expect(out).toContain(encodeURIComponent("(?:[_ ]+|%20)"));
    });
});

describe("redirLink", () => {
    it("popupFixRedirs 关闭（默认）：hr 分隔 + 重定向文案", async () => {
        const f = await fresh();
        expect(f.links.redirLink("Bar", new f.title.Title("Foo"))).toBe(`<hr />${f.strings.popupString("Redirects")}${f.strings.popupString(" to ")}`);
    });

    it("popupFixRedirs 开启：串起「target / target & label」两个改链入口", async () => {
        const f = await fresh({ popupFixRedirs: true });
        const article = new f.title.Title("Foo");
        const base = {
            newTarget: "Bar",
            summary: f.strings.simplePrintf(f.options.getValueOf("popupFixRedirsSummary") as string, [article.toString(), "Bar"]),
            oldTarget: article.toString(),
            clickButton: f.options.getValueOf("popupRedirAutoClick") as string,
            minor: true,
            watch: f.options.getValueOf("popupWatchRedirredPages") as boolean | null,
        };
        const first = f.links.changeLinkTargetLink({
            ...base,
            text: f.strings.popupString("target"),
            hint: f.strings.popupString("Fix this redirect, changing just the link target"),
        });
        const second = f.links.changeLinkTargetLink({
            ...base,
            alsoChangeLabel: true,
            text: f.strings.popupString("target & label"),
            hint: f.strings.popupString("Fix this redirect, changing the link target and label"),
        });
        expect(f.links.redirLink("Bar", article)).toBe(
            `<hr />${f.strings.popupString("Redirects to: (Fix ")}${String(first)}${f.strings.popupString(" or ")}${String(second)}${f.strings.popupString(")")}`,
        );
    });

    it("popupNavLinks 关闭：绕过重定向链接", async () => {
        const f = await fresh({ popupNavLinks: false });
        const out = f.links.redirLink("Bar", new f.title.Title("Foo"));
        expect(out).toBe(`<br> ${f.strings.popupString("Redirects")}${f.strings.popupString(" to ")}${expectedAnchor({ href: `${TITLEBASE}Bar`, title: f.strings.popupString("Bypass redirect"), text: "Bar" })}`);
    });

    it("popupAppendRedirNavLinks 关闭：同走绕过链接", async () => {
        const f = await fresh({ popupAppendRedirNavLinks: false });
        const out = f.links.redirLink("Bar", new f.title.Title("Foo"));
        expect(out).toBe(`<br> ${f.strings.popupString("Redirects")}${f.strings.popupString(" to ")}${expectedAnchor({ href: `${TITLEBASE}Bar`, title: f.strings.popupString("Bypass redirect"), text: "Bar" })}`);
    });
});
