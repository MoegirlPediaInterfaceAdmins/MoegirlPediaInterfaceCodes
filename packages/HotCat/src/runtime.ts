import type { CategoryEditor } from "./ui/editor.ts";
import type { CommitForm, SiteConfig } from "./types.ts";

/** 站点上下文 */
const site: {
    conf: SiteConfig;
    /** 脚本入口绝对前缀 */
    expandedScriptPrefix: string;
    /** 条目路径绝对前缀 */
    expandedArticlePrefix: string;
    /** 皮肤名 */
    skin: string;
    /** WebKit 判定 */
    isWebkit: boolean;
} = {
    conf: {} as SiteConfig,
    expandedScriptPrefix: "",
    expandedArticlePrefix: "",
    skin: "",
    isWebkit: false,
};

/** 运行时可变状态。 */
interface RuntimeState {
    /** opensearch 的命名空间前缀正则缓存 */
    cat_prefix: RegExp | null;
    /** 建议接口失败后不再发请求 */
    noSuggestions: boolean;
    /** 跨语言链接正则 */
    interlanguageRE: RegExp | null;
    catLine: HTMLElement | null;
    onUpload: boolean;
    editors: CategoryEditor[];
    commitButton: HTMLInputElement | null;
    commitForm: CommitForm | null;
    multiSpan: HTMLElement | null;
    pageText: string | null;
    pageTime: string | null;
    pageWatched: boolean;
    watchCreate: boolean;
    watchCreateExpiry: string;
    watchEdit: boolean;
    watchDefaultExpiry: string;
    minorEdits: boolean;
    editToken: string | null;
    is_rtl: boolean;
    serverTime: string | null;
    lastRevId: number | null;
    pageTextRevId: number | null;
    conflictingUser: string | null;
    /** 分类栏使用 <li> 结构时为 true */
    newDOM: boolean;
    saveInProgress: boolean;
    initialized: boolean;
    setupTimeout: number | null;
    /** 清洗后的页面源码 */
    cleanedText: string | null;
}

const state: RuntimeState = {
    cat_prefix: null,
    noSuggestions: false,
    interlanguageRE: null,
    catLine: null,
    onUpload: false,
    editors: [],
    commitButton: null,
    commitForm: null,
    multiSpan: null,
    pageText: null,
    pageTime: null,
    pageWatched: false,
    watchCreate: false,
    watchCreateExpiry: "",
    watchEdit: false,
    watchDefaultExpiry: "",
    minorEdits: false,
    editToken: null,
    is_rtl: false,
    serverTime: null,
    lastRevId: null,
    pageTextRevId: null,
    conflictingUser: null,
    newDOM: false,
    saveInProgress: false,
    initialized: false,
    setupTimeout: null,
    cleanedText: null,
};

/** 重置页面源码缓存。 */
const invalidateCleanedText = (): void => {
    state.cleanedText = null;
};

export { site, state, invalidateCleanedText };
export type { RuntimeState };
