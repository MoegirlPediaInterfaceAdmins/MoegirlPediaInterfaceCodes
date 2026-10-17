// 图片域镜像测试：loadImage（popupImages 门、isValidImageName 拦截、URL 装配、
// lazy 态 DOWNLOAD_IMAGE_QUERY_DATA hook）、popupsInsertImage（JSON → popupImg
// 槽写入、imageinfo 缺失早退、坏 JSON 走 catch、三种 popupThumbAction）、
// getValidImageFromWikiText（wiki.re.image 命中/推进/注释剥除/本地化前缀）。
// 行为基准 = legacy src/modules/images.ts（commit 02c8dec）；期望值按萌百
// popupStrings 译文与 legacy init.ts setRegexps 的正则公式手工推导。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import { buildTitleWikiFixtures } from "../../helpers/wikiFixtures.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as ImagesNs from "../../../src/preview/images.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as SiteinfoNs from "../../../src/api/siteinfo.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type Events = typeof EventsNs;
type Htmlout = typeof HtmloutNs;
type Images = typeof ImagesNs;
type Namespaces = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type Popup = typeof PopupNs;
type Siteinfo = typeof SiteinfoNs;
type TitleModule = typeof TitleNs;

interface Fresh {
    images: Images;
    events: Events;
    htmlout: Htmlout;
    namespaces: Namespaces;
    options: OptionsModule;
    popup: Popup;
    siteinfo: Siteinfo;
    title: TitleModule;
}

// legacy options.ts 的选项默认值（本域消费的正则源）
const IMAGE_VARS_REGEXP = "image|image_(?:file|skyline|name|flag|seal)|cover|badge|logo";

const APIBASE = "https://zh.moegirl.org.cn/api.php";

// 本文件写到 window 上的选项覆盖，用例间统一摘除（getValueOf 首读固化缓存，
// 不同选项组合经 resetModules 各自重载 + 各自覆盖）
let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}, mwConfig: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw({ config: { wgArticlePath: "/wiki/$1", ...mwConfig } });
    const [images, events, htmlout, namespaces, options, popup, siteinfo, title] = await Promise.all([
        import("../../../src/preview/images.ts"),
        import("../../../src/core/events.ts"),
        import("../../../src/core/htmlout.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/popup.ts"),
        import("../../../src/api/siteinfo.ts"),
        import("../../../src/title/title.ts"),
    ]);
    namespaces.setNamespaces();
    options.setOptions();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    // wiki.re.image 按 legacy init.ts setRegexps 公式（"img" 全局正则——
    // exec 推进 lastIndex 是 getValidImageFromWikiText 循环推进的前提）
    const im = namespaces.nsRe(namespaces.nsState.imageId);
    title.wiki.re.image = RegExp(
        `(^|\\[\\[)${im}: *([^|\\]]*[^|\\] ])([^0-9\\]]*([0-9]+) *px)?|(?:\\n *[|]?|[|]) *(${IMAGE_VARS_REGEXP}) *= *(?:\\[\\[ *)?(?:${im}:)?([^|]*?)(?:\\]\\])? *[|]? *\\n`,
        "img",
    );
    siteinfo.siteState.apiwikibase = APIBASE;
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { images, events, htmlout, namespaces, options, popup, siteinfo, title };
};

// 预览槽骨架：#popupImg<N> / #popupImageLink<N>（嵌套形态对齐 htmlout 的
// imageHTML 产物——把手 a 内含 img）
const imageSlots = (id: number, nested: boolean): { img: HTMLImageElement; a: HTMLAnchorElement } => {
    const img = document.createElement("img");
    img.id = `popupImg${String(id)}`;
    const a = document.createElement("a");
    a.id = `popupImageLink${String(id)}`;
    if (nested) {
        a.appendChild(img);
        document.body.appendChild(a);
    } else {
        document.body.appendChild(img);
        document.body.appendChild(a);
    }
    return { img, a };
};

