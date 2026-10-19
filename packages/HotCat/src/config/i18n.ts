import { HC } from "./hotcat.ts";
import { site } from "../runtime.ts";
import type { HotCatMessages, HotCatTooltips } from "./messages.ts";

interface HotCatLocalization {
    messages: HotCatMessages;
    categories: string;
    redir_category: string;
    tooltips: HotCatTooltips;
    multi_tooltip: string;
    engine_names: Record<string, string>;
    disambig_category: string;
    blacklist: RegExp;
}

const local: HotCatLocalization = {
    messages: {
        cat_removed: "移除[[分类:$1]]",
        template_removed: "移除{{[[分类:$1]]}}",
        cat_added: "添加[[分类:$1]]",
        cat_keychange: "为[[分类:$1]]设定新索引：“$2”",
        cat_notFound: "分类“$1”未找到",
        cat_exists: "分类“$1”已存在，不执行添加操作",
        cat_resolved: "（已处理[[分类:$1]]的重定向）",
        uncat_removed: "", // 萌百没有 Template:Uncategorized
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
    redir_category: "分类重定向",
    tooltips: {
        change: "修改",
        remove: "移除",
        add: "新增一个分类",
        restore: "回退更改",
        undo: "回退更改",
        down: "打开以便修改并显示子分类",
        up: "打开以便修改并显示父分类",
    },
    multi_tooltip: "修改多个分类",
    engine_names: {
        searchindex: "搜索索引",
        pagelist: "页面列表",
        combined: "合并搜索",
        subcat: "子分类",
        parentcat: "父分类",
    },
    disambig_category: "消歧义页",
    blacklist: /(?:不可|已)索引页面|(?:调用重复模板参数|有(?:过多高开销解析器函数调用|忽略显示标题|模板循环|脚本错误|投票|参考文献错误)|含有(?:略过模板参数|受损文件链接)|展开模板后长度超过上限|扩展深度超出限制|使用无效自封闭HTML标签|受到保护无法编辑|即将删除)的页面|有错误的Scribunto模块|隐藏分类|页面的节点数超出限制|需要帮助/i,
};

/** 在 `$.ready` 后应用中文覆盖。 */
const applyLocalization = (): void => {
    if (site.conf.wgUserLanguage !== "en") {
        // 浅合并
        $.extend(HC, local, true);
    }
};

export { applyLocalization };
