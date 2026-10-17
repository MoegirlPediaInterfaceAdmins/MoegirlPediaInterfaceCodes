// 导航链接域单元测试（阶段 4-L3 余段，links.ts 追加段）：外部统计/搜索链接
// 五件套（arin/editCounter/globalSearch/google/editorList）的 URL 逐字装配与
// saneLinkCheck 门控、getHistoryInfo 家族（XHR 完整回调链、JSON 夹具→
// HistoryInfo、finishProcessHistory 的 myLastEdit/firstNewEditor 判定矩阵）、
// getLastContrib/getDiffSinceMyEdit 的 alert 文案与 displayUrl 新窗口/导航
// 两条打开方式、pg.fn 家族的普通函数化移植（purgePopups/disablePopups/
// togglePreviews/modifyWatchlist/magicWatchLink/magicHistoryLink/popupMenuLink/
// specialLink）。行为基准 = legacy src/modules/links.ts（commit 02c8dec）；
// 怪癖用例名标注「照搬勿修」。
//
// 断言形态说明（与 links.test.ts 同款）：
// - generalLink 产物经 jsdom outerHTML 序列化，期望串用 expectedAnchor 以同一
//   DOM 序列化机制构造；innerText 原型补齐见 links.test.ts 文件头。
// - displayUrl 的 newWin=false 分支写 document.location.href：jsdom 的真导航
//   不可观测（Not implemented），用例把目标页标题带上 "#" 锚点、并令当前
//   URL 与目标仅差 fragment——jsdom 对同文档 fragment 导航会真实更新
//   location.hash，以 hash 值钉住写入的 URL（见对应用例注释）。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw, type InstalledMw } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import { TITLEBASE, buildTitleWikiFixtures } from "../../helpers/wikiFixtures.ts";
import type * as CacheNs from "../../../src/net/cache.ts";
import type * as DownloaderNs from "../../../src/net/downloader.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as LinksNs from "../../../src/navlinks/links.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as SiteNs from "../../../src/api/siteinfo.ts";
import type * as StringsNs from "../../../src/core/strings.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type Cache = typeof CacheNs;
type DownloaderModule = typeof DownloaderNs;
type EventsModule = typeof EventsNs;
type LinksModule = typeof LinksNs;
type NamespacesModule = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type PopupModule = typeof PopupNs;
type SiteModule = typeof SiteNs;
type StringsModule = typeof StringsNs;
type TitleModule = typeof TitleNs;

interface Fresh {
    links: LinksModule;
    namespaces: NamespacesModule;
    options: OptionsModule;
    strings: StringsModule;
    title: TitleModule;
    events: EventsModule;
    site: SiteModule;
    downloader: DownloaderModule;
    cache: Cache;
    popup: PopupModule;
    installed: InstalledMw;
}

// 见 links.test.ts 文件头说明：innerText 原型补齐（jsdom 30 的 setter 不物化
// DOM 文本子节点，outerHTML 仍为空；真实浏览器对纯文本赋值等价于 textContent）
Reflect.defineProperty(HTMLElement.prototype, "innerText", {
    get(this: HTMLElement): string {
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

const APIBASE = "https://zh.moegirl.org.cn/api.php";
const SITEBASE = "zh.moegirl.org.cn";
// legacy init.ts setRegexps 的 ipUser 常量（^ 只约束 IPv6 支、$ 只约束 IPv4 支，
// legacy 原样；buildTitleWikiFixtures 不含该正则，arinLink 用例就地装配）
const IP_USER_SOURCE = "^(?::(?::|(?::[0-9A-Fa-f]{1,4}){1,7})|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6}::|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){7})|(((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9]))$";

let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw();
    const [links, namespaces, options, strings, title, events, site, downloader, cache, popup] = await Promise.all([
        import("../../../src/navlinks/links.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/strings.ts"),
        import("../../../src/title/title.ts"),
        import("../../../src/core/events.ts"),
        import("../../../src/api/siteinfo.ts"),
        import("../../../src/net/downloader.ts"),
        import("../../../src/net/cache.ts"),
        import("../../../src/core/popup.ts"),
    ]);
    namespaces.setNamespaces();
    options.setOptions();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    title.wiki.re.ipUser = RegExp(IP_USER_SOURCE);
    // 站点态：apiwikibase/titlebase 供 getHistory/editorListLink；hostname 取
    // 萌百域名（editCounterLink 的前两段 + wikimedia 统计链接门控）
    site.siteState.apiwikibase = APIBASE;
    site.siteState.hostname = SITEBASE;
    site.siteState.wikimedia = true;
    // Talk 名字空间：installMw 的 wgNamespaceIds 默认不含 talk（title 域
    // namespaceId 会回落 0），editorListLink 的讨论页用例就地补表
    (installed.config.wgNamespaceIds as Record<string, number>).talk = 1;
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { links, namespaces, options, strings, title, events, site, downloader, cache, popup, installed };
};

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    // displayUrl 的导航用例改过 location，逐用例复位
    window.history.pushState(null, "", "/");
});

