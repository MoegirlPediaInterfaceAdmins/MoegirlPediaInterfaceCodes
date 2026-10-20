/** mw.config.values 中用到的键 */
interface SiteConfig {
    wgAction: string;
    wgArticleId: number;
    wgArticlePath: string;
    wgCanonicalSpecialPageName: string | false;
    wgCurRevisionId: number;
    wgDBname: string;
    wgFormattedNamespaces: Record<string, string>;
    wgIsArticle: boolean;
    wgNamespaceIds: Record<string, number>;
    wgNamespaceNumber: number;
    wgPageContentModel: string;
    wgPageName: string;
    wgScript: string;
    wgScriptPath: string;
    wgServer: string;
    wgTitle: string;
    wgUserLanguage: string;
    wgUserName: string | null;
    skin: string;
}

/** action=query 的 revisions 项（rvslots=main） */
interface ApiRevision {
    slots: {
        main: {
            "*": string;
        };
    };
    timestamp?: string;
    revid?: number;
    user?: string;
}

/** action=query 的 pages 项 */
interface ApiPage {
    title: string;
    /** 页面不存在时为空串 */
    missing?: string;
    redirect?: string;
    lastrevid?: number;
    starttimestamp?: string;
    watched?: string | boolean;
    langlinks?: {
        lang: string;
    }[];
    revisions?: ApiRevision[];
    categories?: {
        title?: string;
    }[];
    links?: {
        ns?: number;
        title?: string;
    }[];
    categoryinfo?: {
        hidden?: string;
    };
}

/** setPage / initiateEdit 读取的 query 结构 */
interface ApiQuery {
    pages?: Record<string, ApiPage | undefined>;
    general?: {
        time?: string;
        /** "first-letter" 表示首字母大写站点 */
        "case"?: string;
    };
    tokens?: {
        csrftoken?: string;
    };
    userinfo?: {
        options?: Record<string, string | number>;
    };
    converted?: {
        from: string;
        to: string;
    }[];
    allpages?: {
        title: string;
    }[];
    categorymembers?: {
        title: string;
    }[];
    langlinks?: unknown;
}

interface ApiResponse {
    query?: ApiQuery;
    "query-continue"?: {
        langlinks?: unknown;
    };
}

/** opensearch 的返回：`[查询串, 标题数组, 描述数组, 链接数组]` */
type OpenSearchResponse = [string, string[], string[], string[]];

/** 建议列表，附带 exists / normalized 标记。 */
interface TitleList extends Array<string> {
    exists?: boolean;
    normalized?: string;
}

/** 单条匹配的原始形态：wikitext 为 RegExpExecArray，JSON 为三元组 */
type CategoryMatch = RegExpExecArray | [string, string, string];

interface CategoryMatchEntry {
    match: CategoryMatch;
}

/** find_category(..., true) 的产物 */
type OnceMatch = RegExpExecArray | CategoryMatchEntry;

/** find_category(..., false) 的产物，附带所用正则 */
interface CategoryMatchList extends Array<CategoryMatchEntry> {
    re?: RegExp;
}

/** wikitext 分支的批量结果 */
interface WikitextMatchEntry {
    match: RegExpExecArray;
}

interface WikitextMatchList extends Array<WikitextMatchEntry> {
    re: RegExp;
}

/** `change_category` 的返回值 */
interface ChangeResult {
    text: string;
    summary: string[];
    error: string | null;
}

/** 编辑失败的统一回调（消息已本地化，直接展示） */
type FailureHandler = (message: string) => void;

/** 隐藏提交表单的具名控件。 */
interface CommitForm {
    wpTextbox1: HTMLInputElement;
    wpMinoredit: HTMLInputElement;
    wpWatchthis: HTMLInputElement;
    wpWatchlistExpiry: HTMLInputElement;
    wpSummary: HTMLInputElement;
    wpStarttime: HTMLInputElement;
    wpEdittime: HTMLInputElement;
    wpAutoSummary: HTMLInputElement;
    wpChangeTags: HTMLInputElement;
    wpEditToken: HTMLInputElement;
    /** 表单中没有 wpSave 控件 */
    wpSave?: HTMLInputElement;
    wpDiff: HTMLInputElement;
    oldid: HTMLInputElement;
    hcCommit: HTMLInputElement;
    click(): void;
}

/** `setState` 的入参形态 */
interface StateCategory {
    element: HTMLElement;
    title: string;
    key: string | null;
}

export type { SiteConfig, ApiRevision, ApiPage, ApiQuery, ApiResponse, OpenSearchResponse, TitleList, CategoryMatch, CategoryMatchEntry, OnceMatch, CategoryMatchList, WikitextMatchEntry, WikitextMatchList, ChangeResult, FailureHandler, CommitForm, StateCategory };
