// 事件流域镜像测试：setupTooltips 绑定（分批/容器链/#toc/.nopopups）、
// mouseOverWikiLink2 悬停主流程（修饰键/removeTitles/静止检测延迟/弹窗装配）、
// simplePopups 简版渲染与 popupPreviewButton、mouseOut/posCheckerHook 隐藏流、
// killPopup、checkPopupPosition/runStopPopupTimer、htmlout 两个注册缝与
// registerAbortAll 下载中止缝。行为基准 = legacy actions.ts + mouseout.ts
// （commit 02c8dec）。事件域自持状态跨用例泄漏，逐用例 vi.resetModules 取
// fresh 模块图（title.test.ts 同款手法）。
/* eslint-disable @typescript-eslint/no-deprecated -- killPopup/快捷键衔接用例读写 document.onkeypress，
   这是快捷键特性的上游契约面（src/core/shortcutkeys.ts 同款豁免） */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { buildTitleWikiFixtures, TITLEBASE } from "../../helpers/wikiFixtures.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as QueriesNs from "../../../src/api/queries.ts";
import type * as TitleNs from "../../../src/title/title.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as StringsNs from "../../../src/core/strings.ts";

// 预览分派段落位后，nonsimplePopupContent 会真实调用 queries 域的
// loadAPIPreview。本文件只锁事件流域行为，网络层在此整体打桩（分派走向与参数
// 由 tests/unit/preview/dispatch.test.ts 覆盖），避免真实 XHR 触网与 pending
// 记账串扰事件域断言
const loadAPIPreviewMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/api/queries.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof QueriesNs>();
    return { ...actual, loadAPIPreview: loadAPIPreviewMock };
});

type Events = typeof EventsNs;
type Options = typeof OptionsNs;
type Title = typeof TitleNs;
type Namespaces = typeof NamespacesNs;
type Popup = typeof PopupNs;
type Htmlout = typeof HtmloutNs;
type Strings = typeof StringsNs;

interface Fresh {
    events: Events;
    options: Options;
    title: Title;
    namespaces: Namespaces;
    popup: Popup;
    htmlout: Htmlout;
    strings: Strings;
}

// fresh 模块图 + mw/选项/wiki 基址装配（每用例调用）
const fresh = async (): Promise<Fresh> => {
    vi.resetModules();
    loadAPIPreviewMock.mockReset();
    const events = await import("../../../src/core/events.ts");
    const options = await import("../../../src/core/options.ts");
    const title = await import("../../../src/title/title.ts");
    const namespaces = await import("../../../src/title/namespaces.ts");
    const popup = await import("../../../src/core/popup.ts");
    const htmlout = await import("../../../src/core/htmlout.ts");
    const strings = await import("../../../src/core/strings.ts");
    const installed = installMw();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    options.setOptions();
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    return { events, options, title, namespaces, popup, htmlout, strings };
};

// window.popupXxx 覆盖登记（afterEach 统一回滚，防跨用例经覆盖链泄漏）
let windowOptionKeys: string[] = [];
const setWindowOption = (name: string, value: unknown): void => {
    (window as unknown as Record<string, unknown>)[name] = value;
    windowOptionKeys.push(name);
};

const stubGeometry = (el: HTMLElement, width: number, height: number): void => {
    Reflect.defineProperty(el, "offsetWidth", { value: width, configurable: true });
    Reflect.defineProperty(el, "offsetHeight", { value: height, configurable: true });
};

const stubClientWidth = (width: number): void => {
    Reflect.defineProperty(document.body, "clientWidth", { value: width, configurable: true });
};

const wikiAnchor = (title: string): HTMLAnchorElement => {
    const a = document.createElement("a");
    a.href = `${TITLEBASE}${title}`;
    return a;
};

// 默认宿主：#content（popupOnlyArticleLinks=true 时的容器链落点之一）
const contentHost = (): HTMLElement => {
    const content = document.createElement("div");
    content.id = "content";
    document.body.append(content);
    return content;
};

const mouseEvent = (type: string, props: Record<string, unknown> = {}): MouseEvent => {
    const init = { clientX: 0, clientY: 0, bubbles: true, cancelable: true, ...props } as MouseEventInit;
    return new MouseEvent(type, init);
};

// 悬停到弹窗可见的最短路径：tracker 落点静止 + 两拍 250ms 轮询（popupDelay 0.5s）
const hoverToShow = (mod: Fresh, a: HTMLAnchorElement, x = 30, y = 40): void => {
    mod.popup.Navpopup.tracker.setPosition(x, y);
    a.dispatchEvent(mouseEvent("mouseover"));
    vi.advanceTimersByTime(500);
};

beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    windowOptionKeys = [];
});

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    Reflect.deleteProperty(document.body, "clientWidth");
    document.onkeypress = null;
    Reflect.deleteProperty(document, "oldPopupOnkeypress");
    document.onmousemove = null;
    document.onmouseup = null;
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe("setupTooltips 绑定与容器链", () => {
    it("默认容器为 #content：容器内 wiki 链接绑 DOM0 三事件并挂 popData/hasPopup，容器外不绑", async () => {
        const mod = await fresh();
        const content = contentHost();
        const inside = wikiAnchor("Foo");
        content.append(inside);
        const outside = wikiAnchor("Bar");
        document.body.append(outside);
        mod.events.setupTooltips();
        expect(inside.onmouseover).toBe(mod.events.mouseOverWikiLink);
        expect(inside.onmouseout).toBe(mod.events.mouseOut);
        expect(inside.onmousedown).toBe(mod.events.killPopup);
        expect(inside.hasPopup).toBe(true);
        expect(inside.popData).toBeNull();
        expect(outside.hasPopup).toBeUndefined();
        expect(content.ranSetupTooltipsAlready).toBe(true);
    });

    it("显式 root 只绑定该子树，popData 透传到锚点（子弹窗扫描入参）", async () => {
        const mod = await fresh();
        const root = document.createElement("div");
        const a = wikiAnchor("Foo");
        root.append(a);
        document.body.append(root);
        const owner = { idNumber: 9, parentAnchor: null } as EventsNs.BoundNavpopup;
        mod.events.setupTooltips(root, false, false, { owner });
        expect(a.hasPopup).toBe(true);
        expect(a.popData).toEqual({ owner });
    });

    it("ranSetupTooltipsAlready：二次默认调用不重扫，force 补绑新链接，remove 解绑并复位标记", async () => {
        const mod = await fresh();
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.onmouseover = null;
        const later = wikiAnchor("Bar");
        content.append(later);
        mod.events.setupTooltips();
        // 标记早退：后加入的链接不补绑
        expect(later.onmouseover).toBeNull();
        mod.events.setupTooltips(undefined, false, true);
        // force 重扫补绑新链接；已绑链接因 onmousedown=killPopup 被 isPopupLink
        // 排除（legacy titles.ts 同款守卫），被外力清除的绑定不会恢复
        expect(later.onmouseover).toBe(mod.events.mouseOverWikiLink);
        expect(a.onmouseover).toBeNull();
        mod.events.setupTooltips(undefined, true);
        expect(a.onmouseover).toBeNull();
        expect(a.onmouseout).toBeNull();
        expect(a.hasPopup).toBe(false);
        expect(content.ranSetupTooltipsAlready).toBe(false);
    });

    it("removeTooltip 还原暂存的 originalTitle；未绑定锚点为 no-op", async () => {
        const mod = await fresh();
        const content = contentHost();
        const a = wikiAnchor("Foo");
        a.title = "原生提示";
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(a.title).toBe("");
        expect(a.originalTitle).toBe("原生提示");
        mod.events.setupTooltips(undefined, true);
        expect(a.title).toBe("原生提示");
        const untouched = wikiAnchor("Baz");
        content.append(untouched);
        // 未绑定锚点直接走 removeTooltip 的 hasPopup 早退分支
        mod.events.setupTooltips(content, true, true, null);
        expect(untouched.title).toBe("");
    });

    it("容器选择器链逐级回落：vector-2022 → mw_content → content → article → moeskin <article> → document", async () => {
        const mod = await fresh();
        expect(mod.events.defaultPopupsContainer()).toBe(document);
        const article = document.createElement("article");
        article.append(wikiAnchor("Moe"));
        document.body.append(article);
        expect(mod.events.defaultPopupsContainer()).toBe(article);
        const articleEl = document.createElement("div");
        articleEl.id = "article";
        document.body.append(articleEl);
        expect(mod.events.defaultPopupsContainer()).toBe(articleEl);
        const contentEl = document.createElement("div");
        contentEl.id = "content";
        document.body.append(contentEl);
        expect(mod.events.defaultPopupsContainer()).toBe(contentEl);
        const mwContent = document.createElement("div");
        mwContent.id = "mw_content";
        document.body.append(mwContent);
        expect(mod.events.defaultPopupsContainer()).toBe(mwContent);
        const vectorBody = document.createElement("div");
        vectorBody.className = "vector-body";
        const vectorSkin = document.createElement("div");
        vectorSkin.className = "skin-vector-2022";
        vectorSkin.append(vectorBody);
        document.body.append(vectorSkin);
        expect(mod.events.defaultPopupsContainer()).toBe(vectorBody);
    });

    it("popupOnlyArticleLinks=false 时容器为整个 document", async () => {
        const mod = await fresh();
        setWindowOption("popupOnlyArticleLinks", false);
        const bodyLink = wikiAnchor("Foo");
        document.body.append(bodyLink);
        mod.events.setupTooltips();
        expect(bodyLink.hasPopup).toBe(true);
    });

    it("无 href 锚点跳过，其余照常绑定", async () => {
        const mod = await fresh();
        const content = contentHost();
        const plain = document.createElement("a");
        plain.textContent = "no href";
        const good = wikiAnchor("Foo");
        content.append(plain, good);
        mod.events.setupTooltips();
        expect(plain.hasPopup).toBeUndefined();
        expect(good.hasPopup).toBe(true);
    });

    it("分批处理：250 个同步绑定，其余 100ms 后补齐（批量上限与间隔为 legacy 定值）", async () => {
        const mod = await fresh();
        const content = contentHost();
        const anchors: HTMLAnchorElement[] = [];
        for (let i = 0; i < 300; ++i) {
            const a = wikiAnchor(`Page${i}`);
            content.append(a);
            anchors.push(a);
        }
        mod.events.setupTooltips();
        expect(anchors[249].hasPopup).toBe(true);
        expect(anchors[250].hasPopup).toBeUndefined();
        vi.advanceTimersByTime(100);
        expect(anchors[250].hasPopup).toBe(true);
        expect(anchors[299].hasPopup).toBe(true);
    });
});

