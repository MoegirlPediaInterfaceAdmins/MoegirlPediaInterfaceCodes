// boot 装配域镜像测试：boot（legacy run 等价）的缝接线与 strings 遗留清理、
// setupPopups 的 15 步序列、幂等（completed 标记）与 callback 语义、setMisc
// 的等价重置段、window.pg 兼容面四域、original.popupImage 槽填充器。
// 行为基准 = legacy src/modules/init.ts + run.ts + debug.ts + strings.ts 顶层
// 语句（commit 02c8dec）。
//
// 装配形态：fresh 模块图（vi.resetModules + 动态 import）+ installMw（配置对齐
// 萌百基址）+ location 桩（jsdom 的 Location 属性 unforgeable，siteinfo.test.ts
// 先例）——站点派生态由 boot 真身产生，测试不再重复 legacy init 的装配公式。
// mw.Api 单例在 fetchSpecialPageNames 内惰性创建，故先取句柄再编程响应
// （siteinfo.test.ts 同款）。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw, type MockApi, type MockMw } from "../helpers/mockMw.ts";
import { installXhr } from "../helpers/mockXhr.ts";
import { SPECIAL_PAGE_ALIASES, SITEBASE, TITLEBASE } from "../helpers/wikiFixtures.ts";
import { assume } from "../../src/core/tools.ts";
import type * as BootNs from "../../src/boot.ts";
import type * as CacheNs from "../../src/net/cache.ts";
import type * as EventsNs from "../../src/core/events.ts";
import type * as HtmloutNs from "../../src/core/htmlout.ts";
import type * as InstaNs from "../../src/preview/insta.ts";
import type * as LinksNs from "../../src/navlinks/links.ts";
import type * as NamespacesNs from "../../src/title/namespaces.ts";
import type * as OptionsNs from "../../src/core/options.ts";
import type * as PopupNs from "../../src/core/popup.ts";
import type * as QueriesNs from "../../src/api/queries.ts";
import type * as SiteinfoNs from "../../src/api/siteinfo.ts";
import type * as StateNs from "../../src/state.ts";
import type { PopupState } from "../../src/state.ts";
import type * as StringsNs from "../../src/core/strings.ts";
import type * as StructuresNs from "../../src/core/structures.ts";
import type * as TitleNs from "../../src/title/title.ts";

type Boot = typeof BootNs;
type Cache = typeof CacheNs;
type Events = typeof EventsNs;
type BoundNavpopup = EventsNs.BoundNavpopup;
type Htmlout = typeof HtmloutNs;
type Insta = typeof InstaNs;
type Links = typeof LinksNs;
type Namespaces = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type Popup = typeof PopupNs;
type Queries = typeof QueriesNs;
type Siteinfo = typeof SiteinfoNs;
type StateModule = typeof StateNs;
type Strings = typeof StringsNs;
type Structures = typeof StructuresNs;
type TitleModule = typeof TitleNs;

interface FreshOptions {
    /**
     * location 桩的 href：mockMw 的 getParamValue 读 globalThis.location.href，
     * 编辑页协议参数（autoedit/autowatchlist）由此驱动（默认站点根）
     */
    href?: string;
    /** window.popupXxx 覆盖（getValueOf 首读前写入） */
    windowOverrides?: Record<string, unknown>;
}

interface Fresh {
    boot: Boot;
    cache: Cache;
    events: Events;
    htmlout: Htmlout;
    insta: Insta;
    links: Links;
    namespaces: Namespaces;
    options: OptionsModule;
    popup: Popup;
    queries: Queries;
    siteinfo: Siteinfo;
    state: StateModule;
    strings: Strings;
    structures: Structures;
    title: TitleModule;
    api: MockApi;
    mw: MockMw;
}

let windowOptionKeys: string[] = [];

