import { describe, expect, it, vi } from "vitest";

// mailmap 是「import 即读 .mailmap」的模块；vi.mock 提升到模块加载前执行，
// 被测模块拿到的是这份固定映射，isMapped 的查询结果从而可确定
vi.mock("../../modules/mailmap.js", () => ({
    "default": {
        "mapped@example.com": "MappedUser",
        "other@example.com": "OtherUser",
    },
}));

import { detectIfBot, isMapped } from "../../emailmapChecker/detectIfBot.js";

describe("detectIfBot", () => {
    it("姓名以 [bot] 结尾时判定为 bot", () => {
        expect(detectIfBot("dependabot[bot]", "bot@example.com")).toBe(true);
    });

    it("[bot] 不在姓名最末（其后还有字符）时不判定为 bot", () => {
        expect(detectIfBot("team[bot] members", "user@example.com")).toBe(false);
    });

    it("邮箱域名为 github.com 时判定为 bot", () => {
        expect(detectIfBot("GitHub", "noreply@github.com")).toBe(true);
    });

    it("普通姓名与普通邮箱不判定为 bot", () => {
        expect(detectIfBot("AnnAngela", "annangela@example.com")).toBe(false);
    });

    it("邮箱域名为子域 noreply.github.com 时不判定为 bot（仅精确匹配 github.com）", () => {
        expect(detectIfBot("Someone", "123456+user@users.noreply.github.com")).toBe(false);
    });

    it("姓名缺失时兜底为空字符串，仅凭邮箱判断", () => {
        expect(detectIfBot(null, "user@example.com")).toBe(false);
        expect(detectIfBot(undefined, "user@github.com")).toBe(true);
    });

    it("邮箱缺失时兜底为空字符串，不抛 TypeError", () => {
        expect(detectIfBot("Someone", null)).toBe(false);
        expect(detectIfBot("Someone", undefined)).toBe(false);
        expect(detectIfBot(null, undefined)).toBe(false);
    });
});

describe("isMapped", () => {
    it("邮箱在 mailmap 中时返回 true", () => {
        expect(isMapped("mapped@example.com")).toBe(true);
    });

    it("邮箱大小写归一化为小写后查询", () => {
        expect(isMapped("MAPPED@Example.COM")).toBe(true);
    });

    it("邮箱不在 mailmap 中时返回 false", () => {
        expect(isMapped("unknown@example.com")).toBe(false);
    });

    it("非字符串输入（null/undefined/数字）返回 false 而不抛错", () => {
        expect(isMapped(null)).toBe(false);
        expect(isMapped(undefined)).toBe(false);
        expect(isMapped(123)).toBe(false);
    });
});
