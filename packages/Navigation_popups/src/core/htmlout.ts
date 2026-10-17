// HTML 输出域：弹窗骨架生成（popupHTML）、按结构逐槽填充（fillEmptySpans）、
// 带轮询重试的槽写入（setPopupHTML）与 tips 重扫调度（popTipsSoonFn）。
// 行为基准 = legacy htmloutput.ts（commit 02c8dec）。
//
// 跨域解耦缝（legacy 的三处直调改为回调注册点，未注册时按 legacy 无数据路径
// 等价处理——跳过）：
// - 写入后 100ms 位置检查：legacy 直调 mouseout 域 checkPopupPosition
// - tips 重扫：legacy 直调 actions 域 setupTooltips
// - 「当前弹窗 id」：legacy 读全局 pg.idNumber（actions.mouseOver 以
//   ++pg.idNumber 递增），重写版收敛为模块内状态 + setPopupIdNumber 注入口
import { log } from "./log.ts";
import { getValueOf, optionDefault, optionStore } from "./options.ts";
import { simplePrintf } from "./strings.ts";
import { flattenLayout, getSlotFiller, structures, type LayoutItem, type PopupLike, type PopupStructure, type StructureContext } from "./structures.ts";
import { parenSplit, parseParams, Title } from "../title/title.ts";

// 子弹窗扫描的随行数据（legacy setupTooltips 的 popData）：owner 指向宿主
// 弹窗，actions 域据此给槽内新链接绑定子弹窗
export interface PopData {
    owner?: PopupLike;
    [key: string]: unknown;
}

declare global {
    interface HTMLAnchorElement {
        // removeTitles（events 域）暂存并清空的原生锚点 title；fillEmptySpans
        // 以它优先作为 hint（legacy a.originalTitle）
        originalTitle?: string;
    }
}

// 「写入后位置检查」回调注册点（legacy：setTimeout(checkPopupPosition, 100)）。
// null = 注销（测试隔离用）；未注册时跳过空定时器，可观察行为与 legacy 的
// 空检查等价。
let positionChecker: (() => void) | null = null;

export const registerPositionChecker = (fn: (() => void) | null): void => {
    positionChecker = fn;
};

// 「tips 重扫」回调注册点（legacy popTipsSoonFn 直调 setupTooltips(根, false,
// true, popData)；fixed 实参由 actions 域的适配闭包补齐）
let tooltipScanner: ((root: HTMLElement | null, popData: PopData | null | undefined) => void) | null = null;

export const registerTooltipScanner = (fn: ((root: HTMLElement | null, popData: PopData | null | undefined) => void) | null): void => {
    tooltipScanner = fn;
};

// 「当前弹窗 id」：setPopupHTML 省略 id 时的回落值。初值 0 = legacy init.ts
// 的 pg.idNumber 初值；弹窗域（popup.ts）创建弹窗时经 setPopupIdNumber 同步。
let currentIdNumber = 0;

export const setPopupIdNumber = (n: number): void => {
    currentIdNumber = n;
};

export const setPopupHTML = (str: string | Node | null | undefined, elementId: string, _popupId?: number, onSuccess?: (() => void) | null, append?: boolean): true | null => {
    let popupId = _popupId;
    if (typeof popupId === "undefined") {
        popupId = currentIdNumber;
    }
    const popupElement = document.getElementById(elementId + String(popupId));
    if (popupElement) {
        if (!append) {
            popupElement.innerHTML = "";
        }
        if (typeof str === "string") {
            popupElement.innerHTML += str;
        } else if (str) {
            popupElement.appendChild(str);
        }
        if (onSuccess) {
            onSuccess();
        }
        if (positionChecker) {
            setTimeout(positionChecker, 100);
        }
        return true;
    }
    // legacy 原样：重试不透传 append——下一轮命中元素时按「清空后写入」处理，
    // 带 append 的调用在重试路径上会丢失追加语义（上游行为，勿"修复"）
    setTimeout((): void => {
        setPopupHTML(str, elementId, popupId, onSuccess);
    }, 600);
    return null;
};

// 数据槽 trailer 的便捷写入口（legacy 预览管线的统计摘要统一落 popupData 槽）
export const setPopupTrailer = (str: string | Node | null | undefined, id?: number): true | null => setPopupHTML(str, "popupData", id);

export interface FillEmptySpansArgs {
    navpopup: PopupLike;
    redir?: boolean;
    redirTarget?: Title;
}

// 与 title 域 assume 同义的恒等断言：调用方担保非空（运行时不变量，类型层
// 承载不了），未满足时与 legacy 一样在原处崩溃（不过度防御）
const assume = <T>(value: T | null | undefined): T => value as T;