describe("链接排除（#toc 与 .nopopups）", () => {
    it("popupTocLinks=false（默认）时绑定完成后移除 #toc 内链接", async () => {
        const mod = await fresh();
        const content = contentHost();
        const normal = wikiAnchor("Foo");
        content.append(normal);
        const toc = document.createElement("div");
        toc.id = "toc";
        const tocLink = wikiAnchor("Section");
        toc.append(tocLink);
        content.append(toc);
        mod.events.setupTooltips();
        expect(normal.hasPopup).toBe(true);
        // legacy removeTooltip 置 hasPopup=false（不删属性）
        expect(tocLink.hasPopup).toBe(false);
        expect(tocLink.onmouseover).toBeNull();
    });

    it("popupTocLinks=true 时保留 #toc 链接", async () => {
        const mod = await fresh();
        setWindowOption("popupTocLinks", true);
        const content = contentHost();
        const toc = document.createElement("div");
        toc.id = "toc";
        const tocLink = wikiAnchor("Section");
        toc.append(tocLink);
        content.append(toc);
        mod.events.setupTooltips();
        expect(tocLink.hasPopup).toBe(true);
    });

    it(".nopopups 容器内链接不绑定", async () => {
        const mod = await fresh();
        const content = contentHost();
        const span = document.createElement("span");
        span.className = "nopopups";
        const excluded = wikiAnchor("Foo");
        span.append(excluded);
        content.append(span);
        mod.events.setupTooltips();
        expect(excluded.hasPopup).toBeUndefined();
        expect(excluded.inNopopupSpan).toBe(true);
    });
});

