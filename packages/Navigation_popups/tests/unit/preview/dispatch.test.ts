// 预览分派域镜像测试：引用预览（footnoteTarget/footnotePreview）、
// nonsimplePopupContent 全分派分支（引用 → diff → history → contribs →
// backlinks → imagepage → category/userinfo → revision 的优先级与参数）、
// events.simplePopupContent 的红链槽写入、setupTooltips 的编辑框 onmouseup
// 接线，以及「悬停 → 分派」的整段接线。行为基准 = legacy src/modules/actions.ts
// 160-335 段与 :25-27（commit 02c8dec）。
//
// 打桩面（分派断言只看调用参数，不走真实网络/渲染）：
// - loadDiff：diff 域并行重写中（占位 stub 会抛异常，必须打桩）
// - loadAPIPreview/loadImage/startArticlePreview：真实实现会发 XHR / 建
//   Previewmaker；分派走向与其参数由本文件锁定
// wiki 基址、正则与命名空间按 tests/helpers/wikiFixtures 装配（legacy init.ts
// 公式），选项默认值经 options.setOptions()。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { buildTitleWikiFixtures, TITLEBASE } from "../../helpers/wikiFixtures.ts";
import type * as DispatchNs from "../../../src/preview/dispatch.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as ImagesNs from "../../../src/preview/images.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PipelineNs from "../../../src/preview/pipeline.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as QueriesNs from "../../../src/api/queries.ts";
import type * as SelectionNs from "../../../src/core/selection.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type Dispatch = typeof DispatchNs;
type Events = typeof EventsNs;
type Htmlout = typeof HtmloutNs;
type Namespaces = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type Popup = typeof PopupNs;
type Selection = typeof SelectionNs;
type TitleModule = typeof TitleNs;

// diff 域（并行重写中）：整模块打桩——本文件只钉分派参数，不加载其实现
const loadDiffMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/preview/diffpreview.ts", () => ({ loadDiff: loadDiffMock }));

// queries 域：loadAPIPreview 打桩，其余导出保持真实（pipeline 等域仍 import）
const loadAPIPreviewMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/api/queries.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof QueriesNs>();
    return { ...actual, loadAPIPreview: loadAPIPreviewMock };
});

// images 域：loadImage 打桩（真实实现会发 imageinfo 查询）
const loadImageMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/preview/images.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof ImagesNs>();
    return { ...actual, loadImage: loadImageMock };
});

// pipeline 域：startArticlePreview 打桩（revision 查询内部由 pipeline.test.ts
// 覆盖；此处只断言分派把 (article, oldid, navpop) 交给了它）
const startArticlePreviewMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/preview/pipeline.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof PipelineNs>();
    return { ...actual, startArticlePreview: startArticlePreviewMock };
});

interface Fresh {
    dispatch: Dispatch;
    events: Events;
    htmlout: Htmlout;
    namespaces: Namespaces;
    options: OptionsModule;
    popup: Popup;
    selection: Selection;
    title: TitleModule;
}

let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    loadDiffMock.mockReset();
    loadAPIPreviewMock.mockReset();
    loadImageMock.mockReset();
    startArticlePreviewMock.mockReset();
    const [dispatch, events, htmlout, namespaces, options, popup, selection, title] = await Promise.all([
        import("../../../src/preview/dispatch.ts"),
        import("../../../src/core/events.ts"),
        import("../../../src/core/htmlout.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/popup.ts"),
        import("../../../src/core/selection.ts"),
        import("../../../src/title/title.ts"),
    ]);
    const installed = installMw();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    options.setOptions();
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { dispatch, events, htmlout, namespaces, options, popup, selection, title };
};

// 已装配弹窗的锚点（运行时不变量：idNumber/parentAnchor/delay 必已赋值）
interface AnchorFixture {
    a: HTMLAnchorElement;
    article: TitleNs.Title;
    navpop: EventsNs.BoundNavpopup;
}

