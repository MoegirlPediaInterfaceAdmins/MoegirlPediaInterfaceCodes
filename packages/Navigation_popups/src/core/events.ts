// 事件流域：链接绑定（setupTooltips 分批/容器链/#toc 与 .nopopups 排除）、
// 悬停主流程（mouseOverWikiLink/mouseOverWikiLink2，含修饰键与 simplePopups
// 简版渲染）、隐藏流（mouseOut/posCheckerHook/checkPopupPosition/
// runStopPopupTimer）与 killPopup。行为基准 = legacy actions.ts + mouseout.ts
// （commit 02c8dec）。
//
// 与 legacy 的结构差异：pg.current/pg.timer/pg.idNumber 动态域收敛为本模块
// 自持的 eventsState；downloader 域的 abortAllDownloads 改为 registerAbortAll
// 注册缝（阶段 2 注册）；htmlout 的「写入后位置检查」「tips 重扫」两个直调点
// 由 setupTooltips 首次调用时幂等接线（对应 legacy 模块级静态 import 的效果）。
import { log } from "./log.ts";
import { getValueOf, optionStore, setDefault } from "./options.ts";
import { fillEmptySpans, popupHTML, registerPositionChecker, registerTooltipScanner, setPopupHTML, setPopupIdNumber, type PopData } from "./htmlout.ts";
import { setupDraggable } from "./drag.ts";
import { Navpopup } from "./popup.ts";
import { Title, isPopupLink } from "../title/title.ts";
import { popupString } from "./strings.ts";
import { doSelectionPopup } from "./selection.ts";
import { addPopupShortcuts, rmPopupShortcuts } from "./shortcutkeys.ts";
// 预览分派段（legacy actions.ts 160-335）落在 preview/dispatch 域：本域只保留
// 调用点与同名入口的转发（见下方 nonsimplePopupContent）
import { nonsimplePopupContent as dispatchNonsimplePopupContent } from "../preview/dispatch.ts";
import { popupRedlinkHTML } from "../preview/dab.ts";

// events 域在 Navpopup 实例上装配的跨域字段（legacy Navpopup 同名成员；popup
// 域不感知标题/父子弹窗/延迟，由本域在 newNavpopup 时补齐）
declare module "./popup.ts" {
    interface Navpopup {
        article?: Title | null;
        // exactOptionalPropertyTypes：owner 取自可选链，需显式含 undefined
        parentPopup?: Navpopup | null | undefined;
        delay?: number;
        hasPopupMenu?: boolean;
    }
}

// 「已装配弹窗」：newNavpopup 构造后 idNumber/parentAnchor/delay 必已赋值
// （运行时不变量，类型层经交集收紧——结构与 htmlout 的 PopupLike 对接）
export type BoundNavpopup = Navpopup & { idNumber: number; parentAnchor: HTMLAnchorElement | null; delay: number };

// 子弹窗扫描随行数据（legacy setupTooltips 的 popData）：owner 指向宿主弹窗
export type AnchorPopData = { owner?: BoundNavpopup } & Record<string, unknown>;

declare global {
    interface HTMLAnchorElement {
        // 悬停后挂到锚点上的弹窗（legacy a.navpopup）
        navpopup?: BoundNavpopup | null;
        // addTooltip 写入的扫描上下文（legacy a.popData）
        popData?: AnchorPopData | null;
        // 绑定标记（removeTooltip 据此早退；legacy a.hasPopup）
        hasPopup?: boolean;
        // 修饰键监听（DOM0 mouseover 时挂到 document、mouseOut/killPopup 摘除）
        modifierKeyHandler?: (evt: Event) => void;
        // 简易弹窗已被用户展开的标记（legacy a.simpleNoMore）
        simpleNoMore?: boolean;
    }
}

// legacy pg.current 的等价物：当前悬停链接/标题、已建弹窗的锚点登记表
export interface EventsCurrentState {
    link: HTMLAnchorElement | null;
    article: Title | null;
    links: HTMLAnchorElement[];
    // href → navpopup 复用表（legacy pg.current.linksHash）
    linksHash: Record<string, BoundNavpopup>;
}

