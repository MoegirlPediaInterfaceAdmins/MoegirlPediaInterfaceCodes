import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startBatch } from "../src/batch.ts";
import { DEFAULT_PREFS } from "../src/prefs.ts";
import { createState } from "../src/state.ts";
import { installMw } from "./helpers/mw.ts";
import type {
    ApiClient,
    BatchHooks,
    BatchOptions,
    CatALotPrefs,
    ConfirmChoice,
    EditMode,
    EditPageParams,
    PageWikitext,
} from "../src/types.ts";

/** 构造页面 wikitext 查询结果。 */
const page = (content: string, overrides: Partial<PageWikitext> = {}): PageWikitext => ({
    content,
    timestamp: "2026-01-01T00:00:00Z",
    curtimestamp: "2026-01-02T00:00:00Z",
    missing: false,
    invalid: false,
    ...overrides,
});

/** 假 ApiClient：只实现批处理用到的查询/编辑/中止。 */
const createFakeApi = (impl: (title: string) => Promise<PageWikitext>) => {
    const fetchPageWikitext = vi.fn(impl);
    const editPage = vi.fn((params: EditPageParams): Promise<void> => {
        void params;
        return Promise.resolve();
    });
    const abortActive = vi.fn<() => void>();
    const api: ApiClient = {
        fetchCategoryTree: vi.fn(() => Promise.resolve({ missing: false, parents: [], subs: [] })),
        fetchCategorySuggestions: vi.fn(() => Promise.resolve([])),
        fetchPageWikitext,
        editPage,
        grantFlood: vi.fn(() => Promise.resolve()),
        revokeFlood: vi.fn(() => Promise.resolve()),
        abortActive,
    };
    return { api, fetchPageWikitext, editPage, abortActive };
};

/** 假 BatchHooks。 */
const createFakeHooks = () => {
    const askDialog = vi.fn((options: { message: string; showCancel: boolean }): Promise<boolean> => {
        void options;
        return Promise.resolve(true);
    });
    const askMoveAllDialog = vi.fn((options: {
        message: string;
        primaryLabel: string;
        extraLabel: string;
    }): Promise<ConfirmChoice> => {
        void options;
        return Promise.resolve("primary");
    });
    const notify = vi.fn();
    const setRunning = vi.fn((running: boolean) => {
        void running;
    });
    const setCurrentTitle = vi.fn((title: string) => {
        void title;
    });
    const setProgress = vi.fn((done: number, total: number) => {
        void done;
        void total;
    });
    const onPageDone = vi.fn((title: string) => {
        void title;
    });
    const requestSelfFlood = vi.fn((): Promise<boolean> => Promise.resolve(true));
    const releaseSelfFlood = vi.fn((): Promise<void> => Promise.resolve());
    const hooks: BatchHooks = {
        askDialog,
        askMoveAllDialog,
        notify,
        setRunning,
        setCurrentTitle,
        setProgress,
        onPageDone,
        requestSelfFlood,
        releaseSelfFlood,
    };
    return {
        hooks,
        askDialog,
        askMoveAllDialog,
        notify,
        setRunning,
        setCurrentTitle,
        setProgress,
        onPageDone,
        requestSelfFlood,
        releaseSelfFlood,
    };
};

interface SetupOptions {
    titles?: string[];
    mode?: EditMode;
    sourceCat?: string;
    targetCat?: string;
    isAllSelected?: boolean;
    hasBotRight?: boolean;
    isSysopOrStaff?: boolean;
    prefs?: CatALotPrefs;
    page?: (title: string) => Promise<PageWikitext>;
}

/** 组装一次批处理所需的全部依赖。 */
const createSetup = (options: SetupOptions = {}) => {
    const apiBundle = createFakeApi(options.page ?? (() => Promise.resolve(page("text"))));
    const hookBundle = createFakeHooks();
    const batchOptions: BatchOptions = {
        titles: options.titles ?? ["Page:1"],
        mode: options.mode ?? "add",
        sourceCat: options.sourceCat ?? "Source",
        targetCat: options.targetCat ?? "Target",
        isAllSelected: options.isAllSelected ?? false,
        prefs: options.prefs ?? { ...DEFAULT_PREFS },
        hasBotRight: options.hasBotRight ?? false,
        isSysopOrStaff: options.isSysopOrStaff ?? false,
        api: apiBundle.api,
        hooks: hookBundle.hooks,
    };
    return { ...apiBundle, ...hookBundle, options: batchOptions };
};

