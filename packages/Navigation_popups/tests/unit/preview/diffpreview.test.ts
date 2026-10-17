// diff 预览域单元测试：loadDiff 的 compare 参数路由（cur/prev/next/数字 diff
// 各分支）、diff 查询 URL 装配与懒下载 hook、doneDiff 回调链（JSON 夹具→
// diffData 回填→popupPreview 槽 HTML）、insertDiff 的上下文/截断/日期表
// （popupDiffDates/popupDiffContextLines/popupDiffContextCharacters/
// popupDiffMaxLines 四个选项）、addReviewLink 巡查链接全链、titledDiffLink
// 的 diff URL 装配。
// 行为基准 = legacy src/modules/diffpreview.ts（commit 02c8dec）；期望值与
// legacy 输出逐字一致（结构经 stub 依赖驱动 legacy 原文件实测比对），怪癖
// 用例名标注「照搬勿修」。
//
// 说明：diff 表格的日期列走 queries 域的 formattedDateTime，测试锁 html lang
// （en → en-GB）与 UTC 时区；链接列走 links 域的 generalLink，期望串按同一
// DOM 序列化机制构造。
import moment from "moment";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installMw, type MockApi } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import { buildTitleWikiFixtures } from "../../helpers/wikiFixtures.ts";
import { assume } from "../../../src/core/tools.ts";
import type * as CacheNs from "../../../src/net/cache.ts";
import type * as DiffNs from "../../../src/preview/diff.ts";
import type * as DiffpreviewNs from "../../../src/preview/diffpreview.ts";
import type * as DownloaderNs from "../../../src/net/downloader.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as InstaNs from "../../../src/preview/insta.ts";
import type * as LinksNs from "../../../src/navlinks/links.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as QueriesNs from "../../../src/api/queries.ts";
import type * as SiteNs from "../../../src/api/siteinfo.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type Cache = typeof CacheNs;
type DiffModule = typeof DiffNs;
type Diffpreview = typeof DiffpreviewNs;
type DownloaderModule = typeof DownloaderNs;
type Events = typeof EventsNs;
type Htmlout = typeof HtmloutNs;
type Insta = typeof InstaNs;
type Links = typeof LinksNs;
type Namespaces = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type Popup = typeof PopupNs;
type Queries = typeof QueriesNs;
type Site = typeof SiteNs;
type TitleModule = typeof TitleNs;

// generalLink 依赖 innerText setter 物化文本子节点；jsdom 30 的 setter 不落
// DOM（outerHTML 为空）。按 navlinks/links.test.ts 同款补齐为 textContent
// 读写（真实浏览器对纯文本赋值等价）。
Reflect.defineProperty(HTMLElement.prototype, "innerText", {
    get(this: HTMLElement): string {
        return this.textContent;
    },
    set(this: HTMLElement, value: string): void {
        this.textContent = value;
    },
    configurable: true,
});

interface Fresh {
    diffpreview: Diffpreview;
    diff: DiffModule;
    cache: Cache;
    queries: Queries;
    links: Links;
    site: Site;
    options: OptionsModule;
    namespaces: Namespaces;
    title: TitleModule;
    htmlout: Htmlout;
    popup: Popup;
    downloader: DownloaderModule;
    events: Events;
    insta: Insta;
    api: MockApi;
}

let windowOptionKeys: string[] = [];