const ownerWith = (f: Fresh, idNumber: number): PopupNs.Navpopup => {
    const navpop = new f.popup.Navpopup();
    navpop.idNumber = idNumber;
    return navpop;
};

// imageinfo 查询的成功响应体（formatversion=2 单页形态）
const imageJson = (info: string): string => `{"query":{"pages":{"10":${info}}}}`;
// eslint-disable-next-line @stylistic/quotes -- JSON 夹具含双引号，模板串保留原文可读性
const FULL_INFO = `{"imageinfo":[{"thumburl":"https://img/thumb.jpg","url":"https://img/full.jpg","mime":"image/jpeg","descriptionurl":"https://zh.moegirl.org.cn/index.php?title=File:a.png"}]}`;

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
});

describe("loadImage", () => {
    it("popupImages 关：早退且不计数不发包，返回 undefined", async () => {
        const f = await fresh({ popupImages: false });
        installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const navpop = ownerWith(f, 1);
        const ret = f.images.loadImage(new f.title.Title("File:a.png"), navpop);
        expect(ret).toBeUndefined();
        expect(navpop.pending).toBeNull();
    });

    it("名字含 { 被 isValidImageName 拦截：返回 false 且不发包", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        const { sent } = installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const navpop = ownerWith(f, 1);
        const ret = f.images.loadImage(new f.title.Title("File:a{b.png"), navpop);
        expect(ret).toBe(false);
        expect(sent).toHaveLength(0);
        // 早退发生在 pendingNavpopTask 之前
        expect(navpop.pending).toBeNull();
    });

    it("URL 装配：apiwikibase + imageinfo + iiprop + iiurlwidth + titles（空格转下划线）", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        const { sent } = installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const navpop = ownerWith(f, 3);
        f.images.loadImage(new f.title.Title("File:Example image.jpg"), navpop);
        await vi.waitFor(() => {
            expect(sent).toHaveLength(1);
        });
        expect(sent[0]?.url).toBe(`${APIBASE}?format=json&formatversion=2&action=query&prop=imageinfo&iiprop=url|mime&iiurlwidth=200&titles=File:Example_image.jpg`);
        // 发起即计数（回调尚未完成时 pending 已 +1）
        expect(navpop.pending).toBe(1);
    });

    it("lazy 态（不可见 + popupLazyDownloads）：挂 DOWNLOAD_IMAGE_QUERY_DATA hook，unhide 后才发包", async () => {
        const f = await fresh();
        const { sent } = installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const navpop = ownerWith(f, 5);
        f.images.loadImage(new f.title.Title("File:a.png"), navpop);
        expect(sent).toHaveLength(0);
        expect(navpop.hookIds["unhide|after|DOWNLOAD_IMAGE_QUERY_DATA"]).toBe(true);
        expect(navpop.hooks.unhide).toHaveLength(1);
        navpop.runHooks("unhide", "after");
        expect(sent).toHaveLength(1);
    });

    it("可见弹窗绕过 lazy 门立即发包", async () => {
        const f = await fresh();
        const { sent } = installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const navpop = ownerWith(f, 6);
        navpop.visible = true;
        f.images.loadImage(new f.title.Title("File:a.png"), navpop);
        expect(sent).toHaveLength(1);
    });
});

