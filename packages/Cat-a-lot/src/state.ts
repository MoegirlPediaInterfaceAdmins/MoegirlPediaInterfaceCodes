import { activeChangeTags, MAX_PANEL_HEIGHT, MIN_PANEL_HEIGHT } from "./constants.ts";
import { CODEX_ICONS } from "./icons.ts";
import { formatApiError, notifyText, uls } from "./localization.ts";
import { createApi } from "./api.ts";
import { loadPanelHeight, loadPrefs, sanitizePrefs, savePanelHeight, savePrefs } from "./prefs.ts";
import {
    bindPageItems as bindDomPageItems,
    clearSelection as clearDomSelection,
    markPageDone as markDomPageDone,
    syncSelectedTitles as collectSelectedTitles,
    toggleAll as toggleAllDom,
} from "./selection.ts";
import { startBatch } from "./batch.ts";
import { normalizeCatName, sameCategory, validateCategoryTitle } from "./wikitext.ts";
import type {
    ApiClient,
    BatchHooks,
    BatchResult,
    BatchRun,
    CatALotIcons,
    CatALotPrefs,
    ConfirmChoice,
    EditMode,
    ReactiveFactory,
    WatchlistOption,
} from "./types.ts";

type PermissionChipStatus = "notice" | "warning";

interface WatchlistOptionItem {
    label: string;
    value: WatchlistOption;
}

interface ConfirmDialogState {
    open: boolean;
    title: string;
    message: string;
    showCancel: boolean;
    primaryLabel: string;
    extraLabel: string;
    resolver: ((value: ConfirmChoice) => void) | null;
}

interface ResultDialogState {
    open: boolean;
    title: string;
    summaryText: string;
    skippedAlready: string[];
    skippedNotFound: string[];
    skippedServer: string[];
}

interface AskDialogOptions {
    message: string;
    showCancel: boolean;
    title?: string;
    primaryLabel?: string;
    extraLabel?: string;
}

interface DialogAction {
    label: string;
    actionType?: "default" | "progressive" | "destructive";
}

interface SiteSnapshot {
    isSearchMode: boolean;
    userGroups: string[];
    userName: string;
    pageCategoryName: string;
}

const readSiteSnapshot = (): SiteSnapshot => {
    const namespaceNumber = mw.config.get("wgNamespaceNumber");
    const title = mw.config.get("wgTitle");
    return {
        isSearchMode: namespaceNumber === -1,
        userGroups: mw.config.get("wgUserGroups") ?? [],
        userName: mw.config.get("wgUserName") ?? "",
        pageCategoryName: namespaceNumber === 14 ? normalizeCatName(title) : "",
    };
};

const emptyResultDialog = (): ResultDialogState => ({
    open: false,
    title: "Cat-a-lot",
    summaryText: "",
    skippedAlready: [],
    skippedNotFound: [],
    skippedServer: [],
});

const buildResultDialog = (result: BatchResult): ResultDialogState => ({
    open: true,
    title: result.stopped ? uls("已终止处理", "已終止處理") : uls("全部页面已处理", "全部頁面已處理"),
    summaryText: uls(
        `成功编辑 ${result.done} 页；跳过（已在分类中）${result.skippedAlready.length} 页；`
        + `跳过（未找到原分类）${result.skippedNotFound.length} 页；失败 ${result.skippedServer.length} 页。`,
        `成功編輯 ${result.done} 頁；跳過（已在分類中）${result.skippedAlready.length} 頁；`
        + `跳過（未找到原分類）${result.skippedNotFound.length} 頁；失敗 ${result.skippedServer.length} 頁。`,
    ),
    skippedAlready: result.skippedAlready,
    skippedNotFound: result.skippedNotFound,
    skippedServer: result.skippedServer,
});

interface CatALotState {
    readonly uls: (hans: string, hant?: string | null) => string;
    readonly icons: CatALotIcons;

    isOpen: boolean;
    panelHeight: number;
    currentCategory: string;
    searchInput: string;
    suggestions: string[];
    activeSuggestionIdx: number;
    parentCats: string[];
    subCats: string[];
    catNotFound: boolean;
    isLoadingCats: boolean;
    catTreeRequestId: number;
    suggestRequestId: number;

