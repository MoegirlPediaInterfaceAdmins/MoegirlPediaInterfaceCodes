// i18n 萌百翻译表的完整性守卫：这是必须原样保留的萌百定制资产
// （.zcode/rewrite-plan.md §2），键的增删都应在这里被测试拦住。
import { describe, expect, it } from "vitest";
import { popupStrings } from "../../src/i18n/popupStrings.ts";

// 「以下内容由 [[User:AnnAngela]] 补正」段的萌百独有键（legacy 存档逐键核对）
const MOEGIRL_ADDED_KEYS = [
    "globalSearchHint",
    "googleSearchHint",
    "enable previews",
    "show preview",
    "historyfeedHint",
    "send thanks",
    "ThanksHint",
    "mark patrolled",
    "markpatrolledHint",
    "Could not marked this edit as patrolled",
    "defaultpopupReviewedSummary",
    "Image from Commons",
    "Description page",
    "Alt text:",
    "revdel",
    "editCounterLinkHint",
    "DeletedcontributionsHint",
    "No backlinks found",
    " and more",
    "Download preview data",
    "Invalid or IP user",
    "Not a registered username",
    "BLOCKED",
    "Has blocks",
    " edits since: ",
    "last edit on ",
    "EmailUserHint",
    "RANGEBLOCKED",
    "IP user",
    "♀",
    "♂",
    "HIDDEN",
    "LOCKED",
    "Invalid user",
    "diff",
    " to ",
    "autoedit_version",
    "PrefixIndexHint",
    "nullEditSummary",
    "group-no-autoconfirmed",
    "separator",
    "comma",
] as const;

// 编辑摘要模板键全集（legacy options.ts / strings.ts 双侧核对）
const DEFAULT_SUMMARY_KEYS = [
    "defaultpopupExtendedRevertSummary",
    "defaultpopupFixDabsSummary",
    "defaultpopupFixRedirsSummary",
    "defaultpopupQueriedRevertSummary",
    "defaultpopupQueriedRevertToPreviousSummary",
    "defaultpopupRedlinkSummary",
    "defaultpopupRevertSummary",
    "defaultpopupRevertToPreviousSummary",
    "defaultpopupReviewedSummary",
    "defaultpopupRmDabLinkSummary",
] as const;

describe("萌百翻译表 popupStrings", () => {
    it("规模与原表完全一致（242 项）", () => {
        expect(Object.keys(popupStrings)).toHaveLength(242);
    });

    it("全部值为非空字符串", () => {
        for (const [key, value] of Object.entries(popupStrings)) {
            expect(value, `键 ${key} 的值应为非空字符串`).toMatch(/\S/);
        }
    });

    it("萌百补正段独有键全部在表", () => {
        for (const key of MOEGIRL_ADDED_KEYS) {
            expect(popupStrings, `缺萌百独有键 ${key}`).toHaveProperty(key);
        }
    });

    it("defaultpopup* 编辑摘要模板键齐全", () => {
        for (const key of DEFAULT_SUMMARY_KEYS) {
            expect(popupStrings, `缺摘要模板键 ${key}`).toHaveProperty(key);
        }
    });

    it("wgULS 直通（简体）下取简体值", () => {
        expect(popupStrings.article).toBe("条目");
        expect(popupStrings.stub).toBe("小作品");
    });
});
