// 预览管线镜像测试：任务计数三件套（pending/completed/debugData）、
// startArticlePreview/loadPreview（revision 分派参数）、insertPreview（无
// owner 早退、重定向分支门、惰性 PREVIEW_HOOK/PREVIEW_REDIR_HOOK 挂载与
// unhide 触发）、loadPreviewFromRedir（跟随全链：redir 递增/redirTarget/
// 锚点透传/popupWarnRedir 槽写入/redir 态 fillEmptySpans/换目标再
// loadPreview）、insertPreviewNow（popupSummaryData 开关、nsImageId 直取 vs
// wikitext 提图、popupPreviews 开关）、insertArticlePreview（Template 原文
// monospace 分支 vs prepPreviewmaker 分支）、prepPreviewmaker/anchorize。
// 行为基准 = legacy src/modules/actions.ts 336-460 段（commit 02c8dec）；
// loadAPIPreview 以 vi.mock 打桩（queries 域另行实现），期望值按萌百
// popupStrings 译文与 legacy init.ts setRegexps 公式手工推导。
//
// redirLink 的产出直接经 links 域装配（pipeline 只负责取返回值写槽），
// 其自身分支由 navlinks/links.test.ts 覆盖，此处只钉「确实经 redirLink
// 落槽」的两种形态（append 开：hr+重定向至；关：绕过重定向链接）。
import { afterEach, describe, expect, it, vi } from "vitest";
import moment from "moment";
import { installMw } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import { buildTitleWikiFixtures } from "../../helpers/wikiFixtures.ts";
import { assume } from "../../../src/core/tools.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as ImagesNs from "../../../src/preview/images.ts";
import type * as InstaNs from "../../../src/preview/insta.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as NetNs from "../../../src/net/downloader.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as PipelineNs from "../../../src/preview/pipeline.ts";
import type * as PreviewmakerNs from "../../../src/preview/previewmaker.ts";
import type * as SiteinfoNs from "../../../src/api/siteinfo.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type Htmlout = typeof HtmloutNs;
type Images = typeof ImagesNs;
type Insta = typeof InstaNs;
type Namespaces = typeof NamespacesNs;
type Net = typeof NetNs;
type OptionsModule = typeof OptionsNs;
type Popup = typeof PopupNs;
type Pipeline = typeof PipelineNs;
type PreviewmakerModule = typeof PreviewmakerNs;
type Siteinfo = typeof SiteinfoNs;
type TitleModule = typeof TitleNs;

interface Fresh {
    pipeline: Pipeline;
    images: Images;
    htmlout: Htmlout;
    insta: Insta;
    namespaces: Namespaces;
    net: Net;
    options: OptionsModule;
    popup: Popup;
    previewmaker: PreviewmakerModule;
    siteinfo: Siteinfo;
    title: TitleModule;
}

// queries 域占位打桩：分派断言只看调用参数，不走真实查询
const loadAPIPreviewMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/api/queries.ts", () => ({ loadAPIPreview: loadAPIPreviewMock }));

// legacy options.ts 的选项默认值（本域消费的正则源）
const DAB_REGEXP_SOURCE = "disambiguation\\}\\}|\\{\\{\\s*(d(ab|isamb(ig(uation)?)?)|(((geo|hn|road?|school|number)dis)|[234][lc][acw]|(road|ship)index))\\s*(\\|[^}]*)?\\}\\}|is a .*disambiguation.*page";
const STUB_REGEXP_SOURCE = "(sect)?stub[}][}]|This .*-related article is a .*stub";
const IMAGE_VARS_REGEXP = "image|image_(?:file|skyline|name|flag|seal)|cover|badge|logo";

const ARTICLEBASE = "https://zh.moegirl.org.cn/wiki";
const APIBASE = "https://zh.moegirl.org.cn/api.php";

// getPageInfo("plain text") 的默认过滤器拼装期望（10 字节 + 0 链/图/分类；
// 其余过滤器为空）——popupData 槽写入值与此逐字相同
const PLAIN_TRAILER = "10&nbsp;字节，0&nbsp;个内部链接，0&nbsp;个文件，0&nbsp;个分类";