export interface EventsDomainState {
    current: EventsCurrentState;
    // 跨弹窗编号（legacy pg.idNumber；与 htmlout 的 setPopupIdNumber 同步）
    idNumber: number;
    // 600ms 重定位轮询（legacy pg.timer.checkPopupPosition）
    checkPopupPositionTimer: ReturnType<typeof setInterval> | null;
}

export const eventsState: EventsDomainState = {
    current: { link: null, article: null, links: [], linksHash: {} },
    idNumber: 0,
    checkPopupPositionTimer: null,
};

// 「中止全部下载」注册缝：legacy killPopup 直调 downloader.abortAllDownloads；
// 阶段 2 的 net 域在此注册后生效，未注册时等价于无事可中止
let abortAllFn: (() => void) | null = null;

export const registerAbortAll = (fn: (() => void) | null): void => {
    abortAllFn = fn;
};

export const setupTooltips = (root?: Element | Document | null, remove = false, force = false, popData: AnchorPopData | null = null): void => {
    let container = root;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- 调试日志照搬 legacy 的 String(container) 形态
    log(`setupTooltips, container=${String(container)}, remove=${String(remove)}`);
    wireHtmloutSeams();
    if (!container) {
        // 编辑框选区的弹窗入口：编辑页上把 onmouseup 接到选区解析（legacy
        // actions.ts :25-27；每轮无容器装配时都会重设，上游原样）
        if (getValueOf("popupOnEditSelection") && document.editform?.wpTextbox1) {
            document.editform.wpTextbox1.onmouseup = doSelectionPopup;
        }
        container = defaultPopupsContainer();
    }
    if (!remove && !force && container.ranSetupTooltipsAlready) {
        return;
    }
    container.ranSetupTooltipsAlready = !remove;
    const anchors = container.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>;
    setupTooltipsLoop(anchors, 0, 250, 100, remove, popData);
};

// 容器选择器链〔萌百〕：vector-2022（现行 Vector 皮肤正文容器）→ Moeskin
// 历史 #mw_content → 通用 #content → #article → Moeskin 裸 <article>，逐级
// 回落至 document；popupOnlyArticleLinks=false 时全站绑定
export const defaultPopupsContainer = (): Element | Document => {
    if (getValueOf("popupOnlyArticleLinks")) {
        const moeskinArticle = document.getElementsByTagName("article")[0] as Element | undefined;
        return document.querySelector(".skin-vector-2022 .vector-body")
            ?? document.getElementById("mw_content")
            ?? document.getElementById("content")
            ?? document.getElementById("article")
            ?? moeskinArticle
            ?? document;
    }
    return document;
};

// 分批绑定：每批 250 个 <A>、间隔 100ms——大量链接时避免一次性同步扫描
// 卡死页面（legacy 定值照搬）；批次末尾按选项摘除 #toc 链接
const setupTooltipsLoop = (anchors: HTMLCollectionOf<HTMLAnchorElement>, begin: number, howmany: number, sleep: number, remove: boolean, popData: AnchorPopData | null): void => {
    const finish = begin + howmany;
    const loopend = Math.min(finish, anchors.length);
    let j = loopend - begin;
    log(`setupTooltips: anchors.length=${anchors.length}, begin=${begin}, howmany=${howmany}, loopend=${loopend}, remove=${String(remove)}`);
    const doTooltip: (a: HTMLAnchorElement, popData: AnchorPopData | null) => void = remove ? removeTooltip : addTooltip;
    if (j > 0) {
        do {
            const a = anchors[loopend - j];
            if (!a.href) {
                log(`got null anchor at index ${loopend - j}`);
                continue;
            }
            doTooltip(a, popData);
        } while (--j);
    }
    if (finish < anchors.length) {
        setTimeout(() => {
            setupTooltipsLoop(anchors, finish, howmany, sleep, remove, popData);
        }, sleep);
    } else {
        if (!remove && !getValueOf("popupTocLinks")) {
            rmTocTooltips();
        }
    }
};

const rmTocTooltips = (): void => {
    const toc = document.getElementById("toc");
    if (toc) {
        const tocLinks = toc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>;
        const tocLen = tocLinks.length;
        for (let j = 0; j < tocLen; ++j) {
            removeTooltip(tocLinks[j]);
        }
    }
};

