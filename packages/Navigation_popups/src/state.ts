// 类型化运行时状态容器：取代原版 pg 的动态域，同时是 window.pg 的兼容面
// （javascript:pg.fn.* 内联 URL、用户脚本 pg.option/pg.wiki 调试依赖它）。
//
// 装配时机：entry 在双载入守卫通过后立即 `window.pg = state`（不能推迟到
// boot——ready 前的窗口期内另一份实例会通过守卫）。四域引用全部指向各域模块
// 的模块级单例（纯赋引用、不触发任何查询或初始化），因此在本模块定义 `state`
// 时即装配完毕，window.pg 一出现就是完整兼容面；守卫失败时 state 照样完整，
// 与 legacy globals.ts 先构造 pg 字面量再判守卫的顺序一致。
//
// 四域映射（legacy pg.* → 重写版）：
// - fn：legacy 的 7 个 pg.fn.* 赋值（links 六件 + querypreview 的 commons 共享
//   资源页 JSONP 回调）与 navlinks DSL 以 `javascript:pg.fn.%s()` 动态引用的三
//   个魔法链接构造器（magicWatchLink/magicHistoryLink/popupMenuLink）
// - option：legacy `pg.option = {}` 的运行时选项缓存 → options 域的 optionStore
//   （legacy 的 purgePopups 以整体替换重置；重写版 links.purgePopups 改为就地
//   清键，本引用因此始终有效）
// - string：legacy pg.string = 英文默认串表 → strings 域的 englishStrings
//   （legacy 全仓无读取点，纯对外兼容面）
// - wiki：legacy pg.wiki 的站点元数据面 → siteinfo 域的 siteState（titlebase
//   家族同时镜像进 title 域 wiki.titlebase，见 setTitleBase）
import { APIsharedImagePagePreviewHTML } from "./api/queries.ts";
import { siteState, type SiteState } from "./api/siteinfo.ts";
import { optionStore, type OptionValue } from "./core/options.ts";
import { englishStrings } from "./core/strings.ts";
import {
    disablePopups,
    getDiffSinceMyEdit,
    getLastContrib,
    magicHistoryLink,
    magicWatchLink,
    modifyWatchlist,
    popupMenuLink,
    purgePopups,
    togglePreviews,
} from "./navlinks/links.ts";

// legacy pg.fn 的可达成员面；值即各域模块导出的函数本身（引用相等，
// `pg.fn.x === 模块导出` 是兼容契约的一部分）
export interface PgFnCompat {
    /** commons 共享资源页二段查询的 JSONP 回调名（URL 的 callback= 参数） */
    APIsharedImagePagePreviewHTML: typeof APIsharedImagePagePreviewHTML;
    getLastContrib: typeof getLastContrib;
    getDiffSinceMyEdit: typeof getDiffSinceMyEdit;
    purgePopups: typeof purgePopups;
    disablePopups: typeof disablePopups;
    togglePreviews: typeof togglePreviews;
    modifyWatchlist: typeof modifyWatchlist;
    magicWatchLink: typeof magicWatchLink;
    magicHistoryLink: typeof magicHistoryLink;
    popupMenuLink: typeof popupMenuLink;
}

export interface PopupState {
    fn: PgFnCompat;
    option: Record<string, OptionValue>;
    string: Record<string, string>;
    wiki: SiteState;
}

export const state: PopupState = {
    fn: {
        APIsharedImagePagePreviewHTML,
        getLastContrib,
        getDiffSinceMyEdit,
        purgePopups,
        disablePopups,
        togglePreviews,
        modifyWatchlist,
        magicWatchLink,
        magicHistoryLink,
        popupMenuLink,
    },
    option: optionStore,
    string: englishStrings,
    wiki: siteState,
};
