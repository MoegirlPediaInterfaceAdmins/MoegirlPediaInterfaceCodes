// 快捷键域镜像测试：popupShortcutKeys 开启时 document.onkeypress 的接管与
// 恢复（Esc→killPopup、popupkey 字母循环 + jQuery trigger("focus")）、
// addPopupShortcut 的 popupkey 属性注入与 title 后缀（空格→「空格」）。
// 行为基准 = legacy shortcutkeys.ts（commit 02c8dec）。与 events 域的衔接
// （killPopup/current 状态来自 events）以 fresh 模块图装配。
/* eslint-disable @typescript-eslint/no-deprecated -- keypress/keyCode/window.event
   是本特性测试的上游契约面（src/core/shortcutkeys.ts 同款豁免） */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as ShortcutkeysNs from "../../../src/core/shortcutkeys.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as TitleNs from "../../../src/title/title.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as PopupNs from "../../../src/core/popup.ts";

type Events = typeof EventsNs;
type Shortcutkeys = typeof ShortcutkeysNs;
type Options = typeof OptionsNs;
type Title = typeof TitleNs;
type Namespaces = typeof NamespacesNs;
type Popup = typeof PopupNs;

const SITEBASE = "zh.moegirl.org.cn";
const TITLEBASE = `https://${SITEBASE}/index.php?title=`;

interface Fresh {
    events: Events;
    shortcutkeys: Shortcutkeys;
    options: Options;
    title: Title;
    namespaces: Namespaces;
    popup: Popup;
}

const fresh = async (options: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const events = await import("../../../src/core/events.ts");
    const shortcutkeys = await import("../../../src/core/shortcutkeys.ts");
    const optionsMod = await import("../../../src/core/options.ts");
    const title = await import("../../../src/title/title.ts");
    const namespaces = await import("../../../src/title/namespaces.ts");
    const popup = await import("../../../src/core/popup.ts");
    const installed = installMw();
    // isPopupLink/Title.fromURL 所需的最小 wiki 基址装配
    namespaces.setNamespaces();
    const esc = installed.mw.util.escapeRegExp;
    title.wiki.titlebase = TITLEBASE;
    title.wiki.re.basenames = RegExp(`^(${esc(TITLEBASE)}|${esc(`https://${SITEBASE}`)})`);
    title.wiki.re.urlNoPopup = /.^/;
    const never = /.^/;
    title.wiki.re.contribs = never;
    title.wiki.re.email = never;
    title.wiki.re.backlinks = never;
    title.wiki.re.specialdiff = never;
    // 捕获序契约：组1=前缀、组2=title、组3=锚点（Title.fromURL 按 m[2]/m[3] 取值，
    // 前缀组必须是捕获组——与 events.test.ts 的装配公式一致）
    title.wiki.re.main = RegExp(`[^:]*://${esc(SITEBASE)}(${esc("/index.php")}[?]title=|${esc("/")})([^&?#]*)[^#]*(?:#(.+))?`);
    optionsMod.setOptions();
    for (const [key, value] of Object.entries(options)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { events, shortcutkeys, options: optionsMod, title, namespaces, popup };
};

let windowOptionKeys: string[] = [];

// 悬停出可见弹窗并把 current.link/锚点弹窗就位（快捷键的判定前提）
const hoverToShow = (mod: Fresh, titleName: string): HTMLAnchorElement => {
    Reflect.defineProperty(document.body, "clientWidth", { value: 1000, configurable: true });
    const content = document.createElement("div");
    content.id = "content";
    const a = document.createElement("a");
    a.href = `${TITLEBASE}${titleName}`;
    content.append(a);
    document.body.append(content);
    mod.events.setupTooltips();
    mod.popup.Navpopup.tracker.setPosition(30, 40);
    a.dispatchEvent(new MouseEvent("mouseover", { clientX: 30, clientY: 40, bubbles: true }));
    vi.advanceTimersByTime(500);
    return a;
};

// 直接以鸭子类型事件调用当前 keypress 处理器（jsdom KeyboardEvent 不支持
// keyCode 初始化，legacy 读取面为 window.event/keyCode/which 三级）
const press = (evt: Record<string, unknown>): unknown => {
    const handler = document.onkeypress;
    expect(handler).toBeTypeOf("function");
    if (!handler) {
        throw new Error("keypress handler missing");
    }
    return Reflect.apply(handler, document, [evt]);
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
    Reflect.deleteProperty(window, "event");
    document.onkeypress = null;
    Reflect.deleteProperty(document, "oldPopupOnkeypress");
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe("addPopupShortcut", () => {
    it("popupShortcutKeys 关闭（默认）：原样返回（含 null 透传）", async () => {
        const mod = await fresh();
        expect(mod.shortcutkeys.addPopupShortcut('<a href="x" title="T">label</a>', "a")).toBe('<a href="x" title="T">label</a>');
        expect(mod.shortcutkeys.addPopupShortcut(null, "a")).toBeNull();
    });

    it("开启：注入 popupkey 属性并给 title 加「 [key]」后缀", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        // legacy addLinkProperty 把 popupkey 插在第一个 ">" 之前——title 已在
        // 该位置前，故产物序为 title 在前、popupkey 在后（属性序无语义，照搬）
        expect(mod.shortcutkeys.addPopupShortcut('<a href="x" title="T">label</a>', "a")).toBe('<a href="x" title="T [a]" popupkey="a">label</a>');
    });

    it("空格键：属性注入原样空格，后缀显示译名「空格」", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        expect(mod.shortcutkeys.addPopupShortcut('<a href="x" title="T">label</a>', " ")).toBe('<a href="x" title="T [空格]" popupkey=" ">label</a>');
    });

    it('无 ">" 的片段原样返回；无 title 属性时只注入 popupkey 不加后缀', async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        expect(mod.shortcutkeys.addPopupShortcut("<a href=", "a")).toBe("<a href=");
        expect(mod.shortcutkeys.addPopupShortcut("<a href=x>label</a>", "a")).toBe('<a href=x popupkey="a">label</a>');
    });
});

