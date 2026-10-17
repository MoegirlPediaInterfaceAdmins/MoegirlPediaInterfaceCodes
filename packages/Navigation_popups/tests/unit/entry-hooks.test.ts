// entry 动态内容重扫（legacy entry.ts:47-87 的 ready 内同层 IIFE）：
// ready 时既有 .mw-parser-output 的初始扫描、wikipage.content 与 Echo 浮层
// hook 的新内容补扫、mw-content-text 首帧的 once 抑制、可见弹窗的
// posCheckerHook 注册，以及 setupPopups 未完成时 doIt 延迟到初始化完成。
// 行为基准 = legacy src/entry.ts（commit 02c8dec）。
//
// 装配形态：installMw + location 桩 + 真 boot（boot.test.ts 同款）——entry
// 的 ready 回调把 boot() 与 hook 装配并列，setupPopups 由 boot 真实驱动，
// 因此本文件不 mock 任何 src 模块；hook 的 fire 走 mockMw 的可编程实现。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw, type MockApi, type MockMw } from "../helpers/mockMw.ts";
import { SPECIAL_PAGE_ALIASES, SITEBASE, TITLEBASE } from "../helpers/wikiFixtures.ts";
import { assume } from "../../src/core/tools.ts";
import type * as BootNs from "../../src/boot.ts";
import type * as EventsNs from "../../src/core/events.ts";
import type * as PopupNs from "../../src/core/popup.ts";
import type * as StateNs from "../../src/state.ts";

type Boot = typeof BootNs;
type Events = typeof EventsNs;
type Popup = typeof PopupNs;
type StateModule = typeof StateNs;
type BoundNavpopup = EventsNs.BoundNavpopup;

interface FreshOptions {
    /** ready 前预置的 body HTML（初始 .mw-parser-output 扫描用） */
    bodyHtml?: string;
    /** readyState 桩（默认 complete：ready 回调内直接 boot） */
    readyState?: string;
    /** mw.Api.get 返回挂起 promise，由用例经 resolveGet 放行（延迟装配用例） */
    deferApiGet?: boolean;
}

interface Fresh {
    boot: Boot;
    events: Events;
    mw: MockMw;
    popup: Popup;
    state: StateModule;
    api: MockApi;
    /** deferApiGet 时指向挂起 promise 的 resolver */
    resolveGet: (response: unknown) => void;
}

const tick = async (): Promise<void> => {
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
};

// jsdom 的 document.readyState 是原型 getter，在实例上定义可写属性遮蔽之
// （entry.test.ts 先例）
const setReadyState = (state: string): void => {
    Reflect.defineProperty(document, "readyState", {
        get: () => state,
        configurable: true,
    });
};

let currentPopup: Popup | null = null;

const fresh = async (options: FreshOptions = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw({ config: { wgArticlePath: "/wiki/$1" } });
    vi.stubGlobal("location", {
        hostname: SITEBASE,
        port: "",
        protocol: "https:",
        href: `https://${SITEBASE}/wiki/`,
    });
    setReadyState(options.readyState ?? "complete");
    if (options.bodyHtml) {
        document.body.innerHTML = options.bodyHtml;
    }
    Reflect.deleteProperty(window, "pg");
    const [boot, events, popup, siteinfo, stateMod] = await Promise.all([
        import("../../src/boot.ts"),
        import("../../src/core/events.ts"),
        import("../../src/core/popup.ts"),
        import("../../src/api/siteinfo.ts"),
        import("../../src/state.ts"),
    ]);
    currentPopup = popup;
    // mw.Api 单例在 fetchSpecialPageNames 内惰性创建，故先取句柄再编程响应
    // （boot.test.ts 先例）
    siteinfo.getMwApi();
    const api = assume(installed.apiInstances[0]);
    let resolveGet: (response: unknown) => void = () => {
        // 非 deferApiGet 分支的占位：没有挂起的请求可放行
    };
    if (options.deferApiGet) {
        api.get.mockReturnValue(new Promise((resolve) => {
            resolveGet = resolve;
        }));
    } else {
        api.get.mockResolvedValue({ query: { specialpagealiases: SPECIAL_PAGE_ALIASES } });
    }
    // entry 的 ready 回调（boot 调度 + hook 装配）在 import 之后的宏任务里执行
    await import("../../src/entry.ts");
    await tick();
    return { boot, events, mw: installed.mw, popup, state: stateMod, api, resolveGet };
};

