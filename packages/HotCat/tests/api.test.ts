import jQuery from "jquery";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { site, state } from "../src/runtime.ts";
import { CategoryEditor } from "../src/ui/editor.ts";
import { initiateEdit, resolveMulti, resolveOne, setPage } from "../src/api/page.ts";
import { resetSite } from "./helpers/site.ts";

const PAGE_JSON = {
    query: {
        pages: {
            1: {
                title: "TestPage",
                lastrevid: 120,
                starttimestamp: "2026-10-19T01:02:03Z",
                watched: "",
                revisions: [
                    { slots: { main: { "*": "text\n[[Category:Foo]]" } }, timestamp: "2026-10-18T00:00:00Z", revid: 119 },
                    { slots: { main: { "*": "old" } }, user: "Bob" },
                ],
                langlinks: [{ lang: "en" }, { lang: "ja" }],
            },
        },
        general: { time: "2026-10-19T00:00:00Z", "case": "first-letter" },
        tokens: { csrftoken: "tok" },
        userinfo: {
            options: {
                watchcreations: "1",
                " watchcreations-expiry": "1 week",
                watchdefault: "1",
                "watchdefault-expiry": "1 month",
                minordefault: 1,
            },
        },
    },
};

const makeEditor = (category = "Foo"): CategoryEditor => {
    document.body.innerHTML = `<div id="catlinks"><div id="mw-normal-catlinks"><span><a href="/wiki/Category:${category}">${category}</a></span></div></div>`;
    const line = document.getElementById("mw-normal-catlinks")!;
    const span = line.getElementsByTagName("span")[0];
    const editor = new CategoryEditor(line, span, category, null, false);
    // 先展开表单
    state.noSuggestions = true;
    editor.display(new MouseEvent("click"));
    return editor;
};