let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    loadAPIPreviewMock.mockReset();
    const installed = installMw({ config: { wgArticlePath: "/wiki/$1" } });
    // 站点运行时由站点注入全局 moment；测试用 node_modules 里的真 moment
    vi.stubGlobal("moment", moment);
    const [pipeline, images, htmlout, insta, namespaces, net, options, popup, previewmaker, siteinfo, title] = await Promise.all([
        import("../../../src/preview/pipeline.ts"),
        import("../../../src/preview/images.ts"),
        import("../../../src/core/htmlout.ts"),
        import("../../../src/preview/insta.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/net/downloader.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/popup.ts"),
        import("../../../src/preview/previewmaker.ts"),
        import("../../../src/api/siteinfo.ts"),
        import("../../../src/title/title.ts"),
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
    // getPageInfo 消费的四个站点派生正则按 legacy init.ts setRegexps 公式装配
    const im = namespaces.nsRe(namespaces.nsState.imageId);
    title.wiki.re.image = RegExp(
        `(^|\\[\\[)${im}: *([^|\\]]*[^|\\] ])([^0-9\\]]*([0-9]+) *px)?|(?:\\n *[|]?|[|]) *(${IMAGE_VARS_REGEXP}) *= *(?:\\[\\[ *)?(?:${im}:)?([^|]*?)(?:\\]\\])? *[|]? *\\n`,
        "img",
    );
    title.wiki.re.imageBracketCount = 6;
    title.wiki.re.category = RegExp(`\\[\\[${namespaces.nsRe(namespaces.nsState.categoryId)}: *([^|\\]]*[^|\\] ]) *`, "i");
    title.wiki.re.categoryBracketCount = 1;
    title.wiki.re.disambig = RegExp(DAB_REGEXP_SOURCE, "im");
    title.wiki.re.stub = RegExp(STUB_REGEXP_SOURCE, "im");
    siteinfo.siteState.articlebase = ARTICLEBASE;
    siteinfo.siteState.apiwikibase = APIBASE;
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { pipeline, images, htmlout, insta, namespaces, net, options, popup, previewmaker, siteinfo, title };
};

// 槽位骨架：#<name><id>（popupData/popupPreview/popupError 等 DOM/CSS 契约 id）
const slotDivs = (id: number, names: string[]): void => {
    for (const n of names) {
        const div = document.createElement("div");
        div.id = `${n}${String(id)}`;
        document.body.appendChild(div);
    }
};

// 注：ownerWith 在 articleName 非 null 时于运行时必装配 article（真 Title），
// 但类型层 article 是 Title | null | undefined，而 originalArticle?: Title 在
// exactOptionalPropertyTypes 下拒绝 undefined——各处 originalArticle = article
// 的镜像赋值（复刻 pipeline.loadPreview）用 assume 收窄类型，运行时恒等。
const ownerWith = (f: Fresh, articleName: string | null, idNumber = 1, visible = false): PopupNs.Navpopup => {
    const navpop = new f.popup.Navpopup();
    navpop.idNumber = idNumber;
    navpop.visible = visible;
    if (articleName !== null) {
        navpop.article = new f.title.Title(articleName);
    }
    return navpop;
};

const downloadWith = (f: Fresh, data: string, owner: PopupNs.Navpopup | null): NetNs.Downloader => {
    const d = new f.net.Downloader("https://zh.moegirl.org.cn/index.php?title=X&action=raw");
    d.data = data;
    d.owner = owner;
    return d;
};

// data 未回填的下载（请求未完成/缓存条目无数据）：钉 `download.data ?? ""`
// 两处兜底侧（insertPreview 的重定向判定与 insertPreviewNow 的 wikiText）
const downloadWithoutData = (f: Fresh, owner: PopupNs.Navpopup): NetNs.Downloader => {
    const d = new f.net.Downloader("https://zh.moegirl.org.cn/index.php?title=X&action=raw");
    d.owner = owner;
    return d;
};

const imgJson = (title: string): string => `{"query":{"pages":{"10":{"imageinfo":[{"thumburl":"https://img/${title}","url":"https://img/full","mime":"image/png","descriptionurl":"https://d"}]}}}}`;

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
});

