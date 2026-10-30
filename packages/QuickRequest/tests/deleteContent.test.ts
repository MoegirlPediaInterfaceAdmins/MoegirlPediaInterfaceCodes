import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApiForSite } from "../src/api.ts";
import type * as ApiModule from "../src/api.ts";
import {
    applyRedirectInfo,
    buildBatchBody,
    buildDeleteBody,
    buildDeleteSectionTitle,
    buildSingleBody,
    normalizeBatchTitle,
    parseBatchPages,
    resolveBatchPages,
} from "../src/deleteContent.ts";
import type { QuickRequestContext } from "../src/types.ts";

// resolveBatchPages 依赖站点 API；只桩掉 getApiForSite，其余导出保持原实现
vi.mock("../src/api.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof ApiModule>();
    return { ...actual, getApiForSite: vi.fn() };
});

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
        const redirectFlags = new Map([["Foo bar baz", true]]);
        expect(applyRedirectInfo(pages, normalized, redirectFlags)).toEqual([
            { title: "cm:foo_bar", isRedirect: true },
            { title: "cm:Bar", isRedirect: false },
        ]);
    });

    it("标记映射查不到的条目按非重定向处理", () => {
        const pages = [
            { title: "cm:Baz", queryTitle: "Baz", site: "commons" as const },
        ];
        expect(applyRedirectInfo(pages, new Map(), new Map())).toEqual([
            { title: "cm:Baz", isRedirect: false },
        ]);
    });
});

describe("resolveBatchPages", () => {
    it("以 prop=info 逐页 redirect 标记判定，不再携带 redirects 参数", async () => {
        const post = vi.fn().mockResolvedValue({
            query: {
                normalized: [{ from: "foo_bar", to: "Foo bar" }],
                pages: [
                    { title: "Foo bar", redirect: true },
                    { title: "Bar", redirect: false },
                ],
            },
        });
        vi.mocked(getApiForSite).mockReturnValue({ post } as never);

        const result = await resolveBatchPages([
            { title: "cm:foo_bar", queryTitle: "foo_bar", site: "commons" },
            { title: "cm:Bar", queryTitle: "Bar", site: "commons" },
        ]);
        expect(result).toEqual([
            { title: "cm:foo_bar", isRedirect: true },
            { title: "cm:Bar", isRedirect: false },
        ]);
        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][0]).toMatchObject({ action: "query", prop: "info", formatversion: 2 });
        expect(post.mock.calls[0][0]).not.toHaveProperty("redirects");
    });

    it("任一批次查询失败时抛错，不再按非重定向继续", async () => {
        const post = vi.fn().mockRejectedValue(new Error("network"));
        vi.mocked(getApiForSite).mockReturnValue({ post } as never);

        await expect(resolveBatchPages([
            { title: "A", queryTitle: "A", site: "zh" },
        ])).rejects.toThrow("批量查询页面重定向状态失败");
    });

    it("超过 50 个页面按 50 个一批拆分查询，结果顺序与入参一致", async () => {
        const titles = Array.from({ length: 101 }, (_, index) => `Page${index + 1}`);
        const post = vi.fn((params: { titles?: string }) => Promise.resolve({
            query: { pages: params.titles?.split("|").map((title) => ({ title })) ?? [] },
        }));
        vi.mocked(getApiForSite).mockReturnValue({ post } as never);

        const pages = await resolveBatchPages(titles.map((title) => ({ title, queryTitle: title, site: "zh" as const })));
        expect(post).toHaveBeenCalledTimes(3);
        expect(post.mock.calls[0][0].titles?.split("|")).toHaveLength(50);
        expect(post.mock.calls[1][0].titles?.split("|")).toHaveLength(50);
        expect(post.mock.calls[2][0].titles?.split("|")).toEqual(["Page101"]);
        expect(pages).toHaveLength(101);
        expect(pages[0]).toEqual({ title: "Page1", isRedirect: false });
        expect(pages[100]).toEqual({ title: "Page101", isRedirect: false });
    });
});

describe("buildDeleteBody 的理由/详情组合", () => {
    // currentSite 读 location.hostname（node 环境没有 location，桩成主站）
    beforeEach(() => {
        vi.stubGlobal("location", { hostname: "zh.moegirl.org.cn" });
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("只填理由时无详细原因行", async () => {
        expect(await buildDeleteBody({ reason: "理由", detail: "" }, context)).toBe(
            "* '''页面标题'''：[[:Example_page]]\n* '''申请理由'''：理由\n~~~~",
        );
    });

    it("只填详情时详情即理由，不再单列为详细原因", async () => {
        expect(await buildDeleteBody({ reason: "", detail: "详情" }, context)).toBe(
            "* '''页面标题'''：[[:Example_page]]\n* '''申请理由'''：详情\n~~~~",
        );
    });

    it("两者都填时详情单列为详细原因", async () => {
        expect(await buildDeleteBody({ reason: "理由", detail: "详情" }, context)).toBe(
            "* '''页面标题'''：[[:Example_page]]\n* '''申请理由'''：理由\n* '''详细原因'''：详情\n~~~~",
        );
    });

    it("批量勾选但清单为空时抛错", async () => {
        await expect(buildDeleteBody({ batch: "1", reason: "理由", detail: "", pages: "" }, context)).rejects.toThrow("请至少填写一个页面");
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
