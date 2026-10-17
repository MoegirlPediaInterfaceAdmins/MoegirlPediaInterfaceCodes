// 阶段 1 端到端验收：用户视角的悬停全流——绑定 → mouseover → 静止检测
// 出弹窗（骨架与 CSS 契约）→ 移出/回弹/killPopup 的隐藏路径。行为基准 =
// legacy actions.ts/mouseout.ts（commit 02c8dec）；装配与 events.test.ts
// 同款（fresh 模块图 + wiki fixtures）。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../helpers/mockMw.ts";
import { buildTitleWikiFixtures, TITLEBASE } from "../helpers/wikiFixtures.ts";
import type * as EventsNs from "../../src/core/events.ts";
import type * as OptionsNs from "../../src/core/options.ts";
import type * as TitleNs from "../../src/title/title.ts";
import type * as NamespacesNs from "../../src/title/namespaces.ts";
import type * as PopupNs from "../../src/core/popup.ts";
import type * as HtmloutNs from "../../src/core/htmlout.ts";
import type * as QueriesNs from "../../src/api/queries.ts";

// 预览分派段落位后，悬停会真实调用 queries 域的 loadAPIPreview（发起 revision
// 查询）。本文件只验悬停/隐藏的事件流域，网络层在此整体打桩，避免真实 XHR 触网
const loadAPIPreviewMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/queries.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof QueriesNs>();
    return { ...actual, loadAPIPreview: loadAPIPreviewMock };
});

type Events = typeof EventsNs;
type Options = typeof OptionsNs;
type Title = typeof TitleNs;
type Namespaces = typeof NamespacesNs;
type Popup = typeof PopupNs;
type Htmlout = typeof HtmloutNs;

interface Fresh {
    events: Events;
    options: Options;
    title: Title;
    namespaces: Namespaces;
    popup: Popup;
    htmlout: Htmlout;
}

let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    loadAPIPreviewMock.mockReset();
    const events = await import("../../src/core/events.ts");
    const options = await import("../../src/core/options.ts");
    const title = await import("../../src/title/title.ts");
    const namespaces = await import("../../src/title/namespaces.ts");
    const popup = await import("../../src/core/popup.ts");
    const htmlout = await import("../../src/core/htmlout.ts");
    const installed = installMw();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    options.setOptions();
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    // 启动 400ms 兜底轮询（真实页面由 boot 装配；posCheckerHook 的隐藏
    // 倒计时靠它推进——enable 只接管 onmousemove 与 interval，无副作用域）
    popup.Navpopup.tracker.enable();
    return { events, options, title, namespaces, popup, htmlout };
};

const mouseEvent = (type: string, props: Record<string, unknown> = {}): MouseEvent =>
    new MouseEvent(type, { clientX: 0, clientY: 0, bubbles: true, cancelable: true, ...props });

const stubGeometry = (el: HTMLElement, width: number, height: number): void => {
    Reflect.defineProperty(el, "offsetWidth", { value: width, configurable: true });
    Reflect.defineProperty(el, "offsetHeight", { value: height, configurable: true });
};

// 正文容器与一条普通条目链接（默认 popupOnlyArticleLinks=true 落在 #content）
const hostWithLink = (titleName: string): { content: HTMLElement; a: HTMLAnchorElement } => {
    const content = document.createElement("div");
    content.id = "content";
    const a = document.createElement("a");
    a.href = `${TITLEBASE}${titleName}`;
    a.appendChild(document.createTextNode(titleName));
    content.append(a);
    document.body.append(content);
    return { content, a };
};

// 悬停并推进静止检测（popupDelay 默认 0.5s → 两拍 250ms 轮询）
const hover = (mod: Fresh, a: HTMLAnchorElement, x = 30, y = 40): void => {
    mod.popup.Navpopup.tracker.setPosition(x, y);
    a.dispatchEvent(mouseEvent("mouseover", { clientX: x, clientY: y }));
    vi.advanceTimersByTime(500);
};

const visiblePopups = (): HTMLElement[] => [...document.querySelectorAll("div.navpopup")] as HTMLElement[];

