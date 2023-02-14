"use strict";
$(() => {
    MOE_SKIN_GLOBAL_DATA_REF.value.moeskin_topbar = MOE_SKIN_GLOBAL_DATA_REF.value.moeskin_topbar
        .replace(
            /<li>https:\/\/commons.moegirl.org.cn\/.*\|最新(文件|档案|檔案)<\/li>/,
            `<li>https://commons.moegirl.org.cn/Special:%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6|${wgULS("最新文件", "最新檔案")}</li>\n` +
            `<li>Special:最新页面|${wgULS("最新页面", "最新頁面")}</li>\n` +
            `<li>Special:日志|${wgULS("所有日志", "所有日誌")}</li>\n` +
            `<li>Category:积压工作|${wgULS("积压工作", "積壓工作")}</li>`,
        );
});
