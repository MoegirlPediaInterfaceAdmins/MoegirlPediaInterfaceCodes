// options 模块：默认值全集、window.popupXxx 覆盖链（legacy defaultize 写法
// 照搬——仅 null/undefined 触发默认化）、setDefault、shouldShow 门控。
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { popupStrings } from "../../../src/i18n/popupStrings.ts";
import {
    popupFilterCountCategories,
    popupFilterCountImages,
    popupFilterCountLinks,
    popupFilterDisambigDetect,
    popupFilterLastModified,
    popupFilterPageSize,
    popupFilterStubDetect,
    popupFilterWikibaseItem,
} from "../../../src/preview/pageinfo.ts";
import {
    getValueOf,
    optionDefault,
    optionStore,
    setDefault,
    setOptions,
    shouldShow,
    shouldShowNonSimple,
} from "../../../src/core/options.ts";

// 本文件里会被写到 window 上的选项覆盖，用例间统一摘除
const WINDOW_OVERRIDES = ["popupDelay", "popupImages", "popupMaxWidth", "simplePopups", "popupPreviewDiffs"];

const setWindowOption = (key: string, value: unknown): void => {
    (window as unknown as Record<string, unknown>)[key] = value;
};

const clearWindowOptions = (): void => {
    for (const key of WINDOW_OVERRIDES) {
        Reflect.deleteProperty(window, key);
    }
};

beforeEach(() => {
    // 两张表都是模块级状态，用例间清空保证计数与链路断言确定性
    for (const key of Object.keys(optionStore)) {
        Reflect.deleteProperty(optionStore, key);
    }
    for (const key of Object.keys(optionDefault)) {
        Reflect.deleteProperty(optionDefault, key);
    }
    clearWindowOptions();
    installMw();
});

afterEach(() => {
    clearWindowOptions();
});