beforeEach(() => {
    vi.useFakeTimers();
    Reflect.defineProperty(document.body, "clientWidth", { value: 1000, configurable: true });
});

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    Reflect.deleteProperty(document.body, "clientWidth");
    document.body.innerHTML = "";
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- 清理快捷键接管的契约面残留
    document.onkeypress = null;
    document.onmousemove = null;
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe("端到端：悬停出弹窗（阶段 1 验收）", () => {
    it("hover 普通条目链接 → 静止后弹窗出现，骨架槽位符合 CSS 契约 → 移出消失", async () => {
        const mod = await fresh();
        const { a } = hostWithLink("Foo");
        mod.events.setupTooltips();
        // 绑定后悬停：弹窗已建但未到静止延迟，不可见
        hover(mod, a, 10, 10);
        // showSoonIfStable 已推进到位：弹窗可见
        const popups = visiblePopups();
        expect(popups).toHaveLength(1);
        const navpop = a.navpopup;
        expect(navpop).toBeDefined();
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        expect(navpop.isVisible()).toBe(true);
        expect(navpop.idNumber).toBe(1);
        // 骨架槽位 id 契约（默认 shortmenus 结构，idNumber 后缀）
        expect(navpop.mainDiv.querySelector("#popupTopLinks1")).not.toBeNull();
        expect(navpop.mainDiv.querySelector("#popupTitle1")).not.toBeNull();
        expect(navpop.mainDiv.querySelector("#popupPreview1")).not.toBeNull();
        // 主 div id 契约：navpopup_maindiv<uid>（CSS/三源核实形态）
        expect(navpop.mainDiv.id).toMatch(/^navpopup_maindiv\d+$/);
        // 移出：鼠标不在弹窗内（默认 popupHideDelay=0.5s）→ 首轮轮询记录
        // 离开时间，后续轮询超时后 banish（banish 置 noshow+hide，节点留 DOM）
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.reposition(10, 10);
        mod.popup.Navpopup.tracker.setPosition(500, 500);
        a.dispatchEvent(mouseEvent("mouseout"));
        vi.advanceTimersByTime(401);
        expect(navpop.isVisible()).toBe(true);
        vi.advanceTimersByTime(1500);
        expect(navpop.isVisible()).toBe(false);
    });

    it("移出后鼠标回到弹窗内：弹窗保留", async () => {
        const mod = await fresh();
        const { a } = hostWithLink("Foo");
        mod.events.setupTooltips();
        hover(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.reposition(10, 10);
        // 移出（鼠标在远处）后立刻回到弹窗内：posCheckerHook 判定保留
        mod.popup.Navpopup.tracker.setPosition(500, 500);
        a.dispatchEvent(mouseEvent("mouseout"));
        mod.popup.Navpopup.tracker.setPosition(50, 50);
        vi.advanceTimersByTime(901);
        expect(navpop.isVisible()).toBe(true);
        expect(visiblePopups()).toHaveLength(1);
    });

    it("mousedown（killPopup）：弹窗立即不可见", async () => {
        const mod = await fresh();
        const { a } = hostWithLink("Foo");
        mod.events.setupTooltips();
        hover(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        expect(navpop.isVisible()).toBe(true);
        a.dispatchEvent(mouseEvent("mousedown"));
        expect(navpop.isVisible()).toBe(false);
    });

    it("simplePopups：original 结构，主链接与标题槽就位", async () => {
        const mod = await fresh({ simplePopups: true });
        const { a } = hostWithLink("Foo");
        mod.events.setupTooltips();
        hover(mod, a);
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        expect(navpop.isVisible()).toBe(true);
        // simplePopups 强制 original 布局：标题/预览槽就位（结构强制细节由
        // events 单测锁定，此处验证端到端渲染落点）
        expect(navpop.mainDiv.querySelector('[id^="popupTitle"]')).not.toBeNull();
        expect(navpop.mainDiv.querySelector('[id^="popupPreview"]')).not.toBeNull();
    });

    it("#toc 与 .nopopups 内链接不出弹窗；容器外链接不绑定", async () => {
        const mod = await fresh();
        const { content } = hostWithLink("Foo");
        const toc = document.createElement("div");
        toc.id = "toc";
        const tocLink = document.createElement("a");
        tocLink.href = `${TITLEBASE}Section`;
        toc.append(tocLink);
        content.append(toc);
        const nopop = document.createElement("span");
        nopop.className = "nopopups";
        const nopopLink = document.createElement("a");
        nopopLink.href = `${TITLEBASE}Bar`;
        nopop.append(nopopLink);
        content.append(nopop);
        const outside = document.createElement("a");
        outside.href = `${TITLEBASE}Baz`;
        document.body.append(outside);
        mod.events.setupTooltips();
        hover(mod, tocLink);
        expect(tocLink.navpopup).toBeUndefined();
        hover(mod, nopopLink);
        expect(nopopLink.navpopup).toBeUndefined();
        hover(mod, outside);
        expect(outside.navpopup).toBeUndefined();
        expect(visiblePopups()).toHaveLength(0);
    });
});