describe("mouseOverWikiLink2 悬停主流程", () => {
    it("装配弹窗并登记域状态：fuzz/delay/idNumber/parentAnchor/article、links/linksHash、骨架渲染、pending 归零", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        a.title = "原生提示";
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        const navpop = a.navpopup;
        expect(navpop).toBeDefined();
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        expect(navpop.fuzz).toBe(5);
        expect(navpop.delay).toBe(500);
        expect(navpop.idNumber).toBe(1);
        expect(navpop.parentAnchor).toBe(a);
        expect(navpop.article?.value).toBe("Foo");
        expect(mod.events.eventsState.current.link).toBe(a);
        expect(mod.events.eventsState.current.article?.value).toBe("Foo");
        expect(mod.events.eventsState.current.links).toEqual([a]);
        expect(mod.events.eventsState.current.linksHash[a.href]).toBe(navpop);
        // 骨架已写入主 div（默认 shortmenus 结构，槽 id 后缀 = idNumber）
        expect(navpop.mainDiv.innerHTML).toContain('id="popupTopLinks1"');
        expect(navpop.mainDiv.innerHTML).toContain('id="popupPreview1"');
        // 预览分派段：pending 归零后转入条目预览（revision 查询已发起；本文件
        // 已打桩 loadAPIPreview，故 pending 记账不计入）
        expect(navpop.pending).toBe(0);
        expect(loadAPIPreviewMock).toHaveBeenCalledWith("revision", expect.anything(), navpop);
        // removeTitles=true：暂存并清空原生 title
        expect(a.title).toBe("");
        expect(a.originalTitle).toBe("原生提示");
        // 静止检测 interval + 600ms 位置检查 interval + 150ms 拖拽装配 timeout
        // （legacy actions.ts simplePopupContent 内联的 dragTimer）+ 100ms 位置
        // 检查 timeout（setPopupHTML 写入成功后的 legacy 直调；本用例中由
        // preview 域注册的 original.popupImage 填充器产生——它是本文件模块图里
        // 唯一已注册的槽键，navlink 填充器未引入）
        expect(navpop.isVisible()).toBe(false);
        expect(vi.getTimerCount()).toBe(4);
    });

    it("idNumber 计数器与 htmlout 当前弹窗 id 同步（setPopupHTML 缺省 id 回落）", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        const second = wikiAnchor("Bar");
        content.append(second);
        // 后加入的链接需 force 重扫补绑后再悬停
        mod.events.setupTooltips(undefined, false, true);
        second.dispatchEvent(mouseEvent("mouseover"));
        expect(second.navpopup?.idNumber).toBe(2);
        mod.htmlout.setPopupHTML("X", "popupData");
        expect(document.getElementById("popupData2")?.innerHTML).toBe("X");
    });

    it("removeTitles=false 时不触碰原生 title", async () => {
        const mod = await fresh();
        setWindowOption("removeTitles", false);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        a.title = "保留";
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(a.title).toBe("保留");
        expect(a.originalTitle).toBeUndefined();
    });

    it("同链接且弹窗可见时跳过重复装配（骨架不重渲染）", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        expect(a.navpopup?.isVisible()).toBe(true);
        if (!a.navpopup) {
            throw new Error("navpopup missing");
        }
        a.navpopup.mainDiv.innerHTML = "<b>marker</b>";
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(a.navpopup.mainDiv.innerHTML).toBe("<b>marker</b>");
    });

    it("子弹窗：a.popData.owner 成为 parentPopup", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        const owner = new mod.popup.Navpopup() as EventsNs.BoundNavpopup;
        owner.idNumber = 7;
        owner.parentAnchor = null;
        owner.delay = 0;
        a.popData = { owner };
        content.append(a);
        mod.events.setupTooltips(content, false, true, a.popData);
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(a.navpopup?.parentPopup).toBe(owner);
    });

    it("registerHooks：unhide 前置钩子钉 maxWidth（默认 350）", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        expect(navpop.mainDiv.style.maxWidth).toBe("350px");
        expect(navpop.maxWidth).toBe(350);
    });

    it("popupMaxWidth 非数字时不注册 maxWidth 钩子", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupMaxWidth", "400");
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        expect(a.navpopup?.mainDiv.style.maxWidth).toBe("");
        expect(a.navpopup?.maxWidth).toBeUndefined();
    });

    it("simplePopupContent 对无弹窗锚点为 no-op（legacy 守卫）", async () => {
        const mod = await fresh();
        const a = wikiAnchor("Foo");
        expect(() => {
            mod.events.simplePopupContent(a, mod.title.Title.fromAnchor(a));
        }).not.toThrow();
    });

    it("nonsimplePopupContent 对无弹窗锚点为 no-op（legacy 守卫）", async () => {
        const mod = await fresh();
        const a = wikiAnchor("Foo");
        document.body.append(a);
        expect(() => {
            mod.events.nonsimplePopupContent(a, mod.title.Title.fromAnchor(a));
        }).not.toThrow();
        expect(loadAPIPreviewMock).not.toHaveBeenCalled();
    });
});