const fresh = async (windowOverrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw();
    // 站点运行时由站点注入全局 moment；测试用 node_modules 里的真 moment
    vi.stubGlobal("moment", moment);
    const [diffpreview, diff, cache, queries, links, site, options, namespaces, title, htmlout, popup, downloader, events, insta] = await Promise.all([
        import("../../../src/preview/diffpreview.ts"),
        import("../../../src/preview/diff.ts"),
        import("../../../src/net/cache.ts"),
        import("../../../src/api/queries.ts"),
        import("../../../src/navlinks/links.ts"),
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
    insta.setupLivePreview({
        articlePath: "/wiki",
        interwiki: "en|ja",
        imageNamespace: "File",
        categoryNamespace: "Category",
    });
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    site.setSiteInfo();
    site.setTitleBase();
    site.setRegexps();
    // mw.Api 客户端由 getMwApi 惰性单例化（loadDiff 内首次取用）；此处先建实例，
    // 测试才能在调用前对 api.get 编程响应
    site.getMwApi();
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    for (const [key, value] of Object.entries(windowOverrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { diffpreview, diff, cache, queries, links, site, options, namespaces, title, htmlout, popup, downloader, events, insta, api: installed.apiInstances[0] };
};

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

const API_BASE = (f: Fresh): string => f.site.siteState.apiwikibase;

// 精确的 diff 查询 URL（revids 取 compare 返回的两 revid）
const diffUrl = (f: Fresh, oldRev: string | number, newRev: string | number): string =>
    `${API_BASE(f)}?format=json&formatversion=2&action=query&revids=${String(oldRev)}|${String(newRev)}&prop=revisions&rvslots=main&rvprop=ids|timestamp|content`;

const OLD = "alpha beta gamma\ndelta\nepsilon\nzeta\neta\ntheta\n";
const NEW = "alpha beta GAMMA\ndelta\nepsilon-MORE\nzeta\neta\nTHETA-new\n";

const revisionJson = (revisions: { revid: number; timestamp: string; content?: string }[]): string => JSON.stringify({
    query: {
        pages: [{
            revisions: revisions.map((r) => {
                if (r.content === undefined) {
                    return { revid: r.revid, timestamp: r.timestamp };
                }
                return { revid: r.revid, timestamp: r.timestamp, slots: { main: { content: r.content } } };
            }),
        }],
    },
});

const CONTENT_JSON = revisionJson([
    { revid: 100, timestamp: "2026-01-02T03:04:05Z", content: OLD },
    { revid: 200, timestamp: "2026-01-03T04:05:06Z", content: NEW },
]);

// compare 的成功响应（fromrevid < torevid；巡查链接判定恒走 ≤ 早退分支）
const COMPARE_OK = { compare: { fromrevid: 100, torevid: 200 } };

// 期望的日期表：新版本在前、旧版本在后（legacy 产出行序）；链接 href 为
// generalLink 直接写入的属性字面量（wgScript + ?oldid=），日期为 en-GB 序
const DATE_TABLE = '<table class="popup_diff_dates">'
    + '<tr><td><a href="/index.php?oldid=200" title="新版本" onclick="undefined">新版本</a></td><td>03/01/2026, 04:05:06</td></tr>'
    + '<tr><td><a href="/index.php?oldid=100" title="旧版本" onclick="undefined">旧版本</a></td><td>02/01/2026, 03:04:05</td></tr>'
    + "</table>";

// 主场景正文（无截断）：\n → <br>、ins/del 标记与 legacy 输出逐字一致
const FULL_BODY = "alpha beta <del class='popupDiff'>gamma</del><ins class='popupDiff'>GAMMA</ins>"
    + "<br>delta<br>epsilon<ins class='popupDiff'>-MORE</ins><br>zeta<br>eta<br>"
    + "<del class='popupDiff'>theta<br></del><ins class='popupDiff'>THETA-new<br></ins>";

// 完整回调链：compare（mw.Api）→ diff 查询（XHR）→ 槽写入
interface ChainOptions {
    /** compare 响应 */
    compare?: unknown;
    /** 第二个 get（巡查 info|flagged）响应 */
    flagged?: unknown;
    /** diff 查询的 XHR 响应体 */
    payload?: string;
    id?: number;
    visible?: boolean;
    /** XHR 响应延迟（ms），用于在响应前观察 pending 记账 */
    delay?: number;
    slots?: string[];
}

const runChain = async (f: Fresh, opts: ChainOptions = {}) => {
    const id = opts.id ?? 1;
    slotDivs(id, opts.slots ?? ["popupPreview"]);
    f.api.get.mockResolvedValueOnce(opts.compare ?? COMPARE_OK);
    if (opts.flagged !== undefined) {
        f.api.get.mockResolvedValueOnce(opts.flagged);
    }
    const xhr = installXhr(() => ({ status: 200, responseText: opts.payload ?? CONTENT_JSON, ...opts.delay === undefined ? {} : { delay: opts.delay } }));
    const navpop = navpopWith(f, id, opts.visible ?? true);
    f.diffpreview.loadDiff(new f.title.Title("Foo"), "100", "123", navpop);
    await vi.waitFor(() => {
        expect(xhr.sent.length).toBe(1);
    });
    await vi.waitFor(() => {
        expect(f.api.get).toHaveBeenCalledTimes(opts.flagged !== undefined ? 2 : 1);
    });
    return { navpop, xhr, slot: (): HTMLElement | null => document.getElementById(`popupPreview${String(id)}`) };
};

// 槽内容经 innerHTML 读回后已被 DOM 归一化（<hr />→<hr>、单引号→双引号、
// table 自动补 tbody），期望串走同一归一化机制（与 links.test.ts 的
// expectedAnchor 同款思路）
const expectSlotHtml = (actual: string | undefined, expected: string): void => {
    const div = document.createElement("div");
    div.innerHTML = expected;
    expect(actual).toBe(div.innerHTML);
};

beforeAll(() => {
    vi.stubEnv("TZ", "UTC");
});
afterAll(() => {
    vi.unstubAllEnvs();
});

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    document.documentElement.removeAttribute("lang");
    Reflect.deleteProperty(window, "popupDebug");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
});

describe("loadDiff · compare 参数路由", () => {
    it("cur + null/空串/prev：只带 torelative=prev，不带 fromrev", async () => {
        for (const oldid of [null, "", "prev"]) {
            const f = await fresh();
            f.api.get.mockResolvedValue(COMPARE_OK);
            f.diffpreview.loadDiff(new f.title.Title("Foo"), oldid, "cur", navpopWith(f));
            expect(f.api.get).toHaveBeenCalledWith({ action: "compare", prop: "ids|title", fromtitle: "Foo", torelative: "prev" });
        }
    });

    it("cur + 数字 oldid：fromrev 原样透传 + torelative=cur", async () => {
        const f = await fresh();
        f.api.get.mockResolvedValue(COMPARE_OK);
        f.diffpreview.loadDiff(new f.title.Title("Foo"), "123", "cur", navpopWith(f));
        expect(f.api.get).toHaveBeenCalledWith({ action: "compare", prop: "ids|title", fromtitle: "Foo", fromrev: "123", torelative: "cur" });
    });

    it("prev + 数字 oldid / prev + cur / prev + null：torelative=prev，仅非 cur 的 oldid 进 fromrev", async () => {
        const cases: [string | null, { fromrev?: string }][] = [["123", { fromrev: "123" }], ["cur", {}], [null, {}]];
        for (const [oldid, extra] of cases) {
            const f = await fresh();
            f.api.get.mockResolvedValue(COMPARE_OK);
            f.diffpreview.loadDiff(new f.title.Title("Foo"), oldid, "prev", navpopWith(f));
            expect(f.api.get).toHaveBeenCalledWith({ action: "compare", prop: "ids|title", fromtitle: "Foo", ...extra, torelative: "prev" });
        }
    });

    it("next + null：fromrev=0（?? 兜底）+ torelative=next", async () => {
        const f = await fresh();
        f.api.get.mockResolvedValue(COMPARE_OK);
        f.diffpreview.loadDiff(new f.title.Title("Foo"), null, "next", navpopWith(f));
        expect(f.api.get).toHaveBeenCalledWith({ action: "compare", prop: "ids|title", fromtitle: "Foo", fromrev: 0, torelative: "next" });
    });

    it("next + 数字 oldid：fromrev 原样透传", async () => {
        const f = await fresh();
        f.api.get.mockResolvedValue(COMPARE_OK);
        f.diffpreview.loadDiff(new f.title.Title("Foo"), "123", "next", navpopWith(f));
        expect(f.api.get).toHaveBeenCalledWith({ action: "compare", prop: "ids|title", fromtitle: "Foo", fromrev: "123", torelative: "next" });
    });

    it("数字 diff：fromrev/torev 双参数（oldid 缺省时 fromrev=0）", async () => {
        const f = await fresh();
        f.api.get.mockResolvedValue(COMPARE_OK);
        f.diffpreview.loadDiff(new f.title.Title("Foo"), "100", "123", navpopWith(f));
        expect(f.api.get).toHaveBeenCalledWith({ action: "compare", prop: "ids|title", fromtitle: "Foo", fromrev: "100", torev: "123" });
        const g = await fresh();
        g.api.get.mockResolvedValue(COMPARE_OK);
        g.diffpreview.loadDiff(new g.title.Title("Foo"), null, "123", navpopWith(g));
        expect(g.api.get).toHaveBeenCalledWith({ action: "compare", prop: "ids|title", fromtitle: "Foo", fromrev: 0, torev: "123" });
    });

    it("fromtitle 取 article.toString()（含锚点）且 diffData 立即预置空两侧", async () => {
        const f = await fresh();
        f.api.get.mockResolvedValue(COMPARE_OK);
        const navpop = navpopWith(f);
        f.diffpreview.loadDiff(new f.title.Title("Foo#Sec"), "100", "123", navpop);
        expect(f.api.get).toHaveBeenCalledWith({ action: "compare", prop: "ids|title", fromtitle: "Foo#Sec", fromrev: "100", torev: "123" });
        // 同步阶段：await 之前 diffData 已是 {oldRev:{},newRev:{}}
        expect(navpop.diffData).toEqual({ oldRev: {}, newRev: {} });
    });
});

describe("loadDiff · diff 查询与懒下载", () => {
    it("可见弹窗：compare 返回的 revid 对进入 revids，URL 逐字装配，pending 记账 +1", async () => {
        const f = await fresh();
        // XHR 延迟响应：在响应落地前观察 pending 记账（响应后回到 0）
        const { navpop, xhr } = await runChain(f, { delay: 300 });
        expect(xhr.sent[0].url).toBe(diffUrl(f, 100, 200));
        expect(xhr.sent[0].method).toBe("GET");
        expect(navpop.pending).toBe(1);
        await vi.waitFor(() => {
            expect(navpop.pending).toBe(0);
        });
    });

    it("不可见且 popupLazyDownloads 开：不发请求，pending 保持初值 null，挂 unhide/before/DOWNLOAD_DIFFS hook", async () => {
        const f = await fresh();
        f.api.get.mockResolvedValue(COMPARE_OK);
        const xhr = installXhr(() => ({ status: 200, responseText: CONTENT_JSON }));
        const navpop = navpopWith(f, 1, false);
        f.diffpreview.loadDiff(new f.title.Title("Foo"), "100", "123", navpop);
        await vi.waitFor(() => {
            expect(f.api.get).toHaveBeenCalledTimes(1);
        });
        expect(xhr.sent.length).toBe(0);
        expect(navpop.pending).toBeNull();
        expect(navpop.hookIds["unhide|before|DOWNLOAD_DIFFS"]).toBe(true);
    });

    it("unhide 触发 hook 后才发请求（hook 返回 true 自注销）", async () => {
        const f = await fresh();
        f.api.get.mockResolvedValue(COMPARE_OK);
        const xhr = installXhr(() => ({ status: 200, responseText: CONTENT_JSON }));
        slotDivs(1, ["popupPreview"]);
        const navpop = navpopWith(f, 1, false);
        f.diffpreview.loadDiff(new f.title.Title("Foo"), "100", "123", navpop);
        await vi.waitFor(() => {
            expect(f.api.get).toHaveBeenCalledTimes(1);
        });
        navpop.unhide();
        await vi.waitFor(() => {
            expect(xhr.sent.length).toBe(1);
        });
        expect(xhr.sent[0].url).toBe(diffUrl(f, 100, 200));
        expect(navpop.hookIds["unhide|before|DOWNLOAD_DIFFS"]).toBeUndefined();
    });

    it("popupLazyDownloads 关：不可见也立即发请求", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        const { xhr } = await runChain(f, { visible: false });
        expect(xhr.sent.length).toBe(1);
    });

    it("revid 缺省：URL 内插为字面 undefined（照搬勿修：String(undefined)）", async () => {
        const f = await fresh();
        const { xhr } = await runChain(f, { compare: { compare: {} } });
        expect(xhr.sent[0].url).toBe(diffUrl(f, "undefined", "undefined"));
    });
});

describe("insertDiff · 槽 HTML", () => {
    it("完整夹具：日期表 + 正文（\\n→<br>）、diffData 双向回填、completed 记账", async () => {
        const f = await fresh();
        document.documentElement.setAttribute("lang", "en");
        const { navpop, slot } = await runChain(f);
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expectSlotHtml(slot()?.innerHTML, `<hr />${DATE_TABLE}<hr />${FULL_BODY}`);
        expect(navpop.pending).toBe(0);
        expect(navpop.diffData?.oldRev.revision?.revid).toBe(100);
        expect(navpop.diffData?.newRev.revision?.revid).toBe(200);
    });

    it("popupDiffDates 关：无日期表，仅 <hr /> 起头", async () => {
        const f = await fresh({ popupDiffDates: false });
        const { slot } = await runChain(f);
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expectSlotHtml(slot()?.innerHTML, `<hr />${FULL_BODY}`);
    });

    it("popupDiffContextCharacters 小：正文按上下文切段，段间 <hr />", async () => {
        const f = await fresh({ popupDiffDates: false, popupDiffContextCharacters: 3 });
        const { slot } = await runChain(f);
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expectSlotHtml(slot()?.innerHTML, "<hr />ta <del class='popupDiff'>gamma</del><ins class='popupDiff'>GAMMA</ins><br>de<hr />lon<ins class='popupDiff'>-MORE</ins><br>ze<hr />ta<br><del class='popupDiff'>theta<br></del><ins class='popupDiff'>THETA-new<br></ins>");
    });

    it("popupDiffContextLines=0：首尾公共行裁剪收紧（只留改动行）", async () => {
        const f = await fresh({ popupDiffDates: false, popupDiffContextLines: 0 });
        const { slot } = await runChain(f, { payload: revisionJson([
            { revid: 100, timestamp: "2026-01-02T03:04:05Z", content: "same1\nsame2\nOLD-A\nsame3\nsame4" },
            { revid: 200, timestamp: "2026-01-03T04:05:06Z", content: "same1\nsame2\nNEW-A\nsame3\nsame4" },
        ]) });
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expectSlotHtml(slot()?.innerHTML, "<hr />same2<br><del class='popupDiff'>OLD</del><ins class='popupDiff'>NEW</ins>-A");
    });

    it("popupDiffMaxLines 超限：截断标记「出于性能考虑，差异已被截断」", async () => {
        const f = await fresh({ popupDiffDates: false, popupDiffMaxLines: 2 });
        const long = (mark: string): string => Array.from({ length: 12 }, (_, i) => {
            if (i % 4 === 0 && mark === "new") {
                return `new-line-${String(i)}`;
            }
            return `old-line-${String(i)}`;
        }).join("\n");
        const { slot } = await runChain(f, { payload: revisionJson([
            { revid: 100, timestamp: "2026-01-02T03:04:05Z", content: long("old") },
            { revid: 200, timestamp: "2026-01-03T04:05:06Z", content: long("new") },
        ]) });
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expectSlotHtml(slot()?.innerHTML, "<hr /><del class='popupDiff'>old</del><ins class='popupDiff'>new</ins>-line-0<br>old-line-1<hr /><b>出于性能考虑，差异已被截断</b>");
    });

    it("两侧内容相同：仅公共行正文，无 ins/del", async () => {
        const f = await fresh({ popupDiffDates: false });
        const { slot } = await runChain(f, { payload: revisionJson([
            { revid: 100, timestamp: "2026-01-02T03:04:05Z", content: "same\nsame\n" },
            { revid: 200, timestamp: "2026-01-03T04:05:06Z", content: "same\nsame\n" },
        ]) });
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expectSlotHtml(slot()?.innerHTML, "<hr />same<br>same");
    });

    it("内容一侧为空串：空侧仍输出空标签对（照搬勿修）", async () => {
        const f = await fresh({ popupDiffDates: false });
        const { slot } = await runChain(f, { payload: revisionJson([
            { revid: 100, timestamp: "2026-01-02T03:04:05Z", content: "" },
            { revid: 200, timestamp: "2026-01-03T04:05:06Z", content: "abc" },
        ]) });
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expectSlotHtml(slot()?.innerHTML, "<hr /><del class='popupDiff'></del><ins class='popupDiff'>abc</ins>");
    });

    it("两修订均无 slots.content：不写槽（insertDiff 早退），completed 仍记账", async () => {
        const f = await fresh();
        const { navpop, slot } = await runChain(f, { payload: revisionJson([
            { revid: 100, timestamp: "2026-01-02T03:04:05Z" },
            { revid: 200, timestamp: "2026-01-03T04:05:06Z" },
        ]) });
        await vi.waitFor(() => {
            expect(navpop.pending).toBe(0);
        });
        expect(slot()?.innerHTML).toBe("");
        expect(navpop.diffData?.oldRev.revision?.revid).toBe(100);
    });

    it("revid 不匹配 compare 结果：两侧 revision 不回填、不写槽（completed 照记）", async () => {
        const f = await fresh();
        const { navpop, slot } = await runChain(f, { payload: revisionJson([
            { revid: 999, timestamp: "2026-01-02T03:04:05Z", content: OLD },
        ]) });
        await vi.waitFor(() => {
            expect(navpop.pending).toBe(0);
        });
        expect(slot()?.innerHTML).toBe("");
        expect(navpop.diffData?.oldRev.revision).toBeUndefined();
    });

    it("页无 revisions 键：空数组，不写槽", async () => {
        const f = await fresh();
        const { navpop, slot } = await runChain(f, { payload: JSON.stringify({ query: { pages: [{}] } }) });
        await vi.waitFor(() => {
            expect(navpop.pending).toBe(0);
        });
        expect(slot()?.innerHTML).toBe("");
    });

    it("非 JSON payload：getJsObj 返回哨兵 1 → 不写槽、不抛错（照搬勿修）", async () => {
        const f = await fresh();
        const { navpop, slot } = await runChain(f, { payload: "not json" });
        await vi.waitFor(() => {
            expect(navpop.pending).toBe(0);
        });
        expect(slot()?.innerHTML).toBe("");
    });

    it("pages 为非数组对象：for...of 抛错被吞 + errlog，仍未写槽（照搬勿修）", async () => {
        const f = await fresh({ popupDebugging: false });
        window.popupDebug = true;
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const { navpop, slot } = await runChain(f, { payload: JSON.stringify({ query: { pages: { 1: { revisions: [{ revid: 100, slots: { main: { content: OLD } } }] } } } }) });
        await vi.waitFor(() => {
            expect(navpop.pending).toBe(0);
        });
        expect(errorSpy).toHaveBeenCalledWith("Could not get diff");
        expect(slot()?.innerHTML).toBe("");
    });

    it("多页 revisions 合并后按 revid 归位（concat 遍历）", async () => {
        const f = await fresh({ popupDiffDates: false });
        const payload = JSON.stringify({
            query: {
                pages: [
                    { revisions: [{ revid: 100, timestamp: "2026-01-02T03:04:05Z", slots: { main: { content: OLD } } }] },
                    { revisions: [{ revid: 200, timestamp: "2026-01-03T04:05:06Z", slots: { main: { content: NEW } } }] },
                ],
            },
        });
        const { slot } = await runChain(f, { payload });
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expectSlotHtml(slot()?.innerHTML, `<hr />${FULL_BODY}`);
    });
});

describe("addReviewLink · 巡查链接", () => {
    // 默认 popupDiffDates 开会走日期表 → formattedDateTime → getLocales，
    // 后者在 html[lang] 缺失时抛 RangeError（queries 域已锁定的 legacy 行为），
    // 该异常会被 downloader 回调的 catch 吞掉导致不写槽——故显式设 lang
    beforeEach(() => {
        document.documentElement.setAttribute("lang", "en");
    });

    it("无巡查权：不发第二个请求、不写槽", async () => {
        const f = await fresh();
        const { slot } = await runChain(f, { slots: ["popupPreview", "popupMiscTools"] });
        expect(f.api.get).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
        expect(document.getElementById("popupMiscTools1")?.innerHTML).toBe("");
    });

    it("有巡查权 + 新版本不新于旧版本：Number 比较早退（不发第二个请求）", async () => {
        const f = await fresh();
        f.site.userState.canReview = true;
        // compare 返回的 revid 对与夹具 revisions（100/200）不匹配：正文不渲染，
        // 但巡查判定在 compare 回调内先执行——正好钉住「早退不发第二个请求」
        const { navpop, slot } = await runChain(f, { compare: { compare: { fromrevid: 300, torevid: 200 } }, slots: ["popupPreview", "popupMiscTools"] });
        expect(f.api.get).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(navpop.pending).toBe(0);
        });
        expect(document.getElementById("popupMiscTools1")?.innerHTML).toBe("");
        expect(slot()?.innerHTML).toBe("");
    });

    it("revid 缺省：Number(undefined)=NaN 比较恒假，继续查询（照搬勿修）", async () => {
        const f = await fresh();
        f.site.userState.canReview = true;
        await runChain(f, { compare: { compare: {} }, flagged: { query: { pages: [{}] } }, slots: ["popupPreview", "popupMiscTools"] });
        expect(f.api.get).toHaveBeenCalledTimes(2);
        expect(f.api.get).toHaveBeenLastCalledWith({ action: "query", prop: "info|flagged", revids: undefined, formatversion: 2 });
    });

    it("稳定版与旧版本一致：popupMiscTools 槽 append 写入巡查链，点击后 postWithToken 并隐藏（csrf）", async () => {
        const f = await fresh();
        f.site.userState.canReview = true;
        const { slot } = await runChain(f, { flagged: { query: { pages: [{ flagged: { stable_revid: 100 } }] } }, slots: ["popupPreview", "popupMiscTools"] });
        await vi.waitFor(() => {
            expect(document.getElementById("popupMiscTools1")?.innerHTML).not.toBe("");
        });
        const slotEl = document.getElementById("popupMiscTools1");
        expect(slotEl?.innerHTML).toBe('<a title="标记该编辑为已巡查">标记为已巡查</a>');
        const anchor = slotEl?.firstChild as HTMLAnchorElement;
        expect(f.api.get).toHaveBeenLastCalledWith({ action: "query", prop: "info|flagged", revids: 100, formatversion: 2 });
        f.api.postWithToken.mockResolvedValue(undefined);
        anchor.click();
        await vi.waitFor(() => {
            expect(f.api.postWithToken).toHaveBeenCalledTimes(1);
        });
        expect(f.api.postWithToken).toHaveBeenCalledWith("csrf", { action: "review", revid: 200, comment: "标记从版本100到200间的编辑为已巡查" });
        await vi.waitFor(() => {
            expect(anchor.style.display).toBe("none");
        });
        await vi.waitFor(() => {
            expect(slot()?.innerHTML).not.toBe("");
        });
    });

    it("append 语义：popupMiscTools 槽既有内容保留", async () => {
        const f = await fresh();
        f.site.userState.canReview = true;
        slotDivs(1, ["popupPreview", "popupMiscTools"]);
        assume(document.getElementById("popupMiscTools1")).innerHTML = "PRE";
        f.api.get.mockResolvedValueOnce(COMPARE_OK);
        f.api.get.mockResolvedValueOnce({ query: { pages: [{ flagged: { stable_revid: 100 } }] } });
        installXhr(() => ({ status: 200, responseText: CONTENT_JSON }));
        f.diffpreview.loadDiff(new f.title.Title("Foo"), "100", "123", navpopWith(f));
        await vi.waitFor(() => {
            expect(document.getElementById("popupMiscTools1")?.innerHTML).toContain("标记为已巡查");
        });
        expect(document.getElementById("popupMiscTools1")?.innerHTML).toBe('PRE<a title="标记该编辑为已巡查">标记为已巡查</a>');
    });

    it("postWithToken 失败：alert 提示（萌百译文）", async () => {
        const f = await fresh();
        f.site.userState.canReview = true;
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        await runChain(f, { flagged: { query: { pages: [{ flagged: { stable_revid: 100 } }] } }, slots: ["popupPreview", "popupMiscTools"] });
        const anchor = document.getElementById("popupMiscTools1")?.firstChild as HTMLAnchorElement;
        f.api.postWithToken.mockRejectedValue(new Error("boom"));
        anchor.click();
        await vi.waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith("无法标记该编辑为已巡查");
        });
        expect(anchor.style.display).not.toBe("none");
    });

    it("稳定版不匹配（缺 flagged 时按 0 兜底）：不写槽", async () => {
        const f = await fresh();
        f.site.userState.canReview = true;
        await runChain(f, { flagged: { query: { pages: [{}] } }, slots: ["popupPreview", "popupMiscTools"] });
        expect(document.getElementById("popupMiscTools1")?.innerHTML).toBe("");
    });

    it("稳定版等于 0 且旧版本为 0：写槽（照搬勿修：?? 0 与 revid 0 相等）", async () => {
        const f = await fresh();
        f.site.userState.canReview = true;
        const { navpop, slot } = await runChain(f, { compare: { compare: { fromrevid: 0, torevid: 5 } }, flagged: { query: { pages: [{}] } }, slots: ["popupPreview", "popupMiscTools"] });
        await vi.waitFor(() => {
            expect(document.getElementById("popupMiscTools1")?.innerHTML).not.toBe("");
        });
        expect(document.getElementById("popupMiscTools1")?.innerHTML).toBe('<a title="标记该编辑为已巡查">标记为已巡查</a>');
        expect(navpop.pending).toBe(0);
        // 夹具 revisions 与 revids=0|5 不匹配：正文不渲染（巡查链接已写入）
        expect(slot()?.innerHTML).toBe("");
    });
});