// 建锚点 + 弹窗 + 骨架槽（popupPreview/popupRedlink 等 <槽名><idNumber> 契约
// id 由 popupHTML 骨架产出，setPopupHTML 因此不再走 600ms 重试）
const anchorWithPopup = (f: Fresh, href: string, idNumber = 1): AnchorFixture => {
    const a = document.createElement("a");
    a.href = href;
    document.body.append(a);
    const navpop = new f.popup.Navpopup() as EventsNs.BoundNavpopup;
    navpop.idNumber = idNumber;
    navpop.parentAnchor = a;
    navpop.delay = 0;
    a.navpopup = navpop;
    navpop.setInnerHTML(f.htmlout.popupHTML(a));
    return { a, article: f.title.Title.fromAnchor(a), navpop };
};

// 本页 URL 劫持：legacy footnoteTarget 以 location.href 与锚点标题比对判定
// 「页内引用跳转」（默认 jsdom 的 localhost URL 与站点正则不匹配即为跨页）
const stubLocation = (href: string): void => {
    vi.stubGlobal("location", { href });
};

const slotHTML = (name: string, idNumber = 1): string => document.getElementById(name + String(idNumber))?.innerHTML ?? "";

// 编辑页装配：document.editform.wpTextbox1（jsdom 不实现 HTMLFormElement 的
// named getter，form.wpTextbox1 需手动挂属性——selection.test.ts 同款手法）
const installEditbox = (): HTMLTextAreaElement => {
    const form = document.createElement("form");
    const box = document.createElement("textarea");
    box.name = "wpTextbox1";
    form.appendChild(box);
    document.body.appendChild(form);
    (document as unknown as Record<string, unknown>).editform = form;
    (form as unknown as Record<string, unknown>).wpTextbox1 = box;
    return box;
};

beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    Reflect.deleteProperty(document, "ranSetupTooltipsAlready");
});

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    Reflect.deleteProperty(document, "editform");
    vi.unstubAllGlobals();
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
});