// 历史查询 JSON 夹具（MediaWiki formatversion=2 的 revisions 数组）
const historyBody = (revisions: { revid?: number; user?: string }[]): string =>
    JSON.stringify({ query: { pages: { 1: { revisions } } } });

// 直填 data 的下载器夹具（processHistory 直调用例）
const downloadWith = (f: Fresh, payload: unknown): DownloaderNs.Downloader => {
    const d = new f.downloader.Downloader("https://example/api");
    d.data = typeof payload === "string" ? payload : JSON.stringify(payload);
    return d;
};

const IP_ARTICLE = "User:1.2.3.4";

describe("arinLink", () => {
    it("article 非对象：saneLinkCheck 挡下", async () => {
        const f = await fresh();
        expect(f.links.arinLink({ text: "t" } as Partial<LinksNs.LinkSpec> as LinksNs.LinkSpec)).toBeNull();
    });

    it("text 非字符串：saneLinkCheck 挡下", async () => {
        const f = await fresh();
        expect(f.links.arinLink({ article: new f.title.Title(IP_ARTICLE) })).toBeNull();
    });

    it("非 IP 用户：返回 null", async () => {
        const f = await fresh();
        expect(f.links.arinLink({ article: new f.title.Title("User:Example"), text: "whois" })).toBeNull();
    });

    it("IP 用户但站点非 wikimedia：返回 null", async () => {
        const f = await fresh();
        f.site.siteState.wikimedia = false;
        expect(f.links.arinLink({ article: new f.title.Title(IP_ARTICLE), text: "whois" })).toBeNull();
    });

    it("IP 用户：ARIN whois 明文 http URL + noPopup（照搬勿修）", async () => {
        const f = await fresh();
        const article = new f.title.Title(IP_ARTICLE);
        const html = f.links.arinLink({ article, text: "whois" });
        expect(html).toBe(expectedAnchor({
            href: "http://ws.arin.net/cgi-bin/whois.pl?queryinput=1.2.3.4",
            title: f.strings.tprintf("Look up %s in ARIN whois database", [article.userName()]),
            text: "whois",
            noPopup: true,
        }));
        expect(html).toContain("在 ARIN Whois 数据库中查询 1.2.3.4");
    });
});

describe("editCounterLink", () => {
    it("article 非对象：saneLinkCheck 挡下", async () => {
        const f = await fresh();
        expect(f.links.editCounterLink({ text: "t" } as Partial<LinksNs.LinkSpec> as LinksNs.LinkSpec)).toBeNull();
    });

    it("站点非 wikimedia：返回 null", async () => {
        const f = await fresh();
        f.site.siteState.wikimedia = false;
        expect(f.links.editCounterLink({ article: new f.title.Title("User:Example"), text: "计数" })).toBeNull();
    });

    it("缺省工具 supercount：xtools 域取主机名前两段（照搬勿修）", async () => {
        const f = await fresh();
        const html = f.links.editCounterLink({ article: new f.title.Title("User:Example"), text: "计数" });
        expect(html).toBe(expectedAnchor({
            href: "https://xtools.wmflabs.org/ec?user=Example&project=zh.moegirl&uselang=zh-cn",
            title: f.strings.tprintf("editCounterLinkHint", [new f.title.Title("User:Example").userName()]),
            text: "计数",
            noPopup: true,
        }));
    });

    it("tool=kate/interiot/soxred：同样走默认工具 URL", async () => {
        for (const tool of ["kate", "interiot", "soxred"]) {
            const f = await fresh({ popupEditCounterTool: tool });
            expect(f.links.editCounterLink({ article: new f.title.Title("User:Example"), text: "t" }))
                .toBe(expectedAnchor({
                    href: "https://xtools.wmflabs.org/ec?user=Example&project=zh.moegirl&uselang=zh-cn",
                    title: f.strings.tprintf("editCounterLinkHint", [new f.title.Title("User:Example").userName()]),
                    text: "t",
                    noPopup: true,
                }));
        }
    });

    it("tool=未知值：default 分支同默认工具 URL", async () => {
        const f = await fresh({ popupEditCounterTool: "no-such-tool" });
        expect(f.links.editCounterLink({ article: new f.title.Title("User:Example"), text: "t" }))
            .toContain("https://xtools.wmflabs.org/ec?user=Example&amp;project=zh.moegirl&amp;uselang=zh-cn");
    });

    it("tool=custom：popupEditCounterUrl + toolDbName 拼接（_p 后缀，照搬勿修）", async () => {
        const f = await fresh({ popupEditCounterTool: "custom", popupEditCounterUrl: "https://custom.example/?user=$1&db=$2" });
        const html = f.links.editCounterLink({ article: new f.title.Title("User:Example User"), text: "t" });
        expect(html).toBe(expectedAnchor({
            href: "https://custom.example/?user=Example%20User&db=zh_moegirl_p",
            title: f.strings.tprintf("editCounterLinkHint", [new f.title.Title("User:Example User").userName()]),
            text: "t",
            noPopup: true,
        }));
    });
});