describe("titledDiffLink · diff 链接装配", () => {
    it("actionName=diff：to&oldid=from 拼进 diff 参数位", async () => {
        const f = await fresh();
        const html = f.diffpreview.titledDiffLink({ article: new f.title.Title("Foo"), to: "cur", from: "prev", text: "cur", title: "显示更改" });
        expect(html).toBe(`<a href="${f.title.wiki.titlebase}Foo&amp;diff=cur&amp;oldid=prev" title="显示更改" onclick="undefined">cur</a>`);
    });

    it("数字 from 与 newWin/noPopup 透传（属性名序列化小写）", async () => {
        const f = await fresh();
        const html = f.diffpreview.titledDiffLink({ article: new f.title.Title("Foo"), to: "123", from: 100, text: "差异", title: "t", newWin: true, noPopup: true });
        expect(html).toBe(`<a href="${f.title.wiki.titlebase}Foo&amp;diff=123&amp;oldid=100" title="t" onclick="undefined" nopopup="1" target="_blank">差异</a>`);
    });

    it("to/from 缺省：String(undefined) 字面量进参数（照搬勿修）", async () => {
        const f = await fresh();
        const html = f.diffpreview.titledDiffLink({ article: new f.title.Title("Foo"), text: "x", title: null });
        expect(html).toBe(`<a href="${f.title.wiki.titlebase}Foo&amp;diff=undefined&amp;oldid=undefined" title="null" onclick="undefined">x</a>`);
    });

    it("article 带锚点：urlString 保留锚点段（锚点后直接接 diff 参数）", async () => {
        const f = await fresh();
        const html = f.diffpreview.titledDiffLink({ article: new f.title.Title("Foo#Sec"), to: "cur", from: null, text: "l", title: "t" });
        expect(html).toContain(`href="${f.title.wiki.titlebase}Foo`);
        expect(html).toContain("#Sec&amp;diff=cur&amp;oldid=null");
    });
});