    selectedTitles: string[];
    selectableCount: number;
    prefs: CatALotPrefs;
    prefsDraft: CatALotPrefs;
    prefsOpen: boolean;
    subcatCountInput: string;

    isSysopOrStaff: boolean;
    hasBotRight: boolean;
    selfFloodActive: boolean;
    canFetchCategoryMembers: boolean;

    batchPending: boolean;
    activeBatchToken: number;
    isRunning: boolean;
    stopRequested: boolean;
    progressDone: number;
    progressTotal: number;
    currentEditingTitle: string;

    resultDialog: ResultDialogState;
    confirmDialog: ConfirmDialogState;
    watchlistOptions: WatchlistOptionItem[];

    readonly hasSelection: boolean;
    readonly isBusy: boolean;
    readonly pageCategoryName: string;
    readonly canActOnCurrentCategory: boolean;
    readonly selectedCountText: string;
    readonly permissionChipText: string;
    readonly permissionChipStatus: PermissionChipStatus;
    readonly activeTagString: string;
    readonly cleanInputCategory: string;
    readonly prefsPrimaryAction: DialogAction;
    readonly prefsDefaultAction: DialogAction;
    readonly confirmPrimaryAction: DialogAction;
    readonly confirmDefaultAction: DialogAction | undefined;
    readonly resultPrimaryAction: DialogAction;

    init(): void;
    bindPageItems(): void;
    syncSelectedTitles(): void;
    toggleAllSelected(select: boolean): void;
    clearSelection(): void;
    markPageDone(title: string): void;
    toggleOpen(): void;
    startResize(event: MouseEvent): void;
    loadCategoryTree(catName: string): Promise<void>;
    navigateCategory(catName: string): void;
    refreshSuggestions(): Promise<void>;
    onSearchInput(): void;
    onSearchKeydown(event: KeyboardEvent): void;
    pickSuggestion(catName: string): void;
    openSettings(): void;
    savePrefsFromDialog(): void;
    closePrefsDialog(): void;
    onPrefsDialogOpenChange(open: boolean): void;
    askChoice(options: AskDialogOptions): Promise<ConfirmChoice>;
    askDialog(options: AskDialogOptions): Promise<boolean>;
    resolveConfirmDialog(value: boolean | ConfirmChoice): void;
    onConfirmDialogOpenChange(open: boolean): void;
    onResultDialogOpenChange(open: boolean): void;
    stopBatch(): void;
    runBatch(mode: EditMode, targetCat?: string): void;
    executeBatch(mode: EditMode, targetCat: string, token: number): Promise<void>;
    grantSelfFlood(): Promise<boolean>;
    revokeSelfFlood(): Promise<void>;
}