const fresh = async (options: FreshOptions = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw({ config: { wgArticlePath: "/wiki/$1" } });
    vi.stubGlobal("location", {
        hostname: SITEBASE,
        port: "",
        protocol: "https:",
        href: options.href ?? `https://${SITEBASE}/wiki/`,
    });
    const [boot, cache, events, htmlout, insta, links, namespaces, optionsMod, popup, queries, siteinfo, stateMod, strings, structures, title] = await Promise.all([
        import("../../src/boot.ts"),
        import("../../src/net/cache.ts"),
        import("../../src/core/events.ts"),
        import("../../src/core/htmlout.ts"),
        import("../../src/preview/insta.ts"),
        import("../../src/navlinks/links.ts"),
        import("../../src/title/namespaces.ts"),
        import("../../src/core/options.ts"),
        import("../../src/core/popup.ts"),
        import("../../src/api/queries.ts"),
        import("../../src/api/siteinfo.ts"),
        import("../../src/state.ts"),
        import("../../src/core/strings.ts"),
        import("../../src/core/structures.ts"),
        import("../../src/title/title.ts"),
    ]);
    siteinfo.getMwApi();
    const api = assume(installed.apiInstances[0]);
    api.get.mockResolvedValue({ query: { specialpagealiases: SPECIAL_PAGE_ALIASES } });
    for (const [key, value] of Object.entries(options.windowOverrides ?? {})) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return {
        boot,
        cache,
        events,
        htmlout,
        insta,
        links,
        namespaces,
        options: optionsMod,
        popup,
        queries,
        siteinfo,
        state: stateMod,
        strings,
        structures,
        title,
        api,
        mw: installed.mw,
    };
};

// 编辑页表单（autoedit.test.ts 先例）：jsdom 的 HTMLFormElement 无 named
// getter，控件按同名属性手工挂载；autoEdit 以 document.editform 早退门控
const installEditform = (boxValue: string): HTMLTextAreaElement => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    const box = document.createElement("textarea");
    box.setAttribute("name", "wpTextbox1");
    box.value = boxValue;
    form.appendChild(box);
    (form as unknown as Record<string, unknown>).wpTextbox1 = box;
    (document as unknown as Record<string, unknown>).editform = form;
    return box;
};

// 「已装配弹窗」的最小形态（BoundNavpopup 不变式由 events 域的 newNavpopup
// 保证，此处手工构造给 eventsState 的登记表预置脏状态）
const boundNavpop = (f: Fresh, id: number): BoundNavpopup => {
    const navpop = new f.popup.Navpopup() as BoundNavpopup;
    navpop.idNumber = id;
    navpop.parentAnchor = null;
    navpop.delay = 0;
    return navpop;
};

// #content 容器与一条站内链接（绝对 URL 走 titlebase——location 是桩，
// 相对 URL 会按 jsdom 的 localhost 文档基址解析，匹配不上站点正则）
const hostWithLink = (name: string): { content: HTMLElement; a: HTMLAnchorElement } => {
    const content = document.createElement("div");
    content.id = "content";
    const a = document.createElement("a");
    a.href = `${TITLEBASE}${name}`;
    a.append(document.createTextNode(name));
    content.append(a);
    document.body.append(content);
    return { content, a };
};

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    Reflect.deleteProperty(window, "popupNoTranslation");
    Reflect.deleteProperty(window, "popupDebug");
    Reflect.deleteProperty(window, "pg");
    Reflect.deleteProperty(document, "editform");
    document.body.innerHTML = "";
    document.onmousemove = null;
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("boot（legacy run 等价）", () => {
    it("setupPopups/modifyWatchlist 两缝接线：autoEdit 的初始化回调链驱动 autoedit 应用与 watchlist 变更", async () => {
        const params = "title=Foo&action=watch&autowatchlist=1&actoken=mock-session-id&autoimpl=np20140416&autoedit=s/a/b/";
        const f = await fresh({ href: `https://${SITEBASE}/wiki/?${params}` });
        localStorage.setItem("popupNoTranslation", "legacy-storage-key");
        const box = installEditform("abc");
        f.boot.boot();
        // 回调在 fetchSpecialPageNames 之后触发：autoedit 的 s/a/b/ 已应用
        await vi.waitFor(() => {
            expect(box.value).toBe("bbc");
        });
        // modifyWatchlist 缝（autoedit 回调内的 autowatchlist 分支直调实现）
        expect(f.api.postWithToken).toHaveBeenCalledWith("watch", expect.objectContaining({ action: "watch", titles: "Foo" }));
        expect(f.mw.notify).toHaveBeenCalledTimes(1);
        // strings 域的遗留清理与缺译集合挂载（legacy 的模块顶层语句）
        expect(localStorage.getItem("popupNoTranslation")).toBeNull();
        expect(window.popupNoTranslation).toBe(f.strings.popupNoTranslation);
        // autoEdit2 排入的 100ms autoEdit3 定时器：在 mw 桩摘除前放行（actoken
        // 命中后 autoclick 缺省为空，无事发生）
        await new Promise((resolve) => {
            setTimeout(resolve, 120);
        });
    });

    it("abortAll 缝接线：killPopup 中止在途下载", async () => {
        const f = await fresh();
        const { sent, instances } = installXhr(() => ({ status: 200, responseText: "{}", delay: 50 }));
        const downloader = await import("../../src/net/downloader.ts");
        f.boot.boot();
        downloader.startDownload(`https://${SITEBASE}/api.php?slow=1`, 1, () => {
            // 回调内容无关紧要，本用例只验中止路径
        });
        expect(sent).toHaveLength(1);
        const navpop = boundNavpop(f, 1);
        const a = document.createElement("a");
        a.navpopup = navpop;
        f.events.eventsState.current.link = a;
        Reflect.apply(f.events.killPopup, a, []);
        expect(instances[0]?.aborted).toBe(true);
    });
});

