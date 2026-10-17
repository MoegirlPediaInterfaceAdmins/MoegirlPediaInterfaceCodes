// queries 域单元测试：loadAPIPreview 的七类 URL 装配与懒下载 hook、XHR 完整
// 回调链（缓存→下载→HTML 槽写入）、时区链（timecorrection 串解析 / Intl
// locale 数组 / ISO 8601 / 偏移量）、editPreviewTable（history 与 contribs
// 两态、minor、隐藏标记、slots 回落）、fetchUserGroupNames（含 * 的组合并、
// 隐式组）、showAPIPreview 的槽位分派与 pending 记账、各 APIxxxPreviewHTML
// 的 JSON 夹具→HTML 断言（missing 页、shared 资源库 URL、wikibase repo 拼接、
// backlinks / userinfo 的 groups/blocks/editcount/registration）。
// 行为基准 = legacy src/modules/querypreview.ts（commit 02c8dec）；期望值与
// legacy 输出逐字一致，怪癖用例名标注「照搬勿修」。
// linkList（imagelinks/category 非空列表渲染）、revision 的 insertPreview、
// imagepage 的 prepPreviewmaker 段一并覆盖。
// linkList → wikiLink → generalLink 的 innerText 依赖见下方原型补齐说明。
import moment from "moment";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi, type Mock } from "vitest";
import { installMw, type InstalledMw, type MockMw } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import type * as CacheNs from "../../../src/net/cache.ts";
import type * as DownloaderNs from "../../../src/net/downloader.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as InstaNs from "../../../src/preview/insta.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as QueriesNs from "../../../src/api/queries.ts";
import type * as SiteNs from "../../../src/api/siteinfo.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type Cache = typeof CacheNs;
type DownloaderModule = typeof DownloaderNs;
type Events = typeof EventsNs;
type Htmlout = typeof HtmloutNs;
type Insta = typeof InstaNs;
type Namespaces = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type Popup = typeof PopupNs;
type Queries = typeof QueriesNs;
type Site = typeof SiteNs;
type TitleModule = typeof TitleNs;

// linkList → wikiLink → generalLink 依赖 innerText setter 物化文本子节点；
// jsdom 30 的 setter 不落 DOM（outerHTML 为空）。按 navlinks/links.test.ts 同款
// 补齐为 textContent 读写（真实浏览器对纯文本赋值等价）。
Reflect.defineProperty(HTMLElement.prototype, "innerText", {
    get(this: HTMLElement): string {
        return this.textContent;
    },
    set(this: HTMLElement, value: string): void {
        this.textContent = value;
    },
    configurable: true,
});

// getPageWithCaching 换 spy 供 URL 装配断言；其余导出面（含回调链依赖的
// fakeDownload/startDownload 等）透传真实现。
// 用 spy: true 而非 async 工厂：异步工厂（importActual 透传）与 fresh() 的
// Promise.all 并行 import 存在注册竞态——首个用例之后 queries 域会拿到真实
// 函数，spy 断言全数失联（实测 12 个 URL 装配用例全红）
vi.mock("../../../src/net/cache.ts", { spy: true });

interface Fresh {
    queries: Queries;
    cache: Cache;
    site: Site;
    options: OptionsModule;
    namespaces: Namespaces;
    title: TitleModule;
    htmlout: Htmlout;
    popup: Popup;
    downloader: DownloaderModule;
    events: Events;
    insta: Insta;
    mw: MockMw;
    apiInstances: InstalledMw["apiInstances"];
}

interface FreshOptions {
    userOptions?: Record<string, string>;
    config?: Record<string, unknown>;
    windowOverrides?: Record<string, unknown>;
}

let windowOptionKeys: string[] = [];

const fresh = async (opts: FreshOptions = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw({
        // exactOptionalPropertyTypes：未给的键不能显式落 undefined
        ...opts.userOptions ? { userOptions: opts.userOptions } : {},
        ...opts.config ? { config: opts.config } : {},
    });
    const [queries, cache, site, options, namespaces, title, htmlout, popup, downloader, events, insta] = await Promise.all([
        import("../../../src/api/queries.ts"),
        import("../../../src/net/cache.ts"),
        import("../../../src/api/siteinfo.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/title/title.ts"),
        import("../../../src/core/htmlout.ts"),
        import("../../../src/core/popup.ts"),
        import("../../../src/net/downloader.ts"),
        import("../../../src/core/events.ts"),
        import("../../../src/preview/insta.ts"),
    ]);
    namespaces.setNamespaces();
    namespaces.setRedirs();
    options.setOptions();
    site.setSiteInfo();
    site.setTitleBase();
    site.setRegexps();
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    // 共享资源页预览（Previewmaker.makePreview→wiki2html）依赖 insta 基址
    insta.setupLivePreview({
        articlePath: "/wiki",
        interwiki: "en|ja",
        imageNamespace: "File",
        categoryNamespace: "Category",
    });
    for (const [key, value] of Object.entries(opts.windowOverrides ?? {})) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { queries, cache, site, options, namespaces, title, htmlout, popup, downloader, events, insta, mw: installed.mw, apiInstances: installed.apiInstances };
};

// convertTimeZone 把「目标时区墙面时间」经 toLocaleString 再解析回 Date，产物
// 按进程本地时区解读——锁 UTC 让 ISO 8601 路径期望值与环境时区无关。
// 走 vi.stubEnv 而非直读 process：测试文件不引入 Node 全局（eslint no-undef），
// 收尾 unstubAllEnvs 还原（含原本未设 TZ 的情形）
beforeAll(() => {
    vi.stubEnv("TZ", "UTC");
});
afterAll(() => {
    vi.unstubAllEnvs();
});

// spy 的 noop 替换需手工回滚：spy:true 的自动 mock 在 vi.restoreAllMocks()
// 之后仍保留 mockImplementation（实测 getMockImplementation 非空），不清理会
// 污染后续需要真实 getPageWithCaching 的 XHR 回调用例
let cacheSpyRestores: (() => void)[] = [];

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    document.documentElement.removeAttribute("lang");
    Reflect.deleteProperty(window, "popupDebug");
    vi.restoreAllMocks();
    for (const restore of cacheSpyRestores) {
        restore();
    }
    cacheSpyRestores = [];
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
});

// 预览槽位骨架：#popupPreview<N> / #popupPostPreview<N> / #popupUserData<N> 等
const slotDivs = (id: number, names: string[]): void => {
    for (const n of names) {
        const div = document.createElement("div");
        div.id = `${n}${String(id)}`;
        document.body.appendChild(div);
    }
};

const navpopWith = (f: Fresh, idNumber = 1, visible = true): PopupNs.Navpopup => {
    const navpop = new f.popup.Navpopup();
    navpop.idNumber = idNumber;
    navpop.visible = visible;
    return navpop;
};

// 走 XHR 前的下载器夹具：data 直接填 API JSON（或原文串）
const downloadWith = (f: Fresh, payload: unknown): DownloaderNs.Downloader => {
    const d = new f.downloader.Downloader("https://example/api");
    d.data = typeof payload === "string" ? payload : JSON.stringify(payload);
    return d;
};