export const fillEmptySpans = (args: FillEmptySpansArgs): void => {
    // legacy 判定照搬：redir 仅在显式真值时开启（undefined/false 均为普通态）
    const redir = !!args.redir;
    // 调用链担保锚点存在（legacy assume）；选区弹窗等无锚场景不进入本函数
    const a = assume(args.navpopup.parentAnchor);
    let article: Title;
    let hint: string | null = null;
    let oldid: string | null | undefined = null;
    let rcid: string | null | undefined;
    let params: Record<string, string | null | undefined> = {};
    // legacy typeof 判定照搬：redir 态但 redirTarget 非对象（未传）时回落锚点
    // 解析——redir 标记本身不变，重定向槽仍按 redirTarget 缺失前的锚点填充
    if (redir && typeof args.redirTarget === "object") {
        article = args.redirTarget;
    } else {
        article = new Title().fromAnchor(a);
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 空串是有意义的值：originalTitle 为空串时须回落 hintValue（legacy || 分支是刻意行为）
        hint = a.originalTitle || article.hintValue();
        params = parseParams(a.href);
        oldid = getValueOf("popupHistoricalLinks") ? params.oldid : null;
        rcid = params.rcid;
    }
    const x: StructureContext = {
        article,
        hint,
        oldid,
        rcid,
        navpop: args.navpopup,
        params,
    };
    // 未知结构名：legacy 此处向 popupError 槽写错误文案，但实参序颠倒
    // （str/elementId 对调），目标元素永不存在 → 600ms 轮询空转，可观察行为
    // 等于什么都不做；且 popupHTML 先行把选项自愈回默认值，本分支不可达。
    // 重写版删除该分支（不过度防御），结构表缺失时原地崩溃。
    const structure: PopupStructure = structures[getValueOf("popupStructure") as string];
    const spans = flattenLayout(structure.popupLayout());
    const redirs = structure.popupRedirSpans ? structure.popupRedirSpans() : [];
    for (const span of spans) {
        // 重定向槽仅在 redir 态填、普通槽仅在非 redir 态填（legacy 双向互斥）
        const found = redirs.includes(span);
        if (found !== redir) {
            continue;
        }
        const fillerKey = structure.slots[span];
        const filler = fillerKey === undefined ? undefined : getSlotFiller(fillerKey);
        if (!filler) {
            continue;
        }
        // TopLinks 槽（含 redir 版）在激活态走「写完即重扫」路径，为槽内
        // 子弹窗链接递归挂 tips（legacy popupActiveNavlinks 分支）
        const setfn: (html: string | Node | null | undefined, divname: string, idnumber?: number) => void = getValueOf("popupActiveNavlinks") && (span.startsWith("popupTopLinks") || span.startsWith("popupRedirTopLinks")) ? setPopupTipsAndHTML : setPopupHTML;
        log(`running ${span}({article:${String(x.article)}, hint:${String(x.hint)}, oldid: ${String(x.oldid)}})`);
        setfn(filler(x), span, args.navpopup.idNumber);
    }
};

export const popupHTML = (a: { navpopup?: PopupLike | null }): string => {
    // 先经 getValueOf 把 window 覆盖链固化进缓存（legacy 同款调用序）
    getValueOf("popupStructure");
    const structure = structures[optionStore.popupStructure as string] as PopupStructure | undefined;
    if (!structure) {
        // 未知结构：把选项自愈回默认值后重试（legacy 递归照搬；默认值由 boot
        // 的 setOptions 保证为合法结构名）
        optionStore.popupStructure = optionDefault.popupStructure;
        return popupHTML(a);
    }
    const navpop = a.navpopup;
    if (!navpop) {
        return "";
    }
    return makeEmptySpans(structure.popupLayout(), navpop);
};

const makeEmptySpans = (list: LayoutItem[], navpop: PopupLike): string => {
    let ret = "";
    for (const item of list) {
        if (typeof item === "string") {
            ret += emptySpanHTML(item, navpop.idNumber);
        } else {
            // 嵌套槽组插入到已累积 HTML 的最后一个闭合标签内侧——重定向组
            // 因此成为 popupRedir 容器的子节点、Redlink 成为 MiscTools 的
            // 子节点（DOM/CSS 契约冻结点，legacy parenSplit 原样）
            ret = parenSplit(ret, RegExp("(</[^>]*?>$)")).join(makeEmptySpans(item, navpop));
        }
    }
    return ret;
};

// 槽 class 别名表（legacy emptySpanHTML.classAliases）：SecondPreview 槽复用
// Preview 的样式类，id 仍按槽名生成
const emptySpanHTMLClassAliases: Record<string, string> = {
    popupSecondPreview: "popupPreview",
};

const emptySpanHTML = (name: string, id: number): string => {
    let classname = emptySpanHTMLClassAliases[name] || name;
    if (name === getValueOf("popupDragHandle")) {
        classname += " popupDragHandle";
    }
    return simplePrintf('<%s id="%s" class="%s"></%s>', ["div", name + String(id), classname, "div"]);
};

// 图片槽骨架（legacy htmloutput.ts 的 imageHTML；弃用从未被读取的 article 形参）。
// id 双契约 #popupImageLink<id>/#popupImg<id> 与 img 的 display:none 初始态
// 均为 CSS 冻结点；original.popupImage 槽填充器（preview 域注册）经此产出。
export const imageHTML = (idNumber: number | undefined): string => simplePrintf('<a id="popupImageLink$1"><img align="right" valign="top" id="popupImg$1" style="display: none;"></img></a>', [String(idNumber)]);

export const popTipsSoonFn = (id: string, _when?: number | null, popData?: PopData | null): () => void => {
    let when = _when;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 是无意义延时须回落 250（legacy !when 判定照搬，??= 会放行 0），且 ??= 为 es2021 语法（产物门禁禁用）
    if (!when) {
        when = 250;
    }
    const popTips = (): void => {
        if (tooltipScanner) {
            tooltipScanner(document.getElementById(id), popData);
        }
    };
    return () => {
        setTimeout(popTips, when);
    };
};

export const setPopupTipsAndHTML = (html: string | Node | null | undefined, divname: string, idnumber?: number, popData?: PopData | null): void => {
    setPopupHTML(html, divname, idnumber, getValueOf("popupSubpopups") ? popTipsSoonFn(divname + String(idnumber), null, popData) : null);
};