describe("setupPopups 序列（legacy init.ts 15 步）", () => {
    it("别名拉取 → 站点态/基址/正则/选项/命名空间 → setMisc → livepreview → tooltips → tracker", async () => {
        const f = await fresh();
        const { sent } = installXhr(() => ({ status: 200, responseText: "{}" }));
        const { content, a } = hostWithLink("Foo");
        await f.boot.setupPopups();
        // 1 fetchSpecialPageNames（萌百定制参数）
        expect(f.api.get).toHaveBeenCalledTimes(1);
        expect(f.api.get.mock.calls[0]?.[0]).toMatchObject({
            action: "query",
            meta: "siteinfo",
            siprop: "specialpagealiases",
            formatversion: 2,
            uselang: "content",
            maxage: 3600,
        });
        expect(f.siteinfo.siteState.specialpagealiases).toEqual(SPECIAL_PAGE_ALIASES);
        expect(sent).toHaveLength(0);
        // 3/4 setSiteInfo + setTitleBase
        expect(f.siteinfo.siteState.hostname).toBe(SITEBASE);
        expect(f.siteinfo.siteState.sitebase).toBe(SITEBASE);
        expect(f.siteinfo.siteState.lang).toBe("zh");
        expect(f.siteinfo.siteState.wikimedia).toBe(false);
        expect(f.siteinfo.siteState.commons).toBeNull();
        expect(f.siteinfo.siteState.titlebase).toBe(TITLEBASE);
        expect(f.siteinfo.siteState.apiwikibase).toBe(`https://${SITEBASE}/api.php`);
        expect(f.title.wiki.titlebase).toBe(TITLEBASE);
        expect(f.title.wiki.re.basenames?.test(`${TITLEBASE}Foo`)).toBe(true);
        // 5 setOptions（默认值全集 + 首个 getValueOf 的固化）
        expect(f.options.optionDefault.popupDelay).toBe(0.5);
        expect(f.options.optionDefault.popupFilters).toHaveLength(8);
        expect(f.options.optionStore.popupMessageNeverUsed).toBeUndefined();
        // 6 setUserInfo（不 await）：canReview 同步置位、popupReview 关时不发请求
        expect(f.siteinfo.userState.canReview).toBe(false);
        expect(f.options.optionStore.popupReview).toBe(false);
        // 7/8/10 setNamespaces/setInterwiki/setRedirs
        expect(f.namespaces.nsState.imageId).toBe(6);
        expect(f.namespaces.nsState.interwiki).toBe("en|ja");
        expect(f.namespaces.nsState.re.interwiki?.test("en:Foo")).toBe(true);
        expect(f.namespaces.nsState.re.redirect?.exec("#REDIRECT [[Foo]]")?.[2]).toBe("Foo");
        // 9 setRegexps（依赖 1 的别名与 5 的选项）
        expect(f.title.wiki.re.main?.exec(`${TITLEBASE}Foo#A`)).toMatchObject({ 2: "Foo", 3: "A" });
        expect(f.title.wiki.re.specialdiff?.test("/Special:Diff/1/2")).toBe(true);
        expect(f.title.wiki.re.contribs?.test("/index.php?title=Special:Contributions&target=Foo")).toBe(true);
        expect(f.title.wiki.re.image).toBeInstanceOf(RegExp);
        expect(f.title.wiki.re.categoryBracketCount).toBe(1);
        expect(f.title.wiki.re.ipUser?.test("1.2.3.4")).toBe(true);
        // 12 setupLivePreview：legacy 读 pg.wiki/pg.nsXxxId 的站点配置经实参注入
        expect(f.insta.instaConf.paths.articles).toBe("/wiki/");
        expect(f.insta.instaConf.wiki.interwiki).toBe("en|ja");
        expect(f.insta.instaConf.locale.image).toBe("File");
        expect(f.insta.instaConf.locale.category).toBe("Category");
        // 13 setupTooltips：容器标记 + DOM0 事件属性接管
        expect(content.ranSetupTooltipsAlready).toBe(true);
        expect(a.hasPopup).toBe(true);
        expect(a.onmouseover).toBeTypeOf("function");
        expect(a.onmouseout).toBeTypeOf("function");
        expect(a.onmousedown).toBeTypeOf("function");
        // 槽填充器注册（navlinks 静态引入 + preview 域 popupImage 注册）
        expect(f.structures.getSlotFiller("original.popupImage")).toBeTypeOf("function");
        expect(f.structures.getSlotFiller("shortmenus.popupTopLinks")).toBeTypeOf("function");
        // 14 Navpopup.tracker.enable（DOM0 接管 document.onmousemove）
        expect(f.popup.Navpopup.tracker.active).toBe(true);
        expect(document.onmousemove).toBeTypeOf("function");
        // 15 completed 标记
        expect(f.boot.setupPopups.completed).toBe(true);
    });

    it("setMisc 等价重置段：current/idNumber/轮询句柄/缓存/decodeExtras 逐项归位", async () => {
        const f = await fresh();
        const dirty = hostWithLink("Dirty");
        f.events.eventsState.current.link = dirty.a;
        f.events.eventsState.current.article = new f.title.Title("Dirty");
        f.events.eventsState.current.links.push(dirty.a);
        f.events.eventsState.current.linksHash[dirty.a.href] = boundNavpop(f, 7);
        // 只作「非 null 句柄」脏值：ReturnType 形式兼容 DOM（number）与 Node
        // （Timeout）两套定时器类型环境，经 unknown 中转消除环境差异
        f.events.eventsState.checkPopupPositionTimer = 42 as unknown as ReturnType<typeof setInterval>;
        f.events.eventsState.idNumber = 9;
        f.cache.pages.push({ url: `https://${SITEBASE}/api.php?cached=1`, data: "{}", lastModified: null });
        await f.boot.setupPopups();
        expect(f.events.eventsState.current.link).toBeNull();
        expect(f.events.eventsState.current.links).toEqual([]);
        expect(f.events.eventsState.current.linksHash).toEqual({});
        expect(f.events.eventsState.checkPopupPositionTimer).toBeNull();
        expect(f.events.eventsState.idNumber).toBe(0);
        expect(f.cache.pages).toEqual([]);
        expect(f.title.wiki.misc.decodeExtras).toEqual([
            { from: "%2C", to: "," },
            { from: "_", to: " " },
            { from: "%24", to: "$" },
            { from: "%26", to: "&" },
        ]);
        // article 不在 legacy setMisc 的重置面（pg.current.article 从未被重置）
        expect(f.events.eventsState.current.article).toBeInstanceOf(f.title.Title);
    });
});

