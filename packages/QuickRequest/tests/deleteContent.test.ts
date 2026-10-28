import { describe, expect, it } from "vitest";
import {
    applyRedirectInfo,
    buildBatchBody,
    buildDeleteSectionTitle,
    buildSingleBody,
    normalizeBatchTitle,
    parseBatchPages,
} from "../src/deleteContent.ts";
import type { QuickRequestContext } from "../src/types.ts";

const context: QuickRequestContext = {
    pageName: "Example_page",
    talkPage: "Example_talk",
    userName: "Someone",
    userGroups: [],
    now: new Date(2026, 9, 27),
    isRedirect: false,
};

describe("buildSingleBody", () => {
    it("普通页面输出内链，含理由、详情与签名", () => {
        expect(buildSingleBody("cm:Foo", false, "理由", "详情")).toBe(
            "* '''页面标题'''：[[:cm:Foo]]\n* '''申请理由'''：理由\n* '''详细原因'''：详情\n~~~~",
        );
    });

    it("重定向页用 NoRedirectLink，详情为空时整行不输出", () => {
        expect(buildSingleBody("Foo", true, "理由", "")).toBe(
            "* '''页面标题'''：{{NoRedirectLink|Foo}}\n* '''申请理由'''：理由\n~~~~",
        );
    });
});

describe("buildBatchBody", () => {
    it("逐行列出页面（重定向用 NoRedirectLink），理由/详情/签名同单页", () => {
        expect(buildBatchBody([
            { title: "A", isRedirect: false },
            { title: "cm:B", isRedirect: true },
        ], "理由", "详情")).toBe(
            "* '''页面标题'''：\n** [[:A]]\n** {{NoRedirectLink|cm:B}}\n* '''申请理由'''：理由\n* '''详细原因'''：详情\n~~~~",
        );
    });

    it("详情为空时整行不输出", () => {
        expect(buildBatchBody([{ title: "A", isRedirect: false }], "理由", "")).toBe(
            "* '''页面标题'''：\n** [[:A]]\n* '''申请理由'''：理由\n~~~~",
        );
    });
});

describe("parseBatchPages", () => {
    it("主站视角：无前缀行视为主站页面，去重且保持顺序", () => {
        expect(parseBatchPages("A\n\n B \nA\ncm:C\nzhmoe:D", "zh")).toEqual([
            { title: "A", queryTitle: "A", site: "zh" },
            { title: "B", queryTitle: "B", site: "zh" },
            { title: "cm:C", queryTitle: "C", site: "commons" },
            { title: "D", queryTitle: "D", site: "zh" },
        ]);
    });

    it("共享站视角：无前缀行补 cm: 前缀", () => {
        expect(parseBatchPages("E\nzhmoe:F", "commons")).toEqual([
            { title: "cm:E", queryTitle: "E", site: "commons" },
            { title: "F", queryTitle: "F", site: "zh" },
        ]);
    });

    it("前缀大小写不敏感，标题保留原始写法", () => {
        expect(parseBatchPages("CM:G", "zh")).toEqual([{ title: "CM:G", queryTitle: "G", site: "commons" }]);
    });

    it("仅有前缀或含非法字符的行报错并列出行内容", () => {
        expect(() => parseBatchPages("cm:\nA|B", "zh")).toThrow("cm:、A|B");
    });
});

describe("normalizeBatchTitle", () => {
    it("下划线转空格、折叠连续空白、首字母大写", () => {
        expect(normalizeBatchTitle("foo _bar  baz")).toBe("Foo bar baz");
    });

    it("非小写字母开头时首字符不变", () => {
        expect(normalizeBatchTitle("中文 page")).toBe("中文 page");
    });
});

describe("applyRedirectInfo", () => {
    it("经归一化与 normalized 映射链识别重定向，顺序与入参一致", () => {
        const pages = [
            { title: "cm:foo_bar", queryTitle: "foo_bar", site: "commons" as const },
            { title: "cm:Bar", queryTitle: "Bar", site: "commons" as const },
        ];
        const normalized = new Map([["Foo bar", "Foo bar baz"]]);
        const redirects = new Set(["Foo bar baz"]);
        expect(applyRedirectInfo(pages, normalized, redirects)).toEqual([
            { title: "cm:foo_bar", isRedirect: true },
            { title: "cm:Bar", isRedirect: false },
        ]);
    });
});

describe("buildDeleteSectionTitle", () => {
    it("单页：请求删除页面：[[页面]] - 用户 - 补零日期（共享站页面带 cm: 前缀）", () => {
        expect(buildDeleteSectionTitle({}, context, "zh")).toBe("请求删除页面：[[Example_page]] - Someone - 2026.10.27");
        expect(buildDeleteSectionTitle({}, context, "commons")).toBe("请求删除页面：[[cm:Example_page]] - Someone - 2026.10.27");
    });

    it("批量：批量删除请求 - 用户 - 补零日期", () => {
        expect(buildDeleteSectionTitle({ batch: "1" }, context, "zh")).toBe("批量删除请求 - Someone - 2026.10.27");
    });
});