describe("globalSearchLink", () => {
    it("article 非对象：saneLinkCheck 挡下", async () => {
        const f = await fresh();
        expect(f.links.globalSearchLink({ text: "t" } as Partial<LinksNs.LinkSpec> as LinksNs.LinkSpec)).toBeNull();
    });

    it("text 非字符串：saneLinkCheck 挡下", async () => {
        const f = await fresh();
        expect(f.links.globalSearchLink({ article: new f.title.Title("Foo") })).toBeNull();
    });

    it("跨语言维基搜索：uselang + 保留空格的条目名", async () => {
        const f = await fresh();
        const article = new f.title.Title("Foo Bar");
        const html = f.links.globalSearchLink({ article, text: "搜" });
        expect(html).toBe(expectedAnchor({
            href: "https://global-search.toolforge.org/?uselang=zh-cn&q=Foo%20Bar",
            title: f.strings.tprintf("globalSearchHint", [f.title.safeDecodeURI(article)]),
            text: "搜",
            noPopup: true,
        }));
    });

    it("newWin 透传：target=_blank", async () => {
        const f = await fresh();
        const html = f.links.globalSearchLink({ article: new f.title.Title("Foo Bar"), text: "搜", newWin: true });
        expect(html).toContain('target="_blank"');
    });
});

describe("googleLink", () => {
    it("article 非对象：saneLinkCheck 挡下", async () => {
        const f = await fresh();
        expect(f.links.googleLink({ text: "t" } as Partial<LinksNs.LinkSpec> as LinksNs.LinkSpec)).toBeNull();
    });

    it("Google 搜索：q=%22<条目>%22（两侧引号编码，照搬勿修）", async () => {
        const f = await fresh();
        const article = new f.title.Title("Foo Bar");
        const html = f.links.googleLink({ article, text: "G" });
        expect(html).toBe(expectedAnchor({
            href: "https://www.google.com/search?q=%22Foo%20Bar%22",
            title: f.strings.tprintf("googleSearchHint", [f.title.safeDecodeURI(article)]),
            text: "G",
            noPopup: true,
        }));
        expect(html).toContain("在 Google 上搜索");
    });
});

describe("editorListLink", () => {
    it("article 非对象：saneLinkCheck 挡下", async () => {
        const f = await fresh();
        expect(f.links.editorListLink({ text: "t" } as Partial<LinksNs.LinkSpec> as LinksNs.LinkSpec)).toBeNull();
    });

    it("普通条目：articleinfo/<hostname>/<条目>", async () => {
        const f = await fresh();
        const article = new f.title.Title("Foo Bar");
        const html = f.links.editorListLink({ article, text: "编者" });
        expect(html).toBe(expectedAnchor({
            href: `https://xtools.wmflabs.org/articleinfo/${encodeURI(SITEBASE)}/Foo_Bar?uselang=zh-cn`,
            title: f.strings.tprintf("editorListHint", [article]),
            text: "编者",
            noPopup: true,
        }));
        expect(html).toContain("列出编辑过");
    });

    it("讨论页：articleFromTalkPage 换成主条目名", async () => {
        const f = await fresh();
        const talk = new f.title.Title("Talk:Foo Bar");
        const html = f.links.editorListLink({ article: talk, text: "编者" });
        expect(html).toContain("articleinfo/zh.moegirl.org.cn/Foo_Bar?uselang=zh-cn");
        // 提示串用换过的主条目（而非讨论页）
        expect(html).toContain(f.strings.tprintf("editorListHint", [new f.title.Title("Foo Bar")]));
    });
});