const addTooltip = (a: HTMLAnchorElement, popData: AnchorPopData | null): void => {
    // isPopupLink 首调会顺带完成 .nopopups 容器与 vector 菜单标题链的
    // inNopopupSpan 标记（title 域的 markNopopupSpanLinks，legacy 同款分工）
    if (!isPopupLink(a)) {
        return;
    }
    // DOM0 事件属性接管（而非 addEventListener）是上游刻意为之，照搬
    a.onmouseover = mouseOverWikiLink;
    a.onmouseout = mouseOut;
    a.onmousedown = killPopup;
    a.hasPopup = true;
    a.popData = popData;
};

const removeTooltip = (a: HTMLAnchorElement): void => {
    if (!a.hasPopup) {
        return;
    }
    a.onmouseover = null;
    a.onmouseout = null;
    if (a.originalTitle) {
        a.title = a.originalTitle;
    }
    a.hasPopup = false;
};

const removeTitle = (a: HTMLAnchorElement): void => {
    // 空串是有效暂存哨兵：originalTitle 为空串（锚点本无 title）时不再覆盖；
    // 不用 ??=（es2021 语法，产物目标 es2020 禁用）
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (!a.originalTitle) {
        a.originalTitle = a.title;
    }
    a.title = "";
};

export const restoreTitle = (a: HTMLAnchorElement): void => {
    if (a.title || !a.originalTitle) {
        return;
    }
    a.title = a.originalTitle;
};

export const removeModifierKeyHandler = (a: HTMLAnchorElement): void => {
    // 两类键都摘（挂时只挂其一，多余一侧的摘除是 no-op——legacy 原样）
    document.removeEventListener("keydown", a.modifierKeyHandler as EventListener, false);
    document.removeEventListener("keyup", a.modifierKeyHandler as EventListener, false);
};

export function mouseOverWikiLink(this: GlobalEventHandlers, _evt?: MouseEvent): void {
    let evt = _evt;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- ??= 是 es2021 语法，产物目标 es2020 禁用
    if (evt === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy window.event 回退是上游行为
        evt = window.event as MouseEvent | undefined;
    }
    if (getValueOf("popupModifier")) {
        const action = getValueOf("popupModifierAction");
        // enable=按下才触发（keydown）；disable=按下屏蔽、松开放行（keyup）
        const key = action === "disable" ? "keyup" : "keydown";
        const a = this as HTMLAnchorElement;
        a.modifierKeyHandler = (e: Event): void => {
            mouseOverWikiLink2(a, e as MouseEvent);
        };
        document.addEventListener(key, a.modifierKeyHandler, false);
    }
    mouseOverWikiLink2(this as HTMLAnchorElement, evt);
}

const modifierPressed = (_evt?: MouseEvent): boolean => {
    let evt = _evt;
    // 唯一调用方 isCorrectModifier 已保证 popupModifier 为真值，此处不再判空
    const mod = getValueOf("popupModifier");
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- ??= 是 es2021 语法，产物目标 es2020 禁用
    if (evt === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy window.event 回退是上游行为
        evt = window.event as MouseEvent | undefined;
    }
    // popupModifier 形如 "ctrl"/"shift"，据此读事件上的 ctrlKey/shiftKey
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- mod 运行时为 "ctrl"/"shift" 字符串，照搬 legacy
    return !!(evt && mod && (evt as unknown as Record<string, unknown>)[`${String(mod).toLowerCase()}Key`]);
};

const isCorrectModifier = (_a: HTMLAnchorElement, evt?: MouseEvent): boolean => {
    if (!getValueOf("popupModifier")) {
        return true;
    }
    const action = getValueOf("popupModifierAction");
    return action === "enable" && modifierPressed(evt) || action === "disable" && !modifierPressed(evt);
};