describe("footnoteTarget / footnotePreview（引用预览）", () => {
    it("sup/cite 形态命中：锚点指向本页同名条目，向上找到最近的 <li> 并写 <hr>+innerHTML", async () => {
        const f = await fresh();
        stubLocation(`${TITLEBASE}Foo`);
        // 正文侧：<li> 内的注脚目标（id 挂在 span 上，命中后需向上走到 li）
        const list = document.createElement("li");
        list.append(document.createTextNode("引用文本"));
        const note = document.createElement("span");
        note.id = "cite_note-1";
        list.append(note);
        document.body.append(list);
        // 引用侧：<sup> 里的锚点指向 #cite_note-1
        const sup = document.createElement("sup");
        sup.id = "cite_ref-1";
        const refLink = document.createElement("a");
        refLink.href = `${TITLEBASE}Foo#cite_note-1`;
        refLink.textContent = "[1]";
        sup.append(refLink);
        document.body.append(sup);
        expect(f.dispatch.footnoteTarget(refLink)).toBe(list);
        const { article, navpop } = anchorWithPopup(f, `${TITLEBASE}Foo#cite_note-1`);
        f.dispatch.footnotePreview(list, navpop);
        // jsdom innerHTML 往返重序列化：<hr /> 去斜杠
        expect(slotHTML("popupPreview")).toBe(`<hr>${list.innerHTML}`);
        expect(article.anchor).toBe("cite_note-1");
    });

    it("分派优先：引用命中时不再走 diff（同一锚点同时带 diff 参数）", async () => {
        const f = await fresh();
        stubLocation(`${TITLEBASE}Foo`);
        const li = document.createElement("li");
        document.body.append(li);
        const target = document.createElement("span");
        target.id = "cite_note-2";
        li.append(target);
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Foo&diff=prev&oldid=99#cite_note-2`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(slotHTML("popupPreview")).toContain('<span id="cite_note-2"></span>');
        expect(loadDiffMock).not.toHaveBeenCalled();
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
        // pending 归零发生在分派之前（重入判定依据）
        expect(navpop.pending).toBe(0);
    });

    it("不命中：锚点前缀不是 cite_note-/_note-/endnote", async () => {
        const f = await fresh();
        stubLocation(`${TITLEBASE}Foo`);
        const li = document.createElement("li");
        document.body.append(li);
        const target = document.createElement("span");
        target.id = "cite_ref-3";
        li.append(target);
        const { a, article } = anchorWithPopup(f, `${TITLEBASE}Foo#cite_ref-3`);
        expect(f.dispatch.footnoteTarget(a)).toBe(false);
        // 分派照常落入普通条目预览
        f.dispatch.nonsimplePopupContent(a, article);
        expect(startArticlePreviewMock).toHaveBeenCalledTimes(1);
    });

    it("不命中：锚点标题与本页不同（跨页链接，location 为默认 localhost）", async () => {
        const f = await fresh();
        const li = document.createElement("li");
        document.body.append(li);
        const target = document.createElement("span");
        target.id = "endnote-4";
        li.append(target);
        const { a } = anchorWithPopup(f, `${TITLEBASE}Other#endnote-4`);
        expect(f.dispatch.footnoteTarget(a)).toBe(false);
    });

    it("不命中：命中前缀且同页但目标元素不存在", async () => {
        const f = await fresh();
        stubLocation(`${TITLEBASE}Foo`);
        const { a } = anchorWithPopup(f, `${TITLEBASE}Foo#cite_note-missing`);
        expect(f.dispatch.footnoteTarget(a)).toBe(false);
    });

    it("不命中：向上走到 <body> 即放弃（目标元素挂在 body 下而非 li 内）", async () => {
        const f = await fresh();
        stubLocation(`${TITLEBASE}Foo`);
        const stray = document.createElement("div");
        stray.id = "cite_note-5";
        document.body.append(stray);
        const { a } = anchorWithPopup(f, `${TITLEBASE}Foo#cite_note-5`);
        expect(f.dispatch.footnoteTarget(a)).toBe(false);
    });

    it("不命中：DOM 结构异常（id 落在 <html> 上，向上走到 parentNode 为空）", async () => {
        const f = await fresh();
        stubLocation(`${TITLEBASE}Foo`);
        document.documentElement.id = "cite_note-6";
        const { a } = anchorWithPopup(f, `${TITLEBASE}Foo#cite_note-6`);
        expect(f.dispatch.footnoteTarget(a)).toBe(false);
        Reflect.deleteProperty(document.documentElement, "id");
    });

    it("_note- 前缀同样命中", async () => {
        const f = await fresh();
        stubLocation(`${TITLEBASE}Foo`);
        const li = document.createElement("li");
        document.body.append(li);
        const inner = document.createElement("div");
        inner.id = "_note-7";
        li.append(inner);
        const { a } = anchorWithPopup(f, `${TITLEBASE}Foo#_note-7`);
        expect(f.dispatch.footnoteTarget(a)).toBe(li);
    });
});