describe("addPopupShortcuts / rmPopupShortcuts", () => {
    it("接管 document.onkeypress 并保存旧 handler；重复接管不覆盖旧值", async () => {
        const mod = await fresh();
        const old = (): boolean => true;
        document.onkeypress = old;
        mod.shortcutkeys.addPopupShortcuts();
        expect(document.onkeypress).toBeTypeOf("function");
        expect(document.onkeypress).not.toBe(old);
        expect(document.oldPopupOnkeypress).toBe(old);
        mod.shortcutkeys.addPopupShortcuts();
        expect(document.oldPopupOnkeypress).toBe(old);
    });

    it("rmPopupShortcuts 恢复旧 handler；原先为空则清空", async () => {
        const mod = await fresh();
        const old = (): boolean => true;
        document.onkeypress = old;
        mod.shortcutkeys.addPopupShortcuts();
        mod.shortcutkeys.rmPopupShortcuts();
        expect(document.onkeypress).toBe(old);
        document.onkeypress = null;
        Reflect.deleteProperty(document, "oldPopupOnkeypress");
        mod.shortcutkeys.addPopupShortcuts();
        mod.shortcutkeys.rmPopupShortcuts();
        expect(document.onkeypress).toBeNull();
    });

    it("oldPopupOnkeypress 即处理器自身时直接置空（legacy 防自引用循环分支）", async () => {
        const mod = await fresh();
        mod.shortcutkeys.addPopupShortcuts();
        document.oldPopupOnkeypress = document.onkeypress;
        mod.shortcutkeys.rmPopupShortcuts();
        expect(document.onkeypress).toBeNull();
    });

    it("恢复 onkeypress 赋值抛错时静默吞掉（legacy try/catch）", async () => {
        const mod = await fresh();
        mod.shortcutkeys.addPopupShortcuts();
        Reflect.defineProperty(document, "onkeypress", {
            get: (): null => null,
            set: (): void => {
                throw new Error("boom");
            },
            configurable: true,
        });
        expect(() => {
            mod.shortcutkeys.rmPopupShortcuts();
        }).not.toThrow();
        Reflect.deleteProperty(document, "onkeypress");
    });
});

