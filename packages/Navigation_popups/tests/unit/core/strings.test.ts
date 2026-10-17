// strings 模块：popupString 查表链、popupNoTranslation 缺译记录、
// tprintf/simplePrintf 双占位符语义、萌百 localStorage 清理行的函数化等价。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { popupStrings as i18nTable } from "../../../src/i18n/popupStrings.ts";
import {
    cleanupLegacyNoTranslationStorage,
    englishStrings,
    popupNoTranslation,
    popupString,
    simplePrintf,
    tprintf,
} from "../../../src/core/strings.ts";

beforeEach(() => {
    popupNoTranslation.clear();
    Reflect.deleteProperty(window, "popupStrings");
});

afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, "popupStrings");
});

describe("英文默认串表 englishStrings", () => {
    it("规模与 legacy pg.string 完全一致（216 项）", () => {
        expect(Object.keys(englishStrings)).toHaveLength(216);
    });

    it("键值照搬抽查（含 enwiki 署名与别名值不等于键的项）", () => {
        expect(englishStrings.raw).toBe("source");
        expect(englishStrings.last).toBe("prev");
        expect(englishStrings.render).toBe("simple");
        expect(englishStrings.autoedit_version).toBe("np20140416");
        expect(englishStrings["Invalid %s %s"]).toBe("The option %s is invalid: %s");
        expect(englishStrings.defaultpopupRevertSummary).toBe(
            "Revert to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        );
        expect(englishStrings.defaultpopupQueriedRevertSummary).toBe(
            "Revert to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        );
    });
});

describe("popupString 查表链", () => {
    it("内置萌百翻译表命中时返回译文", () => {
        expect(popupString("article")).toBe("条目");
        expect(popupString("stub")).toBe("小作品");
    });

    it("window.popupStrings 外部覆盖优先于内置表", () => {
        window.popupStrings = { article: "外部词条" };
        expect(popupString("article")).toBe("外部词条");
    });

    it("外部覆盖值为空串时按未命中处理（truthy 判定照搬 legacy）", () => {
        window.popupStrings = { article: "" };
        expect(popupString("article")).toBe("条目");
    });

    it("英文表兜底：内置表缺失的键回落英文表且不计缺译", () => {
        // 现行萌百表（242 键）覆盖英文表全部 216 键，本分支仅在两表出现
        // 增删漂移时可达；注入合成键锁定回退契约。
        const key = "__testEnglishOnly__";
        englishStrings[key] = "English fallback";
        const result = popupString(key);
        Reflect.deleteProperty(englishStrings, key);
        expect(result).toBe("English fallback");
        expect(popupNoTranslation.has(key)).toBe(false);
    });

    it("全部表未命中时返回原键兜底", () => {
        expect(popupString("__noSuchKey__")).toBe("__noSuchKey__");
    });
});

describe("popupNoTranslation 缺译记录", () => {
    it("未命中翻译记入 Set 并 console.info 报告，重复查询不重复报告", () => {
        const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
        popupString("__missing__");
        popupString("__missing__");
        expect(popupNoTranslation.has("__missing__")).toBe(true);
        expect(info).toHaveBeenCalledOnce();
        expect(info).toHaveBeenLastCalledWith("popupNoTranslation", popupNoTranslation);
    });

    it("autoedit 动作 URL 串不入记录（legacy 排除条件照搬）", () => {
        const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
        const url = "edit&autoclick=wpSave&autoimpl=np20140416&actoken=x";
        expect(popupString(url)).toBe(url);
        expect(popupNoTranslation.has(url)).toBe(false);
        expect(info).not.toHaveBeenCalled();
    });

    it("*Hint 结尾的键不入记录", () => {
        const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
        expect(popupString("__missingHint")).toBe("__missingHint");
        expect(popupNoTranslation.size).toBe(0);
        expect(info).not.toHaveBeenCalled();
    });

    it("命中翻译时不记录不报告", () => {
        const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
        popupString("article");
        expect(popupNoTranslation.size).toBe(0);
        expect(info).not.toHaveBeenCalled();
    });
});

describe("tprintf", () => {
    it("%s 键配萌百译文的 $1..$N 模板（revision 模板惯例）", () => {
        // 萌百表把 "revision %s of %s" 译成 $2/$1 语序模板
        expect(tprintf("revision %s of %s", [123, "条目"])).toBe("页面 条目 的修订版本 123");
    });

    it("标量参数包装为单元素数组", () => {
        expect(tprintf("Go to %s", "X")).toBe("Go to X");
    });

    it("未传参数时 %s 渲染为空串（join 把 undefined 转空串，legacy 行为）", () => {
        expect(tprintf("Go to %s")).toBe("Go to ");
    });

    it("参数不足时占位符原样保留", () => {
        expect(tprintf("Go to %s and %s", ["X"])).toBe("Go to X and %s");
    });

    it("超出下标与无效下标（$0）的 $N 原样保留", () => {
        expect(tprintf("$3 of $0", ["a", "b"])).toBe("$3 of $0");
    });

    it("%s 与 $N 可混用（%s 序号计数独立于 $N，legacy 行为）", () => {
        // 第二个 %s 仍取 i=1 处的 "b"：$N 的使用不推进 %s 的序号
        expect(tprintf("%s then $2 then %s", ["a", "b", "c"])).toBe("a then b then b");
    });
});

describe("simplePrintf", () => {
    it("空串直通", () => {
        expect(simplePrintf("", ["x"])).toBe("");
    });

    it("无占位符原样返回", () => {
        expect(simplePrintf("plain text", [])).toBe("plain text");
    });
});

describe("萌百旧版遗留清理", () => {
    it("清理函数移除 localStorage 的 popupNoTranslation 键", () => {
        const removeItem = vi.spyOn(Storage.prototype, "removeItem");
        cleanupLegacyNoTranslationStorage();
        expect(removeItem).toHaveBeenCalledExactlyOnceWith("popupNoTranslation");
    });
});

describe("内置表与英文表的关系锁定", () => {
    it("英文表全部键都被内置萌百表覆盖（英文层缺省不可达的原因）", () => {
        for (const key of Object.keys(englishStrings)) {
            expect(i18nTable[key], `键 ${key} 应被萌百表覆盖`).toBeTruthy();
        }
    });
});
