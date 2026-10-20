import type { HotCat } from "./config/hotcat.ts";

/** UploadForm 扩展的接口面 */
interface UploadFormGlobal {
    /** 上次的分类状态（`分类|索引` 逐行） */
    previous_hotcat_state?: string | null;
}

/** UFUI 的标签查询接口 */
interface UFUIGlobal {
    getLabel(id: string, textOnly?: boolean): Node | null;
}

/** 站内用户配置对象 */
interface JSconfigGlobal {
    keys?: Record<string, unknown>;
}

declare global {
    interface Window {
        HotCat?: HotCat & { nodeName?: string };
        hotcat_translations_from_commons: boolean;
        hotcat_no_autocommit?: boolean;
        hotcat_del_needs_diff?: boolean;
        hotcat_dont_add_to_watchlist?: boolean;
        hotcat_suggestion_delay?: number;
        hotcat_editbox_width?: number;
        hotcat_suggestions?: string;
        hotcat_suggestions_fixed?: boolean;
        hotcat_single_changes_are_minor?: boolean;
        hotcat_changed_background?: string;
        hotcat_use_category_links?: boolean;
        hotcat_list_size?: number | string;
        hotcat_get_state?: () => string | null;
        hotcat_set_state?: (state: string) => null;
        hotcat_close_form?: () => void;
        JSconfig?: JSconfigGlobal;
        UFUI?: UFUIGlobal;
        UIElements?: unknown;
        UploadForm?: UploadFormGlobal;
    }

    /** OOUI 对话框封装 */
    const oouiDialog: {
        alert(textORjQuery: string | JQuery, option?: { title?: string }): JQuery.Promise<void>;
        sanitize(text: string): string;
    };
}

export {};