// 线上由 app.ts 注入 Vue.reactive；测试传恒等函数，state 不依赖 mw.loader。
const createState = (makeReactive: ReactiveFactory): CatALotState => {
    const site = readSiteSnapshot();
    const api: ApiClient = createApi(site.userName);
    const initialPrefs = loadPrefs();
    const initialPanelHeight = loadPanelHeight();
    const canFetchCategoryMembers = ["patroller", "sysop", "staff", "bot", "flood"]
        .some((group) => site.userGroups.includes(group));
    const initialBotRight = site.userGroups.includes("bot") || site.userGroups.includes("flood");

    let batchSession: BatchRun | null = null;

    const state = makeReactive<CatALotState>({
        uls,
        icons: CODEX_ICONS,

        isOpen: false,
        panelHeight: initialPanelHeight,
        currentCategory: site.pageCategoryName,
        searchInput: site.isSearchMode ? mw.util.getParamValue("search") ?? "" : "",
        suggestions: [],
        activeSuggestionIdx: -1,
        parentCats: [],
        subCats: [],
        catNotFound: false,
        isLoadingCats: false,
        catTreeRequestId: 0,
        suggestRequestId: 0,

        selectedTitles: [],
        selectableCount: 0,
        prefs: initialPrefs,
        prefsDraft: { ...initialPrefs },
        prefsOpen: false,
        subcatCountInput: `${initialPrefs.subcatcount}`,

        isSysopOrStaff: site.userGroups.includes("sysop") || site.userGroups.includes("staff"),
        hasBotRight: initialBotRight,
        selfFloodActive: false,
        canFetchCategoryMembers,

        batchPending: false,
        activeBatchToken: 0,
        isRunning: false,
        stopRequested: false,
        progressDone: 0,
        progressTotal: 0,
        currentEditingTitle: "",

        resultDialog: emptyResultDialog(),
        confirmDialog: {
            open: false,
            title: "Cat-a-lot",
            message: "",
            showCancel: true,
            primaryLabel: "",
            extraLabel: "",
            resolver: null,
        },
        watchlistOptions: [
            { label: uls("与系统参数设置相同", "與系統參數設置相同"), value: "preferences" },
            { label: uls("不要更改监视状态", "不要更改監視狀態"), value: "nochange" },
            { label: uls("监视编辑的页面", "監視編輯的頁面"), value: "watch" },
            { label: uls("从监视列表移除", "從監視列表移除"), value: "unwatch" },
        ],

        get hasSelection(): boolean {
            return state.selectedTitles.length > 0;
        },
        get isBusy(): boolean {
            return state.isRunning || state.batchPending;
        },
        get pageCategoryName(): string {
            return site.pageCategoryName;
        },
        get canActOnCurrentCategory(): boolean {
            return Boolean(state.currentCategory)
                && (!site.pageCategoryName || !sameCategory(state.currentCategory, site.pageCategoryName));
        },
        get selectedCountText(): string {
            return uls(
                `已选择 ${state.selectedTitles.length} 个页面或文件`,
                `已選擇 ${state.selectedTitles.length} 個頁面或文件`,
            );
        },
        get permissionChipText(): string {
            if (state.selfFloodActive) {
                return uls("临时机器用户（无速率限制）", "臨時機器用戶（無速率限制）");
            }
            if (state.hasBotRight) {
                return uls("机器用户（无速率限制）", "機器用戶（無速率限制）");
            }
            if (state.isSysopOrStaff) {
                return uls(
                    "管理员（超过 10 页可自授权临时机器用户）",
                    "管理員（超過 10 頁可自授權臨時機器用戶）",
                );
            }
            return uls("普通用户（每 20 秒一次，最多 50 页）", "普通用戶（每 20 秒一次，最多 50 頁）");
        },
        get permissionChipStatus(): PermissionChipStatus {
            return state.hasBotRight ? "warning" : "notice";
        },
        get activeTagString(): string {
            return activeChangeTags(state.hasBotRight);
        },
        get cleanInputCategory(): string {
            return normalizeCatName(state.searchInput);
        },
        get prefsPrimaryAction(): DialogAction {
            return { label: uls("保存", "保存"), actionType: "progressive" };
        },
        get prefsDefaultAction(): DialogAction {
            return { label: uls("取消", "取消"), actionType: "default" };
        },
        get confirmPrimaryAction(): DialogAction {
            return {
                label: state.confirmDialog.primaryLabel || uls("确定", "確定"),
                actionType: "progressive",
            };
        },
        get confirmDefaultAction(): DialogAction | undefined {
            return state.confirmDialog.showCancel
                ? { label: uls("取消", "取消"), actionType: "default" }
                : undefined;
        },
        get resultPrimaryAction(): DialogAction {
            return { label: uls("确定", "確定"), actionType: "progressive" };
        },

        init: (): void => {
            state.bindPageItems();
            if (state.currentCategory) {
                void state.loadCategoryTree(state.currentCategory);
            }
        },
        bindPageItems: (): void => {
            state.selectableCount = bindDomPageItems({
                allowNonFiles: state.prefs.editpages,
                isBusy: () => state.isBusy,
                onSelectionChange: () => {
                    state.syncSelectedTitles();
                },
            });
        },
        syncSelectedTitles: (): void => {
            state.selectedTitles = collectSelectedTitles();
        },
        toggleAllSelected: (select: boolean): void => {
            if (state.isBusy) {
                return;
            }
            state.selectedTitles = toggleAllDom(select);
        },
        clearSelection: (): void => {
            clearDomSelection();
            state.selectedTitles = [];
        },
        markPageDone: (title: string): void => {
            markDomPageDone(title);
            state.selectedTitles = collectSelectedTitles();
        },
        toggleOpen: (): void => {
            state.isOpen = !state.isOpen;
        },
        startResize: (event: MouseEvent): void => {
            const startY = event.clientY;
            const startHeight = state.panelHeight;
            const onMove = (moveEvent: MouseEvent): void => {
                const next = startHeight + (startY - moveEvent.clientY);
                state.panelHeight = Math.min(Math.max(next, MIN_PANEL_HEIGHT), MAX_PANEL_HEIGHT);
            };
            const onUp = (): void => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                savePanelHeight(state.panelHeight);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
        },
        loadCategoryTree: async (catName: string): Promise<void> => {
            const clean = normalizeCatName(catName);
            if (!clean) {
                return;
            }
            const canonical = validateCategoryTitle(clean) ?? clean;
            state.catTreeRequestId += 1;
            const requestId = state.catTreeRequestId;
            state.currentCategory = canonical;
            state.isLoadingCats = true;
            state.catNotFound = false;
            try {
                const tree = await api.fetchCategoryTree(
                    canonical,
                    state.prefs.subcatcount,
                    state.canFetchCategoryMembers,
                );
                if (requestId !== state.catTreeRequestId) {
                    return;
                }
                state.catNotFound = tree.missing;
                state.parentCats = tree.parents;
                state.subCats = tree.subs;
            } catch (error) {
                if (requestId !== state.catTreeRequestId) {
                    return;
                }
                state.catNotFound = false;
                state.parentCats = [];
                state.subCats = [];
                notifyText(`${uls("获取分类列表失败", "獲取分類列表失敗")}：${formatApiError(error)}`, "error");
            } finally {
                if (requestId === state.catTreeRequestId) {
                    state.isLoadingCats = false;
                }
            }
        },
        navigateCategory: (catName: string): void => {
            if (state.isBusy) {
                return;
            }
            void state.loadCategoryTree(catName);
        },
        refreshSuggestions: async (): Promise<void> => {
            const value = state.cleanInputCategory;
            if (!value) {
                state.suggestRequestId += 1;
                state.suggestions = [];
                state.activeSuggestionIdx = -1;
                return;
            }
            state.suggestRequestId += 1;
            const requestId = state.suggestRequestId;
            try {
                const results = await api.fetchCategorySuggestions(value);
                if (requestId !== state.suggestRequestId || state.cleanInputCategory !== value) {
                    return;
                }
                state.suggestions = results;
                state.activeSuggestionIdx = -1;
            } catch {
                if (requestId === state.suggestRequestId) {
                    state.suggestions = [];
                }
            }
        },
        onSearchInput: (): void => {
            if (state.isBusy) {
                return;
            }
            void state.refreshSuggestions();
        },
        onSearchKeydown: (event: KeyboardEvent): void => {
            if (state.isBusy) {
                return;
            }
            if (state.suggestions.length > 0) {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    state.activeSuggestionIdx = (state.activeSuggestionIdx + 1) % state.suggestions.length;
                    return;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    state.activeSuggestionIdx = (state.activeSuggestionIdx - 1 + state.suggestions.length)
                        % state.suggestions.length;
                    return;
                }
                if (event.key === "Escape") {
                    state.suggestions = [];
                    return;
                }
            }
            if (event.key === "Enter") {
                event.preventDefault();
                const active = state.activeSuggestionIdx >= 0
                    ? state.suggestions[state.activeSuggestionIdx]
                    : undefined;
                if (active !== undefined) {
                    state.pickSuggestion(active);
                } else if (state.cleanInputCategory) {
                    state.suggestions = [];
                    void state.loadCategoryTree(state.cleanInputCategory);
                }
            }
        },
        pickSuggestion: (catName: string): void => {
            if (state.isBusy) {
                return;
            }
            state.searchInput = catName;
            state.suggestions = [];
            state.activeSuggestionIdx = -1;
            void state.loadCategoryTree(catName);
        },
        openSettings: (): void => {
            if (state.isBusy) {
                return;
            }
            state.prefsDraft = { ...state.prefs };
            state.subcatCountInput = `${state.prefs.subcatcount}`;
            state.prefsOpen = true;
        },
        savePrefsFromDialog: (): void => {
            if (state.isBusy) {
                return;
            }
            const previousEditPages = state.prefs.editpages;
            const nextPrefs = sanitizePrefs({
                ...state.prefsDraft,
                subcatcount: +state.subcatCountInput,
            });
            state.prefs = nextPrefs;
            savePrefs(nextPrefs);
            state.prefsOpen = false;
            if (previousEditPages !== nextPrefs.editpages) {
                state.bindPageItems();
            }
            if (state.currentCategory) {
                void state.loadCategoryTree(state.currentCategory);
            }
            notifyText(uls("Cat-a-lot 设置已保存。", "Cat-a-lot 設置已保存。"), "success");
        },
        closePrefsDialog: (): void => {
            state.prefsOpen = false;
        },
        onPrefsDialogOpenChange: (open: boolean): void => {
            state.prefsOpen = open;
        },
        askChoice: (options: AskDialogOptions): Promise<ConfirmChoice> => {
            const previous = state.confirmDialog.resolver;
            if (previous) {
                state.confirmDialog = { ...state.confirmDialog, resolver: null };
                previous("cancel");
            }
            return new Promise<ConfirmChoice>((resolve) => {
                state.confirmDialog = {
                    open: true,
                    title: options.title ?? "Cat-a-lot",
                    message: options.message,
                    showCancel: options.showCancel,
                    primaryLabel: options.primaryLabel ?? "",
                    extraLabel: options.extraLabel ?? "",
                    resolver: resolve,
                };
            });
        },
        askDialog: async (options: AskDialogOptions): Promise<boolean> => {
            const choice = await state.askChoice(options);
            return choice === "primary";
        },
        resolveConfirmDialog: (value: boolean | ConfirmChoice): void => {
            const resolve = state.confirmDialog.resolver;
            let choice: ConfirmChoice;
            if (typeof value === "boolean") {
                choice = value ? "primary" : "cancel";
            } else {
                choice = value;
            }
            state.confirmDialog = {
                ...state.confirmDialog,
                open: false,
                extraLabel: "",
                resolver: null,
            };
            resolve?.(choice);
        },
        onConfirmDialogOpenChange: (open: boolean): void => {
            if (!open) {
                state.resolveConfirmDialog(false);
            }
        },
        onResultDialogOpenChange: (open: boolean): void => {
            state.resultDialog.open = open;
        },
        stopBatch: (): void => {
            if (!state.isRunning) {
                return;
            }
            state.stopRequested = true;
            batchSession?.stop();
        },
        runBatch: (mode: EditMode, targetCat = ""): void => {
            if (state.isBusy) {
                return;
            }
            // A14：批处理一开始就重置结果对话框，避免上一批的结果残留
            state.resultDialog = emptyResultDialog();
            state.batchPending = true;
            state.activeBatchToken += 1;
            state.stopRequested = false;
            const token = state.activeBatchToken;
            void state.executeBatch(mode, targetCat, token);
        },
        executeBatch: async (mode: EditMode, targetCat: string, token: number): Promise<void> => {
            let batchStarted = false;
            try {
                const titles = [...state.selectedTitles];
                const isAllSelected = state.selectableCount > 0 && titles.length === state.selectableCount;
                // A14：批处理开始时快照偏好，批处理过程中改设置不影响本批次
                const prefsSnapshot: CatALotPrefs = { ...state.prefs };
                const hooks: BatchHooks = {
                    askDialog: (options) => state.askDialog(options),
                    askMoveAllDialog: (options) => state.askChoice({
                        message: options.message,
                        showCancel: true,
                        primaryLabel: options.primaryLabel,
                        extraLabel: options.extraLabel,
                    }),
                    notify: (text, type) => {
                        notifyText(text, type);
                    },
                    setRunning: (running) => {
                        state.isRunning = running;
                        if (running) {
                            batchStarted = true;
                        }
                    },
                    setCurrentTitle: (title) => {
                        state.currentEditingTitle = title;
                    },
                    setProgress: (done, total) => {
                        state.progressDone = done;
                        state.progressTotal = total;
                    },
                    onPageDone: (title) => {
                        state.markPageDone(title);
                    },
                    requestSelfFlood: () => state.grantSelfFlood(),
                    releaseSelfFlood: () => state.revokeSelfFlood(),
                };
                const session = startBatch({
                    titles,
                    mode,
                    sourceCat: state.pageCategoryName,
                    targetCat,
                    isAllSelected,
                    prefs: prefsSnapshot,
                    hasBotRight: state.hasBotRight,
                    isSysopOrStaff: state.isSysopOrStaff,
                    api,
                    hooks,
                });
                batchSession = session;
                const result = await session.result;
                if (token !== state.activeBatchToken) {
                    return;
                }
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- batchStarted 在 setRunning 回调中赋值，TS 控制流看不到
                if (batchStarted) {
                    state.resultDialog = buildResultDialog(result);
                }
            } catch (error) {
                if (token === state.activeBatchToken) {
                    notifyText(uls(
                        `批处理失败：${formatApiError(error)}`,
                        `批次處理失敗：${formatApiError(error)}`,
                    ), "error");
                }
            } finally {
                if (token === state.activeBatchToken) {
                    batchSession = null;
                    state.batchPending = false;
                    state.isRunning = false;
                    state.stopRequested = false;
                    state.currentEditingTitle = "";
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- batchStarted 在 setRunning 回调中赋值，TS 控制流看不到
                    if (batchStarted) {
                        state.clearSelection();
                    }
                }
            }
        },
        grantSelfFlood: async (): Promise<boolean> => {
            try {
                await api.grantFlood(activeChangeTags(state.hasBotRight), site.userName);
                // eslint-disable-next-line require-atomic-updates -- 授权接口成功后才会切换权限状态，state 是唯一响应式实例
                state.hasBotRight = true;
                // eslint-disable-next-line require-atomic-updates -- 同上，仅在授权成功后置位
                state.selfFloodActive = true;
                notifyText(uls("已成功自授权 2 小时临时机器用户！", "已成功自授權 2 小時臨時機器用戶！"), "success");
                return true;
            } catch (error) {
                await state.askDialog({
                    message: uls(
                        `自动授权临时机器用户失败：${formatApiError(error)}\n将继续以当前身份受速率限制执行。`,
                        `自動授權臨時機器用戶失敗：${formatApiError(error)}\n將繼續以當前身份受速率限制執行。`,
                    ),
                    showCancel: false,
                });
                return false;
            }
        },
        revokeSelfFlood: async (): Promise<void> => {
            try {
                await api.revokeFlood(activeChangeTags(state.hasBotRight), site.userName);
                // eslint-disable-next-line require-atomic-updates -- 撤销接口成功后才更新权限状态
                state.selfFloodActive = false;
                if (!site.userGroups.includes("bot")) {
                    // eslint-disable-next-line require-atomic-updates -- 同上，仅撤销成功后清除临时机器用户权限
                    state.hasBotRight = false;
                }
                notifyText(uls("已取消临时机器用户。", "已取消臨時機器用戶。"), "info");
            } catch (error) {
                notifyText(uls(
                    `移除临时机器用户失败：${formatApiError(error)}`,
                    `移除臨時機器用戶失敗：${formatApiError(error)}`,
                ), "warn");
            }
        },
    });

    return state;
};

export type {
    WatchlistOptionItem,
    ConfirmDialogState,
    ResultDialogState,
    AskDialogOptions,
    DialogAction,
    CatALotState,
};
export { createState };