describe("simplePopups 简版渲染", () => {
    it("simplePopups 开启时结构默认强制 original", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("simplePopups", true);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(mod.options.optionStore.popupStructure).toBe("original");
        // original 布局：popupUserData 在 popupRedir 之前
        const html = a.navpopup?.mainDiv.innerHTML ?? "";
        expect(html.indexOf('id="popupUserData1"')).toBeLessThan(html.indexOf('id="popupRedir1"'));
    });

    it("用户已显式覆盖 popupStructure 时不强制 original", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("simplePopups", true);
        setWindowOption("popupStructure", "menus");
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(mod.options.optionStore.popupStructure).toBe("menus");
    });

    it("非 simplePopups（默认）保持 shortmenus 布局（popupUserData 在 popupRedir 之后）", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        const html = a.navpopup?.mainDiv.innerHTML ?? "";
        expect(html.indexOf('id="popupUserData1"')).toBeGreaterThan(html.indexOf('id="popupRedir1"'));
    });

    it("popupPreviewButton：simplePopups 下在 popupPreview 槽挂按钮，点击后 simpleNoMore 并隐藏按钮", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("simplePopups", true);
        setWindowOption("popupPreviewButton", true);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        const slot = document.getElementById("popupPreview1");
        expect(slot?.querySelector("div.popupPreviewButtonDiv")).not.toBeNull();
        const button = slot?.querySelector<HTMLElement>("span.popupPreviewButton");
        // 〔萌百〕"show preview" 键译为「禁用预览」（popupString 取串链）
        expect(button?.innerHTML).toBe(mod.strings.popupString("show preview"));
        expect(button?.innerHTML).toBe("禁用预览");
        if (!button) {
            throw new Error("preview button missing");
        }
        button.dispatchEvent(mouseEvent("click"));
        expect(a.simpleNoMore).toBe(true);
        expect(button.parentElement?.style.display).toBe("none");
    });

    it("popupPreviewButton 关闭（默认）时不挂按钮", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("simplePopups", true);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
    });

    it("simpleNoMore 已置位时不重复挂按钮", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("simplePopups", true);
        setWindowOption("popupPreviewButton", true);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        a.simpleNoMore = true;
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
    });
});

describe("修饰键（popupModifier）", () => {
    const ctrlEvent = (ctrlKey: boolean): MouseEvent => mouseEvent("keydown", { ctrlKey });

    it("action=enable（默认）：按下修饰键才弹", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupModifier", "ctrl");
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        mod.events.mouseOverWikiLink2(a, ctrlEvent(false));
        expect(a.navpopup).toBeUndefined();
        mod.events.mouseOverWikiLink2(a, ctrlEvent(true));
        expect(a.navpopup).toBeDefined();
    });

    it("action=disable：按下修饰键不弹", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupModifier", "ctrl");
        setWindowOption("popupModifierAction", "disable");
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        mod.events.mouseOverWikiLink2(a, ctrlEvent(true));
        expect(a.navpopup).toBeUndefined();
        mod.events.mouseOverWikiLink2(a, ctrlEvent(false));
        expect(a.navpopup).toBeDefined();
    });

    it("DOM0 mouseOverWikiLink 注册 document keydown（enable）并在 mouseOut 解绑；按键事件触发补弹", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupModifier", "ctrl");
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        const removeSpy = vi.spyOn(document, "removeEventListener");
        // mouseover 未按 ctrl：不弹，但挂上 keydown 监听
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(a.navpopup).toBeUndefined();
        expect(a.modifierKeyHandler).toBeTypeOf("function");
        document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true }));
        expect(a.navpopup).toBeDefined();
        a.dispatchEvent(mouseEvent("mouseout"));
        expect(removeSpy).toHaveBeenCalledWith("keydown", a.modifierKeyHandler, false);
        removeSpy.mockRestore();
    });

    it("action=disable 时监听挂在 keyup 上", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupModifier", "ctrl");
        setWindowOption("popupModifierAction", "disable");
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        const addSpy = vi.spyOn(document, "addEventListener");
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(addSpy).toHaveBeenCalledWith("keyup", a.modifierKeyHandler, false);
        addSpy.mockRestore();
    });

    it("事件缺省时回落 window.event（legacy 上游回退路径）", async () => {
        const mod = await fresh();
        Reflect.defineProperty(window, "event", { value: mouseEvent("mouseover", { ctrlKey: true }), configurable: true });
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        // evt 缺省 → window.event（带 ctrlKey）→ 弹窗
        const handler = a.onmouseover;
        expect(handler).toBeTypeOf("function");
        if (handler) {
            Reflect.apply(handler, a, []);
        }
        expect(a.navpopup).toBeDefined();
        Reflect.deleteProperty(window, "event");
    });

    it("mouseOverWikiLink2 直调且事件缺省：modifierPressed 经 window.event 判定修饰键", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupModifier", "ctrl");
        Reflect.defineProperty(window, "event", { value: mouseEvent("mouseover", { ctrlKey: true }), configurable: true });
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        // evt 缺省 → modifierPressed 回落 window.event 的 ctrlKey → 放行装配
        mod.events.mouseOverWikiLink2(a, undefined);
        expect(a.navpopup).toBeDefined();
        Reflect.deleteProperty(window, "event");
    });
});

