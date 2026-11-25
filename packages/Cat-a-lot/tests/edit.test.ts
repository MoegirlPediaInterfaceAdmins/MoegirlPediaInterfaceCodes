import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_TIMEOUT_MS } from "../src/constants.ts";
import { createApi } from "../src/api.ts";
import type { EditPageParams, PageWikitext } from "../src/types.ts";

/** mw.Api.post 的 mock。 */
let postMock = vi.fn<(
    parameters: Record<string, unknown>,
    options?: Record<string, unknown>,
) => unknown>();

/** mw.Api.postWithToken 的 mock。 */
let postWithTokenMock = vi.fn<(
    tokenType: string,
    parameters: Record<string, unknown>,
    options?: Record<string, unknown>,
) => unknown>();

/** mw.Api.abort 的 mock。 */
let abortMock = vi.fn<() => void>();

/** 记录构造的假 mw.Api；方法签名与 createApi 的调用面一致。 */
class FakeApi {
    static instances: FakeApi[] = [];

    post = postMock;

    postWithToken = postWithTokenMock;

    abort = abortMock;

    constructor() {
        FakeApi.instances.push(this);
    }
}

/** 模拟 mw.Api 以 (code, result, ...) 多参 reject 的 thenable。 */
const rejectWith = (code: string, result: unknown) => ({
    then: (_onFulfilled: (value: unknown) => void, onRejected?: (...args: unknown[]) => void): void => {
        if (onRejected) {
            onRejected(code, result);
        }
    },
    abort: vi.fn<() => void>(),
});

/** 构造合法的编辑参数。 */
const editParams = (overrides: Partial<EditPageParams> = {}): EditPageParams => ({
    title: "TestPage",
    text: "new text",
    summary: "summary",
    watchlist: "preferences",
    minor: false,
    bot: false,
    tags: "Cat-a-lot",
    ...overrides,
});

/** 页面 wikitext 查询结果。 */
const pageResult = (overrides: Partial<PageWikitext> = {}): PageWikitext => ({
    content: "text",
    timestamp: "2026-01-01T00:00:00Z",
    curtimestamp: "2026-01-02T00:00:00Z",
    missing: false,
    invalid: false,
    ...overrides,
});

beforeEach(() => {
    postMock = vi.fn();
    postWithTokenMock = vi.fn();
    abortMock = vi.fn();
    FakeApi.instances = [];
    vi.stubGlobal("mw", { Api: FakeApi });
    vi.stubGlobal("wgULS", (hans: string, hant?: string | null) => hant ?? hans);
});

describe("createApi：mw.Api 生命周期", () => {
    it("懒创建且只创建一个 mw.Api 实例", async () => {
        const api = createApi("TestUser");
        expect(FakeApi.instances).toHaveLength(0);
        postMock.mockReturnValue(Promise.resolve(pageResult()));
        await api.fetchPageWikitext("TestPage");
        await api.fetchPageWikitext("TestPage");
        expect(FakeApi.instances).toHaveLength(1);
        expect(postMock).toHaveBeenCalledTimes(2);
    });
});

describe("fetchPageWikitext", () => {
    it("用 POST 查询内容、时间戳与 curtimestamp", async () => {
        const api = createApi("TestUser");
        postMock.mockReturnValue(Promise.resolve({
            curtimestamp: "cur",
            query: {
                pages: [{
                    revisions: [{
                        timestamp: "ts",
                        slots: { main: { content: "page text" } },
                    }],
                }],
            },
        }));
        await expect(api.fetchPageWikitext("TestPage")).resolves.toEqual({
            content: "page text",
            timestamp: "ts",
            curtimestamp: "cur",
            missing: false,
            invalid: false,
        });
        expect(postMock).toHaveBeenCalledWith({
            action: "query",
            prop: "revisions",
            titles: "TestPage",
            rvprop: "content|timestamp",
            rvslots: "main",
            curtimestamp: 1,
            formatversion: 2,
        }, { timeout: API_TIMEOUT_MS });
    });

    it("missing / invalid 页面如实返回", async () => {
        const api = createApi("TestUser");
        postMock.mockReturnValue(Promise.resolve({
            query: { pages: [{ missing: true }] },
        }));
        await expect(api.fetchPageWikitext("Missing")).resolves.toEqual({
            content: undefined,
            timestamp: undefined,
            curtimestamp: undefined,
            missing: true,
            invalid: false,
        });

        postMock.mockReturnValue(Promise.resolve({
            query: { pages: [{ invalid: true }] },
        }));
        await expect(api.fetchPageWikitext("Invalid")).resolves.toEqual({
            content: undefined,
            timestamp: undefined,
            curtimestamp: undefined,
            missing: false,
            invalid: true,
        });
    });
});