describe("getHistoryInfo / getHistory：XHR 完整回调链", () => {
    it("getHistoryInfo 提供回调：URL 装配（rvlimit 读 popupHistoryLimit）与 HistoryInfo 交付", async () => {
        const f = await fresh({ popupHistoryLimit: 7 });
        const { sent } = installXhr(() => ({
            status: 200,
            responseText: historyBody([
                { revid: 101, user: "Alice" },
                { revid: 102, user: "Bob" },
                { revid: 103, user: "Alice" },
            ]),
        }));
        const received: LinksNs.HistoryInfo[] = [];
        f.links.getHistoryInfo("Some_Page", (x) => {
            received.push(x);
        });
        await vi.waitFor(() => {
            expect(received).toHaveLength(1);
        });
        expect(sent).toHaveLength(1);
        expect(sent[0]?.url).toBe(`${APIBASE}?format=json&formatversion=2&action=query&prop=revisions&titles=Some_Page&rvlimit=7`);
        expect(received[0]).toEqual({
            edits: [
                { oldid: 101, editor: "Alice" },
                { oldid: 102, editor: "Bob" },
                { oldid: 103, editor: "Alice" },
            ],
            userName: null,
            firstNewEditor: { index: 1, oldid: 102, previd: 101 },
        });
    });

    it("缺省 rvlimit=50（popupHistoryLimit 默认值）", async () => {
        const f = await fresh();
        const { sent } = installXhr(() => ({ status: 200, responseText: historyBody([]) }));
        f.links.getHistoryInfo("Some_Page", vi.fn());
        await vi.waitFor(() => {
            expect(sent).toHaveLength(1);
        });
        expect(sent[0]?.url).toContain("titles=Some_Page&rvlimit=50");
    });

    it("getHistoryInfo 未给回调：processHistory 直接作 onComplete（返回值丢弃，不抛）", async () => {
        const f = await fresh();
        const { sent } = installXhr(() => ({ status: 200, responseText: historyBody([{ revid: 5, user: "Alice" }]) }));
        expect(() => {
            f.links.getHistoryInfo("Some_Page");
        }).not.toThrow();
        await vi.waitFor(() => {
            expect(sent).toHaveLength(1);
        });
    });

    it("getHistoryInfo 实测 HistoryInfo 标记（wgUserName 命中首位编辑者）", async () => {
        const f = await fresh();
        f.installed.config.wgUserName = "Alice";
        installXhr(() => ({
            status: 200,
            responseText: historyBody([
                { revid: 101, user: "Alice" },
                { revid: 102, user: "Bob" },
            ]),
        }));
        const received: LinksNs.HistoryInfo[] = [];
        f.links.getHistoryInfo("Some_Page", (x) => {
            received.push(x);
        });
        await vi.waitFor(() => {
            expect(received).toHaveLength(1);
        });
        // myLastEdit 命中 index 0 → previd null；firstNewEditor 在 index 1 → previd=前一条 oldid
        expect(received[0]).toEqual({
            edits: [
                { oldid: 101, editor: "Alice" },
                { oldid: 102, editor: "Bob" },
            ],
            userName: "Alice",
            myLastEdit: { index: 0, oldid: 101, previd: null },
            firstNewEditor: { index: 1, oldid: 102, previd: 101 },
        });
    });
});

describe("processHistory", () => {
    it("正常 JSON：revid/user 提取为 edits", async () => {
        const f = await fresh();
        const info = f.links.processHistory(downloadWith(f, historyBody([
            { revid: 11, user: "Alice" },
            { revid: 12, user: "Bob" },
        ])));
        expect(info.edits).toEqual([
            { oldid: 11, editor: "Alice" },
            { oldid: 12, editor: "Bob" },
        ]);
    });

    it("revid/user 缺失：edits 项两字段为 undefined（照搬勿修）", async () => {
        const f = await fresh();
        const info = f.links.processHistory(downloadWith(f, { query: { pages: { 1: { revisions: [{}] } } } }));
        expect(info.edits).toEqual([{ oldid: undefined, editor: undefined }]);
    });

    it("页面无 revisions 字段：空 edits 兜底", async () => {
        const f = await fresh();
        const info = f.links.processHistory(downloadWith(f, { query: { pages: { 1: { title: "Foo" } } } }));
        expect(info.edits).toEqual([]);
    });

    it("无 query/pages：anyChild 取空表返 null，空 edits 兜底", async () => {
        const f = await fresh();
        expect(f.links.processHistory(downloadWith(f, { batchcomplete: "" })).edits).toEqual([]);
    });

    it("data 未设（?? \"\"）与非法 JSON：getJsObj 哨兵 1 走空 edits 兜底", async () => {
        const f = await fresh();
        const unset = new f.downloader.Downloader("https://example/api");
        expect(f.links.processHistory(unset).edits).toEqual([]);
        expect(f.links.processHistory(downloadWith(f, "not json")).edits).toEqual([]);
    });

    it("revisions 为空数组：空 edits（不进 !revisions 兜底）", async () => {
        const f = await fresh();
        expect(f.links.processHistory(downloadWith(f, { query: { pages: { 1: { revisions: [] } } } })).edits).toEqual([]);
    });
});