describe("popupsInsertImage（经 loadImage 全链）", () => {
    it("thumburl 命中：img 写 src/display/width，默认 imagepage 动作挂 toggleSize", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const { img, a } = imageSlots(7, false);
        const navpop = ownerWith(f, 7);
        f.images.loadImage(new f.title.Title("File:a.png"), navpop);
        await vi.waitFor(() => {
            expect(img.src).toBe("https://img/thumb.jpg");
        });
        expect(img.style.display).toBe("inline");
        // popupImageSize 默认 60
        expect(img.width).toBe(60);
        // eventsState.current.article 为 null → imagepage 分支回落到尺寸切换
        expect(typeof a.onclick).toBe("function");
        expect(a.title).toBe("点击切换图片大小");
    });

    it("imagepage + 当前条目非 File 名字空间：链接指向 descriptionurl", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const { img, a } = imageSlots(8, false);
        f.events.eventsState.current.article = new f.title.Title("Foo");
        f.images.loadImage(new f.title.Title("File:a.png"), ownerWith(f, 8));
        await vi.waitFor(() => {
            expect(img.src).toBe("https://img/thumb.jpg");
        });
        expect(a.href).toBe("https://zh.moegirl.org.cn/index.php?title=File:a.png");
        expect(typeof a.onclick).toBe("object");
    });

    it("thumburl 缺失 + image/* mime：回落原始 url", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({
            status: 200,
            // eslint-disable-next-line @stylistic/quotes -- JSON 夹具含双引号
            responseText: imageJson(`{"imageinfo":[{"url":"https://img/full.png","mime":"image/png","descriptionurl":"https://d"}]}`),
        }));
        const { img } = imageSlots(9, false);
        f.images.loadImage(new f.title.Title("File:a.png"), ownerWith(f, 9));
        await vi.waitFor(() => {
            expect(img.src).toBe("https://img/full.png");
        });
    });

    it("thumburl 缺失 + 非 image mime：src 不动（「不确定是图」路径）", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({
            status: 200,
            responseText: imageJson('{"imageinfo":[{"url":"https://doc/pdf","mime":"application/pdf","descriptionurl":"https://d"}]}'),
        }));
        const { img } = imageSlots(10, false);
        f.images.loadImage(new f.title.Title("File:a.pdf"), ownerWith(f, 10));
        await new Promise((resolve) => {
            setTimeout(resolve, 20);
        });
        expect(img.src).toBe("");
        expect(img.style.display).toBe("inline");
    });

    it("sizetoggle：onclick 切换首子元素宽度 100% ↔ 空", async () => {
        const f = await fresh({ popupLazyDownloads: false, popupThumbAction: "sizetoggle" });
        installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const { img, a } = imageSlots(11, true);
        f.images.loadImage(new f.title.Title("File:a.png"), ownerWith(f, 11));
        await vi.waitFor(() => {
            expect(img.src).toBe("https://img/thumb.jpg");
        });
        expect(a.title).toBe("点击切换图片大小");
        Reflect.apply(a.onclick as (this: GlobalEventHandlers) => void, a, []);
        expect(img.style.width).toBe("100%");
        Reflect.apply(a.onclick as (this: GlobalEventHandlers) => void, a, []);
        expect(img.style.width).toBe("");
    });

    it("linkfull：链接指向全尺寸 url 并附提示", async () => {
        const f = await fresh({ popupLazyDownloads: false, popupThumbAction: "linkfull" });
        installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const { img, a } = imageSlots(12, false);
        f.images.loadImage(new f.title.Title("File:a.png"), ownerWith(f, 12));
        await vi.waitFor(() => {
            expect(img.src).toBe("https://img/thumb.jpg");
        });
        expect(a.href).toBe("https://img/full.jpg");
        expect(a.title).toBe("查看全尺寸图像");
    });

    it("imageinfo 缺失：早退，img 槽不写", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({ status: 200, responseText: imageJson("{}") }));
        const { img } = imageSlots(13, false);
        f.images.loadImage(new f.title.Title("File:a.png"), ownerWith(f, 13));
        await new Promise((resolve) => {
            setTimeout(resolve, 20);
        });
        expect(img.style.display).toBe("");
        expect(img.src).toBe("");
    });

    it("坏 JSON：getJsObj 哨兵路径走 catch 早退", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({ status: 200, responseText: "not json" }));
        const { img } = imageSlots(14, false);
        f.images.loadImage(new f.title.Title("File:a.png"), ownerWith(f, 14));
        await new Promise((resolve) => {
            setTimeout(resolve, 20);
        });
        expect(img.style.display).toBe("");
    });

    it("下载数据缺省（缓存条目无数据）：空串兜底后解析失败走「查询失败」catch", async () => {
        const f = await fresh({ popupLazyDownloads: false, popupDebug: true });
        // XHR 路径的 responseText 恒为字符串，构造不出 data 缺省形态；改走
        // 缓存命中：条目在但 data 为 undefined，fakeDownload 原样回调
        const cache = await import("../../../src/net/cache.ts");
        const url = `${APIBASE}?format=json&formatversion=2&action=query&prop=imageinfo&iiprop=url|mime&iiurlwidth=200&titles=File:a.png`;
        cache.pages.push({ url, data: undefined, lastModified: null });
        const { img } = imageSlots(16, false);
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        f.images.loadImage(new f.title.Title("File:a.png"), ownerWith(f, 16));
        expect(logSpy.mock.calls.some((call) => String(call[0]) === "popupsInsertImage failed :(")).toBe(true);
        expect(img.style.display).toBe("");
        expect(img.src).toBe("");
    });

    it("popupImageLink 元素缺失：img 已写入、静默返回 null 路径", async () => {
        const f = await fresh({ popupLazyDownloads: false });
        installXhr(() => ({ status: 200, responseText: imageJson(FULL_INFO) }));
        const img = document.createElement("img");
        img.id = "popupImg15";
        document.body.appendChild(img);
        f.images.loadImage(new f.title.Title("File:a.png"), ownerWith(f, 15));
        await vi.waitFor(() => {
            expect(img.src).toBe("https://img/thumb.jpg");
        });
    });
});

