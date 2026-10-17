// 选项系统：默认值全集（legacy options.ts 的 setOptions 逐项照搬）、
// window.popupXxx 用户覆盖链、shouldShow 显示门控。
// 重写版没有 pg 动态域，legacy 的 pg.option / pg.optionDefault 由本模块
// 自持并导出（purge 重置等后续模块经导出的 optionStore 操作）。
import { popupString } from "./strings.ts";
import {
    popupFilterCountCategories,
    popupFilterCountImages,
    popupFilterCountLinks,
    popupFilterDisambigDetect,
    popupFilterLastModified,
    popupFilterPageSize,
    popupFilterStubDetect,
    popupFilterWikibaseItem,
} from "../preview/pageinfo.ts";

export type OptionValue = string | number | boolean | null | object | undefined;

// 运行时选项缓存 = legacy pg.option：首次取值时并入 window 覆盖后固化
export const optionStore: Record<string, OptionValue> = {};

// 默认值表 = legacy pg.optionDefault，由 setOptions/setDefault 填充
export const optionDefault: Record<string, OptionValue> = {};

const newOption = (x: string, def: OptionValue): void => {
    optionDefault[x] = def;
};

export const setDefault = (x: string, def: OptionValue): void => {
    newOption(x, def);
};

const defaultize = (x: string): void => {
    // 仅 null/undefined 触发默认化——false/0/空串是合法的用户覆盖值，
    // 不得被默认值替换（legacy 判定写法照搬）
    if (optionStore[x] === null || typeof optionStore[x] === "undefined") {
        const w = window as unknown as Record<string, unknown>;
        // 注意 window 上显式赋的 null 视同已设置（typeof null === "object"），
        // 会原样进入缓存——legacy 同款行为
        if (typeof w[x] !== "undefined") {
            optionStore[x] = w[x];
        } else {
            optionStore[x] = optionDefault[x];
        }
    }
};

export const getValueOf = (varName: string): OptionValue => {
    defaultize(varName);
    return optionStore[varName];
};