describe("fetchCategoryTree", () => {
    it("并行查询父分类与子分类并规范化名称", async () => {
        const api = createApi("TestUser");
        postMock
            .mockReturnValueOnce(Promise.resolve({
                query: { pages: [{ categories: [{ title: "Category:Parent" }] }] },
            }))
            .mockReturnValueOnce(Promise.resolve({
                query: { categorymembers: [{ title: "Category:Sub" }] },
            }));

        await expect(api.fetchCategoryTree("Category:Foo", 900, true)).resolves.toEqual({
            missing: false,
            parents: ["Parent"],
            subs: ["Sub"],
        });
        expect(postMock).toHaveBeenCalledTimes(2);
        expect(postMock.mock.calls[0]?.[0]).toEqual({
            action: "query",
            prop: "categories",
            titles: "Category:Foo",
            cllimit: "max",
            clshow: "!hidden",
            formatversion: 2,
        });
        expect(postMock.mock.calls[1]?.[0]).toEqual({
            action: "query",
            list: "categorymembers",
            cmtitle: "Category:Foo",
            cmtype: "subcat",
            cmlimit: 500,
            formatversion: 2,
        });
    });

    it("subcat limit clamp 到 1..500", async () => {
        const api = createApi("TestUser");
        postMock
            .mockReturnValueOnce(Promise.resolve({ query: { pages: [{}] } }))
            .mockReturnValueOnce(Promise.resolve({ query: { categorymembers: [] } }));
        await api.fetchCategoryTree("Foo", 0, true);
        expect(postMock.mock.calls[1]?.[0]?.cmlimit).toBe(1);

        postMock.mockClear();
        postMock
            .mockReturnValueOnce(Promise.resolve({ query: { pages: [{}] } }))
            .mockReturnValueOnce(Promise.resolve({ query: { categorymembers: [] } }));
        await api.fetchCategoryTree("Foo", -20, true);
        expect(postMock.mock.calls[1]?.[0]?.cmlimit).toBe(1);
    });

    it("无 categorymembers 权限时只查父分类", async () => {
        const api = createApi("TestUser");
        postMock.mockReturnValue(Promise.resolve({
            query: { pages: [{ missing: true, categories: [{ title: "Category:Parent" }] }] },
        }));
        await expect(api.fetchCategoryTree("Foo", 50, false)).resolves.toEqual({
            missing: true,
            parents: ["Parent"],
            subs: [],
        });
        expect(postMock).toHaveBeenCalledTimes(1);
    });

    it("页面缺失时 missing 为 true", async () => {
        const api = createApi("TestUser");
        postMock
            .mockReturnValueOnce(Promise.resolve({ query: { pages: [{ missing: true }] } }))
            .mockReturnValueOnce(Promise.resolve({ query: { categorymembers: [] } }));
        await expect(api.fetchCategoryTree("Foo", 50, true)).resolves.toEqual({
            missing: true,
            parents: [],
            subs: [],
        });
    });
});