beforeEach(() => {
    resetSite();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

describe("setPage", () => {
    it("灌入源码、时间、令牌、监视设置与语言链接正则", () => {
        setPage(PAGE_JSON);
        expect(state.pageText).toBe("text\n[[Category:Foo]]");
        expect(state.pageTime).toBe("20261018000000");
        expect(state.pageTextRevId).toBe(119);
        expect(state.conflictingUser).toBe("Bob");
        expect(state.lastRevId).toBe(120);
        expect(state.pageWatched).toBe(true);
        expect(state.editToken).toBe("tok");
        expect(state.interlanguageRE).toBeInstanceOf(RegExp);
        expect(state.interlanguageRE?.test("\n[[en:Foo]]")).toBe(true);
        expect(HC.capitalizePageNames).toBe(true);
        expect(state.serverTime).toBe("20261019010203");
        expect(state.watchCreate).toBe(true);
        expect(state.watchCreateExpiry).toBe("1 week");
        expect(state.watchEdit).toBe(true);
        expect(state.watchDefaultExpiry).toBe("1 month");
        expect(state.minorEdits).toBe(true);
        expect(HC.single_minor).toBe(true);
    });

    it("新页面按 -1 取 pages", () => {
        site.conf.wgArticleId = 0;
        setPage({ query: { pages: { "-1": { title: "TestPage", revisions: [{ slots: { main: { "*": "" } } }] } } } });
        expect(state.pageText).toBe("");
    });

    it("langlinks 有后续分页时不编译跨语言正则", () => {
        setPage({ ...PAGE_JSON, "query-continue": { langlinks: {} } });
        expect(state.interlanguageRE).toBeNull();
    });

    it("dont_add_to_watchlist 时忽略监视选项", () => {
        HC.dont_add_to_watchlist = true;
        setPage(PAGE_JSON);
        expect(state.watchCreate).toBe(false);
        expect(state.watchEdit).toBe(false);
    });

    it("空响应不改变已有状态", () => {
        state.pageText = "keep";
        setPage(null);
        expect(state.pageText).toBe("keep");
    });
});

describe("initiateEdit", () => {
    it("取到数据后调用 doEdit", async () => {
        vi.spyOn(jQuery, "getJSON").mockReturnValue(Promise.resolve(PAGE_JSON) as unknown as JQuery.jqXHR);
        const doEdit = vi.fn();
        const failure = vi.fn();
        await initiateEdit(doEdit, failure);
        expect(doEdit).toHaveBeenCalledWith(expect.any(Function));
        expect(failure).not.toHaveBeenCalled();
        expect(state.pageText).toBe("text\n[[Category:Foo]]");
        expect(state.saveInProgress).toBe(true);
    });

    it("请求失败时回调状态码", async () => {
        const error = Object.assign(new Error("500"), { status: 500, statusText: "Internal Server Error" });
        vi.spyOn(jQuery, "getJSON").mockReturnValue(Promise.reject(error) as unknown as JQuery.jqXHR);
        const failure = vi.fn();
        await initiateEdit(vi.fn(), failure);
        expect(failure).toHaveBeenCalledWith("500 Internal Server Error");
        expect(state.saveInProgress).toBe(false);
    });

    it("保存进行中时直接返回，不重复请求", async () => {
        const spy = vi.spyOn(jQuery, "getJSON");
        state.saveInProgress = true;
        const doEdit = vi.fn();
        await initiateEdit(doEdit, vi.fn());
        expect(spy).not.toHaveBeenCalled();
        expect(doEdit).not.toHaveBeenCalled();
    });

    it("提交期间禁用保存按钮，失败后恢复", async () => {
        state.commitButton = document.createElement("input");
        state.commitButton.disabled = false;
        const error = Object.assign(new Error("404"), { status: 404, statusText: "Not Found" });
        vi.spyOn(jQuery, "getJSON").mockReturnValue(Promise.reject(error) as unknown as JQuery.jqXHR);
        await initiateEdit(vi.fn(), vi.fn());
        expect(state.commitButton.disabled).toBe(false);
    });
});

describe("resolveOne", () => {
    it("回填隐藏状态与存在性图标", () => {
        const editor = makeEditor("Foo");
        resolveOne({ title: "Category:Foo", categoryinfo: { hidden: "" } }, [editor]);
        expect(editor.currentHidden).toBe(true);
        expect(editor.inputExists).toBe(true);
        expect(editor.icon.src).toBe(HC.existsYes);
    });

    it("缺失页面标记为不存在", () => {
        const editor = makeEditor("Foo");
        resolveOne({ title: "Category:Foo", missing: "" }, [editor]);
        expect(editor.inputExists).toBe(false);
        expect(editor.icon.src).toBe(HC.existsNo);
    });

    it("重定向分类给出唯一目标", () => {
        const editor = makeEditor("Foo");
        resolveOne({ title: "Category:Foo", redirect: "", links: [{ ns: 14, title: "Category:Target" }] }, [editor]);
        expect(editor.text.value).toBe("Target");
        expect(editor.dab).toBeUndefined();
    });

    it("多个分类链接时给出消歧义候选", () => {
        const editor = makeEditor("Foo");
        resolveOne({ title: "Category:Foo", redirect: "", links: [{ ns: 14, title: "Category:A" }, { ns: 14, title: "Category:B" }] }, [editor]);
        expect(editor.dab).toEqual(["A", "B"]);
    });

    it("消歧义分类同样触发候选", () => {
        const editor = makeEditor("Foo");
        resolveOne({ title: "Category:Foo", categories: [{ title: "Category:消歧义页" }], links: [{ ns: 14, title: "Category:A" }] }, [editor]);
        expect(editor.text.value).toBe("A");
    });

    it("黑名单命中的目标被剔除", () => {
        HC.blacklist = /Hidden/;
        const editor = makeEditor("Foo");
        resolveOne({ title: "Category:Foo", redirect: "", links: [{ ns: 14, title: "Category:Hidden" }] }, [editor]);
        expect(editor.dab).toBeUndefined();
        expect(editor.text.value).toBe("Foo");
    });
});

describe("resolveMulti", () => {
    it("noSuggestions 时直接回调", async () => {
        state.noSuggestions = true;
        const editor = makeEditor("Foo");
        const callback = vi.fn();
        await resolveMulti([editor], callback);
        expect(callback).toHaveBeenCalledWith([editor]);
    });

    it("解析重定向后回调，并记录 dabInput", async () => {
        vi.spyOn(jQuery, "getJSON").mockReturnValue(Promise.resolve({
            query: { pages: { 1: { title: "Category:Foo", redirect: "", links: [{ ns: 14, title: "Category:Target" }] } } },
        }) as unknown as JQuery.jqXHR);
        const editor = makeEditor("Foo");
        state.noSuggestions = false;
        editor.lastInput = "Foo";
        const callback = vi.fn();
        await resolveMulti([editor], callback);
        expect(editor.dabInput).toBe("Foo");
        expect(editor.dabInputCleaned).toBe("Foo");
        expect(editor.text.value).toBe("Target");
        expect(callback).toHaveBeenCalledWith([editor]);
    });

    it("请求失败时仍然回调（并标记 noSuggestions）", async () => {
        // 用 thenable 在 await 时才 reject：直接 Promise.reject 会被 vitest 记为 unhandled
        vi.spyOn(jQuery, "getJSON").mockReturnValue({
            then: (_onFulfilled: unknown, onRejected: (reason: unknown) => void) => {
                onRejected(undefined);
            },
        } as unknown as JQuery.jqXHR);
        const editor = makeEditor("Foo");
        state.noSuggestions = false;
        const callback = vi.fn();
        await resolveMulti([editor], callback);
        expect(callback).toHaveBeenCalledWith([editor]);
        expect(state.noSuggestions).toBe(true);
    });
});
