// 初始化编排域：legacy run.ts 的 run（boot）与 init.ts 的 setupPopups。
// 时序、幂等语义（completed 单次标记 + callback 参数）、日志行与 setMisc 的
// 重置面全部照 legacy 原文（commit 02c8dec 存档 .zcode/legacy-src）：
//
//   1  await fetchSpecialPageNames()   specialpagealiases（siteinfo 域）
//   2  setupDebugging()                重写版无独立 debug 模块，内联同等 log
//   3  setSiteInfo()                   站点元数据（location/mw.config 派生）
//   4  setTitleBase()                  基址家族 + title.wiki.titlebase
//   5  setOptions()                    选项默认值全集
//   6  void setUserInfo()              不 await：popupReview 时后台查 rights
//   7  setNamespaces() / 8 setInterwiki() / 10 setRedirs()
//   9  setRegexps()                    站点派生正则（依赖 1 的别名与 5 的选项）
//   11 setMisc()                       状态重置（逐项映射见下）
//   12 setupLivePreview(site)          legacy 无参读 pg.wiki，重写版参数化注入
//   13 setupTooltips()                 链接绑定（分批 + #toc 摘除）
//   14 Navpopup.tracker.enable()       鼠标追踪接管
//   15 markSetupCompleted()            completed = true + 回调
//
// 装配缝接线（boot 开头，先于 autoEdit）：events 域的 abortAll 缝、autoedit
// 域的 setupPopups/modifyWatchlist 两缝。legacy 靠模块静态 import 直调，重写版
// 收敛到 boot 统一接线；autoEdit 在 boot 内被调用，注册必须先于它发生。
//
// navlinks 域在模块顶层向 core/structures 注册 7 种结构的槽填充器（legacy 是
// 结构对象内联函数），故此处静态 import 该模块——entry → boot → navlinks 的
// 引入链即完成接线（navlinks 不反向依赖 boot，本域自身不引入新环）。
// 注意：整个模块图当前存在既有的预览域环（events/queries/pipeline/links 等
// 10 模块 SCC，见 final-report），rollup 的 CIRCULAR_DEPENDENCY 致命门禁会因
// 此拦截打包——该问题的断环属独立批次，不在阶段 5 的改动面内。
import { autoEdit, registerModifyWatchlist, registerSetupPopups } from "./actions/autoedit.ts";
import { fetchSpecialPageNames, setRegexps, setSiteInfo, setTitleBase, setUserInfo, siteState } from "./api/siteinfo.ts";
import { eventsState, registerAbortAll, setupTooltips } from "./core/events.ts";
import { setPopupIdNumber } from "./core/htmlout.ts";
import { log } from "./core/log.ts";
import { setOptions } from "./core/options.ts";
import { Navpopup } from "./core/popup.ts";
import { cleanupLegacyNoTranslationStorage, popupNoTranslation } from "./core/strings.ts";
import { modifyWatchlist } from "./navlinks/links.ts";
import { clearPages } from "./net/cache.ts";
import { abortAllDownloads } from "./net/downloader.ts";
import { setupLivePreview, type InstaSiteConfig } from "./preview/insta.ts";
import { nsState, setInterwiki, setNamespaces, setRedirs } from "./title/namespaces.ts";
import { wiki } from "./title/title.ts";
// 槽填充器注册（模块顶层副作用，装配层显式引入即完成）
import "./navlinks/navlinks.ts";

export type SetupPopupsCallback = () => void;

// legacy init.ts 的 SetupPopups 形态：可调用 + 单次标记
export interface SetupPopups {
    (callback?: SetupPopupsCallback): Promise<void>;
    completed?: boolean;
}

// legacy debug.ts 的 setupDebugging（重写版无独立 debug 模块，等价内联）
const setupDebugging = (): void => {
    // 已在开头设置 log 和 errlog 函数
    log("Initializing logger");
};

// legacy setMisc 的等价重置段。逐项映射（legacy pg 动态域 → 重写版容器）：
// pg.current.{link,links,linksHash} → eventsState.current（article 不在重置面，
// legacy 同款）；setupCache() → net/cache 的 clearPages；pg.timer.
// checkPopupPosition → eventsState.checkPopupPositionTimer；pg.idNumber →
// eventsState.idNumber（弹窗编号主计数）+ htmlout 的缺省槽 id 副本（两者由
// events 域的 newNavpopup 同步，此处一并归零）；pg.misc.decodeExtras →
// wiki.misc.decodeExtras。pg.counter.loop 在 legacy 全仓无读取点（唯一定义即
// setMisc 本身），重写版无对位容器，不设。
const setMisc = (): void => {
    eventsState.current.link = null;
    eventsState.current.links = [];
    eventsState.current.linksHash = {};
    clearPages();
    eventsState.checkPopupPositionTimer = null;
    eventsState.idNumber = 0;
    setPopupIdNumber(eventsState.idNumber);
    wiki.misc.decodeExtras = [
        {
            from: "%2C",
            to: ",",
        }, {
            from: "_",
            to: " ",
        }, {
            from: "%24",
            to: "$",
        }, {
            from: "%26",
            to: "&",
        },
    ];
};

// legacy setupLivePreview 读 pg.wiki.*/pg.nsXxxId（重写版无 pg 动态域），
// 站点配置在 setTitleBase/setInterwiki/setNamespaces 之后就地派生
const instaSiteConfig = (): InstaSiteConfig => {
    const formattedNamespaces = mw.config.get("wgFormattedNamespaces");
    return {
        articlePath: siteState.articlePath,
        interwiki: nsState.interwiki,
        imageNamespace: formattedNamespaces[nsState.imageId],
        categoryNamespace: formattedNamespaces[nsState.categoryId],
    };
};

export const setupPopups: SetupPopups = async (callback?: SetupPopupsCallback): Promise<void> => {
    if (setupPopups.completed) {
        if (typeof callback === "function") {
            callback();
        }
        return;
    }
    // 标记写入独立同步函数：require-atomic-updates 否则会把跨 await 的
    // read-modify-write 配对报警，而 completed 单次标记是刻意为之（legacy 原样）
    const markSetupCompleted = (): void => {
        setupPopups.completed = true;
        if (typeof callback === "function") {
            callback();
        }
    };
    await fetchSpecialPageNames();
    setupDebugging();
    setSiteInfo();
    setTitleBase();
    setOptions();
    // 不 await：巡查权查询在后台进行（popupReview 关时仅同步置 canReview）
    void setUserInfo();
    setNamespaces();
    setInterwiki();
    setRegexps();
    setRedirs();
    setMisc();
    setupLivePreview(instaSiteConfig());
    setupTooltips();
    log("In setupPopups(), just called setupTooltips()");
    Navpopup.tracker.enable();
    markSetupCompleted();
};

// legacy run 的等价物：strings 域的遗留 localStorage 清理与缺译集合挂载原本在
// 模块求值期执行（重写版模块顶层零副作用），随首个装配入口 boot 一并落地
export const boot = (): void => {
    registerSetupPopups(setupPopups);
    registerModifyWatchlist(modifyWatchlist);
    registerAbortAll(abortAllDownloads);
    cleanupLegacyNoTranslationStorage();
    window.popupNoTranslation = popupNoTranslation;
    autoEdit();
    void setupPopups();
};