describe("fetchCategorySuggestions", () => {
    it("用 opensearch POST 查询并规范化结果", async () => {
        const api = createApi("TestUser");
        postMock.mockReturnValue(Promise.resolve([
            "foo",
            ["Category:Bar", "Category:Baz qux"],
            [],
            [],
        ]));
        await expect(api.fetchCategorySuggestions("Foo")).resolves.toEqual(["Bar", "Baz qux"]);
        expect(postMock).toHaveBeenCalledWith({
            action: "opensearch",
            namespace: 14,
            search: "Foo",
            limit: 12,
            format: "json",
        }, { timeout: API_TIMEOUT_MS });
    });

    it("空查询不发出请求", async () => {
        const api = createApi("TestUser");
        await expect(api.fetchCategorySuggestions("  ")).resolves.toEqual([]);
        expect(postMock).not.toHaveBeenCalled();
    });
});

describe("editPage", () => {
    it("用 csrf token 提交编辑，可选字段只在有值时加入", async () => {
        const api = createApi("TestUser");
        postWithTokenMock.mockReturnValue(Promise.resolve({ edit: { result: "Success" } }));
        await api.editPage(editParams());
        expect(postWithTokenMock).toHaveBeenCalledWith("csrf", {
            action: "edit",
            title: "TestPage",
            text: "new text",
            summary: "summary",
            watchlist: "preferences",
            nocreate: true,
            tags: "Cat-a-lot",
            formatversion: 2,
        }, { timeout: API_TIMEOUT_MS });
        const payload = postWithTokenMock.mock.calls[0][1];
        expect(payload).not.toHaveProperty("minor");
        expect(payload).not.toHaveProperty("bot");
        expect(payload).not.toHaveProperty("basetimestamp");
        expect(payload).not.toHaveProperty("starttimestamp");
    });

    it("A13：basetimestamp / starttimestamp 仅在字符串时加入", async () => {
        const api = createApi("TestUser");
        postWithTokenMock.mockReturnValue(Promise.resolve({ edit: { result: "Success" } }));

        await api.editPage(editParams({ basetimestamp: "", starttimestamp: "" }));
        let payload = postWithTokenMock.mock.calls[0][1];
        expect(payload).not.toHaveProperty("basetimestamp");
        expect(payload).not.toHaveProperty("starttimestamp");

        postWithTokenMock.mockClear();
        postWithTokenMock.mockReturnValue(Promise.resolve({ edit: { result: "Success" } }));
        await api.editPage(editParams({
            basetimestamp: "2026-01-01T00:00:00Z",
            starttimestamp: "2026-01-02T00:00:00Z",
        }));
        payload = postWithTokenMock.mock.calls[0][1];
        expect(payload.basetimestamp).toBe("2026-01-01T00:00:00Z");
        expect(payload.starttimestamp).toBe("2026-01-02T00:00:00Z");
    });

    it("minor / bot 为 true 时写入 payload", async () => {
        const api = createApi("TestUser");
        postWithTokenMock.mockReturnValue(Promise.resolve({ edit: { result: "Success" } }));
        await api.editPage(editParams({ minor: true, bot: true, tags: "Cat-a-lot|Bot" }));
        const payload = postWithTokenMock.mock.calls[0][1];
        expect(payload.minor).toBe(true);
        expect(payload.bot).toBe(true);
        expect(payload.tags).toBe("Cat-a-lot|Bot");
    });

    it("API 业务错误保留 code 与 info 并抛出可读信息", async () => {
        const api = createApi("TestUser");
        postWithTokenMock.mockReturnValue(
            rejectWith("protectedpage", { error: { code: "protectedpage", info: "页面已被保护" } }),
        );
        await expect(api.editPage(editParams())).rejects.toMatchObject({
            message: "页面已被保护",
            error: { code: "protectedpage", info: "页面已被保护" },
        });
    });

    it("action=edit 返回 Failure 时抛业务错误", async () => {
        const api = createApi("TestUser");
        postWithTokenMock.mockReturnValue(Promise.resolve({
            edit: { result: "Failure", code: "abusefilter-disallowed", info: "被过滤器阻止" },
        }));
        await expect(api.editPage(editParams())).rejects.toMatchObject({
            message: "被过滤器阻止",
            error: { code: "abusefilter-disallowed", info: "被过滤器阻止" },
        });
    });

    it("传输错误不带 error.code（供批处理回读核对）", async () => {
        const api = createApi("TestUser");
        postWithTokenMock.mockReturnValue(
            rejectWith("http", { textStatus: "error", exception: "Gateway Timeout" }),
        );
        await expect(api.editPage(editParams())).rejects.toMatchObject({
            message: "Gateway Timeout",
        });
        const caught: unknown = await api.editPage(editParams()).catch((reason: unknown) => reason);
        expect(caught).toBeInstanceOf(Error);
        expect(caught).not.toHaveProperty("error");
    });
});