describe("mouseOut 与隐藏流", () => {
    it("无弹窗：直接返回，不挂 tracker hook", async () => {
        const mod = await fresh();
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseout"));
        expect(mod.popup.Navpopup.tracker.hooks).toHaveLength(0);
    });

    it("弹窗尚不可见：立即 banish（此后不再显示）", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        a.dispatchEvent(mouseEvent("mouseover"));
        a.dispatchEvent(mouseEvent("mouseout"));
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        expect(navpop.noshow).toBe(true);
        vi.advanceTimersByTime(2000);
        expect(navpop.isVisible()).toBe(false);
    });

    it("弹窗可见：还原 title 并把 posCheckerHook 挂上 tracker", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        a.title = "原生提示";
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        a.dispatchEvent(mouseEvent("mouseout"));
        expect(a.title).toBe("原生提示");
        expect(mod.popup.Navpopup.tracker.hooks).toHaveLength(1);
    });

    it("posCheckerHook：弹窗不可见返回 true 注销自身", async () => {
        const mod = await fresh();
        const navpop = new mod.popup.Navpopup() as EventsNs.BoundNavpopup;
        navpop.idNumber = 1;
        navpop.parentAnchor = null;
        navpop.delay = 0;
        expect(mod.events.posCheckerHook(navpop)()).toBe(true);
    });

    it("posCheckerHook：tracker.dirty 时不做判定", async () => {
        const mod = await fresh();
        const navpop = new mod.popup.Navpopup() as EventsNs.BoundNavpopup;
        navpop.idNumber = 1;
        navpop.parentAnchor = null;
        navpop.delay = 0;
        navpop.unhide();
        mod.popup.Navpopup.tracker.dirty = true;
        expect(mod.events.posCheckerHook(navpop)()).toBe(false);
        expect(navpop.noshow).toBe(false);
    });

    it("popupHideDelay=0：鼠标在弹窗外立即 banish 并还原锚点 title；在弹窗内保留", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupHideDelay", 0);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        a.title = "原生提示";
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.reposition(10, 10);
        const hook = mod.events.posCheckerHook(navpop);
        // 鼠标在弹窗内（fuzz=5 容差）：保留
        mod.popup.Navpopup.tracker.setPosition(12, 12);
        expect(hook()).toBe(false);
        expect(navpop.isVisible()).toBe(true);
        // 鼠标移出：立即隐藏并还原 title
        mod.popup.Navpopup.tracker.setPosition(500, 500);
        expect(hook()).toBe(true);
        expect(navpop.isVisible()).toBe(false);
        expect(a.title).toBe("原生提示");
    });

    it("popupHideDelay 默认 0.5s：首拍记录 mouseLeavingTime，回弹窗内清零，超时后 banish", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.reposition(10, 10);
        const hook = mod.events.posCheckerHook(navpop);
        mod.popup.Navpopup.tracker.setPosition(500, 500);
        // legacy mouseLeavingTime 为可选字段不初始化：hook 首拍前是 undefined
        expect(navpop.mouseLeavingTime).toBeUndefined();
        expect(hook()).toBe(false);
        expect(navpop.mouseLeavingTime).toBe(+new Date());
        // 鼠标回到弹窗上：清零离开时间
        mod.popup.Navpopup.tracker.setPosition(12, 12);
        expect(hook()).toBe(false);
        expect(navpop.mouseLeavingTime).toBeNull();
        // 再次离开并超过 hideDelay：banish
        mod.popup.Navpopup.tracker.setPosition(500, 500);
        expect(hook()).toBe(false);
        vi.advanceTimersByTime(501);
        mod.popup.Navpopup.tracker.setPosition(501, 501);
        expect(hook()).toBe(true);
        expect(navpop.isVisible()).toBe(false);
        expect(navpop.mouseLeavingTime).toBeNull();
    });

    it("菜单展开中（ul.popup_menu 可见）视为鼠标仍在弹窗上", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupHideDelay", 0);
        const navpop = new mod.popup.Navpopup() as EventsNs.BoundNavpopup;
        navpop.idNumber = 1;
        navpop.parentAnchor = null;
        navpop.delay = 0;
        navpop.unhide();
        navpop.left = 10;
        navpop.top = 10;
        const menu = document.createElement("ul");
        menu.className = "popup_menu";
        Reflect.defineProperty(menu, "offsetWidth", { value: 120, configurable: true });
        navpop.mainDiv.append(menu);
        mod.popup.Navpopup.tracker.setPosition(900, 900);
        // 非 popup_menu 的 ul 不参与判定（先挂一个干扰项）
        const other = document.createElement("ul");
        other.className = "other";
        navpop.mainDiv.prepend(other);
        expect(mod.events.posCheckerHook(navpop)()).toBe(false);
        expect(navpop.isVisible()).toBe(true);
    });

    it("checkPopupPosition 定时器每 600ms 对当前弹窗做水平限位", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        const spy = vi.spyOn(navpop, "limitHorizontalPosition");
        vi.advanceTimersByTime(600);
        expect(spy).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(600);
        expect(spy).toHaveBeenCalledTimes(2);
        spy.mockRestore();
    });

    it("runStopPopupTimer：500ms 轮询 posChecker，hide 前置钩子清定时器；重复调用幂等", async () => {
        const mod = await fresh();
        setWindowOption("popupHideDelay", 0);
        const navpop = new mod.popup.Navpopup() as EventsNs.BoundNavpopup;
        navpop.idNumber = 1;
        navpop.parentAnchor = null;
        navpop.delay = 0;
        navpop.unhide();
        navpop.left = 0;
        navpop.top = 0;
        stubGeometry(navpop.mainDiv, 100, 50);
        mod.events.runStopPopupTimer(navpop);
        expect(vi.getTimerCount()).toBe(1);
        mod.events.runStopPopupTimer(navpop);
        expect(vi.getTimerCount()).toBe(1);
        // 鼠标在弹窗外 + 无隐藏延迟：轮询拍触发 banish
        mod.popup.Navpopup.tracker.setPosition(800, 800);
        vi.advanceTimersByTime(500);
        expect(navpop.isVisible()).toBe(false);
        // hide 已清掉轮询定时器
        expect(vi.getTimerCount()).toBe(0);
    });

    it("pending 中间态重入：|| 左假右真组合走 simple/nonsimple 两侧；菜单展开中 mouseOut 视为仍在弹窗", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        // 首轮装配完成后 pending=0；置中间值并隐藏弹窗使 mouseOverWikiLink2
        // 重入（可见早退不再拦截），覆盖 ===null 的左假与 !==0 的右真组合
        navpop.pending = 3;
        navpop.hide();
        mod.popup.Navpopup.tracker.setPosition(30, 40);
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(navpop.pending).toBe(0);
        // 菜单展开（ul.popup_menu offsetWidth>0，jsdom 无布局故 stub）：
        // 鼠标远处 mouseOut 后 posCheckerHook 仍视为悬停，弹窗保留；
        // 前置一个非菜单 ul 覆盖循环的跳过分支
        navpop.unhide();
        navpop.reposition(10, 10);
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.mainDiv.append(document.createElement("ul"));
        const menu = document.createElement("ul");
        menu.className = "popup_menu";
        navpop.mainDiv.append(menu);
        Reflect.defineProperty(menu, "offsetWidth", { value: 100, configurable: true });
        mod.popup.Navpopup.tracker.setPosition(500, 500);
        a.dispatchEvent(mouseEvent("mouseout"));
        // 直接驱动 posCheckerHook（用例未 enable tracker 轮询）：鼠标远处但
        // 菜单展开（普通 ul 先被循环跳过）→ 视为仍在弹窗，首拍仅记离开时间
        const hook = mod.events.posCheckerHook(navpop);
        expect(hook()).toBe(false);
        expect(navpop.isVisible()).toBe(true);
        expect(navpop.mouseLeavingTime).toBe(+new Date());
    });

    it("分支补面：originalTitle 已存不覆盖、pending=0 重入不重渲染、非菜单 ul 跳过、checkPopupPosition 空链路", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        a.title = "原生";
        content.append(a);
        mod.events.setupTooltips();
        // current.link 为空：checkPopupPosition 的空链路
        mod.events.checkPopupPosition();
        hoverToShow(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        expect(a.originalTitle).toBe("原生");
        // popup_menu 但未展开（jsdom 无布局 offsetWidth 恒 0）：fuzzy 判定
        // 仍收起，鼠标远处 mouseOut 后直调 hook 走「记离开时间」分支
        const closed = document.createElement("ul");
        closed.className = "popup_menu";
        navpop.mainDiv.append(closed);
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.reposition(10, 10);
        navpop.unhide();
        mod.popup.Navpopup.tracker.setPosition(500, 500);
        a.dispatchEvent(mouseEvent("mouseout"));
        const hook = mod.events.posCheckerHook(navpop);
        expect(hook()).toBe(false);
        expect(navpop.mouseLeavingTime).toBe(+new Date());
        // pending=0 + 弹窗不可见 → 重入时两侧条件皆假：simple/nonsimple 均不
        // 重渲染；同时 removeTitle 第二次执行（originalTitle 已存，不再覆盖）
        navpop.hide();
        const spySimple = vi.spyOn(mod.events, "simplePopupContent");
        const spyNon = vi.spyOn(mod.events, "nonsimplePopupContent");
        mod.popup.Navpopup.tracker.setPosition(30, 40);
        a.dispatchEvent(mouseEvent("mouseover"));
        expect(spySimple).not.toHaveBeenCalled();
        expect(spyNon).not.toHaveBeenCalled();
        spySimple.mockRestore();
        spyNon.mockRestore();
        expect(a.originalTitle).toBe("原生");
    });
});