export const mouseOverWikiLink2 = (a: HTMLAnchorElement, evt?: MouseEvent): void => {
    if (!isCorrectModifier(a, evt)) {
        return;
    }
    if (getValueOf("removeTitles")) {
        removeTitle(a);
    }
    if (a === eventsState.current.link && a.navpopup?.isVisible()) {
        return;
    }
    eventsState.current.link = a;
    if (getValueOf("simplePopups") && !optionStore.popupStructure) {
        // 仅在运行时缓存尚未固化结构时改默认值：用户 window 覆盖仍随后生效
        setDefault("popupStructure", "original");
    }
    const article = Title.fromAnchor(a);
    eventsState.current.article = article;
    if (!a.navpopup) {
        a.navpopup = newNavpopup(a, article);
        eventsState.current.linksHash[a.href] = a.navpopup;
        eventsState.current.links.push(a);
    }
    const navpop = a.navpopup;
    if (navpop.pending === null || navpop.pending !== 0) {
        simplePopupContent(a, article);
    }
    navpop.showSoonIfStable(navpop.delay);
    if (eventsState.checkPopupPositionTimer) {
        clearInterval(eventsState.checkPopupPositionTimer);
    }
    eventsState.checkPopupPositionTimer = setInterval(checkPopupPosition, 600);
    if (getValueOf("simplePopups")) {
        if (getValueOf("popupPreviewButton") && !a.simpleNoMore) {
            const d = document.createElement("div");
            d.className = "popupPreviewButtonDiv";
            const s = document.createElement("span");
            d.appendChild(s);
            s.className = "popupPreviewButton";
            (s as unknown as Record<string, unknown>)[`on${getValueOf("popupPreviewButtonEvent") as string}`] = (): void => {
                a.simpleNoMore = true;
                d.style.display = "none";
                nonsimplePopupContent(a, article);
            };
            s.innerHTML = popupString("show preview");
            setPopupHTML(d, "popupPreview", navpop.idNumber);
        }
    }
    if (navpop.pending !== 0) {
        nonsimplePopupContent(a, article);
    }
};

// 简版骨架渲染：结构骨架 + 逐槽填充 + 可拖拽装配（150ms 延迟绑定在
// setupDraggable 内）+ 红链槽写入
export const simplePopupContent = (a: HTMLAnchorElement, article: Title): void => {
    const navpop = a.navpopup;
    if (!navpop) {
        return;
    }
    navpop.hasPopupMenu = false;
    navpop.setInnerHTML(popupHTML(a));
    fillEmptySpans({ navpopup: navpop });
    setupDraggable(navpop);
    // 红链槽（legacy :275-277）：popupRedlinkRemoval 开启且锚点 className 恰为
    // "new" 时追加「移除该链接」入口。<br> 前缀与 className 严格相等判定
    // （非 classList.contains）都是上游原样，照搬勿修
    if (getValueOf("popupRedlinkRemoval") && a.className === "new") {
        setPopupHTML(`<br>${popupRedlinkHTML(article)}`, "popupRedlink", navpop.idNumber);
    }
};

// 完整预览装配已整体迁至 preview/dispatch.ts（legacy actions.ts 160-335 的分派
// 段照搬）；本域保留同名入口：mouseOverWikiLink2 的调用点与对外契约不变，实现
// 原样转发（无行为差异）
export const nonsimplePopupContent = (a: HTMLAnchorElement, article: Title): void => {
    dispatchNonsimplePopupContent(a, article);
};

const registerHooks = (np: Navpopup): void => {
    const popupMaxWidth = getValueOf("popupMaxWidth");
    if (typeof popupMaxWidth === "number") {
        const setMaxWidth = function (this: Navpopup): void {
            this.mainDiv.style.maxWidth = `${popupMaxWidth}px`;
            this.maxWidth = popupMaxWidth;
        };
        np.addHook(setMaxWidth, "unhide", "before");
    }
    np.addHook(addPopupShortcuts, "unhide", "after");
    np.addHook(rmPopupShortcuts, "hide", "before");
};

const newNavpopup = (a: HTMLAnchorElement, article: Title): BoundNavpopup => {
    // 构造后立即补齐 idNumber/parentAnchor/delay，满足 BoundNavpopup 不变式
    const navpopup = new Navpopup() as BoundNavpopup;
    navpopup.fuzz = 5;
    navpopup.delay = +(getValueOf("popupDelay") as string | number) * 1e3;
    navpopup.idNumber = ++eventsState.idNumber;
    // htmlout 的 setPopupHTML 缺省 id 回落值与弹窗编号同步（legacy 共用 pg.idNumber）
    setPopupIdNumber(navpopup.idNumber);
    navpopup.parentAnchor = a;
    navpopup.parentPopup = a.popData?.owner;
    navpopup.article = article;
    registerHooks(navpopup);
    return navpopup;
};

