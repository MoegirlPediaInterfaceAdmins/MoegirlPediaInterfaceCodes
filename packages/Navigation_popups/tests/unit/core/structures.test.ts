// structures 模块镜像测试：7 种弹窗结构的布局槽序、重定向槽表与槽填充器
// 映射的 copyStructure 派生语义。行为基准 = legacy domdrag.ts 顶部的 original
// 结构定义 + structures.ts 的派生表（commit 02c8dec）。
// legacy 把槽填充器（navlinks DSL 渲染）内联在结构对象上；重写版结构表只
// 声明「槽名 → 注册表键」绑定（`${结构名}.${槽名}` 约定），实现由 navlinks
// （阶段 4）/preview（阶段 2/3）域后续注册——本文件锁绑定关系与派生语义。
import { describe, expect, it } from "vitest";
import { flattenLayout, getSlotFiller, registerSlotFiller, structures } from "../../../src/core/structures.ts";

// legacy original.popupLayout（domdrag.ts:122）逐项照搬——槽序是 DOM/CSS 契约
// 冻结点（docs/functional-spec.md §14），嵌套组表示「插入前一槽容器内部」。
const REDIR_GROUP = ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"];

const ORIGINAL_LAYOUT = [
    "popupError",
    "popupImage",
    "popupTopLinks",
    "popupTitle",
    "popupUserData",
    "popupData",
    "popupOtherLinks",
    "popupRedir",
    REDIR_GROUP,
    "popupMiscTools",
    ["popupRedlink"],
    "popupPrePreviewSep",
    "popupPreview",
    "popupSecondPreview",
    "popupPreviewMore",
    "popupPostPreview",
    "popupFixDab",
];

const ORIGINAL_REDIR_SPANS = ["popupRedir", "popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"];

describe("结构表全集与 original 基准", () => {
    it("恰好定义 7 种结构", () => {
        expect(Object.keys(structures)).toEqual(["original", "nostalgia", "fancy", "fancy2", "menus", "shortmenus", "lite"]);
    });

    it("original：布局、重定向槽表与槽键绑定逐项对齐 legacy", () => {
        expect(structures.original.popupLayout()).toEqual(ORIGINAL_LAYOUT);
        expect(structures.original.popupRedirSpans?.()).toEqual(ORIGINAL_REDIR_SPANS);
        expect(structures.original.slots).toEqual({
            popupTitle: "original.popupTitle",
            popupTopLinks: "original.popupTopLinks",
            popupImage: "original.popupImage",
            // legacy：popupRedirTitle/popupRedirTopLinks 与非 redir 版指向同一函数
            popupRedirTitle: "original.popupTitle",
            popupRedirTopLinks: "original.popupTopLinks",
        });
    });

    it("original 每次调用 layout 返回新数组实例（legacy 数组字面量照搬）", () => {
        expect(structures.original.popupLayout()).not.toBe(structures.original.popupLayout());
    });
});