describe("finishProcessHistory", () => {
    it("空 edits：无任何标记，userName 原样", async () => {
        const f = await fresh();
        expect(f.links.finishProcessHistory([], "Alice")).toEqual({ edits: [], userName: "Alice" });
    });

    it("userName 为 null：myLastEdit 不设，firstNewEditor 照常判定", async () => {
        const f = await fresh();
        const info = f.links.finishProcessHistory([
            { oldid: 1, editor: "Alice" },
            { oldid: 2, editor: "Bob" },
        ], null);
        expect(info.userName).toBeNull();
        expect(info.myLastEdit).toBeUndefined();
        expect(info.firstNewEditor).toEqual({ index: 1, oldid: 2, previd: 1 });
    });

    it("只有一位编者：firstNewEditor 不设（myLastEdit 命中 index 0）", async () => {
        const f = await fresh();
        const info = f.links.finishProcessHistory([
            { oldid: 1, editor: "Alice" },
            { oldid: 2, editor: "Alice" },
        ], "Alice");
        expect(info.myLastEdit).toEqual({ index: 0, oldid: 1, previd: null });
        expect(info.firstNewEditor).toBeUndefined();
    });

    it("自己编辑在第 2 位：myLastEdit 取首个命中（previd=前一条）", async () => {
        const f = await fresh();
        const info = f.links.finishProcessHistory([
            { oldid: 1, editor: "Bob" },
            { oldid: 2, editor: "Alice" },
            { oldid: 3, editor: "Alice" },
        ], "Alice");
        // 首个命中即停（index 1），后续同名编辑不再覆盖
        expect(info.myLastEdit).toEqual({ index: 1, oldid: 2, previd: 1 });
    });
});

describe("getLastContrib", () => {
    it("无编辑：裸英文 alert（照搬勿修）", async () => {
        const f = await fresh();
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        installXhr(() => ({ status: 200, responseText: historyBody([]) }));
        f.links.getLastContrib("Some_Page", true);
        await vi.waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith("Popups: an odd thing happened. Please retry.");
        });
    });

    it("只有一位编者：alert 报送该编者与编辑数", async () => {
        const f = await fresh();
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        installXhr(() => ({
            status: 200,
            responseText: historyBody([
                { revid: 1, user: "Alice" },
                { revid: 2, user: "Alice" },
            ]),
        }));
        f.links.getLastContrib("Some_Page", true);
        await vi.waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith(f.strings.tprintf("Only found one editor: %s made %s edits", ["Alice", 2]));
        });
    });

    it("首个新编者存在：window.open 打开 diff=cur&oldid=<首个新编者的上一条 oldid>", async () => {
        const f = await fresh();
        const openMock = vi.fn();
        vi.spyOn(window, "open").mockImplementation(openMock);
        installXhr(() => ({
            status: 200,
            responseText: historyBody([
                { revid: 1, user: "Bob" },
                { revid: 2, user: "Alice" },
            ]),
        }));
        f.links.getLastContrib("Some_Page", true);
        await vi.waitFor(() => {
            expect(openMock).toHaveBeenCalledWith(`${TITLEBASE}Some_Page&diff=cur&oldid=2`);
        });
    });
});

describe("getDiffSinceMyEdit", () => {
    it("无编辑：裸英文 alert（照搬勿修）", async () => {
        const f = await fresh();
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        installXhr(() => ({ status: 200, responseText: historyBody([]) }));
        f.links.getDiffSinceMyEdit("Some_Page", true);
        await vi.waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith("Popups: something fishy happened. Please try again.");
        });
    });

    it("找不到自己的编辑：alert 含用户名/上限/条目名（下划线换空格）", async () => {
        const f = await fresh();
        f.installed.config.wgUserName = "Carol";
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        installXhr(() => ({
            status: 200,
            responseText: historyBody([
                { revid: 1, user: "Bob" },
                { revid: 2, user: "Alice" },
            ]),
        }));
        f.links.getDiffSinceMyEdit("Some_Page", true);
        await vi.waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith(
                f.strings.tprintf("Couldn't find an edit by %s\nin the last %s edits to\n%s", ["Carol", 50, "Some Page"]),
            );
        });
    });

    it("自己的编辑就是最新一条（index 0）：alert 提示自身即最后编者", async () => {
        const f = await fresh();
        f.installed.config.wgUserName = "Alice";
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        installXhr(() => ({
            status: 200,
            responseText: historyBody([
                { revid: 1, user: "Alice" },
                { revid: 2, user: "Bob" },
            ]),
        }));
        f.links.getDiffSinceMyEdit("Some_Page", true);
        await vi.waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith(f.strings.tprintf("%s seems to be the last editor to the page %s", ["Alice", "Some Page"]));
        });
    });

    it("自己的编辑在更早位置：document.location.href 导航（newWin=false 分支）", async () => {
        const f = await fresh();
        f.installed.config.wgUserName = "Alice";
        // 目标页标题带锚点、当前 URL 与目标仅差 fragment——jsdom 对同文档
        // fragment 导航会真实更新 location.hash，以此钉住 displayUrl 写入的 URL
        f.title.wiki.titlebase = `${location.origin}/index.php?title=`;
        window.history.pushState(null, "", "/index.php?title=Some_Page");
        installXhr(() => ({
            status: 200,
            responseText: historyBody([
                { revid: 1, user: "Bob" },
                { revid: 2, user: "Alice" },
            ]),
        }));
        f.links.getDiffSinceMyEdit("Some_Page#frag", false);
        await vi.waitFor(() => {
            expect(document.location.hash).toBe("#frag&diff=cur&oldid=2");
        });
        expect(document.location.href).toBe(`${location.origin}/index.php?title=Some_Page#frag&diff=cur&oldid=2`);
    });
});