describe("popupHandleKeypress（经 document.onkeypress 接管后调用）", () => {
    it("无 keyCode 或无当前弹窗：直接返回 undefined", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        mod.shortcutkeys.addPopupShortcuts();
        expect(press({ keyCode: 0, which: 0 })).toBeUndefined();
        hoverToShow(mod, "Foo");
        // killPopup 后 current.link 清空（killPopup 会顺带摘除接管，重新接管
        // 后再验证「无当前弹窗」分支的返回值）
        Reflect.apply(mod.events.killPopup, document.createElement("a"), []);
        mod.shortcutkeys.addPopupShortcuts();
        expect(press({ keyCode: 65 })).toBeUndefined();
    });

    it("Esc(27)：killPopup 当前弹窗并返回 false", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        const a = hoverToShow(mod, "Foo");
        expect(a.navpopup?.isVisible()).toBe(true);
        expect(press({ keyCode: 27 })).toBe(false);
        expect(a.navpopup?.isVisible()).toBe(false);
        expect(mod.events.eventsState.current.link).toBeNull();
    });

    it("字母循环：从上次选中项的下一位起查找 popupkey 匹配锚点并 jQuery trigger focus", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        const a = hoverToShow(mod, "Foo");
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        // jsdom 与真实浏览器一致：无 href 的 <a> 不可聚焦，focus 路径需要 href
        navpop.mainDiv.innerHTML = '<div><a popupkey="a" id="k0" href="#">0</a><a popupkey="a" id="k1" href="#">1</a><a popupkey="a" id="k2" href="#">2</a></div>';
        const focused: string[] = [];
        for (const id of ["k0", "k1", "k2"]) {
            document.getElementById(id)?.addEventListener("focus", () => {
                focused.push(id);
            });
        }
        const preventDefault = vi.fn();
        // 首按选中 links[1]（legacy 从 startLink+1 起查找），其后循环 2→0
        expect(press({ keyCode: 97, preventDefault })).toBe(false);
        expect(focused).toEqual(["k1"]);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(document.activeElement?.id).toBe("k1");
        expect(press({ keyCode: 97, preventDefault: vi.fn() })).toBe(false);
        expect(focused).toEqual(["k1", "k2"]);
        expect(press({ keyCode: 97, preventDefault: vi.fn() })).toBe(false);
        expect(focused).toEqual(["k1", "k2", "k0"]);
    });

    it("上次选中项已不在弹窗内：从头查找（startLink 保持 0）", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        const a = hoverToShow(mod, "Foo");
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        navpop.mainDiv.innerHTML = '<a popupkey="b" id="k0" href="#">0</a><a popupkey="b" id="k1" href="#">1</a>';
        expect(press({ keyCode: 98, preventDefault: vi.fn() })).toBe(false);
        expect(document.activeElement?.id).toBe("k1");
        // 清空弹窗内容使 lastPopupLinkSelected 悬空，再按→仍从 index 1 起
        navpop.mainDiv.innerHTML = '<a popupkey="b" id="n0" href="#">0</a><a popupkey="b" id="n1" href="#">1</a>';
        document.getElementById("n0")?.focus();
        expect(press({ keyCode: 98, preventDefault: vi.fn() })).toBe(false);
        expect(document.activeElement?.id).toBe("n1");
    });

    it("无匹配字母：回落旧 handler 的返回值；无旧 handler 返回 true", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        const a = hoverToShow(mod, "Foo");
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        navpop.mainDiv.innerHTML = '<a popupkey="a">0</a>';
        expect(press({ keyCode: 122 })).toBe(true);
        const old = vi.fn(() => "OLD" as unknown as boolean);
        document.oldPopupOnkeypress = old;
        expect(press({ keyCode: 122 })).toBe("OLD");
        expect(old).toHaveBeenCalledTimes(1);
    });

    it("evt.keyCode 为 0 时回落 evt.which；window.event 存在时优先取其 keyCode", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        const a = hoverToShow(mod, "Foo");
        const navpop = a.navpopup;
        if (!navpop) {
            throw new Error("navpopup missing");
        }
        // which=98 → "b" 命中
        navpop.mainDiv.innerHTML = '<a popupkey="b" id="w0" href="#">0</a>';
        expect(press({ keyCode: 0, which: 98, preventDefault: vi.fn() })).toBe(false);
        expect(document.activeElement?.id).toBe("w0");
        // window.event 优先：其 keyCode=99 → "c"
        navpop.mainDiv.innerHTML = '<a popupkey="c" id="w1" href="#">0</a>';
        Reflect.defineProperty(window, "event", { value: { keyCode: 99 }, configurable: true });
        expect(press({ keyCode: 0, which: 122, preventDefault: vi.fn() })).toBe(false);
        expect(document.activeElement?.id).toBe("w1");
    });
});

describe("与 events 域的衔接（registerHooks 挂载）", () => {
    it("弹窗 unhide 后接管 keypress，hide 前摘除（popupShortcutKeys 开启时）", async () => {
        const mod = await fresh({ popupShortcutKeys: true });
        const a = hoverToShow(mod, "Foo");
        expect(document.onkeypress).toBeTypeOf("function");
        a.navpopup?.banish();
        expect(document.onkeypress).toBeNull();
    });
});