describe("任务计数三件套", () => {
    it("pendingNavpopTask：pending null→0 后递增（照搬勿修：=== null 判定）", async () => {
        const f = await fresh();
        const navpop = new f.popup.Navpopup();
        expect(navpop.pending).toBeNull();
        f.pipeline.pendingNavpopTask(navpop);
        expect(navpop.pending).toBe(1);
        f.pipeline.pendingNavpopTask(navpop);
        expect(navpop.pending).toBe(2);
    });

    it("popupDebugging 开启时 debugData 写 popupError 槽", async () => {
        const f = await fresh({ popupDebugging: true });
        slotDivs(4, ["popupError"]);
        const navpop = ownerWith(f, "Foo", 4);
        f.pipeline.pendingNavpopTask(navpop);
        expect(document.getElementById("popupError4")?.innerHTML).toBe("idNumber=4, pending=1");
    });

    it("completedNavpopTask 在 0 时不减、非 0 时递减", async () => {
        const f = await fresh();
        const navpop = new f.popup.Navpopup();
        navpop.pending = 0;
        f.pipeline.completedNavpopTask(navpop);
        expect(navpop.pending).toBe(0);
        navpop.pending = 2;
        f.pipeline.completedNavpopTask(navpop);
        expect(navpop.pending).toBe(1);
    });
});

describe("startArticlePreview / loadPreview", () => {
    it("redir 归零并按 revision 分派（oldid 透传到 article）", async () => {
        const f = await fresh();
        const navpop = ownerWith(f, "Foo");
        navpop.redir = 5;
        const article = new f.title.Title("Foo");
        f.pipeline.startArticlePreview(article, "123", navpop);
        expect(navpop.redir).toBe(0);
        expect(loadAPIPreviewMock).toHaveBeenCalledOnce();
        expect(loadAPIPreviewMock).toHaveBeenCalledWith("revision", article, navpop);
        expect(article.oldid).toBe("123");
    });

    it("redir=0 时记录 originalArticle（同实例）且 oldid 可为 null", async () => {
        const f = await fresh();
        const navpop = ownerWith(f, "Foo");
        const article = new f.title.Title("Foo");
        f.pipeline.startArticlePreview(article, null, navpop);
        expect(navpop.originalArticle).toBe(article);
        expect(article.oldid).toBeNull();
    });
});

describe("insertPreview", () => {
    it("无 owner 早退：不挂 hook、不分派", async () => {
        const f = await fresh();
        slotDivs(1, ["popupData"]);
        f.pipeline.insertPreview(downloadWith(f, "#REDIRECT [[T]]", null));
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
    });

    it("data 缺省：重定向判定按空串进行（不命中、不跟随），不可见照常挂惰性 hook", async () => {
        const f = await fresh();
        slotDivs(1, ["popupData"]);
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWithoutData(f, navpop));
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(navpop.hookIds["unhide|after|PREVIEW_HOOK"]).toBe(true);
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
    });

    it("redir=0 且数据非重定向：不进跟随分支，不可见走 PREVIEW_HOOK 惰性挂载", async () => {
        const f = await fresh();
        slotDivs(1, ["popupData"]);
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        f.pipeline.insertPreview(downloadWith(f, "plain text", navpop));
        expect(navpop.hookIds["unhide|after|PREVIEW_HOOK"]).toBe(true);
        expect(navpop.hooks.unhide).toHaveLength(1);
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
    });

    it("redir 非 0 时重定向数据不再跟随：挂 PREVIEW_REDIR_HOOK", async () => {
        const f = await fresh();
        const navpop = ownerWith(f, "Foo");
        navpop.redir = 1;
        navpop.originalArticle = new f.title.Title("Foo");
        f.pipeline.insertPreview(downloadWith(f, "#REDIRECT [[Target]]", navpop));
        expect(navpop.hookIds["unhide|after|PREVIEW_REDIR_HOOK"]).toBe(true);
        expect(navpop.hookIds["unhide|after|PREVIEW_HOOK"]).toBeUndefined();
    });

    it("可见弹窗立即执行 insertPreviewNow：popupData 槽写入统计串", async () => {
        const f = await fresh();
        slotDivs(1, ["popupData"]);
        const navpop = ownerWith(f, "Foo", 1, true);
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, "plain text", navpop));
        expect(document.getElementById("popupData1")?.innerHTML).toBe(PLAIN_TRAILER);
    });

    it("popupLazyPreviews=false 时不可见也立即执行", async () => {
        const f = await fresh({ popupLazyPreviews: false });
        slotDivs(1, ["popupData"]);
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, "plain text", navpop));
        expect(document.getElementById("popupData1")?.innerHTML).toBe(PLAIN_TRAILER);
    });

    it("unhide 触发挂载的 hook 后补执行 insertPreviewNow", async () => {
        const f = await fresh();
        slotDivs(1, ["popupData"]);
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, "plain text", navpop));
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
        navpop.unhide();
        expect(document.getElementById("popupData1")?.innerHTML).toBe(PLAIN_TRAILER);
        // hook 返回 true：执行后自注销
        expect(assume(navpop.hooks.unhide).filter((e) => e !== null)).toHaveLength(0);
    });
});

