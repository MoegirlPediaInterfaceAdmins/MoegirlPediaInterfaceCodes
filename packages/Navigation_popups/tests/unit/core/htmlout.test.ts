// htmlout 模块镜像测试：popupHTML 骨架生成（DOM/CSS 契约冻结点：槽 id 命名
// `popup<槽名><idNumber>`、popupSecondPreview 的 class 别名、嵌套槽组插入前一
// 槽容器内部）、setPopupHTML 的 600ms 轮询重试与写入后 100ms 位置检查、
// fillEmptySpans 的逐槽填充与重定向态、popTipsSoonFn 的 250ms tips 重扫。
// 行为基准 = legacy htmloutput.ts（commit 02c8dec）；legacy 直调 navlinks/
// mouseout/actions 域函数之处，重写版经注册缝解耦，本文件以 stub 注册者锁行为。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockMw } from "../../helpers/mockMw.ts";
import { installMw } from "../../helpers/mockMw.ts";
import {
    fillEmptySpans,
    imageHTML,
    popTipsSoonFn,
    popupHTML,
    registerPositionChecker,
    registerTooltipScanner,
    setPopupHTML,
    setPopupIdNumber,
    setPopupTipsAndHTML,
    setPopupTrailer,
} from "../../../src/core/htmlout.ts";
import { registerSlotFiller, type PopupLike, type StructureContext } from "../../../src/core/structures.ts";
import { optionDefault, optionStore, setOptions } from "../../../src/core/options.ts";
import { Title, wiki } from "../../../src/title/title.ts";

const SITEBASE = "zh.moegirl.org.cn";

// 本文件只解析普通条目链接；Title.fromURL 会先对四条 Special 解析正则取
// exec，故须装配为永不命中的 RegExp（title 域测试用真实公式，这里从简）。
const installTitleFixtures = (mw: MockMw): void => {
    const esc = mw.util.escapeRegExp;
    wiki.titlebase = `https://${SITEBASE}/index.php?title=`;
    const articlePath = String(mw.config.get("wgArticlePath")).replace(/\/\$1/, "");
    const preTitles = `(?:${esc(String(mw.config.get("wgScript")))}|${esc(String(mw.config.get("wgScriptPath")))}/(?:index[.]php|wiki[.]phtml))`;
    // legacy init.ts setMainRegex 公式（组 2 = 标题、组 3 = 锚点，fromURL 依赖）
    wiki.re.main = RegExp(`[^:]*://${esc(SITEBASE)}(${preTitles}[?]title=|${esc(`${articlePath}/`)})` + "([^&?#]*)[^#]*(?:#(.+))?");
    const never = /.^/;
    wiki.re.contribs = never;
    wiki.re.email = never;
    wiki.re.backlinks = never;
    wiki.re.specialdiff = never;
};

const anchor = (href: string): HTMLAnchorElement => {
    const a = document.createElement("a");
    a.href = href;
    document.body.append(a);
    return a;
};

const makeNavpop = (idNumber: number, a: HTMLAnchorElement | null): PopupLike => ({ idNumber, parentAnchor: a });

const mount = (html: string): HTMLElement => {
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.append(host);
    return host;
};

const mountSkeleton = (navpop: PopupLike): void => {
    mount(popupHTML({ navpopup: navpop }));
};

const slot = (name: string, id: number, cls = name): string => `<div id="${name}${id}" class="${cls}"></div>`;

const REDIR_GROUP = ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"];

const redirGroupSpans = (id: number): string => REDIR_GROUP.map((name) => slot(name, id)).join("");

// MiscTools 块：Redlink 嵌入容器内部，且因 parenSplit 尾捕获的尾部空段在
// 容器闭合后原样重复一份（见 originalSkeleton 注释）
const miscToolsBlock = (id: number): string => `<div id="popupMiscTools${id}" class="popupMiscTools">${slot("popupRedlink", id)}</div>${slot("popupRedlink", id)}`;

const tailSlots = (id: number): string =>
    [
        slot("popupPrePreviewSep", id),
        slot("popupPreview", id),
        slot("popupSecondPreview", id, "popupPreview"),
        slot("popupPreviewMore", id),
        slot("popupPostPreview", id),
        slot("popupFixDab", id),
    ].join("");