describe("pg.fn 家族：purgePopups / disablePopups / togglePreviews", () => {
    it("purgePopups：banish + 清 navpopup + 清缓存 + 清选项目录 + 中止下载", async () => {
        const f = await fresh();
        const banished = new f.popup.Navpopup();
        banished.visible = false;
        const keep = document.createElement("a");
        keep.navpopup = banished as EventsNs.BoundNavpopup;
        keep.simpleNoMore = true;
        const plain = document.createElement("a");
        plain.simpleNoMore = true;
        const nullPopup = document.createElement("a");
        nullPopup.navpopup = null;
        nullPopup.simpleNoMore = true;
        f.events.eventsState.current.links = [keep, plain, nullPopup];
        f.cache.pages.push({ url: "https://example/x", data: "d", lastModified: null });
        // 选项缓存先落一个键，purge 后应清空
        f.options.getValueOf("simplePopups");
        expect(Object.keys(f.options.optionStore)).not.toHaveLength(0);
        installXhr(() => ({ status: 200, responseText: "{}", delay: 50 }));
        const d = f.downloader.startDownload("https://example/api", 4, vi.fn());
        expect(f.downloader.downloadsInProgress["4"]).toBe(d);
        f.links.purgePopups();
        expect(banished.noshow).toBe(true);
        expect(keep.navpopup).toBeNull();
        expect(keep.simpleNoMore).toBe(false);
        // 无 navpopup（undefined / null）的链接直接跳过，simpleNoMore 不动
        expect(plain.simpleNoMore).toBe(true);
        expect(nullPopup.simpleNoMore).toBe(true);
        expect(f.cache.pages).toHaveLength(0);
        expect(Object.keys(f.options.optionStore)).toEqual([]);
        expect(d.aborted).toBe(true);
        expect(f.downloader.downloadsInProgress["4"]).toBeUndefined();
    });

    it("disablePopups：banish 但不摘 navpopup，并以 remove=true 重扫链接", async () => {
        const f = await fresh();
        const banished = new f.popup.Navpopup();
        banished.visible = false;
        const keep = document.createElement("a");
        keep.navpopup = banished as EventsNs.BoundNavpopup;
        f.events.eventsState.current.links = [keep];
        document.ranSetupTooltipsAlready = true;
        f.links.disablePopups();
        expect(banished.noshow).toBe(true);
        // nullify=false：navpopup 保留（与 purgePopups 的差异）
        expect(keep.navpopup).toBe(banished);
        expect(keep.simpleNoMore).toBe(false);
        // setupTooltips(null, true) 已执行：装配标记被置回 false
        expect(document.ranSetupTooltipsAlready).toBe(false);
    });

    it("togglePreviews：摘 navpopup 并翻转 simplePopups（直读直写 optionStore）", async () => {
        const f = await fresh();
        const navpop = new f.popup.Navpopup();
        navpop.visible = false;
        const a = document.createElement("a");
        a.navpopup = navpop as EventsNs.BoundNavpopup;
        f.events.eventsState.current.links = [a];
        installXhr(() => ({ status: 200, responseText: "{}", delay: 50 }));
        const d = f.downloader.startDownload("https://example/api", 6, vi.fn());
        // 先经 getValueOf 落默认 false，避免 undefined 的默认化干扰断言
        expect(f.options.getValueOf("simplePopups")).toBe(false);
        f.links.togglePreviews();
        expect(f.options.optionStore.simplePopups).toBe(true);
        expect(a.navpopup).toBeNull();
        expect(navpop.noshow).toBe(true);
        expect(d.aborted).toBe(true);
        f.links.togglePreviews();
        expect(f.options.optionStore.simplePopups).toBe(false);
    });
});