export const setOptions = (): void => {
    // popupAdminLinks 随 sysop 组：legacy 遍历 wgUserGroups 找 sysop，
    // includes 语义等价
    const groups = mw.config.get("wgUserGroups") as string[] | null | undefined;
    const userIsSysop = !!groups && groups.includes("sysop");
    newOption("popupDelay", 0.5);
    newOption("popupHideDelay", 0.5);
    newOption("simplePopups", false);
    newOption("popupStructure", "shortmenus");
    newOption("popupActionsMenu", true);
    newOption("popupSetupMenu", true);
    newOption("popupAdminLinks", userIsSysop);
    newOption("popupShortcutKeys", false);
    newOption("popupHistoricalLinks", true);
    newOption("popupOnlyArticleLinks", true);
    newOption("removeTitles", true);
    newOption("popupMaxWidth", 350);
    newOption("popupSimplifyMainLink", true);
    newOption("popupAppendRedirNavLinks", true);
    newOption("popupTocLinks", false);
    newOption("popupSubpopups", true);
    newOption("popupDragHandle", false);
    newOption("popupLazyPreviews", true);
    newOption("popupLazyDownloads", true);
    newOption("popupAllDabsStubs", false);
    newOption("popupDebugging", false);
    newOption("popupActiveNavlinks", true);
    newOption("popupModifier", false);
    newOption("popupModifierAction", "enable");
    newOption("popupDraggable", true);
    newOption("popupReview", false);
    newOption("popupLocale", false);
    newOption("popupDateTimeFormatterOptions", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    newOption("popupDateFormatterOptions", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    newOption("popupTimeFormatterOptions", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    newOption("popupImages", true);
    newOption("imagePopupsForImages", true);
    newOption("popupNeverGetThumbs", false);
    newOption("popupThumbAction", "imagepage");
    newOption("popupImageSize", 60);
    newOption("popupImageSizeLarge", 200);
    newOption("popupFixRedirs", false);
    newOption("popupRedirAutoClick", "wpDiff");
    newOption("popupFixDabs", false);
    newOption("popupDabsAutoClick", "wpDiff");
    newOption("popupRevertSummaryPrompt", false);
    newOption("popupMinorReverts", false);
    newOption("popupRedlinkRemoval", false);
    newOption("popupRedlinkAutoClick", "wpDiff");
    newOption("popupWatchDisambiggedPages", null);
    newOption("popupWatchRedirredPages", null);
    newOption("popupDabWiktionary", "last");
    newOption("popupNavLinks", true);
    newOption("popupNavLinkSeparator", " &sdot; ");
    newOption("popupLastEditLink", true);
    newOption("popupEditCounterTool", "supercount");
    newOption("popupEditCounterUrl", "");
    newOption("popupPreviews", true);
    newOption("popupSummaryData", true);
    newOption("popupMaxPreviewSentences", 5);
    newOption("popupMaxPreviewCharacters", 600);
    newOption("popupLastModified", true);
    newOption("popupPreviewKillTemplates", true);
    newOption("popupPreviewRawTemplates", true);
    newOption("popupPreviewFirstParOnly", true);
    newOption("popupPreviewCutHeadings", true);
    newOption("popupPreviewButton", false);
    newOption("popupPreviewButtonEvent", "click");
    newOption("popupPreviewDiffs", true);
    newOption("popupDiffMaxLines", 100);
    newOption("popupDiffContextLines", 2);
    newOption("popupDiffContextCharacters", 40);
    newOption("popupDiffDates", true);
    newOption("popupDiffDatePrinter", "toLocaleString");
    // 编辑摘要默认值经 popupString 取萌百译文（defaultpopup* 模板键）
    newOption("popupReviewedSummary", popupString("defaultpopupReviewedSummary"));
    newOption("popupFixDabsSummary", popupString("defaultpopupFixDabsSummary"));
    newOption("popupExtendedRevertSummary", popupString("defaultpopupExtendedRevertSummary"));
    newOption("popupRevertSummary", popupString("defaultpopupRevertSummary"));
    newOption("popupRevertToPreviousSummary", popupString("defaultpopupRevertToPreviousSummary"));
    newOption("popupQueriedRevertSummary", popupString("defaultpopupQueriedRevertSummary"));
    newOption("popupQueriedRevertToPreviousSummary", popupString("defaultpopupQueriedRevertToPreviousSummary"));
    newOption("popupFixRedirsSummary", popupString("defaultpopupFixRedirsSummary"));
    newOption("popupRedlinkSummary", popupString("defaultpopupRedlinkSummary"));
    newOption("popupRmDabLinkSummary", popupString("defaultpopupRmDabLinkSummary"));
    newOption("popupHistoryLimit", 50);
    // 8 个 pageinfo 统计过滤器按 legacy 注册顺序进 popupData 槽：小作品 →
    // 消歧义 → 页面大小 → 内链 → 图片 → 分类 → 最后修改 → wikibase。
    // 与 pageinfo 模块互相 import（legacy 同款环引用）：双方顶层都只有函数
    // 定义，首次实际取值发生在 setOptions() 调用时，环引用无碍
    newOption("popupFilters", [popupFilterStubDetect, popupFilterDisambigDetect, popupFilterPageSize, popupFilterCountLinks, popupFilterCountImages, popupFilterCountCategories, popupFilterLastModified, popupFilterWikibaseItem]);
    newOption("extraPopupFilters", []);
    newOption("popupOnEditSelection", "cursor");
    newOption("popupPreviewHistory", true);
    newOption("popupImageLinks", true);
    newOption("popupCategoryMembers", true);
    newOption("popupUserInfo", true);
    newOption("popupHistoryPreviewLimit", 25);
    newOption("popupContribsPreviewLimit", 25);
    newOption("popupRevDelUrl", "//en.wikipedia.org/wiki/Wikipedia:Revision_deletion");
    newOption("popupShowGender", true);
    newOption("popupNewWindows", false);
    newOption("popupLinksNewWindow", {
        lastContrib: true,
        sinceMe: true,
    });
    newOption("popupDabRegexp", "disambiguation\\}\\}|\\{\\{\\s*(d(ab|isamb(ig(uation)?)?)|(((geo|hn|road?|school|number)dis)|[234][lc][acw]|(road|ship)index))\\s*(\\|[^}]*)?\\}\\}|is a .*disambiguation.*page");
    newOption("popupAnchorRegexp", "anchors?");
    newOption("popupStubRegexp", "(sect)?stub[}][}]|This .*-related article is a .*stub");
    newOption("popupImageVarsRegexp", "image|image_(?:file|skyline|name|flag|seal)|cover|badge|logo");
};

// 锚点上与门控相关的最小结构面：完整锚点扩展属性随 events/actions 阶段迁入
export interface PopupAnchorLike {
    // 简易弹窗已被用户展开的标记（legacy 在锚点上维护的 simpleNoMore）
    simpleNoMore?: boolean;
}

export const shouldShowNonSimple = (a: PopupAnchorLike): boolean | undefined => !getValueOf("simplePopups") || a.simpleNoMore;

export const shouldShow = (a: PopupAnchorLike, option: string): unknown => {
    if (shouldShowNonSimple(a)) {
        return getValueOf(option);
    }
    // 简易模式下不看运行时选项，直查 window 覆盖；truthy 原值返回（legacy 语义照搬）
    const w = window as unknown as Record<string, unknown>;
    return typeof w[option] !== "undefined" && w[option];
};