describe("copyStructure 派生语义", () => {
    it("nostalgia：继承 original 布局/重定向槽表，仅覆盖 TopLinks 槽键（redir 版同键）", () => {
        expect(structures.nostalgia.popupLayout()).toEqual(ORIGINAL_LAYOUT);
        expect(structures.nostalgia.popupRedirSpans?.()).toEqual(ORIGINAL_REDIR_SPANS);
        expect(structures.nostalgia.slots).toEqual({
            popupTitle: "original.popupTitle",
            popupTopLinks: "nostalgia.popupTopLinks",
            popupImage: "original.popupImage",
            popupRedirTitle: "original.popupTitle",
            popupRedirTopLinks: "nostalgia.popupTopLinks",
        });
        // 槽键映射是独立副本：派生结构的覆盖不得写穿回基结构
        expect(structures.nostalgia.slots).not.toBe(structures.original.slots);
    });

    it("fancy：覆盖 Title/TopLinks/OtherLinks 三槽（含 redir 别名），其余继承 original", () => {
        expect(structures.fancy.popupLayout()).toEqual(ORIGINAL_LAYOUT);
        expect(structures.fancy.popupRedirSpans?.()).toEqual(ORIGINAL_REDIR_SPANS);
        expect(structures.fancy.slots).toEqual({
            popupTitle: "fancy.popupTitle",
            popupTopLinks: "fancy.popupTopLinks",
            popupImage: "original.popupImage",
            popupRedirTitle: "fancy.popupTitle",
            popupRedirTopLinks: "fancy.popupTopLinks",
            popupOtherLinks: "fancy.popupOtherLinks",
            popupRedirOtherLinks: "fancy.popupOtherLinks",
        });
    });

    it("fancy2：从 fancy 派生，布局前移 Title 到 TopLinks 前，并覆盖 TopLinks 槽键", () => {
        expect(structures.fancy2.popupLayout()).toEqual([
            "popupError",
            "popupImage",
            "popupTitle",
            "popupUserData",
            "popupData",
            "popupTopLinks",
            "popupOtherLinks",
            "popupRedir",
            REDIR_GROUP,
            "popupMiscTools",
            ["popupRedlink"],
            "popupPrePreviewSep",
            "popupPreview",
            "popupSecondPreview",
            "popupPreviewMore",
            "popupPostPreview",
            "popupFixDab",
        ]);
        expect(structures.fancy2.popupRedirSpans?.()).toEqual(ORIGINAL_REDIR_SPANS);
        expect(structures.fancy2.slots).toEqual({
            popupTitle: "fancy.popupTitle",
            popupTopLinks: "fancy2.popupTopLinks",
            popupImage: "original.popupImage",
            popupRedirTitle: "fancy.popupTitle",
            popupRedirTopLinks: "fancy.popupTopLinks",
            popupOtherLinks: "fancy.popupOtherLinks",
            popupRedirOtherLinks: "fancy.popupOtherLinks",
        });
    });

    it("menus：布局把 TopLinks 提到 Title 前、数据槽后移，TopLinks 槽键覆盖（redir 版同键）", () => {
        expect(structures.menus.popupLayout()).toEqual([
            "popupError",
            "popupImage",
            "popupTopLinks",
            "popupTitle",
            "popupOtherLinks",
            "popupRedir",
            REDIR_GROUP,
            "popupUserData",
            "popupData",
            "popupMiscTools",
            ["popupRedlink"],
            "popupPrePreviewSep",
            "popupPreview",
            "popupSecondPreview",
            "popupPreviewMore",
            "popupPostPreview",
            "popupFixDab",
        ]);
        expect(structures.menus.popupRedirSpans?.()).toEqual(ORIGINAL_REDIR_SPANS);
        expect(structures.menus.slots).toEqual({
            popupTitle: "original.popupTitle",
            popupTopLinks: "menus.popupTopLinks",
            popupImage: "original.popupImage",
            // legacy menus.popupRedirTitle 别名到 menus.popupTitle——后者正是
            // 从 original 复制来的那份，故键保持 original.popupTitle
            popupRedirTitle: "original.popupTitle",
            popupRedirTopLinks: "menus.popupTopLinks",
        });
    });

    it("shortmenus：从 menus 派生，仅 TopLinks 槽键换成简化版（redir 版同键）", () => {
        expect(structures.shortmenus.popupLayout()).toEqual(structures.menus.popupLayout());
        expect(structures.shortmenus.popupRedirSpans?.()).toEqual(ORIGINAL_REDIR_SPANS);
        expect(structures.shortmenus.slots).toEqual({
            popupTitle: "original.popupTitle",
            popupTopLinks: "shortmenus.popupTopLinks",
            popupImage: "original.popupImage",
            popupRedirTitle: "original.popupTitle",
            popupRedirTopLinks: "shortmenus.popupTopLinks",
        });
        expect(structures.shortmenus.slots).not.toBe(structures.menus.slots);
    });

    it("lite：只有 Title 与 Preview 两槽，无重定向槽表，Title 槽键指向 lite 专属", () => {
        expect(structures.lite.popupLayout()).toEqual(["popupTitle", "popupPreview"]);
        expect(structures.lite.popupRedirSpans).toBeUndefined();
        expect(structures.lite.slots).toEqual({
            popupTitle: "lite.popupTitle",
        });
    });
});

describe("flattenLayout", () => {
    it("嵌套槽组深度优先展平", () => {
        expect(flattenLayout(["a", ["b", ["c", ["d"]]], "e"])).toEqual(["a", "b", "c", "d", "e"]);
    });

    it("original 布局展平为 21 槽、顺序保留", () => {
        expect(flattenLayout(structures.original.popupLayout())).toEqual([
            "popupError",
            "popupImage",
            "popupTopLinks",
            "popupTitle",
            "popupUserData",
            "popupData",
            "popupOtherLinks",
            "popupRedir",
            "popupWarnRedir",
            "popupRedirTopLinks",
            "popupRedirTitle",
            "popupRedirData",
            "popupRedirOtherLinks",
            "popupMiscTools",
            "popupRedlink",
            "popupPrePreviewSep",
            "popupPreview",
            "popupSecondPreview",
            "popupPreviewMore",
            "popupPostPreview",
            "popupFixDab",
        ]);
    });
});

describe("槽填充器注册表", () => {
    it("注册后按名取回，重复注册以后者覆盖", () => {
        const first = (): string => "1";
        const second = (): string => "2";
        registerSlotFiller("test.slot", first);
        expect(getSlotFiller("test.slot")).toBe(first);
        registerSlotFiller("test.slot", second);
        expect(getSlotFiller("test.slot")).toBe(second);
    });

    it("未注册的键返回 undefined", () => {
        expect(getSlotFiller("never.registered")).toBeUndefined();
    });
});