describe("nonsimplePopupContent：分派优先级与参数", () => {
    it("无弹窗锚点：早退且不发起任何查询", async () => {
        const f = await fresh();
        const a = document.createElement("a");
        a.href = `${TITLEBASE}Foo`;
        document.body.append(a);
        f.dispatch.nonsimplePopupContent(a, f.title.Title.fromAnchor(a));
        expect(loadDiffMock).not.toHaveBeenCalled();
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(loadImageMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
    });

    it("diff 分支：oldid 与 diff 参数原样交给 loadDiff", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Foo&diff=prev&oldid=123`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadDiffMock).toHaveBeenCalledExactlyOnceWith(article, "123", "prev", navpop);
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
    });

    it("diff 分支照搬怪癖：无 oldid 的 diff=prev 经 parseParams 互换后两侧皆为 prev", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Foo&diff=prev`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadDiffMock).toHaveBeenCalledExactlyOnceWith(article, "prev", "prev", navpop);
    });

    it("popupPreviewDiffs=false 时不走 diff，回落 revision（oldid 仍透传）", async () => {
        const f = await fresh({ popupPreviewDiffs: false });
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Foo&diff=prev&oldid=123`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadDiffMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(article, "123", navpop);
    });

    it("history 分支：action=history 走 loadAPIPreview(history)", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Foo&action=history`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).toHaveBeenCalledExactlyOnceWith("history", article, navpop);
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
    });

    it("popupPreviewHistory=false 时不走 history，回落 revision", async () => {
        const f = await fresh({ popupPreviewHistory: false });
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Foo&action=history`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(article, null, navpop);
    });

    it("contribs 分支：Special:Contributions 链接走 loadAPIPreview(contribs)", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Special:Contributions&target=Foo`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).toHaveBeenCalledExactlyOnceWith("contribs", article, navpop);
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
    });

    it("backlinks 分支：Special:Whatlinkshere 链接走 loadAPIPreview(backlinks)", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Special:Whatlinkshere&target=Foo`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).toHaveBeenCalledExactlyOnceWith("backlinks", article, navpop);
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
    });

    it("simplePopups 简版态：contribs/backlinks 分支被 shouldShowNonSimple 拦下，不发查询", async () => {
        const f = await fresh({ simplePopups: true });
        const contribs = anchorWithPopup(f, `${TITLEBASE}Special:Contributions&target=Foo`, 1);
        f.dispatch.nonsimplePopupContent(contribs.a, contribs.article);
        const backlinks = anchorWithPopup(f, `${TITLEBASE}Special:Whatlinkshere&target=Foo`, 2);
        f.dispatch.nonsimplePopupContent(backlinks.a, backlinks.article);
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
        expect(contribs.navpop.pending).toBe(0);
    });

    it("simpleNoMore 展开后回到完整分派：contribs 照常查询", async () => {
        const f = await fresh({ simplePopups: true });
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Special:Contributions&target=Foo`);
        a.simpleNoMore = true;
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).toHaveBeenCalledExactlyOnceWith("contribs", article, navpop);
    });

    it("imagepage 分支（imagePopupsForImages 默认开）：双查询 imagepagepreview + loadImage", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}File:Image.png`);
        expect(article.namespaceId()).toBe(f.namespaces.nsState.imageId);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).toHaveBeenCalledExactlyOnceWith("imagepagepreview", article, navpop);
        expect(loadImageMock).toHaveBeenCalledExactlyOnceWith(article, navpop);
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
    });

    it("imagepage 分支：imagePopupsForImages=false 但锚点不含图片时仍走（!anchorContainsImage）", async () => {
        const f = await fresh({ imagePopupsForImages: false });
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}File:Image.png`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).toHaveBeenCalledExactlyOnceWith("imagepagepreview", article, navpop);
        expect(loadImageMock).toHaveBeenCalledExactlyOnceWith(article, navpop);
    });

    it("imagepage 分支：imagePopupsForImages=false 且锚点自带 <img> 时回落 revision", async () => {
        const f = await fresh({ imagePopupsForImages: false });
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}File:Image.png`);
        a.append(document.createElement("img"));
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(loadImageMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(article, null, navpop);
    });

    it("category 分支：popupCategoryMembers 默认开 → category 查询后仍发起 revision", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Category:Cat`);
        expect(article.namespaceId()).toBe(f.namespaces.nsState.categoryId);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).toHaveBeenNthCalledWith(1, "category", article, navpop);
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(article, null, navpop);
    });

    it("popupCategoryMembers=false：跳过 category 查询，仅 revision", async () => {
        const f = await fresh({ popupCategoryMembers: false });
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Category:Cat`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(article, null, navpop);
    });

    it("userinfo 分支：User 名字空间（popupUserInfo 默认开）→ userinfo 查询后仍发起 revision", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}User:Bob`);
        expect(article.namespaceId()).toBe(f.namespaces.nsState.userId);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).toHaveBeenNthCalledWith(1, "userinfo", article, navpop);
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(article, null, navpop);
    });

    it("popupUserInfo=false：跳过 userinfo 查询，仅 revision", async () => {
        const f = await fresh({ popupUserInfo: false });
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}User:Bob`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(article, null, navpop);
    });

    it("普通条目：无专用预览，oldid 透传给 startArticlePreview", async () => {
        const f = await fresh();
        const { a, article, navpop } = anchorWithPopup(f, `${TITLEBASE}Foo&oldid=456`);
        f.dispatch.nonsimplePopupContent(a, article);
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
        expect(loadDiffMock).not.toHaveBeenCalled();
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(article, "456", navpop);
    });

    it("simplePopups 简版态：普通条目不发 revision；window 覆盖可放行 diff 分支", async () => {
        const f = await fresh({ simplePopups: true });
        const plain = anchorWithPopup(f, `${TITLEBASE}Foo`, 1);
        f.dispatch.nonsimplePopupContent(plain.a, plain.article);
        expect(startArticlePreviewMock).not.toHaveBeenCalled();
        // shouldShow 在简版态直查 window 覆盖（不看运行时选项）
        (window as unknown as Record<string, unknown>).popupPreviewDiffs = true;
        windowOptionKeys.push("popupPreviewDiffs");
        const diffAnchor = anchorWithPopup(f, `${TITLEBASE}Bar&diff=prev&oldid=7`, 2);
        f.dispatch.nonsimplePopupContent(diffAnchor.a, diffAnchor.article);
        expect(loadDiffMock).toHaveBeenCalledExactlyOnceWith(diffAnchor.article, "7", "prev", diffAnchor.navpop);
    });
});

describe("simplePopupContent 红链槽（legacy :275-277）", () => {
    it("popupRedlinkRemoval 开启且锚点 class 恰为 new：popupRedlink 槽追加移除链接", async () => {
        const f = await fresh({ popupRedlinkRemoval: true });
        const { a, article } = anchorWithPopup(f, `${TITLEBASE}RedLink`);
        a.className = "new";
        f.events.simplePopupContent(a, article);
        const html = slotHTML("popupRedlink");
        expect(html.startsWith("<br>")).toBe(true);
        expect(html).toContain('class="popup_change_title_link"');
        // 移除脚本的目标即红链标题（oldTarget 参与 autoedit 正则）
        expect(html).toContain("RedLink");
    });

    it("锚点 class 非恰为 new（追加了其他类）：照搬严格相等判定，不写槽", async () => {
        const f = await fresh({ popupRedlinkRemoval: true });
        const { a, article } = anchorWithPopup(f, `${TITLEBASE}RedLink`);
        a.className = "new mw-redlink";
        f.events.simplePopupContent(a, article);
        expect(slotHTML("popupRedlink")).toBe("");
    });

    it("popupRedlinkRemoval 关闭（默认）：不写槽", async () => {
        const f = await fresh();
        const { a, article } = anchorWithPopup(f, `${TITLEBASE}RedLink`);
        a.className = "new";
        f.events.simplePopupContent(a, article);
        expect(slotHTML("popupRedlink")).toBe("");
    });
});

describe("setupTooltips 编辑框 onmouseup 接线（legacy :25-27）", () => {
    it("popupOnEditSelection 开启（默认 cursor）时接到 doSelectionPopup", async () => {
        const f = await fresh();
        const box = installEditbox();
        f.events.setupTooltips();
        expect(box.onmouseup).toBe(f.selection.doSelectionPopup);
    });

    it("popupOnEditSelection 关闭时不接线", async () => {
        const f = await fresh({ popupOnEditSelection: false });
        const box = installEditbox();
        f.events.setupTooltips();
        expect(box.onmouseup).toBeNull();
    });

    it("无编辑框时不接线也不报错", async () => {
        const f = await fresh();
        expect(() => {
            f.events.setupTooltips();
        }).not.toThrow();
    });
});

describe("整段接线：悬停 → 预览分派", () => {
    it("mouseOverWikiLink2 装配弹窗后经 events.nonsimplePopupContent 转入分派", async () => {
        const f = await fresh();
        const a = document.createElement("a");
        a.href = `${TITLEBASE}Foo`;
        document.body.append(a);
        f.events.mouseOverWikiLink2(a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        // newNavpopup 字段装配（legacy :284-294，实现留在 events 域）
        expect(navpop.fuzz).toBe(5);
        expect(navpop.delay).toBe(500);
        expect(navpop.idNumber).toBe(1);
        expect(navpop.parentAnchor).toBe(a);
        expect(navpop.article?.value).toBe("Foo");
        // 分派：普通条目 → revision（loadAPIPreview 打桩，仅钉参数）
        expect(startArticlePreviewMock).toHaveBeenCalledExactlyOnceWith(navpop.article, null, navpop);
        expect(navpop.pending).toBe(0);
    });
});
