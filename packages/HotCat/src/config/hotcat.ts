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
    wikitextContentModels: string[];
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
        cat_removed: "移除[[分类:$1]]",
        template_removed: "移除{{[[分类:$1]]}}",
        cat_added: "添加[[分类:$1]]",
        cat_keychange: "为[[分类:$1]]设定新索引：“$2”",
        cat_notFound: "分类“$1”未找到",
        cat_exists: "分类“$1”已存在，不执行添加操作",
        cat_resolved: "（已处理[[分类:$1]]的重定向）",
        separator: "; ",
        prefix: "",
        using: "——[[Help:HotCat小工具|HotCat]]",
        multi_change: "$1个分类",
        commit: "保存",
        ok: "确定",
        cancel: "取消",
        multi_error: "无法连接到萌百服务器，因此您的分类更改无法保存，由此引发的不便我们深表歉意。",
        short_catchange: null,
    },
    categories: "分类",
    disambig_category: "消歧义页",
    redir_category: "分类重定向",
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
        change: "修改",
        remove: "移除",
        add: "新增一个分类",
        restore: "回退更改",
        undo: "回退更改",
        down: "打开以便修改并显示子分类",
        up: "打开以便修改并显示父分类",
    },
    addmulti: "<span>+<sup>+</sup></span>",
    multi_tooltip: "修改多个分类",
    isSupportedContentModel: () => HC.wikitextContentModels.includes(site.conf.wgPageContentModel),
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
    wikitextContentModels: ["wikitext"],
    existsYes: "https://storage.moegirl.org.cn/moegirl/commons/b/be/P_yes.svg",
    existsNo: "https://storage.moegirl.org.cn/moegirl/commons/4/42/P_no.svg",
    template_categories: {},
    engine_names: {
        searchindex: "搜索索引",
        pagelist: "页面列表",
        combined: "合并搜索",
        subcat: "子分类",
        parentcat: "父分类",
    },
    capitalizePageNames: null,
    upload_disabled: false,
    blacklist: /(?:不可|已)索引页面|(?:调用重复模板参数|有(?:过多高开销解析器函数调用|忽略显示标题|模板循环|脚本错误|投票|参考文献错误)|含有(?:略过模板参数|受损文件链接)|展开模板后长度超过上限|扩展深度超出限制|使用无效自封闭HTML标签|受到保护无法编辑|即将删除)的页面|有错误的Scribunto模块|隐藏分类|页面的节点数超出限制|需要帮助/i,
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
        const hotCat = window.HotCat!;
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