describe("grantFlood / revokeFlood", () => {
    it("grant 使用 userrights token 添加 2 小时 flood", async () => {
        const api = createApi("TestUser");
        postWithTokenMock.mockReturnValue(Promise.resolve({}));
        await api.grantFlood("Cat-a-lot|Bot", "");
        expect(postWithTokenMock).toHaveBeenCalledWith("userrights", expect.objectContaining({
            action: "userrights",
            user: "TestUser",
            add: "flood",
            expiry: "2 hours",
            tags: "Cat-a-lot|Bot",
            formatversion: 2,
        }), { timeout: API_TIMEOUT_MS });
        expect(postWithTokenMock.mock.calls[0][1].reason).toBe("[[Help:Cat-a-lot|Cat-a-lot]]：临时启用机器用户");
    });

    it("revoke 使用 userrights token 移除 flood", async () => {
        const api = createApi("TestUser");
        postWithTokenMock.mockReturnValue(Promise.resolve({}));
        await api.revokeFlood("Cat-a-lot", "");
        expect(postWithTokenMock).toHaveBeenCalledWith("userrights", expect.objectContaining({
            action: "userrights",
            user: "TestUser",
            remove: "flood",
            tags: "Cat-a-lot",
            formatversion: 2,
        }), { timeout: API_TIMEOUT_MS });
        expect(postWithTokenMock.mock.calls[0][1].reason).toBe("[[Help:Cat-a-lot|Cat-a-lot]]：批量分类完成，移除临时机器用户");
    });
});

describe("abortActive", () => {
    it("中止当前 active 请求", () => {
        const api = createApi("TestUser");
        const abort = vi.fn<() => void>();
        postMock.mockReturnValue({ then: () => undefined, abort });
        const pending = api.fetchPageWikitext("TestPage");
        api.abortActive();
        expect(abort).toHaveBeenCalledTimes(1);
        void pending;
    });

    it("分类树与搜索建议请求不覆盖且不被 abortActive 误中止", () => {
        const api = createApi("TestUser");
        const pageAbort = vi.fn<() => void>();
        const treeAbort = vi.fn<() => void>();
        const suggestAbort = vi.fn<() => void>();
        postMock
            .mockReturnValueOnce({ then: () => undefined, abort: pageAbort })
            .mockReturnValueOnce({ then: () => undefined, abort: treeAbort })
            .mockReturnValueOnce({ then: () => undefined, abort: treeAbort })
            .mockReturnValueOnce({ then: () => undefined, abort: suggestAbort });

        const pendingPage = api.fetchPageWikitext("TestPage");
        const pendingTree = api.fetchCategoryTree("Target", 50, true);
        const pendingSuggest = api.fetchCategorySuggestions("Tar");
        api.abortActive();

        expect(pageAbort).toHaveBeenCalledTimes(1);
        expect(treeAbort).not.toHaveBeenCalled();
        expect(suggestAbort).not.toHaveBeenCalled();
        void pendingPage;
        void pendingTree;
        void pendingSuggest;
    });
});