describe("loadPreviewFromRedir", () => {
    it("redir=0 命中重定向：锚点透传、写 popupWarnRedir 槽、redirTarget 换目标再按 revision 分派", async () => {
        const f = await fresh();
        // 槽填充器注册：与 pipeline 同代模块注册表（fresh 的 resetModules 之后
        // 动态 import 取到同一实例）；下一用例 fresh 后注册表随模块重载清空
        const structures = await import("../../../src/core/structures.ts");
        structures.registerSlotFiller("original.popupTitle", (x) => x.article.toString());
        slotDivs(1, ["popupWarnRedir", "popupTitle", "popupRedirTitle"]);
        const navpop = ownerWith(f, "Foo#Section");
        const original = assume(navpop.article);
        f.pipeline.startArticlePreview(original, "123", navpop);
        f.pipeline.insertPreview(downloadWith(f, "#REDIRECT [[Target]]", navpop));
        // 第二次分派 = 跟随后的 loadPreview(target, null)
        expect(loadAPIPreviewMock).toHaveBeenCalledTimes(2);
        expect(loadAPIPreviewMock).toHaveBeenNthCalledWith(1, "revision", original, navpop);
        const target = assume(navpop.redirTarget);
        expect(loadAPIPreviewMock).toHaveBeenNthCalledWith(2, "revision", target, navpop);
        expect(navpop.redir).toBe(1);
        expect(navpop.article).toBe(target);
        expect(target.value).toBe("Target");
        // 目标 wikitext 自带的锚被原锚点覆盖（legacy 先构造后叠加）
        expect(target.anchor).toBe("Section");
        expect(target.oldid).toBeNull();
        // redir 已非 0：originalArticle 不被跟随后的 loadPreview 覆写
        expect(navpop.originalArticle).toBe(original);
        // 跟随分支先于惰性门返回：不挂 PREVIEW_HOOK
        expect(navpop.hookIds["unhide|after|PREVIEW_HOOK"]).toBeUndefined();
        // popupAppendRedirNavLinks/popupNavLinks 默认开、popupFixRedirs 默认关：
        // redirLink 走 hr + 重定向至（innerHTML 往返：<hr /> 去斜杠）
        expect(document.getElementById("popupWarnRedir1")?.innerHTML).toBe("<hr>重定向至");
        // fillEmptySpans({redir: true, redirTarget: target})：重定向名单内的槽
        // 按 target 填充（article 非锚点来源），名单外的同名普通槽互斥跳过
        expect(document.getElementById("popupRedirTitle1")?.innerHTML).toBe("Target#Section");
        expect(document.getElementById("popupTitle1")?.innerHTML).toBe("");
    });

    it("无宿主条目：warnRedir 取空串仍写槽（清空既有内容），目标照常跟随", async () => {
        const f = await fresh();
        slotDivs(1, ["popupWarnRedir"]);
        assume(document.getElementById("popupWarnRedir1")).innerHTML = "stale";
        const navpop = ownerWith(f, null);
        f.pipeline.insertPreview(downloadWith(f, "#REDIRECT [[Target]]", navpop));
        expect(document.getElementById("popupWarnRedir1")?.innerHTML).toBe("");
        const target = assume(navpop.redirTarget);
        expect(target.anchor).toBe("");
        expect(navpop.article).toBe(target);
        expect(navpop.redir).toBe(1);
        expect(loadAPIPreviewMock).toHaveBeenCalledOnce();
        expect(loadAPIPreviewMock).toHaveBeenCalledWith("revision", target, navpop);
    });

    it("popupAppendRedirNavLinks 关：popupWarnRedir 写入 redirLink 的绕过重定向链接", async () => {
        const f = await fresh({ popupAppendRedirNavLinks: false });
        slotDivs(1, ["popupWarnRedir"]);
        const navpop = ownerWith(f, "Foo");
        f.pipeline.insertPreview(downloadWith(f, "#REDIRECT [[Target]]", navpop));
        const html = document.getElementById("popupWarnRedir1")?.innerHTML ?? "";
        expect(html).toContain("<br> 重定向至");
        expect(html).toContain('href="https://zh.moegirl.org.cn/index.php?title=Target"');
        expect(html).toContain('title="忽略重定向"');
        // 无锚原条目：目标不叠加锚
        expect(assume(navpop.redirTarget).anchor).toBe("");
    });
});

