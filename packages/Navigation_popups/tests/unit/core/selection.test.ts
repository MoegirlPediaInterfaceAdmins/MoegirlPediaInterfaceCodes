// selection 域单元测试：编辑框选区弹窗（cursor / boxpreview 两模式）。
// 行为基准 = legacy src/modules/selpop.ts（commit 02c8dec）的 doSelectionPopup /
// doSeparateSelectionPopup / getEditboxSelection（Mousetracker 类已在
// core/mousetracker.ts 承接，不在此测）。装配与 hover 集成测试同款：
// fresh 模块图 + wikiFixtures + setOptions + tracker.enable。
// legacy 的 document.editform try/catch（跨域 iframe 读取）与 box.parentNode
// try/catch 在主文档正常路径永不触发、jsdom 不可构造——按「不过度防御」
// 删除并登记 semantic-notes（待阶段 5 重写）。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { buildTitleWikiFixtures, TITLEBASE } from "../../helpers/wikiFixtures.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as InstaNs from "../../../src/preview/insta.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as SelectionNs from "../../../src/core/selection.ts";
import type * as TitleNs from "../../../src/title/title.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";

type Events = typeof EventsNs;
type Htmlout = typeof HtmloutNs;
type Insta = typeof InstaNs;
type Options = typeof OptionsNs;
type Popup = typeof PopupNs;
type Selection = typeof SelectionNs;
type TitleModule = typeof TitleNs;
type Namespaces = typeof NamespacesNs;

interface Fresh {
    selection: Selection;
    events: Events;
    htmlout: Htmlout;
    insta: Insta;
    options: Options;
    popup: Popup;
    title: TitleModule;
    namespaces: Namespaces;
}

let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const [selection, events, htmlout, insta, options, popup, title, namespaces] = await Promise.all([
        import("../../../src/core/selection.ts"),
        import("../../../src/core/events.ts"),
        import("../../../src/core/htmlout.ts"),
        import("../../../src/preview/insta.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/popup.ts"),
        import("../../../src/title/title.ts"),
        import("../../../src/title/namespaces.ts"),
    ]);
    const installed = installMw();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    options.setOptions();
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    // wiki2html 的站点态（BLOCK_IMAGE 等）由 setupLivePreview 构造——
    // 真实页面由 boot 装配，测试就地补上（参数同 insta.test.ts 站点形态）
    insta.setupLivePreview({
        articlePath: "/wiki",
        interwiki: "en|ja",
        imageNamespace: "File",
        categoryNamespace: "Category",
    });
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    popup.Navpopup.tracker.enable();
    return { selection, events, htmlout, insta, options, popup, title, namespaces };
};

// 构造 document.editform.wpTextbox1 并整选 value（selectionStart/End 全覆盖）。
// setSelectionRange 须在元素 attach 后调用——jsdom 对 detached 元素不落选区
const installEditbox = (value: string, selStart?: number, selEnd?: number): HTMLTextAreaElement => {
    const form = document.createElement("form");
    const box = document.createElement("textarea");
    box.name = "wpTextbox1";
    box.value = value;
    form.appendChild(box);
    document.body.appendChild(form);
    (document as unknown as Record<string, unknown>).editform = form;
    // jsdom 不实现 HTMLFormElement 的 named getter（form.wpTextbox1 直取
    // 恒 undefined，form.elements.namedItem 才有）；真实浏览器两者等价，
    // 测试手动挂属性模拟同一语义
    (form as unknown as Record<string, unknown>).wpTextbox1 = box;
    const start = selStart ?? 0;
    const end = selEnd ?? value.length;
    box.setSelectionRange(start, end);
    return box;
};