// 初始化序列跑完的强前提：completed 之后 setupPopups(callback) 才是同步回调，
// 用例里「fire hook 后立刻断言」才有确定性
const waitSetup = async (f: Fresh): Promise<void> => {
    await vi.waitFor(() => {
        expect(f.boot.setupPopups.completed).toBe(true);
    });
};

// #content 容器与一条站内链接（绝对 URL 走 titlebase——location 是桩，
// 相对 URL 会按 jsdom 的 localhost 文档基址解析，匹配不上站点正则）
const hostWithLink = (name: string, options: { id?: string; classes?: string; attach?: boolean } = {}): { container: HTMLElement; a: HTMLAnchorElement } => {
    const container = document.createElement("div");
    if (options.id) {
        container.id = options.id;
    }
    if (options.classes) {
        container.className = options.classes;
    }
    const a = document.createElement("a");
    a.href = `${TITLEBASE}${name}`;
    a.append(document.createTextNode(name));
    container.append(a);
    if (options.attach !== false) {
        document.body.append(container);
    }
    return { container, a };
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

afterEach(() => {
    currentPopup?.Navpopup.tracker.disable();
    currentPopup = null;
    $(window).off("load");
    document.body.innerHTML = "";
    document.onmousemove = null;
    Reflect.deleteProperty(window, "pg");
    Reflect.deleteProperty(document, "readyState");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("entry 初始 .mw-parser-output 扫描", () => {
    it("ready 时既有 .mw-parser-output 逐个立即处理（真实初始化驱动的延迟回调）", async () => {
        // loading：boot 只在 load 事件后跑，本用例只走初始扫描触发的
        // setupPopups(doIt)——链接绑定与容器标记只可能来自该延迟回调
        const f = await fresh({
            readyState: "loading",
            bodyHtml: `<div class="mw-parser-output"><a href="${TITLEBASE}Foo">Foo</a></div>`,
        });
        await waitSetup(f);
        const container = assume(document.querySelector<HTMLElement>(".mw-parser-output"));
        const a = assume(container.querySelector("a"));
        expect(a.hasPopup).toBe(true);
        expect(container.ranSetupTooltipsAlready).toBe(true);
    });

    it("初始扫描中 id=mw-content-text 的 .mw-parser-output 同样被 once 跳过", async () => {
        // 首帧该元素的动态内容会由 MediaWiki 在 wikipage.content 上重放，
        // 初始扫描这一遍即白跑——legacy 正是让它吃掉 once。另设一个普通
        // .mw-parser-output：初始扫描的 setupPopups(doIt) 由它触发，
        // 否则整段初始化根本没人调起（once 分支在 setupPopups 之前返回）
        const f = await fresh({
            readyState: "loading",
            bodyHtml:
                `<div class="mw-parser-output"><a href="${TITLEBASE}Plain">Plain</a></div>`
                + `<div class="mw-parser-output" id="mw-content-text"><a href="${TITLEBASE}Body">Body</a></div>`,
        });
        await waitSetup(f);
        const plain = assume(document.querySelector<HTMLElement>(".mw-parser-output:not(#mw-content-text)"));
        expect(assume(plain.querySelector("a")).hasPopup).toBe(true);
        // 正文容器被跳过：标记与链接绑定都不存在
        const body = assume(document.getElementById("mw-content-text"));
        const bodyLink = assume(body.querySelector("a"));
        expect(bodyLink.hasPopup).toBeUndefined();
        expect(body.ranSetupTooltipsAlready).toBeUndefined();
        // once 已被初始扫描消耗，后续正文触发直接处理
        f.mw.hook("wikipage.content").fire($(body));
        expect(bodyLink.hasPopup).toBe(true);
        expect(body.ranSetupTooltipsAlready).toBe(true);
    });
});

describe("mw-content-text 的 once 抑制", () => {
    it("首帧触发的正文容器被跳过，once 用尽后同一容器再触发才重扫", async () => {
        const f = await fresh();
        await waitSetup(f);
        // setup 完成后新建的容器不会被 boot 的全局扫描碰到，
        // 「未绑定」只可能来自 once 抑制
        const { container, a } = hostWithLink("Foo", { id: "mw-content-text" });
        f.mw.hook("wikipage.content").fire($(container));
        expect(a.hasPopup).toBeUndefined();
        expect(container.ranSetupTooltipsAlready).toBeUndefined();
        f.mw.hook("wikipage.content").fire($(container));
        expect(a.hasPopup).toBe(true);
        expect(container.ranSetupTooltipsAlready).toBe(true);
    });

    it("非 mw-content-text 的首次触发立即处理（多元素集合逐个扫），且不消耗 once", async () => {
        const f = await fresh();
        await waitSetup(f);
        const first = hostWithLink("Alpha");
        const second = hostWithLink("Gamma");
        f.mw.hook("wikipage.content").fire($([first.container, second.container]));
        expect(first.a.hasPopup).toBe(true);
        expect(second.a.hasPopup).toBe(true);
        // once 未被前一次触发消耗：正文容器的首次触发仍被跳过
        const body = hostWithLink("Beta", { id: "mw-content-text" });
        f.mw.hook("wikipage.content").fire($(body.container));
        expect(body.a.hasPopup).toBeUndefined();
    });
});

describe("wikipage.content hook 的新内容补扫", () => {
    it("清容器标记后重扫：初次扫描后追加的新链接被补挂", async () => {
        const f = await fresh();
        await waitSetup(f);
        expect(f.mw.hook("wikipage.content").add).toHaveBeenCalledTimes(1);
        const { container, a } = hostWithLink("Old");
        // 先手动扫一遍：标记置位、旧链接已绑定
        f.events.setupTooltips(container);
        expect(container.ranSetupTooltipsAlready).toBe(true);
        const b = document.createElement("a");
        b.href = `${TITLEBASE}New`;
        b.append(document.createTextNode("New"));
        container.append(b);
        f.mw.hook("wikipage.content").fire($(container));
        // doIt 先复位标记再 setupTooltips，否则二级扫描会被标记挡掉
        expect(b.hasPopup).toBe(true);
        expect(a.hasPopup).toBe(true);
        expect(container.ranSetupTooltipsAlready).toBe(true);
    });
});

describe("Echo 浮层 hook", () => {
    it("只扫 $overlay.find('.mw-echo-state') 子树", async () => {
        const f = await fresh();
        await waitSetup(f);
        const overlay = $("<div>").append(
            `<div class="mw-echo-state"><a href="${TITLEBASE}Echo">Echo</a></div>`,
            `<div class="mw-echo-other"><a href="${TITLEBASE}Other">Other</a></div>`,
        );
        f.mw.hook("ext.echo.overlay.beforeShowingOverlay").fire(overlay);
        const stateEl = assume(overlay.find(".mw-echo-state")[0]);
        const inside = assume(stateEl.querySelector("a"));
        expect(inside.hasPopup).toBe(true);
        expect(stateEl.ranSetupTooltipsAlready).toBe(true);
        // 子树之外的同级内容不归本次重扫管
        const outside = assume(assume(overlay.find(".mw-echo-other")[0]).querySelector("a"));
        expect(outside.hasPopup).toBeUndefined();
    });
});

describe("可见弹窗的位置守卫注册", () => {
    it("只给 isVisible() 的弹窗注册 posCheckerHook，无弹窗的链接跳过", async () => {
        const f = await fresh();
        await waitSetup(f);
        const addHook = vi.spyOn(f.popup.Navpopup.tracker, "addHook");
        const bare = document.createElement("a");
        const hiddenLink = document.createElement("a");
        hiddenLink.navpopup = boundNavpop(f, 1);
        const visibleLink = document.createElement("a");
        const visible = boundNavpop(f, 2);
        visible.visible = true;
        visibleLink.navpopup = visible;
        f.events.eventsState.current.links = [bare, hiddenLink, visibleLink];
        f.mw.hook("wikipage.content").fire($(document.createElement("div")));
        expect(addHook).toHaveBeenCalledTimes(1);
        // 注册的确是 visible 弹窗的 posCheckerHook：弹窗不再可见后请求注销自身
        const hook = assume(addHook.mock.calls[0]?.[0]);
        visible.visible = false;
        expect(hook()).toBe(true);
    });
});

describe("setupPopups 未完成时的 doIt 延迟", () => {
    it("初始化挂起时 fire hook 不重扫，放行后延迟回调才绑定", async () => {
        const f = await fresh({ deferApiGet: true });
        expect(f.boot.setupPopups.completed).toBeUndefined();
        // 容器不入文档：初始化完成时的全局扫描（默认容器回落 document）
        // 碰不到它，绑定只可能来自 doIt
        const { container, a } = hostWithLink("Deferred", { attach: false });
        f.mw.hook("wikipage.content").fire($(container));
        await tick();
        expect(a.hasPopup).toBeUndefined();
        expect(container.ranSetupTooltipsAlready).toBeUndefined();
        f.resolveGet({ query: { specialpagealiases: SPECIAL_PAGE_ALIASES } });
        await vi.waitFor(() => {
            expect(a.hasPopup).toBe(true);
        });
        expect(container.ranSetupTooltipsAlready).toBe(true);
    });
});