describe("insertPreviewNow", () => {
    it("popupSummaryData 关：不写 popupData 槽", async () => {
        const f = await fresh({ popupSummaryData: false });
        slotDivs(1, ["popupData"]);
        const navpop = ownerWith(f, "Foo", 1, true);
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, "plain text", navpop));
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
    });

    it("data 缺省：wikiText 取空串，统计槽写「空页面」，预览渲染分支跳过", async () => {
        const f = await fresh();
        slotDivs(1, ["popupData", "popupPreview", "popupPrePreviewSep"]);
        const navpop = ownerWith(f, "Foo", 1, true);
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWithoutData(f, navpop));
        expect(document.getElementById("popupData1")?.innerHTML).toBe("空页面");
        // insertArticlePreview 的 typeof download.data === "string" 为假：不建
        // Previewmaker、不写预览槽
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
        expect(document.getElementById("popupPrePreviewSep1")?.innerHTML).toBe("");
    });

    it("hook 延迟到 owner 被清空后触发：insertPreviewNow 二次早退（不写槽）", async () => {
        const f = await fresh();
        slotDivs(1, ["popupData"]);
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = assume(navpop.article);
        const download = downloadWith(f, "plain text", navpop);
        f.pipeline.insertPreview(download);
        // 弹窗在预览落地前收起清空归属（hide 流把 owner 摘掉）：hook 触发时
        // 二次 owner 判定必须拦截，不能空跑
        download.owner = null;
        navpop.unhide();
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
    });

    it("redirTarget 与 originalArticle 皆缺：insertPreviewNow 早退（不写槽）", async () => {
        const f = await fresh();
        slotDivs(1, ["popupData"]);
        // 无宿主条目的可见弹窗：下载已回填但两处条目来源都没有
        const navpop = ownerWith(f, null, 1, true);
        f.pipeline.insertPreview(downloadWith(f, "plain text", navpop));
        expect(document.getElementById("popupData1")?.innerHTML).toBe("");
    });

    it("nsImageId 直取分支实际发出的 titles= 为条目本身（经 XHR 断言）", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        const { sent } = installXhr(() => ({ status: 200, responseText: imgJson("t") }));
        const navpop = ownerWith(f, "File:Direct.png", 1, true);
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, "text [[File:InText.png]] tail", navpop));
        await vi.waitFor(() => {
            expect(sent).toHaveLength(1);
        });
        expect(sent[0]?.url).toContain("&titles=File:Direct.png");
    });

    it("普通条目从 wikitext 提取首个有效图并发起图查询", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        const { sent } = installXhr(() => ({ status: 200, responseText: imgJson("t") }));
        const navpop = ownerWith(f, "Foo", 1, true);
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, "lead [[File:InText.png]] tail", navpop));
        await vi.waitFor(() => {
            expect(sent).toHaveLength(1);
        });
        expect(sent[0]?.url).toContain("&titles=File:InText.png");
    });

    it("wikitext 无图：不发图查询", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        const { sent } = installXhr(() => ({ status: 200, responseText: imgJson("t") }));
        const navpop = ownerWith(f, "Foo", 1, true);
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, "plain text", navpop));
        await new Promise((resolve) => {
            setTimeout(resolve, 20);
        });
        expect(sent).toHaveLength(0);
    });

    it("popupPreviews 关：不写预览槽（统计槽照写，insertArticlePreview 不建 Previewmaker）", async () => {
        const f = await fresh({ popupPreviews: false });
        slotDivs(1, ["popupData", "popupPreview", "popupPrePreviewSep"]);
        const navpop = ownerWith(f, "Foo", 1, true);
        navpop.originalArticle = assume(navpop.article);
        // insertArticlePreview 是模块私有函数，无法直接 spy：以渲染终点
        // showPreview 的未被调用证明整条预览分支被 popupPreviews 门挡下
        const showPreviewSpy = vi.spyOn(f.previewmaker.Previewmaker.prototype, "showPreview");
        f.pipeline.insertPreview(downloadWith(f, "plain text", navpop));
        expect(document.getElementById("popupData1")?.innerHTML).toBe(PLAIN_TRAILER);
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
        expect(document.getElementById("popupPrePreviewSep1")?.innerHTML).toBe("");
        expect(showPreviewSpy).not.toHaveBeenCalled();
    });
});

