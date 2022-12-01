"use strict";
$(() => {
    let moetopbarplus = MOE_SKIN_GLOBAL_DATA_REF.value.moeskin_topbar
        .replace(
            /<li>萌娘百科_talk:(讨论|討論)版\|(讨论|討論)版<\/li>/,
            `<li>|${wgULS("讨论版", "討論版")}\n` +
            `<ul><li>萌娘百科_talk:讨论版|${wgULS("目录", "目録")}</li>\n` +
            `<li>萌娘百科_talk:讨论版/技术实现|${wgULS("技术实现", "技術實現")}</li>\n` +
            `<li>萌娘百科_talk:讨论版/权限变更|${wgULS("权限变更", "權限變更")}</li>\n` +
            `<li>萌娘百科_talk:讨论版/操作申请|${wgULS("操作申请", "操作申請")}</li>\n` +
            `<li>萌娘百科_talk:讨论版/方针政策|${wgULS("方针政策", "方針政策")}</li>\n` +
            `<li>萌娘百科_talk:讨论版/页面相关|${wgULS("页面相关", "頁面相關")}</li>\n` +
            `<li>萌娘百科_talk:讨论版/提问求助|${wgULS("提问求助", "提問求助")}</li>\n` +
            `<li>萌娘百科_talk:讨论版/群组信息|${wgULS("群组信息", "群組資訊")}</li></ul></li>`,
        );
    if (+mw.user.options.get("gadget-moeskin-topbar-patrolplus", 0) === 1) {
        moetopbarplus = moetopbarplus
            .replace(
                /<li>https:\/\/commons.moegirl.org.cn\/.*\|最新(文件|档案|檔案)<\/li>/,
                `<li>https://commons.moegirl.org.cn/Special:%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6|${wgULS("最新文件", "最新檔案")}</li>\n` +
                `<li>Special:最新页面|${wgULS("最新页面", "最新頁面")}</li>\n` +
                `<li>Special:日志|${wgULS("所有日志", "所有日誌")}</li>\n` +
                `<li>Category:积压工作|${wgULS("积压工作", "積壓工作")}</li>`,
            );
    }
    MOE_SKIN_GLOBAL_DATA_REF.value.moeskin_topbar = moetopbarplus;
});