beforeEach(() => {
    // validateCategoryTitle 依赖 mw.Title；批次测试只需 Title 与 wgULS
    installMw();
    vi.stubGlobal("wgULS", (hans: string, hant?: string | null) => hant ?? hans);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("startBatch：前置校验", () => {
    it("空 titles：提示后返回空结果", async () => {
        const setup = createSetup({ titles: [] });
        const result = await startBatch(setup.options).result;
        expect(result).toEqual({
            total: 0,
            done: 0,
            stopped: false,
            skippedAlready: [],
            skippedNotFound: [],
            skippedServer: [],
        });
        expect(setup.askDialog).toHaveBeenCalledWith(expect.objectContaining({ showCancel: false }));
        expect(setup.fetchPageWikitext).not.toHaveBeenCalled();
        expect(setup.editPage).not.toHaveBeenCalled();
    });

    it("remove 之外目标分类非法：提示后返回", async () => {
        const setup = createSetup({ titles: ["Page:1"], mode: "add", targetCat: "Bad|Target" });
        const result = await startBatch(setup.options).result;
        expect(result.total).toBe(1);
        expect(setup.askDialog).toHaveBeenCalledWith(expect.objectContaining({ showCancel: false }));
        expect(setup.fetchPageWikitext).not.toHaveBeenCalled();
    });

    it("普通用户选择超过 50 页：提示后返回", async () => {
        const titles = Array.from({ length: 51 }, (_value, index) => `Page:${index}`);
        const setup = createSetup({ titles, hasBotRight: false, isSysopOrStaff: false });
        const result = await startBatch(setup.options).result;
        expect(result.total).toBe(51);
        expect(result.done).toBe(0);
        const ask = setup.askDialog.mock.calls[0][0];
        expect(ask.message).toContain("50");
        expect(ask.showCancel).toBe(false);
        expect(setup.setRunning).not.toHaveBeenCalled();
        expect(setup.fetchPageWikitext).not.toHaveBeenCalled();
    });

    it("分类成员全部迁移（move + isAllSelected）：提示分类重定向，取消时不执行编辑", async () => {
        const setup = createSetup({
            titles: ["Page:1"],
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
            isAllSelected: true,
        });
        setup.askMoveAllDialog.mockResolvedValueOnce("cancel");
        const result = await startBatch(setup.options).result;
        expect(result.done).toBe(0);
        expect(setup.askMoveAllDialog).toHaveBeenCalledTimes(1);
        const ask = setup.askMoveAllDialog.mock.calls[0][0];
        expect(ask.message).toContain("{{分类重定向|Target}}");
        expect(ask.message).toContain("機器人自動處理");
        expect(ask.extraLabel).toBe("懸掛分類重定向");
        expect(ask.primaryLabel).toBe("立即執行");
        expect(setup.setRunning).not.toHaveBeenCalled();
        expect(setup.fetchPageWikitext).not.toHaveBeenCalled();
        expect(setup.editPage).not.toHaveBeenCalled();
    });

    it("分类成员全部迁移（move + isAllSelected）：选择替换为重定向时直接覆盖当前分类页", async () => {
        const setup = createSetup({
            titles: ["Page:1"],
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
            isAllSelected: true,
        });
        setup.askMoveAllDialog.mockResolvedValueOnce("extra");
        const result = await startBatch(setup.options).result;
        expect(result.done).toBe(0);
        expect(setup.fetchPageWikitext).toHaveBeenCalledWith("Category:Source");
        expect(setup.editPage).toHaveBeenCalledTimes(1);
        expect(setup.editPage).toHaveBeenCalledWith(expect.objectContaining({
            title: "Category:Source",
            text: "#重定向 [[:Category:Target]]\n{{分类重定向|Target}}",
        }));
        expect(setup.notify).toHaveBeenCalledWith(expect.stringContaining("Category:Source"), "success");
    });

    it("分类成员全部迁移（move + isAllSelected）：确认执行后继续批量编辑", async () => {
        const setup = createSetup({
            titles: ["Page:1"],
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
            isAllSelected: true,
            page: () => Promise.resolve(page("[[Category:Source]]")),
        });
        setup.askMoveAllDialog.mockResolvedValueOnce("primary");
        const result = await startBatch(setup.options).result;
        expect(setup.askMoveAllDialog).toHaveBeenCalledTimes(1);
        expect(result.done).toBe(1);
        expect(setup.editPage).toHaveBeenCalledTimes(1);
    });

    it("非全部迁移或非 move 模式：不弹出分类重定向提示", async () => {
        const partialMove = createSetup({
            titles: ["Page:1"],
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
            isAllSelected: false,
            page: () => Promise.resolve(page("[[Category:Source]]")),
        });
        await startBatch(partialMove.options).result;
        expect(partialMove.askMoveAllDialog).not.toHaveBeenCalled();

        const fullCopy = createSetup({
            titles: ["Page:1"],
            mode: "copy",
            sourceCat: "Source",
            targetCat: "Target",
            isAllSelected: true,
            page: () => Promise.resolve(page("[[Category:Source]]")),
        });
        await startBatch(fullCopy.options).result;
        expect(fullCopy.askMoveAllDialog).not.toHaveBeenCalled();
    });
});

describe("startBatch：编辑与标签", () => {
    it("普通用户使用 Cat-a-lot 标签、bot=false，并更新 hooks 状态", async () => {
        const setup = createSetup({
            titles: ["Page:1"],
            page: () => Promise.resolve(page("text")),
        });
        const result = await startBatch(setup.options).result;
        expect(result).toEqual({
            total: 1,
            done: 1,
            stopped: false,
            skippedAlready: [],
            skippedNotFound: [],
            skippedServer: [],
        });
        expect(setup.editPage).toHaveBeenCalledTimes(1);
        const payload = setup.editPage.mock.calls[0][0];
        expect(payload).toEqual(expect.objectContaining({
            title: "Page:1",
            text: "text\n[[Category:Target]]\n",
            watchlist: "preferences",
            minor: false,
            bot: false,
            tags: "Cat-a-lot",
            basetimestamp: "2026-01-01T00:00:00Z",
            starttimestamp: "2026-01-02T00:00:00Z",
        }));
        expect(setup.onPageDone).toHaveBeenCalledWith("Page:1");
        expect(setup.setRunning.mock.calls).toEqual([[true], [false]]);
        expect(setup.setCurrentTitle).toHaveBeenCalledWith("Page:1");
        expect(setup.setCurrentTitle).toHaveBeenLastCalledWith("");
        expect(setup.setProgress.mock.calls[0]).toEqual([0, 1]);
        expect(setup.setProgress.mock.calls.at(-1)).toEqual([1, 1]);
        expect(setup.abortActive).not.toHaveBeenCalled();
        expect(setup.releaseSelfFlood).not.toHaveBeenCalled();
    });

    it("bot 用户使用 Cat-a-lot|Bot 标签并提交 bot=1", async () => {
        const setup = createSetup({ titles: ["Page:1"], hasBotRight: true });
        await startBatch(setup.options).result;
        const payload = setup.editPage.mock.calls[0][0];
        expect(payload.tags).toBe("Cat-a-lot|Bot");
        expect(payload.bot).toBe(true);
    });

    it("A13：页面时间戳缺失时不写入 edit payload", async () => {
        const setup = createSetup({
            titles: ["Page:1"],
            page: () => Promise.resolve(page("text", { timestamp: undefined, curtimestamp: undefined })),
        });
        await startBatch(setup.options).result;
        const payload = setup.editPage.mock.calls[0][0];
        expect(payload).not.toHaveProperty("basetimestamp");
        expect(payload).not.toHaveProperty("starttimestamp");
    });

    it("move 保留 sortkey 并删除源分类", async () => {
        const setup = createSetup({
            titles: ["Page:1"],
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
            page: () => Promise.resolve(page("text\n[[Category:Source|Key]]")),
        });
        await startBatch(setup.options).result;
        expect(setup.editPage.mock.calls[0][0].text).toBe("text\n[[Category:Target|Key]]");
    });

    it("A3：移动目标与页面分类相同：不提交编辑，记为 skipped-already", async () => {
        const setup = createSetup({
            titles: ["Page:1"],
            mode: "move",
            sourceCat: "Foo",
            targetCat: "foo",
            page: () => Promise.resolve(page("[[Category:Foo]]")),
        });
        const result = await startBatch(setup.options).result;
        expect(result.skippedAlready).toEqual(["Page:1"]);
        expect(result.done).toBe(0);
        expect(setup.editPage).not.toHaveBeenCalled();
    });
});

describe("startBatch：跳过与失败", () => {
    it("按状态分别归入 skippedAlready / skippedNotFound / skippedServer", async () => {
        const already = createSetup({
            titles: ["Already"],
            mode: "add",
            targetCat: "Target",
            hasBotRight: true,
            page: () => Promise.resolve(page("[[Category:Target]]")),
        });
        const alreadyResult = await startBatch(already.options).result;
        expect(alreadyResult.skippedAlready).toEqual(["Already"]);
        expect(alreadyResult.done).toBe(0);
        expect(already.editPage).not.toHaveBeenCalled();

        const notFound = createSetup({
            titles: ["NotFound"],
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
            hasBotRight: true,
            page: () => Promise.resolve(page("text")),
        });
        const notFoundResult = await startBatch(notFound.options).result;
        expect(notFoundResult.skippedNotFound).toEqual(["NotFound"]);
        expect(notFoundResult.done).toBe(0);
        expect(notFound.editPage).not.toHaveBeenCalled();

        const missing = createSetup({
            titles: ["Missing"],
            mode: "move",
            sourceCat: "Source",
            targetCat: "Target",
            hasBotRight: true,
            page: () => Promise.resolve(page("", { content: undefined, missing: true })),
        });
        const missingResult = await startBatch(missing.options).result;
        expect(missingResult.skippedServer).toHaveLength(1);
        expect(missingResult.skippedServer[0]).toContain("Missing");
        expect(missingResult.done).toBe(0);
        expect(missing.editPage).not.toHaveBeenCalled();
    });

    it("编辑响应不确定时回读并确认已提交，计为成功", async () => {
        const setup = createSetup({ titles: ["Page:1"], hasBotRight: true });
        setup.editPage.mockRejectedValue(new Error("network boom"));
        setup.fetchPageWikitext
            .mockResolvedValueOnce(page("text"))
            .mockResolvedValueOnce(page("text\n[[Category:Target]]"));
        const result = await startBatch(setup.options).result;
        expect(result.done).toBe(1);
        expect(result.skippedServer).toEqual([]);
        expect(setup.fetchPageWikitext).toHaveBeenCalledTimes(2);
        expect(setup.onPageDone).toHaveBeenCalledWith("Page:1");
    });

    it("编辑响应不确定且回读未生效时记入 skippedServer", async () => {
        const setup = createSetup({ titles: ["Page:1"], hasBotRight: true });
        setup.editPage.mockRejectedValue(new Error("network boom"));
        setup.fetchPageWikitext
            .mockResolvedValueOnce(page("text"))
            .mockResolvedValueOnce(page("text"));
        const result = await startBatch(setup.options).result;
        expect(result.done).toBe(0);
        expect(result.skippedServer).toEqual(["Page:1（network boom）"]);
    });

    it("API 业务错误不回读，直接记入 skippedServer", async () => {
        const setup = createSetup({ titles: ["Page:1"], hasBotRight: true });
        setup.editPage.mockRejectedValue(Object.assign(new Error("页面已被保护"), {
            error: { code: "protectedpage", info: "页面已被保护" },
        }));
        const result = await startBatch(setup.options).result;
        expect(result.done).toBe(0);
        expect(result.skippedServer).toEqual(["Page:1（页面已被保护）"]);
        expect(setup.fetchPageWikitext).toHaveBeenCalledTimes(1);
    });
});

describe("startBatch：自授权与停止", () => {
    it("sysop 超过 10 页：征得同意后自授权，编辑用 Bot 标签，结束后释放", async () => {
        const titles = Array.from({ length: 11 }, (_value, index) => `Page:${index}`);
        const setup = createSetup({
            titles,
            isSysopOrStaff: true,
            hasBotRight: false,
            page: () => Promise.resolve(page("text")),
        });
        setup.requestSelfFlood.mockResolvedValue(true);
        const result = await startBatch(setup.options).result;
        expect(setup.askDialog).toHaveBeenCalledWith(expect.objectContaining({ showCancel: true }));
        expect(setup.requestSelfFlood).toHaveBeenCalledTimes(1);
        expect(result.done).toBe(11);
        expect(setup.editPage).toHaveBeenCalledTimes(11);
        expect(setup.editPage.mock.calls[0][0].tags).toBe("Cat-a-lot|Bot");
        expect(setup.editPage.mock.calls[0][0].bot).toBe(true);
        expect(setup.releaseSelfFlood).toHaveBeenCalledTimes(1);
    });

    it("sysop 自授权失败：按普通用户继续，受 20 秒间隔限制", async () => {
        vi.useFakeTimers();
        const titles = Array.from({ length: 11 }, (_value, index) => `Page:${index}`);
        const setup = createSetup({
            titles,
            isSysopOrStaff: true,
            hasBotRight: false,
            page: () => Promise.resolve(page("text")),
        });
        setup.requestSelfFlood.mockResolvedValue(false);
        const run = startBatch(setup.options);
        await vi.advanceTimersByTimeAsync(0);
        expect(setup.requestSelfFlood).toHaveBeenCalledTimes(1);
        expect(setup.editPage).toHaveBeenCalledTimes(1);
        expect(setup.editPage.mock.calls[0][0].tags).toBe("Cat-a-lot");
        run.stop();
        const result = await run.result;
        expect(result.stopped).toBe(true);
        expect(result.done).toBe(1);
        expect(setup.releaseSelfFlood).not.toHaveBeenCalled();
    });

    it("Stop 立即中断页面间延迟", async () => {
        vi.useFakeTimers();
        const setup = createSetup({
            titles: ["Page:1", "Page:2"],
            hasBotRight: false,
            page: () => Promise.resolve(page("text")),
        });
        const run = startBatch(setup.options);
        await vi.advanceTimersByTimeAsync(0);
        expect(setup.fetchPageWikitext).toHaveBeenCalledTimes(1);
        expect(setup.editPage).toHaveBeenCalledTimes(1);
        run.stop();
        const result = await run.result;
        expect(result.stopped).toBe(true);
        expect(result.total).toBe(2);
        expect(result.done).toBe(1);
        expect(result.skippedServer).toEqual([]);
        expect(setup.fetchPageWikitext).toHaveBeenCalledTimes(1);
        expect(setup.abortActive).toHaveBeenCalled();
    });

    it("Stop 立即中止当前请求，不记入失败列表", async () => {
        const pending: { reject?: (reason?: unknown) => void } = {};
        const setup = createSetup({
            titles: ["Page:1"],
            hasBotRight: false,
            page: () => new Promise<PageWikitext>((_resolve, reject) => {
                pending.reject = reject;
            }),
        });
        const run = startBatch(setup.options);
        await Promise.resolve();
        run.stop();
        expect(setup.abortActive).toHaveBeenCalled();
        pending.reject?.(new Error("abort"));
        const result = await run.result;
        expect(result.stopped).toBe(true);
        expect(result.done).toBe(0);
        expect(result.skippedServer).toEqual([]);
        expect(setup.editPage).not.toHaveBeenCalled();
    });
});

describe("createState：结果弹窗门控与分类规范化", () => {
    it("普通用户超 50 页未进入批处理时，关闭提示后不弹出结果对话框", async () => {
        const { mw } = installMw({ namespaceNumber: 14, title: "Test", groups: [] });
        Object.assign(mw, {
            Api: class {
                post = vi.fn();
                postWithToken = vi.fn();
            },
        });
        const state = createState((value) => value);
        state.selectedTitles = Array.from({ length: 51 }, (_value, index) => `Page:${index}`);

        const pending = state.executeBatch("add", "Target", state.activeBatchToken);
        await Promise.resolve();
        expect(state.confirmDialog.open).toBe(true);
        expect(state.confirmDialog.message).toContain("50");
        state.resolveConfirmDialog(true);
        await pending;

        expect(state.resultDialog.open).toBe(false);
        expect(state.isBusy).toBe(false);
    });

    it("loadCategoryTree 规范化分类名且首字母大小写不同仍识别为当前分类", async () => {
        const { mw } = installMw({ namespaceNumber: 14, title: "Foo_bar", groups: [] });
        Object.assign(mw, {
            Api: class {
                post = vi.fn(() => Promise.resolve({
                    query: { pages: [{ categories: [] }] },
                }));
                postWithToken = vi.fn();
            },
        });
        const state = createState((value) => value);

        await state.loadCategoryTree("foo_bar");
        expect(state.currentCategory).toBe("Foo bar");
        expect(state.canActOnCurrentCategory).toBe(false);

        await state.loadCategoryTree("other_cat");
        expect(state.currentCategory).toBe("Other cat");
        expect(state.canActOnCurrentCategory).toBe(true);
    });
});