// getPageWithCaching 的 spy 拦截（阻断真实下载，仅断言调用面）。
// 收尾用 mockReset 而非 mockImplementation(原实现)：spy:true 的自动 mock 在
// vi.restoreAllMocks() 之后实现并不回滚（实测 getMockImplementation 为空、
// 且不再透传真实实现），只有 mockReset 能把实现还原为自动 mock 捕获的原函数
const spyCache = (f: Fresh): Mock => {
    const g = f.cache.getPageWithCaching as unknown as Mock;
    g.mockReset();
    g.mockImplementation(() => undefined);
    cacheSpyRestores.push(() => {
        g.mockReset();
    });
    return g;
};

const PREFIX = (f: Fresh): string => `${f.site.siteState.apiwikibase}?format=json&formatversion=2&action=query&`;

describe("loadAPIPreview · URL 装配", () => {
    it("history：titles/prop/rvlimit 按 popupHistoryPreviewLimit 默认 25", async () => {
        const f = await fresh();
        const g = spyCache(f);
        const navpop = navpopWith(f);
        f.queries.loadAPIPreview("history", new f.title.Title("Foo"), navpop);
        expect(g).toHaveBeenCalledTimes(1);
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}titles=Foo&prop=revisions&rvlimit=25`);
        expect(g.mock.calls[0]?.[1]).toBeTypeOf("function");
        expect(g.mock.calls[0]?.[2]).toBe(navpop);
        expect(navpop.pending).toBe(1);
    });

    it("category：list=categorymembers&cmtitle", async () => {
        const f = await fresh();
        const g = spyCache(f);
        f.queries.loadAPIPreview("category", new f.title.Title("Category:Cats"), navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}list=categorymembers&cmtitle=Category:Cats`);
    });

    it("userinfo 非 IP：users|usercontribs|globaluserinfo 组合串（照搬勿修：ususers/guiuser/ucuser 三处重复传名）", async () => {
        const f = await fresh();
        const g = spyCache(f);
        f.queries.loadAPIPreview("userinfo", new f.title.Title("User:Example"), navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}list=users|usercontribs&usprop=blockinfo|groups|editcount|registration|gender&ususers=Example&meta=globaluserinfo&guiprop=groups|unattached&guiuser=Example&uclimit=1&ucprop=timestamp&ucuser=Example`);
    });

    it("userinfo IP：list=blocks 分支", async () => {
        const f = await fresh();
        const g = spyCache(f);
        f.queries.loadAPIPreview("userinfo", new f.title.Title("User:192.0.2.5"), navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}list=blocks&bkprop=range|restrictions&bkip=192.0.2.5`);
    });

    it("contribs：ucuser/uclimit 按 popupContribsPreviewLimit 默认 25", async () => {
        const f = await fresh();
        const g = spyCache(f);
        f.queries.loadAPIPreview("contribs", new f.title.Title("User:Example"), navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}list=usercontribs&ucuser=Example&uclimit=25`);
    });

    it("imagepagepreview：popupImageLinks 默认开，附 imageusage trail", async () => {
        const f = await fresh();
        const g = spyCache(f);
        f.queries.loadAPIPreview("imagepagepreview", new f.title.Title("File:Example.jpg"), navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}titles=File:Example.jpg&prop=revisions|imageinfo&rvslots=main&rvprop=content&list=imageusage&iutitle=File:Example.jpg`);
    });

    it("imagepagepreview：popupImageLinks 关时不附 trail", async () => {
        const f = await fresh({ windowOverrides: { popupImageLinks: false } });
        const g = spyCache(f);
        f.queries.loadAPIPreview("imagepagepreview", new f.title.Title("File:Example.jpg"), navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}titles=File:Example.jpg&prop=revisions|imageinfo&rvslots=main&rvprop=content`);
    });

    it("backlinks：list=backlinks&bltitle", async () => {
        const f = await fresh();
        const g = spyCache(f);
        f.queries.loadAPIPreview("backlinks", new f.title.Title("Foo"), navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}list=backlinks&bltitle=Foo`);
    });

    it("revision 带 oldid：revids 分支", async () => {
        const f = await fresh();
        const g = spyCache(f);
        const article = new f.title.Title("Foo");
        article.oldid = "123";
        f.queries.loadAPIPreview("revision", article, navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}revids=123&prop=revisions|pageprops|info|images|categories&meta=wikibase&rvslots=main&rvprop=ids|timestamp|flags|comment|user|content&cllimit=max&imlimit=max`);
    });

    it("revision 无 oldid：titles 取 removeAnchor 后的串", async () => {
        const f = await fresh();
        const g = spyCache(f);
        f.queries.loadAPIPreview("revision", new f.title.Title("Foo#Anchor"), navpopWith(f));
        expect(g.mock.calls[0]?.[0]).toBe(`${PREFIX(f)}titles=Foo&prop=revisions|pageprops|info|images|categories&meta=wikibase&rvslots=main&rvprop=ids|timestamp|flags|comment|user|content&cllimit=max&imlimit=max`);
    });

    it("未知 queryType：默认 htmlGenerator 走 alert，html 落默认槽", async () => {
        const f = await fresh();
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        slotDivs(1, ["popupPreview"]);
        let captured: ((d: DownloaderNs.Downloader) => void | Promise<void>) | undefined;
        const g = spyCache(f);
        g.mockImplementation((_url: string, cb: (d: DownloaderNs.Downloader) => void | Promise<void>) => {
            captured = cb;
        });
        const navpop = navpopWith(f);
        f.queries.loadAPIPreview("bogus", new f.title.Title("Foo"), navpop);
        expect(typeof captured).toBe("function");
        await captured?.(downloadWith(f, { query: {} }));
        expect(alertMock).toHaveBeenCalledWith("invalid html generator");
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
        expect(navpop.pending).toBe(0);
    });

    it("懒下载：不可见且 popupLazyDownloads 开时不发请求，挂 unhide/before hook", async () => {
        const f = await fresh();
        const g = spyCache(f);
        const navpop = navpopWith(f, 1, false);
        f.queries.loadAPIPreview("history", new f.title.Title("Foo"), navpop);
        expect(g).not.toHaveBeenCalled();
        expect(navpop.hooks.unhide).toHaveLength(1);
        expect(navpop.hooks.unhide?.[0]?.hookId).toBe("unhide|before|DOWNLOAD_history_QUERY_DATA");
        navpop.runHooks("unhide", "before");
        expect(g).toHaveBeenCalledTimes(1);
    });

    it("懒下载：popupLazyDownloads 关时不可见也立即发请求", async () => {
        const f = await fresh({ windowOverrides: { popupLazyDownloads: false } });
        const g = spyCache(f);
        f.queries.loadAPIPreview("history", new f.title.Title("Foo"), navpopWith(f, 1, false));
        expect(g).toHaveBeenCalledTimes(1);
    });
});

describe("loadAPIPreview · XHR 完整回调链", () => {
    it("history：下载→JSON→表格写入 popupPreview 槽，pending 归零", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        installXhr(() => ({
            status: 200,
            responseText: JSON.stringify({ query: { pages: { 1: { title: "Foo", revisions: [{ revid: 100, timestamp: "2026-01-02T03:04:05Z", user: "Alice", comment: "fix" }] } } } }),
        }));
        slotDivs(1, ["popupPreview"]);
        const navpop = navpopWith(f);
        f.queries.loadAPIPreview("history", new f.title.Title("Foo"), navpop);
        await vi.waitFor(() => {
            expect(document.getElementById("popupPreview1")?.innerHTML).toContain("popup_history_date");
        });
        const html = document.getElementById("popupPreview1")?.innerHTML ?? "";
        expect(html).toContain("2026-01-02");
        expect(html).toContain("03:04:05");
        expect(html).toContain("当前");
        expect(navpop.pending).toBe(0);
    });

    it("userinfo：先 fetchUserGroupNames 再写 popupUserData 槽", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        installXhr(() => ({
            status: 200,
            responseText: JSON.stringify({
                query: {
                    users: { Example: { groups: ["*", "sysop"], editcount: 42, registration: "2006-02-05T18:29:00Z", gender: "male" } },
                    usercontribs: [{ timestamp: "2026-01-02T03:04:05Z" }],
                },
            }),
        }));
        slotDivs(1, ["popupUserData"]);
        f.queries.loadAPIPreview("userinfo", new f.title.Title("User:Example"), navpopWith(f));
        await vi.waitFor(() => {
            expect(document.getElementById("popupUserData1")?.innerHTML).toContain("42次编辑");
        });
        expect(f.apiInstances[0]?.loadMessagesIfMissing).toHaveBeenCalledWith(["group-*-member", "group-sysop-member"]);
    });
});

describe("时区链", () => {
    it("getTimeOffset：ZoneInfo 串取第二段、带 | 的串取段值、无 | 或空取 0", async () => {
        expect((await fresh({ userOptions: { timecorrection: "ZoneInfo|480|Asia/Shanghai" } })).queries.getTimeOffset()).toBe(480);
        expect((await fresh({ userOptions: { timecorrection: "0|120" } })).queries.getTimeOffset()).toBe(120);
        expect((await fresh({ userOptions: { timecorrection: "OFF" } })).queries.getTimeOffset()).toBe(0);
        expect((await fresh()).queries.getTimeOffset()).toBe(0);
    });

    it("getTimeZone：null 回落 UTC，ZoneInfo 三段取时区名", async () => {
        expect((await fresh()).queries.getTimeZone()).toBe("UTC");
        expect((await fresh({ userOptions: { timecorrection: "ZoneInfo|480|Asia/Shanghai" } })).queries.getTimeZone()).toBe("Asia/Shanghai");
    });

    it("getTimeZone：非 ZoneInfo 三段串记 errlog 且回落 UTC，结果缓存", async () => {
        const f = await fresh({ userOptions: { timecorrection: "WEIRD" } });
        window.popupDebug = true;
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        expect(f.queries.getTimeZone()).toBe("UTC");
        expect(errorSpy).toHaveBeenCalledWith("Unexpected timezone information: WEIRD");
        expect(f.queries.getTimeZone()).toBe("UTC");
        expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it("useTimeOffset：null 时区串走 ZoneInfo 路径（照搬勿修：=== false 判定放行 null）", async () => {
        expect((await fresh()).queries.useTimeOffset()).toBe(false);
        expect((await fresh({ userOptions: { timecorrection: "0|120" } })).queries.useTimeOffset()).toBe(true);
        expect((await fresh({ userOptions: { timecorrection: "ZoneInfo|480|Asia/Shanghai" } })).queries.useTimeOffset()).toBe(false);
    });

    it("useTimeOffset：formatToParts 缺失（旧引擎）时恒走偏移路径", async () => {
        const f = await fresh();
        const desc = Reflect.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype, "formatToParts");
        Reflect.deleteProperty(Intl.DateTimeFormat.prototype, "formatToParts");
        try {
            expect(f.queries.useTimeOffset()).toBe(true);
        } finally {
            if (desc) {
                Reflect.defineProperty(Intl.DateTimeFormat.prototype, "formatToParts", desc);
            }
        }
    });

    it("getMWDateFormat：直读 date 选项", async () => {
        expect((await fresh({ userOptions: { date: "mdy" } })).queries.getMWDateFormat()).toBe("mdy");
        expect((await fresh({ userOptions: { date: "ISO 8601" } })).queries.getMWDateFormat()).toBe("ISO 8601");
        expect((await fresh()).queries.getMWDateFormat()).toBe("");
    });

    it("getLocales：en 站按 date 选项分化 en-GB/en-US，结果缓存", async () => {
        document.documentElement.setAttribute("lang", "en");
        const f = await fresh();
        expect(f.queries.getLocales()).toEqual(["en-GB", "en-US"]);
        expect(f.queries.getLocales()).toEqual(["en-GB", "en-US"]);
        const mdy = await fresh({ userOptions: { date: "mdy" } });
        document.documentElement.setAttribute("lang", "en");
        expect(mdy.queries.getLocales()).toEqual(["en-US"]);
    });

    it("getLocales：非 en 站保留 html lang，popupLocale 覆盖优先", async () => {
        document.documentElement.setAttribute("lang", "zh");
        expect((await fresh()).queries.getLocales()).toEqual(["zh", "en-US"]);
        document.documentElement.setAttribute("lang", "zh");
        expect((await fresh({ windowOverrides: { popupLocale: "fr" } })).queries.getLocales()).toEqual(["fr", "en-US"]);
    });

    it("getLocales：html 无 lang 且无 popupLocale 时崩溃（照搬勿修：legacy 同款 RangeError）", async () => {
        const f = await fresh();
        expect(() => f.queries.getLocales()).toThrow(RangeError);
    });

    it("adjustDate：偏移量按分钟累加可跨日", async () => {
        const f = await fresh();
        expect(f.queries.adjustDate(new Date("2026-01-02T23:30:00Z"), 60).toISOString()).toBe("2026-01-03T00:30:00.000Z");
    });

    it("convertTimeZone：目标时区墙面时间重建成 Date", async () => {
        const f = await fresh();
        expect(f.queries.convertTimeZone(new Date("2026-01-02T23:30:00Z"), "Asia/Shanghai").toISOString()).toBe("2026-01-03T07:30:00.000Z");
    });
});

describe("formattedDateTime / formattedDate / formattedTime", () => {
    const D = new Date("2026-01-02T23:30:00Z");

    it("偏移路径：timecorrection 0|120 时 UTC 字段加偏移", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|120" } });
        expect(f.queries.formattedDate(D)).toBe("2026-01-03");
        expect(f.queries.formattedTime(D)).toBe("01:30:00");
        expect(f.queries.formattedDateTime(D)).toBe("2026-01-03 01:30:00");
    });

    it("ISO 8601 路径：ZoneInfo 时区换算后零填充拼 T", async () => {
        const f = await fresh({ userOptions: { timecorrection: "ZoneInfo|480|Asia/Shanghai", date: "ISO 8601" } });
        expect(f.queries.formattedDate(D)).toBe("2026-01-03");
        expect(f.queries.formattedTime(D)).toBe("07:30:00");
        expect(f.queries.formattedDateTime(D)).toBe("2026-01-03T07:30:00");
    });

    it("默认 locale 路径：en-GB 日期序（日/月/年）+ 24 小时制", async () => {
        document.documentElement.setAttribute("lang", "en");
        const f = await fresh();
        expect(f.queries.formattedDate(D)).toBe("02/01/2026");
        expect(f.queries.formattedTime(D)).toBe("23:30:00");
        expect(f.queries.formattedDateTime(D)).toBe("02/01/2026, 23:30:00");
    });

    it("默认 locale 路径：date=mdy 时 en-US 日期序（月/日/年）", async () => {
        document.documentElement.setAttribute("lang", "en");
        const f = await fresh({ userOptions: { date: "mdy" } });
        expect(f.queries.formattedDate(D)).toBe("01/02/2026");
        expect(f.queries.formattedDateTime(D)).toBe("01/02/2026, 23:30:00");
    });
});

describe("editPreviewTable · history 态（经 APIhistoryPreviewHTML）", () => {
    const ROWS = [
        { revid: 100, timestamp: "2026-01-02T03:04:05Z", user: "Alice", comment: "fix typo" },
        { revid: 90, timestamp: "2026-01-02T05:06:07Z", user: "1.2.3.4", minor: true, comment: "" },
        { revid: 80, timestamp: "2026-01-01T09:00:00Z", user: "Bob", commenthidden: true },
    ];

    it("日期分组、奇偶行、cur/last 锚、IP 用户 Special:Contributions、minor 与隐藏摘要（照搬勿修：colspan 不加引号）", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIhistoryPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { pages: { 1: { revisions: ROWS } } } }), navpopWith(f));
        expect(html).toBe(
            "<table>"
            + "<tr><td colspan=3><span class=\"popup_history_date\">2026-01-02</span></td></tr>"
            + `<tr class="popup_history_row_even"><td>(<a href="${TB}Foo&diff=100&oldid=100">当前</a>&nbsp;|&nbsp;<a href="${TB}Foo&diff=prev&oldid=100">之前</a>)</td><td><a href="${TB}Foo&oldid=100">03:04:05</a></td><td><a href="${TB}User:Alice">Alice</a></td><td>fix typo</td></tr>`
            + `<tr class="popup_history_row_odd"><td>(<a href="${TB}Foo&diff=100&oldid=90">当前</a>&nbsp;|&nbsp;<a href="${TB}Foo&diff=prev&oldid=90">之前</a>)</td><td><a href="${TB}Foo&oldid=90">05:06:07</a></td><td><a href="${TB}Special:Contributions&target=1.2.3.4">1.2.3.4</a></td><td><b>小 </b></td></tr>`
            + "<tr><td colspan=3><span class=\"popup_history_date\">2026-01-01</span></td></tr>"
            + `<tr class="popup_history_row_even"><td>(<a href="${TB}Foo&diff=100&oldid=80">当前</a>&nbsp;|&nbsp;<a href="${TB}Foo&diff=prev&oldid=80">之前</a>)</td><td><a href="${TB}Foo&oldid=80">09:00:00</a></td><td><a href="${TB}User:Bob">Bob</a></td><td>历史版本被隐藏</td></tr>`
            + "</table>",
        );
    });

    it("userhidden：第三列落 popupRevDelUrl 与 revdel 文案", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const html = f.queries.APIhistoryPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { pages: { 1: { revisions: [{ revid: 100, timestamp: "2026-01-02T03:04:05Z", user: "Secret", userhidden: true }] } } } }), navpopWith(f));
        expect(html).toContain("<td><a href=\"//en.wikipedia.org/wiki/Wikipedia:Revision_deletion\">历史版本被隐藏</a></td>");
        expect(html).toContain("&oldid=100\"");
    });

    it("空摘要回落 slots 内容（照搬勿修：|| 判定让空串 comment 走 slots）", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const html = f.queries.APIhistoryPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { pages: { 1: { revisions: [{ revid: 100, timestamp: "2026-01-02T03:04:05Z", user: "Alice", comment: "", slots: { main: { content: "from slots" } } }] } } } }), navpopWith(f));
        expect(html).toContain("<td>from slots</td>");
    });

    it("空 revisions 数组触发 catch：返回 History preview failed 文案（h[0].revid 崩溃被拦截）", async () => {
        const f = await fresh();
        expect(f.queries.APIhistoryPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { pages: { 1: { revisions: [] } } } }), navpopWith(f))).toBe("历史记录预览失败 :-(");
        expect(f.queries.APIhistoryPreviewHTML(new f.title.Title("Foo"), downloadWith(f, "{bad json"), navpopWith(f))).toBe("历史记录预览失败 :-(");
    });
});

describe("editPreviewTable · contribs 态（经 APIcontribsPreviewHTML）", () => {
    it("diff/hist 锚按行内 title、第三列条目链、minor 前置", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIcontribsPreviewHTML(new f.title.Title("User:Alice"), downloadWith(f, { query: { usercontribs: [
            { revid: 200, title: "Foo", timestamp: "2026-01-02T03:04:05Z", user: "Alice", comment: "c1" },
            { revid: 190, title: "Bar Baz", timestamp: "2026-01-02T04:05:06Z", user: "Alice", minor: true },
        ] } }), navpopWith(f));
        expect(html).toBe(
            "<table>"
            + "<tr><td colspan=3><span class=\"popup_history_date\">2026-01-02</span></td></tr>"
            + `<tr class="popup_history_row_even"><td>(<a href="${TB}Foo&diff=prev&oldid=200">差异</a>&nbsp;|&nbsp;<a href="${TB}Foo&action=history">历史</a>)</td><td><a href="${TB}Foo&oldid=200">03:04:05</a></td><td><a href="${TB}Foo">Foo</a></td><td>c1</td></tr>`
            + `<tr class="popup_history_row_odd"><td>(<a href="${TB}Bar_Baz&diff=prev&oldid=190">差异</a>&nbsp;|&nbsp;<a href="${TB}Bar_Baz&action=history">历史</a>)</td><td><a href="${TB}Bar_Baz&oldid=190">04:05:06</a></td><td><b>小 </b><a href="${TB}Bar_Baz">Bar Baz</a></td><td></td></tr>`
            + "</table>",
        );
    });

    it("空贡献列表产出空表（contribs 态不取 h[0]，不抛）", async () => {
        const f = await fresh();
        expect(f.queries.APIcontribsPreviewHTML(new f.title.Title("User:Alice"), downloadWith(f, { query: { usercontribs: [] } }), navpopWith(f))).toBe("<table></table>");
    });

    it("响应无 query/usercontribs：usercontribs ?? [] 兜底为空表", async () => {
        const f = await fresh();
        const art = new f.title.Title("User:Alice");
        expect(f.queries.APIcontribsPreviewHTML(art, downloadWith(f, { query: {} }), navpopWith(f))).toBe("<table></table>");
        expect(f.queries.APIcontribsPreviewHTML(art, downloadWith(f, {}), navpopWith(f))).toBe("<table></table>");
    });

    it("行缺 title/timestamp：空标题与 Invalid Date 照落（三处 ?? 兜底）", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIcontribsPreviewHTML(new f.title.Title("User:Alice"), downloadWith(f, { query: { usercontribs: [{ revid: 200, user: "Alice" }] } }), navpopWith(f));
        expect(html).toBe(
            "<table>"
            + "<tr><td colspan=3><span class=\"popup_history_date\">NaN-NaN-NaN</span></td></tr>"
            + `<tr class="popup_history_row_even"><td>(<a href="${TB}&diff=prev&oldid=200">差异</a>&nbsp;|&nbsp;<a href="${TB}&action=history">历史</a>)</td><td><a href="${TB}&oldid=200">NaN:NaN:NaN</a></td><td><a href="${TB}"></a></td><td></td></tr>`
            + "</table>",
        );
    });
});

describe("editPreviewTable · history/contribs 字段缺省", () => {
    it("history 行缺 user：第三列落 User: 空标题（两处 ?? 兜底）", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIhistoryPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { pages: { 1: { revisions: [{ revid: 100, timestamp: "2026-01-02T03:04:05Z", comment: "x" }] } } } }), navpopWith(f));
        expect(html).toContain(`<td><a href="${TB}User:"></a></td>`);
    });

    it("空摘要且 slots 无 main 内容：comment 兜底 null（?? 兜底）", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIhistoryPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { pages: { 1: { revisions: [{ revid: 100, timestamp: "2026-01-02T03:04:05Z", user: "Alice", comment: "", slots: {} }] } } } }), navpopWith(f));
        expect(html).toContain(`<td><a href="${TB}User:Alice">Alice</a></td><td></td>`);
    });
});

describe("APIrevisionPreviewHTML", () => {
    it("missing 页：owner 置 null 并返回 undefined", async () => {
        const f = await fresh();
        const d = downloadWith(f, { query: { pages: { 1: { missing: true } } } });
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), d)).toBeUndefined();
        expect(d.owner).toBeNull();
    });

    it("wikitext 内容：data 换正文、lastModified 取时间戳、wikibase 条目与 repo 拼接", async () => {
        const f = await fresh();
        const d = downloadWith(f, {
            query: {
                pages: { 1: { revisions: [{ timestamp: "2026-01-02T03:04:05Z", slots: { main: { content: "WIKI", contentmodel: "wikitext" } } }], pageprops: { wikibase_item: "Q42" } } },
                wikibase: { repo: { url: { base: "https://www.wikidata.org/w", articlepath: "/wiki/$1" } } },
            },
        });
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), d)).toBeUndefined();
        expect(d.data).toBe("WIKI");
        expect(d.lastModified).toEqual(new Date("2026-01-02T03:04:05Z"));
        expect(d.wikibaseItem).toBe("Q42");
        expect(d.wikibaseRepo).toBe("https://www.wikidata.org/w/wiki/$1");
    });

    it("非 wikitext 内容模型：data 与 lastModified 保持原样", async () => {
        const f = await fresh();
        const raw = JSON.stringify({ query: { pages: { 1: { revisions: [{ timestamp: "2026-01-02T03:04:05Z", slots: { main: { content: "body{}", contentmodel: "css" } } }] } } } });
        const d = downloadWith(f, raw);
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), d)).toBeUndefined();
        expect(d.data).toBe(raw);
        expect(d.lastModified).toBeNull();
    });

    it("query.pages 缺失或空：返回失败文案", async () => {
        const f = await fresh();
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: {} }))).toBe("Revision preview failed :(");
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { pages: {} } }))).toBe("Revision preview failed :(");
    });

    it("download.data 缺省：?? \"\" 兜底按解析失败处理", async () => {
        const f = await fresh();
        const d = new f.downloader.Downloader("https://example/api");
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), d)).toBe("Revision preview failed :(");
        expect(d.data).toBeUndefined();
    });

    it("wikitext 内容但 timestamp 缺省：lastModified 落 Invalid Date", async () => {
        const f = await fresh();
        const d = downloadWith(f, { query: { pages: { 1: { revisions: [{ slots: { main: { content: "WIKI", contentmodel: "wikitext" } } }] } } } });
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), d)).toBeUndefined();
        expect(d.data).toBe("WIKI");
        expect((d.lastModified as Date).getTime()).toBeNaN();
    });

    it("pageprops.wikibase_item 无 wikibase 段：repo 拼接两处 ?? \"\" 兜底为空串", async () => {
        const f = await fresh();
        const d = downloadWith(f, { query: { pages: { 1: { pageprops: { wikibase_item: "Q42" }, revisions: [] } } } });
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), d)).toBeUndefined();
        expect(d.wikibaseItem).toBe("Q42");
        expect(d.wikibaseRepo).toBe("");
    });

    it("pages 命中 null 页：anyChild 返回 null，失败文案", async () => {
        const f = await fresh();
        expect(f.queries.APIrevisionPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { pages: { 1: null } } }))).toBe("Revision preview failed :(");
    });
});

describe("APIbacklinksPreviewHTML", () => {
    it("链入列表：titlebase + entify 实体转义、顿号分隔", async () => {
        const f = await fresh();
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIbacklinksPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { backlinks: [{ title: "A & B" }, { title: "Foo" }] } }));
        expect(html).toBe(`<a href="${TB}A_%26_B">A &amp; B</a>、<a href="${TB}Foo">Foo</a>`);
    });

    it("blcontinue 存在时追加「以及更多」", async () => {
        const f = await fresh();
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIbacklinksPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: { backlinks: [{ title: "Foo" }] }, "continue": { blcontinue: "0|Foo" } }));
        expect(html).toBe(`<a href="${TB}Foo">Foo</a>以及其他页面`);
    });

    it("无 backlinks / 无 query：各自文案", async () => {
        const f = await fresh();
        expect(f.queries.APIbacklinksPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: {} }))).toBe("找不到链入页面");
        expect(f.queries.APIbacklinksPreviewHTML(new f.title.Title("Foo"), downloadWith(f, { query: null }))).toBe("backlinksPreviewHTML went wonky");
    });
});

describe("APIimagelinksPreviewHTML（阶段 1：空态路径）", () => {
    it("无 imageusage / 空列表：未找到文件链接", async () => {
        const f = await fresh();
        expect(f.queries.APIimagelinksPreviewHTML(new f.title.Title("File:X.jpg"), downloadWith(f, { query: {} }))).toBe("未找到文件链接");
        expect(f.queries.APIimagelinksPreviewHTML(new f.title.Title("File:X.jpg"), downloadWith(f, { query: { imageusage: [] } }))).toBe("未找到文件链接");
    });

    it("非空列表：h2 文件链接 + linkList（按标题排序、空格转 &nbsp;、顿号分隔）（照搬勿修：onclick=\"undefined\" 属性）", async () => {
        const f = await fresh();
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIimagelinksPreviewHTML(new f.title.Title("File:X.jpg"), downloadWith(f, { query: { imageusage: [{ title: "C" }, { title: "A b" }] } }));
        expect(html).toBe(
            "<h2>文件链接</h2>"
            + `<a href="${TB}A_b" title="前往 A b" onclick="undefined">A&nbsp;b</a>、`
            + `<a href="${TB}C" title="前往 C" onclick="undefined">C</a>`,
        );
    });

    it("重复与逆序标题：排序比较器相等/小于/大于三侧", async () => {
        const f = await fresh();
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIimagelinksPreviewHTML(new f.title.Title("File:X.jpg"), downloadWith(f, { query: { imageusage: [{ title: "B" }, { title: "A" }, { title: "B" }] } }));
        expect(html).toBe(
            "<h2>文件链接</h2>"
            + `<a href="${TB}A" title="前往 A" onclick="undefined">A</a>、`
            + `<a href="${TB}B" title="前往 B" onclick="undefined">B</a>、`
            + `<a href="${TB}B" title="前往 B" onclick="undefined">B</a>`,
        );
    });
});

describe("APIcategoryPreviewHTML（阶段 1：空态路径）", () => {
    it("无 categorymembers / 空列表：空的分类", async () => {
        const f = await fresh();
        expect(f.queries.APIcategoryPreviewHTML(new f.title.Title("Category:C"), downloadWith(f, { query: {} }))).toBe("空的分类");
        expect(f.queries.APIcategoryPreviewHTML(new f.title.Title("Category:C"), downloadWith(f, { query: { categorymembers: [] } }))).toBe("空的分类");
    });

    it("非空列表：tprintf 计数 h2 + linkList，cmcontinue 追加「以及其他页面」", async () => {
        const f = await fresh();
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIcategoryPreviewHTML(new f.title.Title("Category:C"), downloadWith(f, { query: { categorymembers: [{ title: "B" }, { title: "A c" }] }, "continue": { cmcontinue: "0|B" } }));
        expect(html).toBe(
            "<h2>分类成员（2 显示）</h2>"
            + `<a href="${TB}A_c" title="前往 A c" onclick="undefined">A&nbsp;c</a>、`
            + `<a href="${TB}B" title="前往 B" onclick="undefined">B</a>`
            + "以及其他页面",
        );
    });

    it("无 cmcontinue：不追加「以及其他页面」", async () => {
        const f = await fresh();
        const TB = f.site.siteState.titlebase;
        const html = f.queries.APIcategoryPreviewHTML(new f.title.Title("Category:C"), downloadWith(f, { query: { categorymembers: [{ title: "B" }] } }));
        expect(html).toBe(`<h2>分类成员（1 显示）</h2><a href="${TB}B" title="前往 B" onclick="undefined">B</a>`);
    });
});

describe("APIuserInfoPreviewHTML", () => {
    const run = (f: Fresh, query: unknown): string => f.queries.APIuserInfoPreviewHTML(new f.title.Title("User:Example"), downloadWith(f, { query }));

    it("注册用户：性别、组名消息、编辑数与注册日期（偏移路径锁 UTC 日期）", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const html = run(f, { users: { Example: { groups: ["*", "user", "sysop", "autoconfirmed"], editcount: 42, registration: "2006-02-05T18:29:00Z", gender: "male" } } });
        expect(html).toBe("<hr />♂，group-sysop-member，42次编辑，注册日期为2006-02-05");
    });

    it("无有效组：补 group-user-member 前先加非自动确认标记", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        const html = run(f, { users: { Example: { groups: ["*"], registration: "2006-02-05T18:29:00Z" } } });
        expect(html).toBe("<hr /><b>非自动确认用户</b>，0次编辑，注册日期为2006-02-05");
    });

    it("invalid/missing 以空串精确判定", async () => {
        const f = await fresh();
        expect(run(f, { users: { Example: { invalid: "" } } })).toBe("<hr />非法用户名");
        expect(run(f, { users: { Example: { missing: "" } } })).toBe("<hr />非已注册的用户");
    });

    it("blockedby：blockpartial 分「被部分封禁」/「被封禁」", async () => {
        const f = await fresh();
        expect(run(f, { users: { Example: { blockedby: "Ops", blockpartial: true } } })).toBe("<hr /><b>被部分封禁</b>");
        expect(run(f, { users: { Example: { blockedby: "Ops" } } })).toBe("<hr /><b>被封禁</b>");
    });

    it("locked/hidden：unattached 含本库（wgDBname）时判定未附着到此、不显示（LOCKED/HIDDEN 按本仓译表输出）", async () => {
        const f = await fresh();
        expect(run(f, { users: { Example: {} }, globaluserinfo: { locked: "", unattached: [{ wiki: "zh_moegirl" }] } })).toBe("<hr />");
        expect(run(f, { users: { Example: {} }, globaluserinfo: { locked: "", unattached: [{ wiki: "enwiki" }] } })).toBe("<hr /><b><i>全域锁定</i></b>");
        expect(run(f, { users: { Example: {} }, globaluserinfo: { hidden: "" } })).toBe("<hr /><b><i>全域隐藏</i></b>");
    });

    it("性别仅 male/female 两态产出符号", async () => {
        const f = await fresh();
        expect(run(f, { users: { Example: { gender: "female" } } })).toBe("<hr />♀");
        expect(run(f, { users: { Example: { gender: "unknown" } } })).toBe("<hr />");
    });

    it("globaluserinfo 组以斜体并入（照搬勿修：无 groups 字段不追加非自动确认标记；未注册消息键原样回落）", async () => {
        const f = await fresh();
        const html = run(f, { users: { Example: {} }, globaluserinfo: { groups: ["steward"] } });
        expect(html).toBe("<hr /><i>group-steward-member</i>");
    });

    it("usercontribs：最后一次编辑日期", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        expect(run(f, { users: { Example: {} }, usercontribs: [{ timestamp: "2026-01-02T03:04:05Z" }] })).toBe("<hr />最后一次编辑于2026-01-02");
    });

    it("IP 封禁态：单 IP BLOCKED、段封禁 Has rangeblocks（无译键原样回落）", async () => {
        const f = await fresh();
        expect(run(f, { blocks: [{ rangestart: "192.0.2.0", rangeend: "192.0.2.0", restrictions: ["edit"] }] })).toBe("<hr />IP用户，<b>被封禁</b>");
        expect(run(f, { blocks: [{ rangestart: "192.0.2.0", rangeend: "192.0.2.255" }] })).toBe("<hr />IP用户，<b>Has rangeblocks</b>");
    });

    it("editcount 0 须渲染为 0（照搬勿修：falsy 分支为 legacy 刻意行为）", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        // 夹具无 groups 字段，legacy 的非自动确认标记分支不触发（见上一用例）
        expect(run(f, { users: { Example: { editcount: 0, registration: "2006-02-05T18:29:00Z" } } })).toBe("<hr />0次编辑，注册日期为2006-02-05");
    });

    it("无任何数据：仅剩 <hr />", async () => {
        const f = await fresh();
        expect(run(f, {})).toBe("<hr />");
    });

    it("groups 全为隐式组且含 autoconfirmed：补 group-user-member（性别参属实/缺省两态，照搬勿修）", async () => {
        const f = await fresh();
        const messageSpy = vi.spyOn(f.mw, "message");
        expect(run(f, { users: { Example: { groups: ["*", "user", "autoconfirmed"] } } })).toBe("<hr />group-user-member");
        expect(messageSpy).toHaveBeenCalledWith("group-user-member", "");
        expect(run(f, { users: { Example: { groups: ["*", "user", "autoconfirmed"], gender: "male" } } })).toBe("<hr />♂，group-user-member");
        expect(messageSpy).toHaveBeenCalledWith("group-user-member", "male");
    });

    it("自定义组且无性别：消息第二参 ?? \"\" 兜底", async () => {
        const f = await fresh();
        const messageSpy = vi.spyOn(f.mw, "message");
        expect(run(f, { users: { Example: { groups: ["sysop"] } } })).toBe("<hr />group-sysop-member、<b>非自动确认用户</b>");
        expect(messageSpy).toHaveBeenCalledWith("group-sysop-member", "");
    });

    it("usercontribs 条目缺 timestamp：Invalid Date 兜底", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        expect(run(f, { users: { Example: {} }, usercontribs: [{}] })).toBe("<hr />最后一次编辑于NaN-NaN-NaN");
    });
});

describe("fetchUserGroupNames", () => {
    it("合并 users.groups 与 globaluserinfo.groups（含 * 隐式组），经 mw.Api 补译", async () => {
        const f = await fresh();
        f.site.getMwApi();
        const api = f.apiInstances[0];
        api.loadMessagesIfMissing.mockReturnValue(Promise.resolve());
        const payload = JSON.stringify({ query: { users: { Example: { groups: ["*", "sysop"] } }, globaluserinfo: { groups: ["steward"] } } });
        await expect(f.queries.fetchUserGroupNames(payload)).resolves.toBeUndefined();
        expect(api.loadMessagesIfMissing).toHaveBeenCalledWith(["group-*-member", "group-sysop-member", "group-steward-member"]);
    });

    it("坏 JSON：users 取不到，补译空列表", async () => {
        const f = await fresh();
        f.site.getMwApi();
        const api = f.apiInstances[0];
        api.loadMessagesIfMissing.mockReturnValue(Promise.resolve());
        await f.queries.fetchUserGroupNames("{bad json");
        expect(api.loadMessagesIfMissing).toHaveBeenCalledWith([]);
    });

    it("入参 undefined：?? \"\" 兜底后按解析失败处理，补译空列表", async () => {
        const f = await fresh();
        f.site.getMwApi();
        const api = f.apiInstances[0];
        api.loadMessagesIfMissing.mockReturnValue(Promise.resolve());
        await f.queries.fetchUserGroupNames(undefined);
        expect(api.loadMessagesIfMissing).toHaveBeenCalledWith([]);
    });
});

describe("各生成器 · download.data 缺省与畸形条目", () => {
    it("data 缺省：?? \"\" 兜底后各自走空态/失败文案", async () => {
        const f = await fresh();
        const art = new f.title.Title("Foo");
        const empty = (): DownloaderNs.Downloader => new f.downloader.Downloader("https://example/api");
        expect(f.queries.APIbacklinksPreviewHTML(art, empty())).toBe("backlinksPreviewHTML went wonky");
        expect(f.queries.APIimagelinksPreviewHTML(art, empty())).toBe("未找到文件链接");
        expect(f.queries.APIcategoryPreviewHTML(art, empty())).toBe("空的分类");
        expect(f.queries.APIhistoryPreviewHTML(art, empty(), navpopWith(f))).toBe("历史记录预览失败 :-(");
        expect(f.queries.APIuserInfoPreviewHTML(art, empty())).toBe("<hr />");
        expect(f.queries.APIimagepagePreviewHTML(art, empty(), navpopWith(f))).toBe("API imagepage preview failed :(");
    });

    it("backlinks/imagelinks/category：title 非字符串在 Title 构造处抛错 → catch 文案", async () => {
        const f = await fresh();
        const art = new f.title.Title("Foo");
        expect(f.queries.APIbacklinksPreviewHTML(art, downloadWith(f, { query: { backlinks: [{ title: 5 }] } }))).toBe("backlinksPreviewHTML went wonky");
        expect(f.queries.APIimagelinksPreviewHTML(art, downloadWith(f, { query: { imageusage: [{ title: 5 }] } }))).toBe("Image links preview generation failed :(");
        expect(f.queries.APIcategoryPreviewHTML(art, downloadWith(f, { query: { categorymembers: [{ title: 5 }] } }))).toBe("Category preview failed :(");
    });

    it("imagepage：File 标题含孤立代理项令 encodeURIComponent 抛 URIError → catch 文案", async () => {
        const f = await fresh();
        const d = downloadWith(f, { query: { pages: { 1: { imagerepository: "shared" } } } });
        expect(f.queries.APIimagepagePreviewHTML(new f.title.Title("File:\ud800"), d, navpopWith(f))).toBe("API imagepage preview failed :(");
    });
});

describe("showAPIPreview", () => {
    it("槽位分派：category/imagelinks→popupPostPreview、userinfo→popupUserData、默认→popupPreview", async () => {
        const f = await fresh();
        slotDivs(1, ["popupPreview", "popupPostPreview", "popupUserData"]);
        const navpop1 = navpopWith(f, 1);
        navpop1.pending = 3;
        f.queries.showAPIPreview("category", "cat", 1, navpop1);
        expect(document.getElementById("popupPostPreview1")?.innerHTML).toBe("cat");
        f.queries.showAPIPreview("imagelinks", "il", 1, navpop1);
        expect(document.getElementById("popupPostPreview1")?.innerHTML).toBe("il");
        f.queries.showAPIPreview("userinfo", "ui", 1, navpop1);
        expect(document.getElementById("popupUserData1")?.innerHTML).toBe("ui");
        f.queries.showAPIPreview("history", "h", 1, navpop1);
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("h");
        expect(navpop1.pending).toBe(0);
    });

    it("html 为 null 时清空目标槽不写入；revision 提前返回不触碰任何槽", async () => {
        const f = await fresh();
        slotDivs(1, ["popupPreview", "popupPostPreview"]);
        const stale = document.getElementById("popupPreview1");
        if (stale) {
            stale.innerHTML = "stale";
        }
        const navpop = navpopWith(f, 1);
        f.queries.showAPIPreview("history", null, 1, navpop);
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
        f.queries.showAPIPreview("revision", "r", 1, navpop);
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
        expect(document.getElementById("popupPostPreview1")?.innerHTML).toBe("");
    });

    it("revision 带 download：转 insertPreview，正文预览写 popupPreview 槽（legacy :353-357）", async () => {
        const f = await fresh({ userOptions: { timecorrection: "0|0" } });
        // pageinfo 的 lastModified 过滤器读取站点注入的全局 moment
        vi.stubGlobal("moment", moment);
        slotDivs(1, ["popupPreview"]);
        const navpop = navpopWith(f, 1);
        navpop.article = new f.title.Title("Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        const d = downloadWith(f, "Hello world");
        d.owner = navpop;
        f.queries.showAPIPreview("revision", "IGNORED", 1, navpop, d);
        expect(document.getElementById("popupPreview1")?.innerHTML).toContain("Hello world");
    });
});

describe("APIsharedImagePagePreviewHTML", () => {
    const sharedObj = (content: string, contentmodel = "wikitext"): Record<string, unknown> => ({
        requestid: 7,
        query: { pages: { 1: { revisions: [{ slots: { main: { content, contentmodel } } }] } } },
    });

    it("命中：当前链接的弹窗生成预览写入 popupSecondPreview 槽", async () => {
        const f = await fresh();
        slotDivs(7, ["popupSecondPreview"]);
        const anchor = document.createElement("a");
        const navpop = new f.popup.Navpopup();
        navpop.idNumber = 1;
        navpop.delay = 50;
        navpop.article = new f.title.Title("File:Example.jpg");
        anchor.navpopup = navpop as EventsNs.BoundNavpopup;
        f.events.eventsState.current.link = anchor;
        f.queries.APIsharedImagePagePreviewHTML(sharedObj("Hello world"));
        expect(document.getElementById("popupSecondPreview7")?.innerHTML).toContain("Hello world");
    });

    it("无当前链接或非 wikitext 内容模型：不写槽", async () => {
        const f = await fresh();
        slotDivs(7, ["popupSecondPreview"]);
        f.queries.APIsharedImagePagePreviewHTML(sharedObj("Hello world"));
        expect(document.getElementById("popupSecondPreview7")?.innerHTML).toBe("");
        const anchor = document.createElement("a");
        const navpop = new f.popup.Navpopup();
        navpop.idNumber = 1;
        navpop.delay = 50;
        navpop.article = new f.title.Title("File:Example.jpg");
        anchor.navpopup = navpop as EventsNs.BoundNavpopup;
        f.events.eventsState.current.link = anchor;
        f.queries.APIsharedImagePagePreviewHTML(sharedObj("body{}", "css"));
        expect(document.getElementById("popupSecondPreview7")?.innerHTML).toBe("");
    });

    it("无 query.pages（undefined 或空对象）：整段跳过不写槽", async () => {
        const f = await fresh();
        slotDivs(7, ["popupSecondPreview"]);
        f.queries.APIsharedImagePagePreviewHTML({ requestid: 7 });
        f.queries.APIsharedImagePagePreviewHTML({ requestid: 7, query: {} });
        expect(document.getElementById("popupSecondPreview7")?.innerHTML).toBe("");
    });
});

describe("APIimagepagePreviewHTML（阶段 1：alt 与 shared 段）", () => {
    it("alt 文本：从父锚点首子节点取 img.alt 并实体转义；imagelinks 副作用写 popupPostPreview", async () => {
        const f = await fresh();
        slotDivs(1, ["popupPostPreview"]);
        const navpop = navpopWith(f);
        const anchor = document.createElement("a");
        const img = document.createElement("img");
        img.alt = "A & B";
        anchor.appendChild(img);
        navpop.parentAnchor = anchor;
        const ret = f.queries.APIimagepagePreviewHTML(new f.title.Title("File:Example.jpg"), downloadWith(f, { query: { pages: { 1: {} } } }), navpop);
        expect(ret).toBe("<hr /><b>替换文本（Alt）：</b> A &amp; B");
        expect(document.getElementById("popupPostPreview1")?.innerHTML).toBe("未找到文件链接");
    });

    it("shared 资源库：Description page 链接与 mw.loader.load 的 JSONP URL", async () => {
        const f = await fresh();
        const navpop = navpopWith(f);
        const ret = f.queries.APIimagepagePreviewHTML(new f.title.Title("File:Example.jpg"), downloadWith(f, { query: { pages: { 1: { imagerepository: "shared" } } } }), navpop);
        const encart = "File%3AExample.jpg";
        expect(ret).toBe(`<hr />来自维基共享的图片: <a href="${f.site.siteState.commonsbase}?title=${encart}">图片描述页</a>`);
        expect(f.mw.loader.load).toHaveBeenCalledWith(`${f.site.siteState.apicommonsbase}?format=json&formatversion=2&callback=pg.fn.APIsharedImagePagePreviewHTML&requestid=1&action=query&prop=revisions&rvslots=main&rvprop=content&titles=${encart}`);
    });

    it("wikitext 内容：popupSummaryData 默认开，统计摘要写 popupData 槽（trailer）", async () => {
        const f = await fresh();
        // 站点运行时由站点注入全局 moment；pageinfo 过滤器读取（pageinfo.test 同款桩）
        vi.stubGlobal("moment", moment);
        slotDivs(1, ["popupData"]);
        const navpop = navpopWith(f);
        const d = downloadWith(f, { query: { pages: { 1: { revisions: [{ slots: { main: { content: "Hello world", contentmodel: "wikitext" } } }] } } } });
        // 运行时 download.owner 即归属弹窗（getPageInfo 过滤器经 owner.article 取条目）
        d.owner = navpop;
        navpop.article = new f.title.Title("File:Example.jpg");
        const ret = f.queries.APIimagepagePreviewHTML(new f.title.Title("File:Example.jpg"), d, navpop);
        // prepPreviewmaker 段（legacy :446-450）：html 非空时以 <hr /> 前缀并入返回值
        expect(ret.startsWith("<hr /><p>Hello world")).toBe(true);
        // innerHTML 读回时 U+00A0 按序列化规则还原为 &nbsp; 实体文本
        expect(document.getElementById("popupData1")?.innerHTML).toContain("11&nbsp;字节");
    });

    it("query.pages 缺失：失败文案", async () => {
        const f = await fresh();
        expect(f.queries.APIimagepagePreviewHTML(new f.title.Title("File:Example.jpg"), downloadWith(f, { query: {} }), navpopWith(f))).toBe("API imagepage preview failed :(");
    });

    it("alt 为空串 / content 非 wikitext / popupSummaryData 关：均不进对应分支", async () => {
        const f = await fresh({ windowOverrides: { popupSummaryData: false } });
        slotDivs(1, ["popupPostPreview", "popupData"]);
        const navpop = navpopWith(f);
        const anchor = document.createElement("a");
        const img = document.createElement("img");
        anchor.appendChild(img);
        navpop.parentAnchor = anchor;
        const ret = f.queries.APIimagepagePreviewHTML(new f.title.Title("File:Example.jpg"), downloadWith(f, { query: { pages: { 1: { revisions: [{ slots: { main: { content: "body{}", contentmodel: "css" } } }] } } } }), navpop);
        expect(ret).toBe("");
        expect(document.getElementById("popupPostPreview1")?.innerHTML).toBe("未找到文件链接");
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
    });

    it("空 wikitext 内容：p.html 为假值不并入返回值，摘要走「空页面」", async () => {
        const f = await fresh();
        vi.stubGlobal("moment", moment);
        slotDivs(1, ["popupData"]);
        const navpop = navpopWith(f);
        navpop.article = new f.title.Title("File:Example.jpg");
        const d = downloadWith(f, { query: { pages: { 1: { revisions: [{ slots: { main: { content: "", contentmodel: "wikitext" } } }] } } } });
        d.owner = navpop;
        const ret = f.queries.APIimagepagePreviewHTML(new f.title.Title("File:Example.jpg"), d, navpop);
        expect(ret).toBe("");
        expect(document.getElementById("popupData1")?.innerHTML).toContain("空页面");
    });

    it("popupSummaryData 关：wikitext 内容仍出预览正文，但不写 popupData 槽", async () => {
        const f = await fresh({ windowOverrides: { popupSummaryData: false } });
        vi.stubGlobal("moment", moment);
        slotDivs(1, ["popupData"]);
        const navpop = navpopWith(f);
        navpop.article = new f.title.Title("File:Example.jpg");
        const d = downloadWith(f, { query: { pages: { 1: { revisions: [{ slots: { main: { content: "Hello world", contentmodel: "wikitext" } } }] } } } });
        d.owner = navpop;
        expect(f.queries.APIimagepagePreviewHTML(new f.title.Title("File:Example.jpg"), d, navpop).startsWith("<hr /><p>Hello world")).toBe(true);
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
    });
});