describe("diffpreview · 内部辅助直调", () => {
    it("stripOuterCommonLines：公共首尾行剔除并按 context 外扩，切片上界 +1 的怪癖照搬", async () => {
        const f = await fresh();
        expect(f.diffpreview.stripOuterCommonLines(["s1", "s2", "X", "s3"], ["s1", "s2", "Y", "s3"], 0)).toEqual({ a: ["s2", "X"], b: ["s2", "Y"] });
    });

    it("stripOuterCommonLines：完全相同时 i 到尾部、j/k 反向到底，切片封顶为原数组", async () => {
        const f = await fresh();
        expect(f.diffpreview.stripOuterCommonLines(["a", "b"], ["a", "b"], 2)).toEqual({ a: ["a", "b"], b: ["a", "b"] });
    });

    it("rmBoringLines：未配对单元原样保留（不降级文本）", async () => {
        const f = await fresh();
        const o = ["keep", { text: "del", row: -1, paired: false }];
        const n = ["keep2", { text: "ins", row: -1, paired: false }];
        expect(f.diffpreview.rmBoringLines(o, n)).toEqual({ a: ["keep", { text: "del", row: -1, paired: false }], b: ["keep2", { text: "ins", row: -1, paired: false }] });
    });

    it("rmBoringLines：context 缺省 2，配对行输出文本、未配对行输出原单元", async () => {
        const f = await fresh();
        const a = [{ text: "same", row: 0, paired: true }, "old", "tail"];
        const b = [{ text: "same", row: 0, paired: true }, "new", "tail"];
        expect(f.diffpreview.rmBoringLines(a, b)).toEqual({ a: ["same", "old", "tail"], b: ["same", "new", "tail"] });
    });

    it("rmBoringLines：交叉配对块按行号标 0.5 保留上下文（前导配对块可被裁掉）", async () => {
        const f = await fresh();
        const a = [{ text: "A1", row: 0, paired: true }, "X", { text: "B1", row: 1, paired: true }, "Y"];
        const b = [{ text: "B1", row: 2, paired: true }, "Y", { text: "A1", row: 1, paired: true }, "X"];
        const out = f.diffpreview.rmBoringLines(a, b, 1);
        // 照搬勿修：a[0]（A1，行号 0）未被标 0.5，其 0.5 标在 b 侧回填处
        expect(out.a).toEqual(["X", "B1", "Y"]);
        expect(out.b).toEqual(["B1", "Y", "A1", "X"]);
    });

    it("diffDatesTable：两侧修订齐全时按新→旧两行，缺一侧只有空表", async () => {
        const f = await fresh();
        document.documentElement.setAttribute("lang", "en");
        slotDivs(1, []);
        const navpop = navpopWith(f);
        expect(f.diffpreview.diffDatesTable(navpop)).toBe('<table class="popup_diff_dates"></table>');
        navpop.diffData = {
            oldRev: { revid: 100, revision: { revid: 100, timestamp: "2026-01-02T03:04:05Z" } },
            newRev: { revid: 200, revision: { revid: 200, timestamp: "2026-01-03T04:05:06Z" } },
        };
        expect(f.diffpreview.diffDatesTable(navpop)).toBe(DATE_TABLE);
    });

    it("diffDatesTableRow：链接取 wgScript + oldid，timestamp 缺省按空串解析（Invalid Date 由格式化链输出）", async () => {
        const f = await fresh();
        document.documentElement.setAttribute("lang", "en");
        const row = f.diffpreview.diffDatesTableRow({ revid: 7 }, "L");
        expect(row).toBe('<tr><td><a href="/index.php?oldid=7" title="L" onclick="undefined">L</a></td><td>Invalid Date</td></tr>');
    });

    it("doneDiff：owner 缺省时不记账不渲染（download 无属主）", async () => {
        const f = await fresh();
        const d = new f.downloader.Downloader("https://example/api");
        expect(() => {
            f.diffpreview.doneDiff(d);
        }).not.toThrow();
    });

    it("doneDiff：data 缺省按空串解析（getJsObj 记解析失败并返哨兵 1），completed 仍记账", async () => {
        const f = await fresh();
        window.popupDebug = true;
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        // 缓存命中且缓存条目无 data 时 download.data 为 undefined（cache 域可达）
        const d = new f.downloader.Downloader("https://example/api");
        const navpop = navpopWith(f);
        navpop.diffData = { oldRev: { revid: 1 }, newRev: { revid: 2 } };
        navpop.pending = 1;
        d.owner = navpop;
        f.diffpreview.doneDiff(d);
        expect(errorSpy).toHaveBeenCalledWith("Something went wrong with getJsObj, json=");
        expect(navpop.pending).toBe(0);
    });

    it("addReviewLink 直调：有巡查权但弹窗无 diffData 时早退", async () => {
        const f = await fresh();
        f.site.userState.canReview = true;
        const navpop = navpopWith(f);
        await f.diffpreview.addReviewLink(navpop, "popupMiscTools");
        expect(f.api.get).not.toHaveBeenCalled();
    });

    it("rmBoringLines：交叉块起始于弹窗窗口内时按上下文标记邻行（b 侧 0.5 回填）", async () => {
        const f = await fresh();
        const a = [{ text: "A", row: 0, paired: true }, { text: "B", row: 2, paired: true }, "pa", "pb"];
        const b = [{ text: "X", row: 3, paired: true }, "p1", "p2", "p3"];
        expect(f.diffpreview.rmBoringLines(a, b, 1)).toEqual({ a: ["A", "B", "pa", "pb"], b: ["X", "p1", "p2", "p3"] });
    });

    it("rmBoringLines：bb 稀疏（洞）时按「洞视作负数」跳过（?? 0 兜底路径）", async () => {
        const f = await fresh();
        const a = [{ text: "A", row: 0, paired: true }, { text: "B", row: 2, paired: true }];
        const b = [{ text: "X", row: 3, paired: true }, { text: "Y", row: 1, paired: true }, "u1", "u2"];
        expect(f.diffpreview.rmBoringLines(a, b, 1)).toEqual({ a: ["B"], b: ["Y", "u1", "u2"] });
    });
});

describe("installed fixtures sanity", () => {
    it("apiwikibase 以 jsdom location 推导", async () => {
        const f = await fresh();
        expect(API_BASE(f)).toBe("http://localhost:3000/api.php");
    });
});