export function killPopup(this: GlobalEventHandlers): boolean {
    removeModifierKeyHandler(this as HTMLAnchorElement);
    if (getValueOf("popupShortcutKeys")) {
        rmPopupShortcuts();
    }
    const navpop = eventsState.current.link?.navpopup;
    if (navpop) {
        navpop.banish();
    }
    eventsState.current.link = null;
    if (abortAllFn) {
        abortAllFn();
    }
    if (eventsState.checkPopupPositionTimer) {
        clearInterval(eventsState.checkPopupPositionTimer);
        eventsState.checkPopupPositionTimer = null;
    }
    return true;
}

// 鼠标是否「仍可视为在弹窗上」：任一 popup_menu 菜单展开（offsetWidth>0，
// jsdom 无布局时恒 0 = 视为收起）即算在弹窗上——菜单浮层常超出弹窗矩形
const fuzzyCursorOffMenus = (_x: number | undefined, _y: number | undefined, _fuzz: number, parent: HTMLElement): boolean => {
    const uls = parent.getElementsByTagName("ul");
    for (const ul of uls) {
        if (ul.className === "popup_menu" && ul.offsetWidth > 0) {
            return false;
        }
    }
    return true;
};

export const checkPopupPosition = (): void => {
    const navpop = eventsState.current.link?.navpopup;
    if (navpop) {
        navpop.limitHorizontalPosition();
    }
};

export function mouseOut(this: GlobalEventHandlers): void {
    const a = this as HTMLAnchorElement;
    removeModifierKeyHandler(a);
    if (!a.navpopup) {
        return;
    }
    if (!a.navpopup.isVisible()) {
        a.navpopup.banish();
        return;
    }
    restoreTitle(a);
    Navpopup.tracker.addHook(posCheckerHook(a.navpopup));
}

// 返回 true 请求从 tracker 注销自身（弹窗已隐藏或已完成隐藏）
export const posCheckerHook = (navpop: Navpopup): () => boolean => () => {
    if (!navpop.isVisible()) {
        return true;
    }
    if (Navpopup.tracker.dirty) {
        return false;
    }
    const x = Navpopup.tracker.x,
        y = Navpopup.tracker.y;
    const mouseOverNavpop = navpop.isWithin(x, y) || !fuzzyCursorOffMenus(x, y, navpop.fuzz, navpop.mainDiv);
    let t = getValueOf("popupHideDelay");
    if (t) {
        t = (t as number) * 1e3;
    }
    if (!t) {
        if (!mouseOverNavpop) {
            if (navpop.parentAnchor) {
                restoreTitle(navpop.parentAnchor);
            }
            navpop.banish();
            return true;
        }
        return false;
    }
    const d = +new Date();
    if (!navpop.mouseLeavingTime) {
        navpop.mouseLeavingTime = d;
        return false;
    }
    if (mouseOverNavpop) {
        navpop.mouseLeavingTime = null;
        return false;
    }
    if (d - navpop.mouseLeavingTime > (t as number)) {
        navpop.mouseLeavingTime = null;
        navpop.banish();
        return true;
    }
    return false;
};

// 选区弹窗等无锚点场景的兜底轮询（500ms 独立于 tracker；hide 时经前置钩子停表）
export const runStopPopupTimer = (navpop: Navpopup): void => {
    if (!navpop.stopPopupTimer) {
        navpop.stopPopupTimer = setInterval(posCheckerHook(navpop), 500);
        navpop.addHook(() => {
            clearInterval(navpop.stopPopupTimer);
        }, "hide", "before");
    }
};

// htmlout 两个回调缝的接线（legacy 是模块级静态直调，重写版改为注册缝）；
// 幂等：仅首次 setupTooltips 时注册
let htmloutSeamsWired = false;

const wireHtmloutSeams = (): void => {
    if (htmloutSeamsWired) {
        return;
    }
    htmloutSeamsWired = true;
    registerPositionChecker(checkPopupPosition);
    // legacy popTipsSoonFn 直调 setupTooltips(el, false, true, popData)：
    // fixed 实参（force=true 重扫已标记容器）在此补齐
    registerTooltipScanner((root: HTMLElement | null, popData: PopData | null | undefined): void => {
        // popData 的 owner 运行时必为 events 域装配的弹窗（htmlout 侧只作
        // PopupLike 透传），类型层经双重收窄还原
        setupTooltips(root, false, true, (popData ?? null) as unknown as AnchorPopData | null);
    });
};