describe("killPopup", () => {
    it("mousedown 全链路：解绑修饰键监听、banish 当前弹窗、中止全部下载、清位置检查定时器", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        const abortAll = vi.fn();
        mod.events.registerAbortAll(abortAll);
        const removeSpy = vi.spyOn(document, "removeEventListener");
        const mousedown = a.onmousedown;
        if (!mousedown) {
            throw new Error("onmousedown handler missing");
        }
        expect(Reflect.apply(mousedown, a, [mouseEvent("mousedown")])).toBe(true);
        expect(a.navpopup?.isVisible()).toBe(false);
        expect(a.navpopup?.noshow).toBe(true);
        expect(mod.events.eventsState.current.link).toBeNull();
        expect(abortAll).toHaveBeenCalledTimes(1);
        expect(removeSpy).toHaveBeenCalledWith("keydown", a.modifierKeyHandler, false);
        expect(vi.getTimerCount()).toBe(0);
        expect(mod.events.eventsState.checkPopupPositionTimer).toBeNull();
        removeSpy.mockRestore();
    });

    it("current.link 为空时不炸（仅走空链路）", async () => {
        const mod = await fresh();
        const a = wikiAnchor("Foo");
        expect(Reflect.apply(mod.events.killPopup, a, [])).toBe(true);
    });

    it("popupShortcutKeys 开启时连带拆除 document.onkeypress", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        setWindowOption("popupShortcutKeys", true);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        expect(document.onkeypress).toBeTypeOf("function");
        Reflect.apply(mod.events.killPopup, a, []);
        expect(document.onkeypress).toBeNull();
    });

    it("registerAbortAll(null) 注销后 killPopup 不再调用", async () => {
        const mod = await fresh();
        const abortAll = vi.fn();
        mod.events.registerAbortAll(abortAll);
        mod.events.registerAbortAll(null);
        Reflect.apply(mod.events.killPopup, wikiAnchor("Foo"), []);
        expect(abortAll).not.toHaveBeenCalled();
    });
});