describe("setOptions 默认值全集", () => {
    it("注册 97 项默认值（legacy newOption 全集）", () => {
        setOptions();
        expect(Object.keys(optionDefault)).toHaveLength(97);
    });

    it("抽查标量默认值（结构/延迟/链接/正则/新窗口映射）", () => {
        setOptions();
        expect(optionDefault.popupDelay).toBe(0.5);
        expect(optionDefault.popupStructure).toBe("shortmenus");
        expect(optionDefault.popupNavLinkSeparator).toBe(" &sdot; ");
        expect(optionDefault.popupRevDelUrl).toBe("//en.wikipedia.org/wiki/Wikipedia:Revision_deletion");
        expect(optionDefault.popupDabRegexp).toBe(
            "disambiguation\\}\\}|\\{\\{\\s*(d(ab|isamb(ig(uation)?)?)|(((geo|hn|road?|school|number)dis)|[234][lc][acw]|(road|ship)index))\\s*(\\|[^}]*)?\\}\\}|is a .*disambiguation.*page",
        );
        expect(optionDefault.popupAnchorRegexp).toBe("anchors?");
        expect(optionDefault.popupStubRegexp).toBe("(sect)?stub[}][}]|This .*-related article is a .*stub");
        expect(optionDefault.popupImageVarsRegexp).toBe("image|image_(?:file|skyline|name|flag|seal)|cover|badge|logo");
        expect(getValueOf("popupLinksNewWindow")).toEqual({ lastContrib: true, sinceMe: true });
        expect(getValueOf("popupEditCounterTool")).toBe("supercount");
        expect(getValueOf("popupWatchDisambiggedPages")).toBeNull();
        expect(getValueOf("extraPopupFilters")).toEqual([]);
    });

    it("popupFilters 默认注册 8 个 pageinfo 过滤器（legacy 注册顺序）", () => {
        setOptions();
        expect(getValueOf("popupFilters")).toEqual([
            popupFilterStubDetect,
            popupFilterDisambigDetect,
            popupFilterPageSize,
            popupFilterCountLinks,
            popupFilterCountImages,
            popupFilterCountCategories,
            popupFilterLastModified,
            popupFilterWikibaseItem,
        ]);
    });

    it("三个 Intl Formatter 选项对象逐字段一致", () => {
        setOptions();
        expect(getValueOf("popupDateTimeFormatterOptions")).toEqual({
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        expect(getValueOf("popupDateFormatterOptions")).toEqual({
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        expect(getValueOf("popupTimeFormatterOptions")).toEqual({
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    });

    it("defaultpopup*Summary 默认值经 popupString 取萌百译文", () => {
        setOptions();
        expect(getValueOf("popupReviewedSummary")).toBe(popupStrings.defaultpopupReviewedSummary);
        expect(getValueOf("popupRevertSummary")).toBe(popupStrings.defaultpopupRevertSummary);
        expect(getValueOf("popupQueriedRevertSummary")).toBe(popupStrings.defaultpopupQueriedRevertSummary);
        expect(getValueOf("popupRmDabLinkSummary")).toBe(popupStrings.defaultpopupRmDabLinkSummary);
    });

    it("popupAdminLinks 随 sysop 组开", () => {
        installMw({ config: { wgUserGroups: ["sysop", "interface-admin"] } });
        setOptions();
        expect(getValueOf("popupAdminLinks")).toBe(true);
    });

    it("非 sysop 默认 false", () => {
        setOptions();
        expect(getValueOf("popupAdminLinks")).toBe(false);
    });

    it("wgUserGroups 为 null 时也默认 false", () => {
        installMw({ config: { wgUserGroups: null } });
        setOptions();
        expect(getValueOf("popupAdminLinks")).toBe(false);
    });
});

describe("getValueOf 覆盖链", () => {
    it("window 覆盖优先于默认值", () => {
        setOptions();
        setWindowOption("popupDelay", 3);
        expect(getValueOf("popupDelay")).toBe(3);
    });

    it("falsy 覆盖（false/0/空串）不被默认值替换（legacy 判定照搬）", () => {
        setOptions();
        setWindowOption("popupImages", false);
        expect(getValueOf("popupImages")).toBe(false);
        setWindowOption("popupDelay", 0);
        expect(getValueOf("popupDelay")).toBe(0);
        setWindowOption("popupMaxWidth", "");
        expect(getValueOf("popupMaxWidth")).toBe("");
    });

    it("window 值为 undefined 视同未设置，回落默认", () => {
        setOptions();
        setWindowOption("popupImages", undefined);
        expect(getValueOf("popupImages")).toBe(true);
    });

    it("window 值为 null 视同已设置，返回 null（legacy typeof 判定照搬）", () => {
        setOptions();
        setWindowOption("popupImages", null);
        expect(getValueOf("popupImages")).toBeNull();
        // 已缓存 null 后再取值：store===null 分支重新默认化，仍取到 window 的 null
        expect(getValueOf("popupImages")).toBeNull();
    });

    it("取值结果粘性缓存（覆盖摘除后不回落）", () => {
        setOptions();
        setWindowOption("popupDelay", 3);
        expect(getValueOf("popupDelay")).toBe(3);
        clearWindowOptions();
        expect(getValueOf("popupDelay")).toBe(3);
    });

    it("未注册且无覆盖的选项返回 undefined", () => {
        expect(getValueOf("__noSuchOption__")).toBeUndefined();
    });
});

describe("setDefault", () => {
    it("注册新默认并可经 getValueOf 取得", () => {
        setDefault("popupCustomOption", 42);
        expect(getValueOf("popupCustomOption")).toBe(42);
    });

    it("覆盖既有默认", () => {
        setDefault("popupDelay", 9);
        expect(getValueOf("popupDelay")).toBe(9);
    });
});

describe("shouldShow 显示门控", () => {
    it("非简易模式走运行时选项值", () => {
        setOptions();
        expect(shouldShow({}, "popupPreviewDiffs")).toBe(true);
    });

    it("简易模式且已展开（simpleNoMore）走运行时选项值", () => {
        setOptions();
        setWindowOption("simplePopups", true);
        expect(shouldShow({ simpleNoMore: true }, "popupPreviewDiffs")).toBe(true);
    });

    it("简易模式未展开直查 window 覆盖，truthy 原值返回", () => {
        setOptions();
        setWindowOption("simplePopups", true);
        setWindowOption("popupPreviewDiffs", "yes");
        expect(shouldShow({}, "popupPreviewDiffs")).toBe("yes");
    });

    it("简易模式未展开且 window 未定义时返回 false", () => {
        setOptions();
        setWindowOption("simplePopups", true);
        expect(shouldShow({}, "popupPreviewDiffs")).toBe(false);
    });

    it("简易模式未展开且 window 为 falsy 时返回 false", () => {
        setOptions();
        setWindowOption("simplePopups", true);
        setWindowOption("popupPreviewDiffs", false);
        expect(shouldShow({}, "popupPreviewDiffs")).toBe(false);
    });
});

describe("shouldShowNonSimple", () => {
    it("非简易（选项未定义）为 true", () => {
        expect(shouldShowNonSimple({})).toBe(true);
    });

    it("简易未展开原样返回 undefined（legacy 写法照搬）", () => {
        setWindowOption("simplePopups", true);
        expect(shouldShowNonSimple({})).toBeUndefined();
    });

    it("简易已展开为 true", () => {
        setWindowOption("simplePopups", true);
        expect(shouldShowNonSimple({ simpleNoMore: true })).toBe(true);
    });
});