describe("setupPopups 幂等与 callback 语义", () => {
    it("completed 后重复调用：同步回调、不重复请求，无回调调用同样安全", async () => {
        const f = await fresh();
        await f.boot.setupPopups();
        const getCalls = f.api.get.mock.calls.length;
        const callback = vi.fn();
        let immediate = false;
        const promise = f.boot.setupPopups(() => {
            immediate = true;
            callback();
        });
        // completed 分支不经过 await：回调在返回的 promise 结算前已执行
        expect(immediate).toBe(true);
        await promise;
        expect(callback).toHaveBeenCalledTimes(1);
        expect(f.api.get.mock.calls.length).toBe(getCalls);
        await f.boot.setupPopups();
        expect(f.api.get.mock.calls.length).toBe(getCalls);
    });

    it("完成前注册的回调：序列末尾触发，await 前不触发", async () => {
        const f = await fresh();
        const callback = vi.fn();
        const promise = f.boot.setupPopups(callback);
        expect(callback).not.toHaveBeenCalled();
        await promise;
        expect(callback).toHaveBeenCalledTimes(1);
        expect(f.boot.setupPopups.completed).toBe(true);
    });
});

describe("window.pg 兼容面（四域）", () => {
    it("fn 域：10 个成员与各域导出引用相等，JSONP 回调路径经 window.pg 可达", async () => {
        const f = await fresh();
        // entry 守卫通过后的同一装配动作（此处手工执行，entry.test.ts 锁时序）
        window.pg = f.state.state;
        const pg = assume(window.pg as PopupState | undefined);
        expect(pg.fn.getLastContrib).toBe(f.links.getLastContrib);
        expect(pg.fn.getDiffSinceMyEdit).toBe(f.links.getDiffSinceMyEdit);
        expect(pg.fn.purgePopups).toBe(f.links.purgePopups);
        expect(pg.fn.disablePopups).toBe(f.links.disablePopups);
        expect(pg.fn.togglePreviews).toBe(f.links.togglePreviews);
        expect(pg.fn.modifyWatchlist).toBe(f.links.modifyWatchlist);
        expect(pg.fn.magicWatchLink).toBe(f.links.magicWatchLink);
        expect(pg.fn.magicHistoryLink).toBe(f.links.magicHistoryLink);
        expect(pg.fn.popupMenuLink).toBe(f.links.popupMenuLink);
        expect(pg.fn.APIsharedImagePagePreviewHTML).toBe(f.queries.APIsharedImagePagePreviewHTML);
        // commons 共享资源页二段查询的 callback=pg.fn.APIsharedImagePagePreviewHTML
        // 按字符串寻址 window：路径可达即可调用（空响应体走无数据早退）
        const callable: (obj: Parameters<typeof f.queries.APIsharedImagePagePreviewHTML>[0]) => void = pg.fn.APIsharedImagePagePreviewHTML;
        callable({});
    });

    it("option/string/wiki 域指向各域单例（purgePopups 就地清键后引用仍有效）", async () => {
        const f = await fresh();
        window.pg = f.state.state;
        const pg = assume(window.pg as PopupState | undefined);
        expect(pg.option).toBe(f.options.optionStore);
        expect(pg.string).toBe(f.strings.englishStrings);
        expect(pg.wiki).toBe(f.siteinfo.siteState);
        // 用户脚本调试读法：setOptions 之后经 pg.option 走默认化链
        f.options.setOptions();
        expect(f.links.purgePopups).toBeTypeOf("function");
        expect(pg.string.autoedit_version).toBe("np20140416");
    });
});