describe("magicWatchLink / modifyWatchlist", () => {
    it("magicWatchLink：onclick 内联 pg.fn.modifyWatchlist 并转义引号，返回 wikiLink 产物", async () => {
        const f = await fresh();
        const l: LinksNs.LinkSpec = { article: new f.title.Title("Don't"), action: "edit", text: "关注" };
        const html = Reflect.apply(f.links.magicWatchLink, { id: "watch-link" }, [l]);
        const onclick = "pg.fn.modifyWatchlist('Don\\'t','watch-link');return false;";
        expect(l.onclick).toBe(onclick);
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Don't&action=edit&wpChangeTags=Popups%2CAutomation%20tool`,
            title: f.strings.simplePrintf(f.strings.popupString("editHint"), ["Don't"]),
            onclick,
            text: "关注",
        }));
    });

    it("magicWatchLink：反斜杠同样转义（照搬勿修）", async () => {
        const f = await fresh();
        const l: LinksNs.LinkSpec = { article: new f.title.Title("A\\B"), action: "view", text: "t" };
        Reflect.apply(f.links.magicWatchLink, { id: "x" }, [l]);
        expect(l.onclick).toBe("pg.fn.modifyWatchlist('A\\\\B','x');return false;");
    });

    it("modifyWatchlist：普通名字空间 + watch → addedwatchtext 通知", async () => {
        const f = await fresh();
        await f.links.modifyWatchlist("Foo", "watch");
        expect(f.installed.apiInstances[0]?.postWithToken).toHaveBeenCalledWith("watch", {
            action: "watch",
            formatversion: 2,
            titles: "Foo",
            uselang: "zh-cn",
        });
        expect(f.installed.apiInstances[0]?.loadMessagesIfMissing).toHaveBeenCalledWith(["addedwatchtext"]);
        expect(f.installed.mw.notify).toHaveBeenCalledWith("addedwatchtext");
    });

    it("modifyWatchlist：讨论页 + unwatch → removedwatchtext-talk 且 unwatch 入参", async () => {
        const f = await fresh();
        f.installed.mw.Title.newFromText.mockReturnValue({ getNamespaceId: (): number => 3 });
        await f.links.modifyWatchlist("Talk:Foo", "unwatch");
        expect(f.installed.apiInstances[0]?.postWithToken).toHaveBeenCalledWith("watch", {
            action: "watch",
            formatversion: 2,
            titles: "Talk:Foo",
            uselang: "zh-cn",
            unwatch: true,
        });
        expect(f.installed.apiInstances[0]?.loadMessagesIfMissing).toHaveBeenCalledWith(["removedwatchtext-talk"]);
        expect(f.installed.mw.notify).toHaveBeenCalledWith("removedwatchtext-talk");
    });

    it("modifyWatchlist：讨论页 + watch → addedwatchtext-talk；偶数名字空间走普通文案", async () => {
        const f = await fresh();
        f.installed.mw.Title.newFromText.mockReturnValue({ getNamespaceId: (): number => 3 });
        await f.links.modifyWatchlist("Talk:Foo", "watch");
        expect(f.installed.apiInstances[0]?.loadMessagesIfMissing).toHaveBeenCalledWith(["addedwatchtext-talk"]);
        f.installed.mw.Title.newFromText.mockReturnValue({ getNamespaceId: (): number => 2 });
        await f.links.modifyWatchlist("User:Foo", "unwatch");
        expect(f.installed.apiInstances[0]?.loadMessagesIfMissing).toHaveBeenCalledWith(["removedwatchtext"]);
    });

    it("modifyWatchlist：title 为 null → titles 空串（?? 兜底）", async () => {
        const f = await fresh();
        await f.links.modifyWatchlist(null, "watch");
        expect(f.installed.apiInstances[0]?.postWithToken).toHaveBeenCalledWith("watch", {
            action: "watch",
            formatversion: 2,
            titles: "",
            uselang: "zh-cn",
        });
        expect(f.installed.mw.notify).toHaveBeenCalledWith("addedwatchtext");
    });
});