describe("doSelectionPopup（cursor 模式）", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        // popTipsSoonFn 的 600ms 注入与 stop 定时器清场
        vi.advanceTimersByTime(2000);
        vi.useRealTimers();
        Reflect.deleteProperty(document, "editform");
        document.body.innerHTML = "";
        for (const key of windowOptionKeys) {
            Reflect.deleteProperty(window, key);
        }
        windowOptionKeys = [];
    });

    it("选区含 [[链接|标签]] 时对链接标题发起悬停弹窗（href 为 titlebase + urlString）", async () => {
        const mod = await fresh();
        installEditbox("前言[[Foo|bar]]后记");
        mod.selection.doSelectionPopup();
        const content = document.querySelector("#content");
        // mouseOverWikiLink2 对合成锚点生效：弹窗已登记进 eventsState.linksHash
        const created = mod.events.eventsState.current.link;
        expect(created).toBeTruthy();
        expect(created?.href).toBe(`${TITLEBASE}Foo`);
        expect(created?.navpopup).toBeTruthy();
        expect(content).toBeNull();
    });

    it("无管道的 [[链接]] 取到闭括号前", async () => {
        const mod = await fresh();
        installEditbox("[[Foo]]");
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link?.href).toBe(`${TITLEBASE}Foo`);
    });

    it("选区无 [[ 时静默返回（不建弹窗）", async () => {
        const mod = await fresh();
        installEditbox("普通文本没有链接");
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link).toBeNull();
    });

    it("有 [[ 但既无 | 也无 ]] 时返回", async () => {
        const mod = await fresh();
        installEditbox("[[Foo");
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link).toBeNull();
    });

    it("管道出现在 [[ 之前（运算符优先级怪癖照搬：|| pipe!== -1 && open > pipe）", async () => {
        const mod = await fresh();
        installEditbox("|尾巴[[Foo");
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link).toBeNull();
    });

    it("闭括号出现在 [[ 之前时返回", async () => {
        const mod = await fresh();
        installEditbox("]]尾巴[[Foo");
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link).toBeNull();
    });

    it("首个 ]] 之后还残留 [[（多链接选区）时返回", async () => {
        const mod = await fresh();
        installEditbox("[[a]] 和 [[b]]");
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link).toBeNull();
    });

    it("弹窗 unhide after 钩子上注册了停止计时器（悬停驻留语义）", async () => {
        const mod = await fresh();
        installEditbox("[[Foo|bar]]");
        mod.selection.doSelectionPopup();
        const navpop = mod.events.eventsState.current.link?.navpopup;
        expect(navpop).toBeTruthy();
        // legacy 在 "unhide"/"after" 注册 runStopPopupTimer——钩子登记可查
        const hookFound = navpop?.hooks.unhide?.some((e) => e?.when === "after");
        expect(hookFound).toBe(true);
    });

    it("modifier 门控拦截悬停时无弹窗可挂钩（navpop 空分支，不崩溃）", async () => {
        // popupModifier+enable：无修饰键的合成 mouseover 被拦，a.navpopup 不存在
        const mod = await fresh({ popupModifier: true, popupModifierAction: "enable" });
        installEditbox("[[Foo|bar]]");
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link).toBeNull();
    });

    it("unhide 触发时经钩子启动停止计时器（驻留语义，runStopPopupTimer 侧行为由 events 域测试）", async () => {
        const mod = await fresh();
        installEditbox("[[Foo|bar]]");
        mod.selection.doSelectionPopup();
        const navpop = mod.events.eventsState.current.link?.navpopup;
        expect(navpop).toBeTruthy();
        // 触发 unhide after 钩子：注册的 runStopPopupTimer 启动隐藏倒计时
        navpop?.runHooks("unhide", "after");
        vi.advanceTimersByTime(4000);
        // 钩子执行无异常即覆盖（隐藏路径的细粒度断言在 events 域）
        expect(mod.events.eventsState.current.link?.navpopup).toBe(navpop);
    });
});