const originalSkeleton = (id: number): string =>
    [
        slot("popupError", id),
        slot("popupImage", id),
        slot("popupTopLinks", id),
        slot("popupTitle", id),
        slot("popupUserData", id),
        slot("popupData", id),
        slot("popupOtherLinks", id),
        // legacy 真实行为：parenSplit 的尾捕获匹配后 split 产物带尾部空串
        // （["前段", "</div>", ""]），join 把嵌套组插两遍——组内紧跟容器闭合
        // 标签之后再来一份（全空 div，不可见且 getElementById 命中前一份），
        // 照搬勿修
        `<div id="popupRedir${id}" class="popupRedir">${redirGroupSpans(id)}</div>`,
        redirGroupSpans(id),
        miscToolsBlock(id),
        tailSlots(id),
    ].join("");

const menusSkeleton = (id: number): string =>
    [
        slot("popupError", id),
        slot("popupImage", id),
        slot("popupTopLinks", id),
        slot("popupTitle", id),
        slot("popupOtherLinks", id),
        `<div id="popupRedir${id}" class="popupRedir">${redirGroupSpans(id)}</div>`,
        redirGroupSpans(id),
        slot("popupUserData", id),
        slot("popupData", id),
        miscToolsBlock(id),
        tailSlots(id),
    ].join("");

const WINDOW_OVERRIDES = ["popupStructure", "popupDragHandle", "popupHistoricalLinks", "popupActiveNavlinks", "popupSubpopups"];

const clearWindowOptions = (): void => {
    for (const key of WINDOW_OVERRIDES) {
        Reflect.deleteProperty(window, key);
    }
};

beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    for (const key of Object.keys(optionStore)) {
        Reflect.deleteProperty(optionStore, key);
    }
    for (const key of Object.keys(optionDefault)) {
        Reflect.deleteProperty(optionDefault, key);
    }
    clearWindowOptions();
    const installed = installMw();
    installTitleFixtures(installed.mw);
    setOptions();
    registerPositionChecker(null);
    registerTooltipScanner(null);
    setPopupIdNumber(0);
});

afterEach(() => {
    vi.useRealTimers();
    clearWindowOptions();
});

describe("popupHTML 骨架生成", () => {
    it("original：槽 id 命名 popup<槽名><idNumber>，嵌套组插入前一槽容器内部（尾部空段重复照搬）", () => {
        (window as unknown as Record<string, unknown>).popupStructure = "original";
        expect(popupHTML({ navpopup: makeNavpop(1, null) })).toBe(originalSkeleton(1));
    });

    it("popupSecondPreview 槽 class 别名为 popupPreview（CSS 契约冻结）", () => {
        (window as unknown as Record<string, unknown>).popupStructure = "original";
        expect(popupHTML({ navpopup: makeNavpop(1, null) })).toContain('<div id="popupSecondPreview1" class="popupPreview"></div>');
    });

    it("menus：TopLinks 前置到 Title 前，UserData/Data 后移到重定向组之后", () => {
        (window as unknown as Record<string, unknown>).popupStructure = "menus";
        expect(popupHTML({ navpopup: makeNavpop(2, null) })).toBe(menusSkeleton(2));
    });

    it("默认结构（setOptions 后的 shortmenus）与 menus 骨架一致", () => {
        expect(popupHTML({ navpopup: makeNavpop(3, null) })).toBe(menusSkeleton(3));
    });

    it("lite：仅 Title 与 Preview 两槽", () => {
        (window as unknown as Record<string, unknown>).popupStructure = "lite";
        expect(popupHTML({ navpopup: makeNavpop(4, null) })).toBe(`${slot("popupTitle", 4)}${slot("popupPreview", 4)}`);
    });

    it("navpopup 缺失或为 null 返回空串", () => {
        (window as unknown as Record<string, unknown>).popupStructure = "original";
        expect(popupHTML({})).toBe("");
        expect(popupHTML({ navpopup: null })).toBe("");
    });

    it("未知结构：选项自愈回默认值后重试，产出默认结构骨架", () => {
        (window as unknown as Record<string, unknown>).popupStructure = "bogus";
        expect(popupHTML({ navpopup: makeNavpop(5, null) })).toBe(menusSkeleton(5));
        expect(optionStore.popupStructure).toBe("shortmenus");
    });

    it("popupDragHandle 命中槽时追加把手类", () => {
        (window as unknown as Record<string, unknown>).popupStructure = "original";
        (window as unknown as Record<string, unknown>).popupDragHandle = "popupTitle";
        expect(popupHTML({ navpopup: makeNavpop(6, null) })).toContain('<div id="popupTitle6" class="popupTitle popupDragHandle"></div>');
    });
});

