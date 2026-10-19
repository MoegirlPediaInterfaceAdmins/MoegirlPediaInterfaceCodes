import { HC } from "./hotcat.ts";
import { site } from "../runtime.ts";
import type { HotCat } from "./hotcat.ts";

const hant: Pick<HotCat, "messages" | "categories" | "disambig_category" | "redir_category" | "tooltips" | "engine_names" | "multi_tooltip"> = {
    messages: {
        cat_removed: "移除[[分類:$1]]",
        template_removed: "移除{{[[分類:$1]]}}",
        cat_added: "添加[[分類:$1]]",
        cat_keychange: "為[[分類:$1]]設定新索引：“$2”",
        cat_notFound: "分類“$1”未找到",
        cat_exists: "分類“$1”已存在，不執行添加操作",
        cat_resolved: "（已處理[[分類:$1]]的重定向）",
        separator: "; ",
        prefix: "",
        using: "——[[Help:HotCat小工具|HotCat]]",
        multi_change: "$1個分類",
        commit: "儲存",
        ok: "確定",
        cancel: "取消",
        multi_error: "無法連接到萌百伺服器，因此您的分類變更無法保存，由此引發的不便我們深表歉意。",
        short_catchange: null,
    },
    categories: "分類",
    disambig_category: "消歧義頁",
    redir_category: "分類重定向",
    tooltips: {
        change: "修改",
        remove: "移除",
        add: "新增一個分類",
        restore: "回退變更",
        undo: "回退變更",
        down: "打開以便修改並顯示子分類",
        up: "打開以便修改並顯示父分類",
    },
    engine_names: {
        searchindex: "搜尋索引",
        pagelist: "頁面列表",
        combined: "合併搜尋",
        subcat: "子分類",
        parentcat: "父分類",
    },
    multi_tooltip: "修改多個分類",
};

/** 對 zh-hant 系變體應用繁體覆蓋；簡體直接使用 HC 預設值。 */
const applyLocalization = (): void => {
    if (/^zh-(hant|hk|mo|tw)/i.test(site.conf.wgUserLanguage)) {
        $.extend(HC, hant, true);
    }
};

export { applyLocalization };