describe("magicHistoryLink / popupMenuLink", () => {
    it("magicHistoryLink：id=lastContrib → getLastContrib 内联调用", async () => {
        const f = await fresh();
        const html = f.links.magicHistoryLink({ article: new f.title.Title("Foo"), id: "lastContrib", text: "最后", newWin: true });
        const onClick = "pg.fn.getLastContrib('Foo',true);return false;";
        expect(html).toBe(expectedAnchor({
            href: "javascript:pg.fn.getLastContrib('Foo',true)",
            title: f.strings.popupString("lastContribHint"),
            onclick: onClick,
            text: "最后",
        }));
    });

    it("magicHistoryLink：id=sinceMe → getDiffSinceMyEdit 内联调用（newWin 缺省落空，照搬勿修）", async () => {
        const f = await fresh();
        const html = f.links.magicHistoryLink({ article: new f.title.Title("Foo"), id: "sinceMe", text: "自我编辑后" });
        // simplePrintf 把 undefined 直推入参组，join 时渲染为空串（非 "undefined"）
        const onClick = "pg.fn.getDiffSinceMyEdit('Foo',);return false;";
        expect(html).toBe(expectedAnchor({
            href: "javascript:pg.fn.getDiffSinceMyEdit('Foo',)",
            title: f.strings.popupString("sinceMeHint"),
            onclick: onClick,
            text: "自我编辑后",
        }));
    });

    it("magicHistoryLink：id 未命中 → 空 title 与空 onClick（照搬勿修）", async () => {
        const f = await fresh();
        const html = f.links.magicHistoryLink({ article: new f.title.Title("Foo"), id: "other", text: "t" });
        expect(html).toBe(expectedAnchor({ href: "javascript:", title: "", onclick: ";return false;", text: "t" }));
    });

    it("popupMenuLink：id 出菜单函数名与提示键", async () => {
        const f = await fresh();
        const html = f.links.popupMenuLink({ article: new f.title.Title("Foo"), id: "purgePopups", text: "复位" });
        expect(html).toBe(expectedAnchor({
            href: "javascript:pg.fn.purgePopups()",
            title: f.strings.popupString("purgePopupsHint"),
            onclick: "pg.fn.purgePopups();return false;",
            text: "复位",
        }));
    });

    it("popupMenuLink：id 缺省 → 函数名为空串（%s 落空，照搬勿修）", async () => {
        const f = await fresh();
        const html = f.links.popupMenuLink({ article: new f.title.Title("Foo"), text: "t" });
        expect(html).toContain("javascript:pg.fn.()");
        expect(html).toContain("pg.fn.();return false;");
    });
});

describe("specialLink", () => {
    it("specialpage 未定义或空串：返回 null", async () => {
        const f = await fresh();
        expect(f.links.specialLink({ article: new f.title.Title("Foo"), text: "t" })).toBeNull();
        expect(f.links.specialLink({ article: new f.title.Title("Foo"), specialpage: "", text: "t" })).toBeNull();
    });

    it("Search：sep 缺省 &target=、条目名保留空格", async () => {
        const f = await fresh();
        const html = f.links.specialLink({ article: new f.title.Title("Foo Bar"), specialpage: "Search", text: "搜索" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Special:Search&target=Foo%20Bar`,
            title: f.strings.simplePrintf(f.strings.popupString("SearchHint"), ["Foo Bar"]),
            text: "搜索",
        }));
    });

    it("PrefixIndex：条目名补斜杠、sep 为 null 回落 &target=", async () => {
        const f = await fresh();
        const html = f.links.specialLink({ article: new f.title.Title("User:Foo"), specialpage: "PrefixIndex", sep: null, text: "子页" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Special:PrefixIndex&target=User:Foo/`,
            title: f.strings.simplePrintf(f.strings.popupString("PrefixIndexHint"), ["User:Foo"]),
            text: "子页",
        }));
    });

    it("Log：五种 sep 各自命中提示键", async () => {
        const cases: [string, string][] = [
            ["&user=", "userLogHint"],
            ["&type=block&page=", "blockLogHint"],
            ["&page=", "pageLogHint"],
            ["&type=protect&page=", "protectLogHint"],
            ["&type=delete&page=", "deleteLogHint"],
        ];
        for (const [sep, hintKey] of cases) {
            const f = await fresh();
            const html = f.links.specialLink({ article: new f.title.Title("Foo"), specialpage: "Log", sep, text: "日志" });
            expect(html).toBe(expectedAnchor({
                href: `${TITLEBASE}Special:Log${sep}Foo`,
                title: f.strings.simplePrintf(f.strings.popupString(hintKey), ["Foo"]),
                text: "日志",
            }));
        }
    });

    it("Log：未知 sep → Missing hint (FIXME)（照搬勿修）", async () => {
        const f = await fresh();
        const html = f.links.specialLink({ article: new f.title.Title("Foo"), specialpage: "Log", sep: "&unknown=", text: "日志" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Special:Log&unknown=Foo`,
            title: "Missing hint (FIXME)",
            text: "日志",
        }));
    });

    it("其他 Special 页：提示键为 <specialpage>Hint", async () => {
        const f = await fresh();
        const html = f.links.specialLink({ article: new f.title.Title("Foo"), specialpage: "Whatlinkshere", text: "链入" });
        expect(html).toBe(expectedAnchor({
            href: `${TITLEBASE}Special:Whatlinkshere&target=Foo`,
            title: f.strings.simplePrintf(f.strings.popupString("WhatlinkshereHint"), ["Foo"]),
            text: "链入",
        }));
    });
});