describe("doSelectionPopup（boxpreview 模式）", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.advanceTimersByTime(2000);
        vi.useRealTimers();
        Reflect.deleteProperty(document, "editform");
        document.body.innerHTML = "";
        for (const key of windowOptionKeys) {
            Reflect.deleteProperty(window, key);
        }
        windowOptionKeys = [];
    });

    it("创建 #selectionPreview 于编辑框之前，innerHTML 为 wiki2html 输出", async () => {
        const mod = await fresh({ popupOnEditSelection: "boxpreview" });
        const box = installEditbox("[[Foo|bar]]");
        mod.selection.doSelectionPopup();
        const div = document.getElementById("selectionPreview");
        expect(div).toBeTruthy();
        // 期望值与 insta 同参调用一致（insta 自身 156 用例锁定输出语义）；
        // innerHTML 读回经 jsdom 重序列化（属性引号统一双引号），期望值
        // 同过一遍 DOM 往返对齐
        const holder = document.createElement("div");
        holder.innerHTML = mod.insta.wiki2html("[[Foo|bar]]");
        expect(div?.innerHTML).toBe(holder.innerHTML);
        // insertBefore(div, box)：div 位于编辑框之前（previousSibling 语义
        // 用 box 侧断言——div 是 form 首子节点时其 previousSibling 为 null）
        expect(box.previousElementSibling).toBe(div);
        expect((div as unknown as Record<string, unknown>).ranSetupTooltipsAlready).toBe(false);
        // popTipsSoonFn 的注入定时器推进后不再崩溃（tooltip 扫描缝未注册时安全）
        vi.advanceTimersByTime(700);
        expect(document.getElementById("selectionPreview")).toBe(div);
    });

    it("复用已存在的 #selectionPreview（不重复建 div）", async () => {
        const mod = await fresh({ popupOnEditSelection: "boxpreview" });
        installEditbox("[[Foo|bar]]");
        const existing = document.createElement("div");
        existing.id = "selectionPreview";
        document.body.appendChild(existing);
        mod.selection.doSelectionPopup();
        const divs = document.querySelectorAll("#selectionPreview");
        expect(divs).toHaveLength(1);
        expect(divs[0]).toBe(existing);
    });

    it("无编辑框（document.editform 缺失）时静默返回，不建 div", async () => {
        const mod = await fresh({ popupOnEditSelection: "boxpreview" });
        // 不安装 editform；直接以空选区路径进入（getEditboxSelection 返回 ""）
        mod.selection.doSelectionPopup();
        expect(document.getElementById("selectionPreview")).toBeNull();
    });

    it("IE 选区可用但编辑框缺失：div 创建中途放弃（box?.parentNode 早退，legacy IE 场景）", async () => {
        const mod = await fresh({ popupOnEditSelection: "boxpreview" });
        // IE 分支取选区不依赖编辑框；doSeparateSelectionPopup 二次读取时
        // editform?.wpTextbox1 为空 → 建到一半放弃，不产出 div
        (document as unknown as Record<string, unknown>).selection = {
            createRange: (): { text: string } => ({ text: "[[Foo|bar]]" }),
        };
        mod.selection.doSelectionPopup();
        expect(document.getElementById("selectionPreview")).toBeNull();
    });
});

describe("getEditboxSelection（经 doSelectionPopup 间接覆盖）", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.advanceTimersByTime(2000);
        vi.useRealTimers();
        Reflect.deleteProperty(document, "editform");
        Reflect.deleteProperty(document, "selection");
        document.body.innerHTML = "";
        for (const key of windowOptionKeys) {
            Reflect.deleteProperty(window, key);
        }
        windowOptionKeys = [];
    });

    it("IE document.selection 分支返回 createRange().text（legacy 回退路径）", async () => {
        const mod = await fresh();
        // 无 editform；document.selection 存在时直接走 IE 分支
        (document as unknown as Record<string, unknown>).selection = {
            createRange: (): { text: string } => ({ text: "[[Foo|bar]]" }),
        };
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link?.href).toBe(`${TITLEBASE}Foo`);
    });

    it("部分选区只取选中片段", async () => {
        const mod = await fresh();
        const text = "前[[Foo|bar]]后";
        // 只选中 "|bar]]" 片段：open=-1 → 静默返回
        installEditbox(text, 3, 10);
        mod.selection.doSelectionPopup();
        expect(mod.events.eventsState.current.link).toBeNull();
    });
});