describe("original.popupImage 槽填充器（preview 域注册）", () => {
    it("返回 imageHTML 骨架串，日志行照搬 legacy", async () => {
        const f = await fresh();
        const filler = assume(f.structures.getSlotFiller("original.popupImage"));
        window.popupDebug = true;
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
            // 静音：仅断言日志内容
        });
        const html = filler({
            article: new f.title.Title("Foo"),
            hint: null,
            oldid: undefined,
            rcid: undefined,
            navpop: { idNumber: 7, parentAnchor: null },
            params: {},
        });
        expect(html).toBe(f.htmlout.imageHTML(7));
        expect(html).toBe('<a id="popupImageLink7"><img align="right" valign="top" id="popupImg7" style="display: none;"></img></a>');
        expect(consoleSpy).toHaveBeenCalledWith("original.popupImage, x.article=Foo, x.navpop?.idNumber=7");
    });

    it("经 fillEmptySpans 落入 #popupImage<N> 槽（结构表绑定值即注册键）", async () => {
        const f = await fresh();
        const { a } = hostWithLink("Foo");
        await f.boot.setupPopups();
        const navpop = boundNavpop(f, 3);
        navpop.parentAnchor = a;
        navpop.setInnerHTML(f.htmlout.popupHTML({ navpopup: navpop }));
        f.htmlout.fillEmptySpans({ navpopup: navpop });
        // jsdom 的 innerHTML 读回会重序列化（<img></img> → <img>），期望值过
        // 同款 DOM 往返
        const expected = document.createElement("div");
        expected.innerHTML = f.htmlout.imageHTML(3);
        expect(document.getElementById("popupImage3")?.innerHTML).toBe(expected.innerHTML);
        expect(document.getElementById("popupImg3")).not.toBeNull();
    });
});
