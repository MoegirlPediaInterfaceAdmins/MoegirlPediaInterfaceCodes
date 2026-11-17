type EditMode = "add" | "copy" | "move" | "remove";

type WatchlistOption = "preferences" | "nochange" | "watch" | "unwatch";

type NotifyType = "info" | "success" | "warn" | "error";

// 选项卡初始停靠位置：右下角（默认）或左下角。
type DockPosition = "bottom-right" | "bottom-left";

interface CatALotPrefs {
    watchlist: WatchlistOption;
    minor: boolean;
    editpages: boolean;
    subcatcount: number;
    position: DockPosition;
}

type CatALotPrefsInput = Partial<Record<keyof CatALotPrefs, unknown>>;

interface SiteContext {
    namespaceNumber: number;
    canonicalSpecialPageName: string | false;
    action: string;
    title: string;
    userName: string;
    userGroups: string[];
}

interface CategoryTree {
    missing: boolean;
    parents: string[];
    subs: string[];
}

interface PageWikitext {
    content: string | undefined;
    timestamp: string | undefined;
    curtimestamp: string | undefined;
    missing: boolean;
    invalid: boolean;
}

interface EditPageParams {
    title: string;
    text: string;
    summary: string;
    watchlist: WatchlistOption;
    minor: boolean;
    bot: boolean;
    tags: string;
    basetimestamp?: string;
    starttimestamp?: string;
}

interface ApiClient {
    fetchCategoryTree(catName: string, subcatLimit: number, allowCategoryMembers: boolean): Promise<CategoryTree>;
    fetchCategorySuggestions(query: string): Promise<string[]>;
    fetchPageWikitext(title: string): Promise<PageWikitext>;
    editPage(params: EditPageParams): Promise<void>;
    grantFlood(tags: string, userName: string): Promise<void>;
    revokeFlood(tags: string, userName: string): Promise<void>;
    abortActive(): void;
}

type ConfirmChoice = "primary" | "extra" | "cancel";

interface BatchHooks {
    askDialog(options: { message: string; showCancel: boolean }): Promise<boolean>;
    askMoveAllDialog?(options: {
        message: string;
        primaryLabel: string;
        extraLabel: string;
    }): Promise<ConfirmChoice>;
    notify(text: string, type: NotifyType): void;
    setRunning(running: boolean): void;
    setCurrentTitle(title: string): void;
    setProgress(done: number, total: number): void;
    onPageDone(title: string): void;
    requestSelfFlood(): Promise<boolean>;
    releaseSelfFlood(): Promise<void>;
}

type WikitextStatus = "ok" | "invalid-target" | "skipped-already" | "skipped-not-found";

interface ComputedWikitext {
    status: WikitextStatus;
    text: string;
}

interface BatchOptions {
    titles: string[];
    mode: EditMode;
    sourceCat: string;
    targetCat: string;
    isAllSelected?: boolean;
    prefs: CatALotPrefs;
    hasBotRight: boolean;
    isSysopOrStaff: boolean;
    api: ApiClient;
    hooks: BatchHooks;
}

interface BatchResult {
    total: number;
    done: number;
    stopped: boolean;
    skippedAlready: string[];
    skippedNotFound: string[];
    skippedServer: string[];
}

interface BatchRun {
    result: Promise<BatchResult>;
    stop(): void;
}

interface CatALotIcons {
    readonly settings: string;
    readonly expand: string;
    readonly collapse: string;
}

type ReactiveFactory = <T extends object>(value: T) => T;

export type {
    EditMode,
    WatchlistOption,
    NotifyType,
    DockPosition,
    ConfirmChoice,
    CatALotPrefs,
    CatALotPrefsInput,
    SiteContext,
    CategoryTree,
    PageWikitext,
    EditPageParams,
    ApiClient,
    BatchHooks,
    WikitextStatus,
    ComputedWikitext,
    BatchOptions,
    BatchResult,
    BatchRun,
    CatALotIcons,
    ReactiveFactory,
};