describe("insertArticlePreview", () => {
    it("Template 名字空间 + popupPreviewRawTemplates：monospace 原文（实体化）", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({ status: 200, responseText: imgJson("t") }));
        slotDivs(1, ["popupData", "popupPreview"]);
        const navpop = ownerWith(f, "Template:X", 1, true);
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, 'a<b>c & "d"', navpop));
        // jsdom innerHTML 往返重序列化：void 元素去斜杠（<hr />→<hr>）、
        // 文本节点里的 &quot; 还原为字面引号——写入口径仍是 legacy 的
        // `<hr /><span …>a&lt;b&gt;c &amp; &quot;d&quot;</span>`
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe('<hr><span style="font-family: monospace;">a&lt;b&gt;c &amp; "d"</span>');
    });

    it("普通条目走 prepPreviewmaker 管线：分隔线 + 渲染预览", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({ status: 200, responseText: imgJson("t") }));
        slotDivs(1, ["popupData", "popupPreview", "popupPrePreviewSep"]);
        const navpop = ownerWith(f, "Foo", 1, true);
        navpop.originalArticle = assume(navpop.article);
        f.pipeline.insertPreview(downloadWith(f, "Hello '''bold''' world sentence.", navpop));
        // 同上：<hr /> 写入后经 innerHTML 读回为 <hr>
        expect(document.getElementById("popupPrePreviewSep1")?.innerHTML).toBe("<hr>");
        expect(document.getElementById("popupPreview1")?.innerHTML).toContain("<b>bold</b>");
    });
});

describe("prepPreviewmaker / anchorize", () => {
    it("无锚原样返回：data 与原文相同；urlBase = articlebase + urlString", async () => {
        const f = await fresh();
        const navpop = ownerWith(f, "Foo");
        const p = f.pipeline.prepPreviewmaker("some wikitext", new f.title.Title("Foo"), navpop);
        expect(p.originalData).toBe("some wikitext");
        expect(p.baseUrl).toBe(`${ARTICLEBASE}/Foo`);
    });

    it("==标题== 命中：从标题行起截断", async () => {
        const f = await fresh();
        const navpop = ownerWith(f, "Foo");
        const p = f.pipeline.prepPreviewmaker("intro\n== Section ==\nbody", new f.title.Title("Foo#Section"), navpop);
        expect(p.originalData).toBe("== Section ==\nbody");
    });

    it("{{anchor|…}} 模板命中：从模板起截断", async () => {
        const f = await fresh();
        const navpop = ownerWith(f, "Foo");
        const p = f.pipeline.prepPreviewmaker("lead\n{{anchor|Section}}\ntext", new f.title.Title("Foo#Section"), navpop);
        expect(p.originalData).toBe("{{anchor|Section}}\ntext");
    });

    it("逐行剥 wiki 链接后命中：返回未剥链的原文行段（剥链仅用于匹配，照搬勿修）", async () => {
        const f = await fresh();
        const navpop = ownerWith(f, "Foo");
        const p = f.pipeline.prepPreviewmaker("intro\n== [[link|Section]] ==\nrest", new f.title.Title("Foo#Section"), navpop);
        expect(p.originalData).toBe("== [[link|Section]] ==\nrest");
    });

    it("锚不命中：原文返回", async () => {
        const f = await fresh();
        const navpop = ownerWith(f, "Foo");
        const p = f.pipeline.prepPreviewmaker("intro\n== Other ==\nbody", new f.title.Title("Foo#Nope"), navpop);
        expect(p.originalData).toBe("intro\n== Other ==\nbody");
    });
});
