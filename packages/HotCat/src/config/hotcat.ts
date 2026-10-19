import { site } from "../runtime.ts";
import type { HotCatMessages, HotCatTooltips, HotCatLinks } from "./messages.ts";

interface HotCat {
    messages: HotCatMessages;
    categories: string;
    disambig_category: string;
    redir_category: string;
    links: HotCatLinks;
    changeTag: string;
    automationChangeTag: string;
    tooltips: HotCatTooltips;
    addmulti: string;
    multi_tooltip: string;
    isSupportedContentModel: () => boolean;
    disable: () => boolean;
    uncat_regexp: RegExp | null;
    wikitextContentModels: string[];
    jsonContentModels: string[];
    existsYes: string;
    existsNo: string;
    /** 分类名 → 模板名 */
    template_categories: Record<string, string>;
    engine_names: Record<string, string>;
    /** 首字母大写站点为 true；null 表示未判定 */
    capitalizePageNames: boolean | null;
    upload_disabled: boolean;
    blacklist: RegExp | null;
    bg_changed: string;
    no_autocommit: boolean;
    del_needs_diff: boolean;
    suggest_delay: number;
    editbox_width: number;
    suggestions: string;
    fixed_search: boolean;
    use_up_down: boolean;
    listSize: number;
    single_minor: boolean;
    dont_add_to_watchlist: boolean;
    shortcuts: Record<string, string> | null;
    addShortcuts: (map: Record<string, unknown> | null | undefined) => void;
    // 本地化阶段写入
    category_canonical: string;
    category_regexp: string;
    template_regexp: string;
    // 一次性标记
    started?: boolean;
    runWhenReady?: (callback: () => void) => void;
}

const HC: HotCat = {
    messages: {
        cat_removed: "removed [[Category:$1]]",
        template_removed: "removed {{[[Category:$1]]}}",
        cat_added: "added [[Category:$1]]",
        cat_keychange: 'new key for [[Category:$1]]: "$2"',
        cat_notFound: 'Category "$1" not found',
        cat_exists: 'Category "$1" already exists; not added.',
        cat_resolved: " (redirect [[Category:$1]] resolved)",
        uncat_removed: "removed {{uncategorized}}",
        separator: "; ",
        prefix: "",
        using: " using [[Help:Gadget-HotCat|HotCat]]",
        multi_change: "$1 categories",
        commit: "Save",
        ok: "OK",
        cancel: "Cancel",
        multi_error: "Could not retrieve the page text from the server. Therefore, your category changes cannot be saved. We apologize for the inconvenience.",
        short_catchange: null,
    },
    categories: "Categories",
    disambig_category: "Disambiguation",
    redir_category: "Category redirects",
    links: {
        change: "(±)",
        remove: "(−)",
        add: "(+)",
        restore: "(×)",
        undo: "(×)",
        down: "(↓)",
        up: "(↑)",
    },
    changeTag: "HotCat",
    automationChangeTag: "Automation tool",
    tooltips: {
        change: "Modify",
        remove: "Remove",
        add: "Add a new category",
        restore: "Undo changes",
        undo: "Undo changes",
        down: "Open for modifying and display subcategories",
        up: "Open for modifying and display parent categories",
    },
    addmulti: "<span>+<sup>+</sup></span>",
    multi_tooltip: "Modify several categories",
    isSupportedContentModel: () => HC.wikitextContentModels.includes(site.conf.wgPageContentModel) || HC.jsonContentModels.includes(site.conf.wgPageContentModel),
    disable: () => {
        const ns = site.conf.wgNamespaceNumber;
        const nsIds = site.conf.wgNamespaceIds;
        return ns < 0
            || ns === nsIds.template
            || ns === nsIds.module
            || ns === nsIds.mediawiki
            || ns === nsIds.file && !site.conf.wgArticleId
            || ns === nsIds.creator
            || ns === nsIds.timedtext
            || ns === nsIds.institution
            || ns === nsIds.user && /\.(js|css|json)$/.test(site.conf.wgTitle);
    },
    uncat_regexp: /\{\{\s*[Uu]ncategorized\s*[^}]*\}\}\s*(<!--.*?-->\s*)?/g,
    wikitextContentModels: ["wikitext", "proofread-index", "proofread-page"],
    jsonContentModels: ["Tabular.JsonConfig", "Map.JsonConfig", "Chart.JsonConfig"],
    existsYes: "https://storage.moegirl.org.cn/moegirl/commons/b/be/P_yes.svg",
    existsNo: "https://storage.moegirl.org.cn/moegirl/commons/4/42/P_no.svg",
    template_categories: {},
    engine_names: {
        searchindex: "Search index",
        pagelist: "Page list",
        combined: "Combined search",
        subcat: "Subcategories",
        parentcat: "Parent categories",
    },
    capitalizePageNames: null,
    upload_disabled: false,
    blacklist: null,
    bg_changed: "#FCA",
    no_autocommit: true,
    del_needs_diff: true,
    suggest_delay: 100,
    editbox_width: 40,
    suggestions: "combined",
    fixed_search: false,
    use_up_down: true,
    listSize: 5,
    single_minor: true,
    dont_add_to_watchlist: false,
    shortcuts: null,
    addShortcuts: (map) => {
        if (!map) {
            return;
        }
        const hotCat = window.HotCat;
        if (!hotCat) {
            return;
        }
        hotCat.shortcuts ||= {};
        for (const rawKey in map) {
            if (!Object.prototype.hasOwnProperty.bind(map)(rawKey)) {
                continue;
            }
            const rawValue = map[rawKey];
            if (typeof rawValue !== "string") {
                continue;
            }
            const k = rawKey.replace(/^\s+|\s+$/g, "");
            const v = rawValue.replace(/^\s+|\s+$/g, "");
            if (!k.length || !v.length) {
                continue;
            }
            hotCat.shortcuts[k] = v;
        }
    },
    // 本地化阶段写入
    category_canonical: "",
    category_regexp: "",
    template_regexp: "",
};

export { HC };
export type { HotCat };