describe("htmlout 注册缝接线", () => {
    it("setupTooltips 后 setPopupHTML 的 100ms 位置检查接线 checkPopupPosition", async () => {
        const mod = await fresh();
        stubClientWidth(1000);
        const content = contentHost();
        const a = wikiAnchor("Foo");
        content.append(a);
        mod.events.setupTooltips();
        hoverToShow(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        const spy = vi.spyOn(navpop, "limitHorizontalPosition");
        // 先错开 600ms 位置轮询的相位（hover 挂起的 interval 与本缝都调
        // checkPopupPosition，同帧到期会重复计数），使后续断言只数缝的这一次
        vi.advanceTimersByTime(101);
        spy.mockClear();
        mod.htmlout.setPopupHTML("x", "popupData", 1);
        vi.advanceTimersByTime(99);
        expect(spy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });

    it("setupTooltips 后 popTipsSoonFn 的 250ms 重扫接线 setupTooltips(force)（子弹窗递归绑定）", async () => {
        const mod = await fresh();
        contentHost();
        mod.events.setupTooltips();
        // 模拟 TopLinks 槽：槽元素内出现新 wiki 链接后经 popTipsSoon 重扫绑定
        const slot = document.createElement("div");
        slot.id = "popupTopLinks3";
        const freshLink = wikiAnchor("NewLink");
        slot.append(freshLink);
        document.body.append(slot);
        mod.htmlout.popTipsSoonFn("popupTopLinks3")();
        vi.advanceTimersByTime(250);
        expect(freshLink.hasPopup).toBe(true);
    });
});