describe("setPopupHTML", () => {
    it("目标存在：写入字符串、先清空旧内容、返回 true", () => {
        const host = mount(slot("popupData", 1));
        const el = host.querySelector<HTMLElement>("#popupData1");
        expect(el).not.toBeNull();
        if (el) {
            el.innerHTML = "old";
        }
        expect(setPopupHTML("new", "popupData", 1)).toBe(true);
        expect(el?.innerHTML).toBe("new");
    });

    it("append=true 追加不清空", () => {
        const host = mount(slot("popupData", 1));
        const el = host.querySelector<HTMLElement>("#popupData1");
        if (el) {
            el.innerHTML = "old";
        }
        setPopupHTML("new", "popupData", 1, null, true);
        expect(el?.innerHTML).toBe("oldnew");
    });

    it("Node 入参走 appendChild", () => {
        const host = mount(slot("popupData", 1));
        const el = host.querySelector<HTMLElement>("#popupData1");
        const node = document.createElement("span");
        setPopupHTML(node, "popupData", 1);
        expect(el?.firstChild).toBe(node);
    });

    it("null 入参只清空不写入", () => {
        const host = mount(slot("popupData", 1));
        const el = host.querySelector<HTMLElement>("#popupData1");
        if (el) {
            el.innerHTML = "old";
        }
        expect(setPopupHTML(null, "popupData", 1)).toBe(true);
        expect(el?.innerHTML).toBe("");
    });

    it("onSuccess 写入成功后同步回调", () => {
        mount(slot("popupData", 1));
        const onSuccess = vi.fn();
        setPopupHTML("x", "popupData", 1, onSuccess);
        expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("写入后 100ms 触发位置检查回调", () => {
        mount(slot("popupData", 1));
        const check = vi.fn();
        registerPositionChecker(check);
        setPopupHTML("x", "popupData", 1);
        vi.advanceTimersByTime(99);
        expect(check).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(check).toHaveBeenCalledTimes(1);
    });

    it("未注册位置检查时照常写入（跳过空定时器）", () => {
        mount(slot("popupData", 1));
        expect(setPopupHTML("x", "popupData", 1)).toBe(true);
        expect(document.getElementById("popupData1")?.innerHTML).toBe("x");
    });

    it("目标缺失返回 null，600ms 轮询重试至写入成功（onSuccess 在重试成功时触发）", () => {
        const onSuccess = vi.fn();
        expect(setPopupHTML("later", "popupData", 5, onSuccess)).toBeNull();
        vi.advanceTimersByTime(599);
        mount(slot("popupData", 5));
        expect(document.getElementById("popupData5")?.innerHTML).toBe("");
        vi.advanceTimersByTime(1);
        expect(document.getElementById("popupData5")?.innerHTML).toBe("later");
        expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("重试不透传 append：append 请求在重试轮按清空写入处理（legacy 原样）", () => {
        setPopupHTML("later", "popupData", 5, null, true);
        mount(slot("popupData", 5));
        const el = document.getElementById("popupData5");
        if (el) {
            el.innerHTML = "old";
        }
        vi.advanceTimersByTime(600);
        expect(el?.innerHTML).toBe("later");
    });

    it("省略 id 时回落到 setPopupIdNumber 设定的当前弹窗 id", () => {
        setPopupIdNumber(7);
        mount(slot("popupData", 7));
        setPopupHTML("cur", "popupData");
        expect(document.getElementById("popupData7")?.innerHTML).toBe("cur");
    });
});

describe("setPopupTrailer", () => {
    it("写入 popupData 槽", () => {
        mount(slot("popupData", 4));
        expect(setPopupTrailer("trailer", 4)).toBe(true);
        expect(document.getElementById("popupData4")?.innerHTML).toBe("trailer");
    });
});

describe("popTipsSoonFn", () => {
    it("缺省 250ms 后以槽元素为根重扫", () => {
        const host = mount(slot("popupTopLinks", 3));
        const el = host.querySelector<HTMLElement>("#popupTopLinks3");
        const scan = vi.fn();
        registerTooltipScanner(scan);
        popTipsSoonFn("popupTopLinks3")();
        vi.advanceTimersByTime(249);
        expect(scan).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(scan).toHaveBeenCalledTimes(1);
        expect(scan).toHaveBeenCalledWith(el, undefined);
    });

    it("自定义延时生效；0 视同缺省回落 250", () => {
        mount(slot("popupTopLinks", 3));
        const scan = vi.fn();
        registerTooltipScanner(scan);
        popTipsSoonFn("popupTopLinks3", 500)();
        vi.advanceTimersByTime(499);
        expect(scan).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(scan).toHaveBeenCalledTimes(1);
        popTipsSoonFn("popupTopLinks3", 0)();
        vi.advanceTimersByTime(249);
        expect(scan).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(scan).toHaveBeenCalledTimes(2);
    });

    it("popData 透传给重扫回调", () => {
        mount(slot("popupTopLinks", 3));
        const scan = vi.fn();
        registerTooltipScanner(scan);
        const pop = makeNavpop(3, null);
        popTipsSoonFn("popupTopLinks3", null, { owner: pop })();
        vi.advanceTimersByTime(250);
        expect(scan).toHaveBeenCalledWith(document.getElementById("popupTopLinks3"), { owner: pop });
    });

    it("未注册重扫回调时定时器空转，事后注册不会被已触发的定时器调用", () => {
        mount(slot("popupTopLinks", 3));
        popTipsSoonFn("popupTopLinks3")();
        vi.advanceTimersByTime(250);
        const scan = vi.fn();
        registerTooltipScanner(scan);
        vi.advanceTimersByTime(1000);
        expect(scan).not.toHaveBeenCalled();
    });
});

describe("setPopupTipsAndHTML", () => {
    it("popupSubpopups 开（默认）：写槽并调度 250ms 重扫该槽", () => {
        mount(slot("popupData", 9));
        const scan = vi.fn();
        registerTooltipScanner(scan);
        setPopupTipsAndHTML("html", "popupData", 9);
        expect(document.getElementById("popupData9")?.innerHTML).toBe("html");
        vi.advanceTimersByTime(250);
        expect(scan).toHaveBeenCalledWith(document.getElementById("popupData9"), undefined);
    });

    it("popupSubpopups 关：只写槽不调度重扫", () => {
        (window as unknown as Record<string, unknown>).popupSubpopups = false;
        mount(slot("popupData", 9));
        const scan = vi.fn();
        registerTooltipScanner(scan);
        setPopupTipsAndHTML("html", "popupData", 9);
        expect(document.getElementById("popupData9")?.innerHTML).toBe("html");
        vi.advanceTimersByTime(250);
        expect(scan).not.toHaveBeenCalled();
    });
});

describe("imageHTML", () => {
    it("产出 popupImageLink/popupImg 双 id 契约（CSS 冻结点）", () => {
        expect(imageHTML(5)).toBe('<a id="popupImageLink5"><img align="right" valign="top" id="popupImg5" style="display: none;"></img></a>');
    });
});

describe("fillEmptySpans", () => {
    it("按当前结构逐槽调用已注册填充器（默认 shortmenus，Title 槽键继承自 original）", () => {
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo`));
        mountSkeleton(pop);
        registerSlotFiller("shortmenus.popupTopLinks", () => "TOP");
        registerSlotFiller("original.popupTitle", () => "TITLE");
        fillEmptySpans({ navpopup: pop });
        expect(document.getElementById("popupTopLinks3")?.innerHTML).toBe("TOP");
        expect(document.getElementById("popupTitle3")?.innerHTML).toBe("TITLE");
    });

    it("lite 结构无重定向槽表：普通态照常填充（空表路径）", () => {
        (window as unknown as Record<string, unknown>).popupStructure = "lite";
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo`));
        mountSkeleton(pop);
        registerSlotFiller("lite.popupTitle", () => "LITE");
        fillEmptySpans({ navpopup: pop });
        expect(document.getElementById("popupTitle3")?.innerHTML).toBe("LITE");
        expect(document.getElementById("popupPreview3")?.innerHTML).toBe("");
    });

    it("未注册槽跳过（= legacy 结构缺槽函数时的 continue 路径）", () => {
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo`));
        mountSkeleton(pop);
        registerSlotFiller("shortmenus.popupTopLinks", () => "TOP");
        fillEmptySpans({ navpopup: pop });
        expect(document.getElementById("popupImage3")?.innerHTML).toBe("");
        expect(document.getElementById("popupError3")?.innerHTML).toBe("");
    });

    it("非 redir 态跳过全部重定向槽，只填普通槽", () => {
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo`));
        mountSkeleton(pop);
        registerSlotFiller("shortmenus.popupTopLinks", () => "TOP");
        registerSlotFiller("original.popupTitle", () => "TITLE");
        fillEmptySpans({ navpopup: pop });
        expect(document.getElementById("popupRedirTopLinks3")?.innerHTML).toBe("");
        expect(document.getElementById("popupRedirTitle3")?.innerHTML).toBe("");
    });

    it("redir 态只填重定向槽，上下文取 redirTarget", () => {
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo&oldid=123`));
        mountSkeleton(pop);
        let captured: StructureContext | undefined;
        registerSlotFiller("shortmenus.popupTopLinks", (x) => {
            captured = x;
            return "RT";
        });
        fillEmptySpans({ navpopup: pop, redir: true, redirTarget: new Title("Target") });
        expect(document.getElementById("popupRedirTopLinks3")?.innerHTML).toBe("RT");
        expect(document.getElementById("popupTopLinks3")?.innerHTML).toBe("");
        expect(captured?.article.toString()).toBe("Target");
        expect(captured?.hint).toBeNull();
        expect(captured?.oldid).toBeNull();
        expect(captured?.rcid).toBeUndefined();
        expect(captured?.params).toEqual({});
    });

    it("redir 态但 redirTarget 缺失时回落锚点解析（legacy typeof 判定照搬）", () => {
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo`));
        mountSkeleton(pop);
        let captured: StructureContext | undefined;
        registerSlotFiller("shortmenus.popupTopLinks", (x) => {
            captured = x;
            return "RT";
        });
        fillEmptySpans({ navpopup: pop, redir: true });
        expect(captured?.article.toString()).toBe("Foo");
        expect(captured?.hint).toBe("Foo");
        expect(document.getElementById("popupRedirTopLinks3")?.innerHTML).toBe("RT");
    });

    it("上下文：hint 优先取锚点暂存的 originalTitle", () => {
        const a = anchor(`https://${SITEBASE}/index.php?title=Foo`);
        a.originalTitle = "原始标题";
        const pop = makeNavpop(3, a);
        mountSkeleton(pop);
        let captured: StructureContext | undefined;
        registerSlotFiller("shortmenus.popupTopLinks", (x) => {
            captured = x;
            return "";
        });
        fillEmptySpans({ navpopup: pop });
        expect(captured?.hint).toBe("原始标题");
    });

    it("上下文：oldid/rcid/params 从锚点 URL 解析", () => {
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo&oldid=123&rcid=456`));
        mountSkeleton(pop);
        let captured: StructureContext | undefined;
        registerSlotFiller("shortmenus.popupTopLinks", (x) => {
            captured = x;
            return "";
        });
        fillEmptySpans({ navpopup: pop });
        expect(captured?.oldid).toBe("123");
        expect(captured?.rcid).toBe("456");
        expect(captured?.params).toEqual({ title: "Foo", oldid: "123", rcid: "456" });
        expect(captured?.navpop).toBe(pop);
    });

    it("上下文：URL 无 oldid 时 x.oldid 原样为 undefined", () => {
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo`));
        mountSkeleton(pop);
        let captured: StructureContext | undefined;
        registerSlotFiller("shortmenus.popupTopLinks", (x) => {
            captured = x;
            return "";
        });
        fillEmptySpans({ navpopup: pop });
        expect(captured?.oldid).toBeUndefined();
    });

    it("上下文：popupHistoricalLinks 关时 oldid 恒为 null", () => {
        // 选项取值是粘性缓存：window 覆盖必须在首次 getValueOf 读取前挂上
        (window as unknown as Record<string, unknown>).popupHistoricalLinks = false;
        const pop = makeNavpop(4, anchor(`https://${SITEBASE}/index.php?title=Foo&oldid=123`));
        mountSkeleton(pop);
        let captured: StructureContext | undefined;
        registerSlotFiller("shortmenus.popupTopLinks", (x) => {
            captured = x;
            return "";
        });
        fillEmptySpans({ navpopup: pop });
        expect(captured?.oldid).toBeNull();
    });

    it("popupActiveNavlinks 开（默认）时 TopLinks 槽走 tips 重扫，其余槽不走", () => {
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo`));
        mountSkeleton(pop);
        registerSlotFiller("shortmenus.popupTopLinks", () => "TOP");
        registerSlotFiller("original.popupTitle", () => "TITLE");
        const scan = vi.fn();
        registerTooltipScanner(scan);
        fillEmptySpans({ navpopup: pop });
        vi.advanceTimersByTime(250);
        expect(scan).toHaveBeenCalledTimes(1);
        expect(scan).toHaveBeenCalledWith(document.getElementById("popupTopLinks3"), undefined);
    });

    it("popupActiveNavlinks 关时 TopLinks 槽走普通 setPopupHTML（不调度重扫）", () => {
        (window as unknown as Record<string, unknown>).popupActiveNavlinks = false;
        const pop = makeNavpop(3, anchor(`https://${SITEBASE}/index.php?title=Foo`));
        mountSkeleton(pop);
        registerSlotFiller("shortmenus.popupTopLinks", () => "TOP");
        const scan = vi.fn();
        registerTooltipScanner(scan);
        fillEmptySpans({ navpopup: pop });
        expect(document.getElementById("popupTopLinks3")?.innerHTML).toBe("TOP");
        vi.advanceTimersByTime(250);
        expect(scan).not.toHaveBeenCalled();
    });
});