describe("getValidImageFromWikiText", () => {
    it("[[File:…]] 命中：返回 File: 前缀 + upcaseFirst", async () => {
        const f = await fresh();
        expect(f.images.getValidImageFromWikiText("intro [[File:x.jpg]] tail")).toBe("File:X.jpg");
    });

    it("wgFormattedNamespaces 本地化：文件: 前缀", async () => {
        const f = await fresh({}, {
            wgFormattedNamespaces: {
                "-1": "Special",
                0: "",
                1: "Talk",
                2: "User",
                3: "User talk",
                6: "文件",
                10: "Template",
                14: "Category",
            },
        });
        expect(f.images.getValidImageFromWikiText("[[File:x.jpg]]")).toBe("文件:X.jpg");
    });

    it("首个命中含 { 无效时推进 lastIndex 取下一个（全局正则推进怪癖，照搬勿修）", async () => {
        const f = await fresh();
        expect(f.images.getValidImageFromWikiText("a [[File:b{c.jpg]] m [[File:good.jpg]] z")).toBe("File:Good.jpg");
        // 结束后 lastIndex 归零，不污染后续调用
        expect(f.title.wiki.re.image?.lastIndex).toBe(0);
    });

    it("非 popup 注释整段剥除：注释内的图不参与提取", async () => {
        const f = await fresh();
        expect(f.images.getValidImageFromWikiText("<!-- [[File:hidden.jpg]] -->\na [[File:visible.jpg]]")).toBe("File:Visible.jpg");
    });

    it("popup 白名单注释保留：注释内的图可提取", async () => {
        const f = await fresh();
        expect(f.images.getValidImageFromWikiText("<!--popups [[File:kept.jpg]]-->")).toBe("File:Kept.jpg");
    });

    it("infobox 变量形式命中：换行 |image = 行", async () => {
        const f = await fresh();
        expect(f.images.getValidImageFromWikiText('{| class="infobox"\n|image = Example.jpg\n|}\n')).toBe("File:Example.jpg");
    });

    it("无命中返 null", async () => {
        const f = await fresh();
        expect(f.images.getValidImageFromWikiText("plain text without images")).toBeNull();
    });
});
