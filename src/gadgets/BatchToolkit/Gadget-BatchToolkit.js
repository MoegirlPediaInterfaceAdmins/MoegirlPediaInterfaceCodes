"use strict";
(() => {
    const { wgUserGroups = [] } = mw.config.get();
    window.BatchToolkit ??= {};
    [
        ["BatchEdit", wgULS("批量编辑", "批次編輯"), "autoconfirmed", false],
        ["BatchUpload", wgULS("批量上传", "批次上傳"), "user", true],
        ["BatchMove", wgULS("批量移动", "批次移動"), "autoconfirmed", false],
        ["BatchDelete", wgULS("批量删除", "批次刪除"), "patroller", true],
        ["BatchUndelete", wgULS("批量还原", "批次還原"), "sysop", false],
        ["BatchCheckuser", wgULS("批量查核", "批次查核"), "checkuser", true],
    ].forEach(([title, text, usergroup, defaultVisible]) => {
        const userSetting = window.BatchToolkit?.[title];

        const hasPermission
            = wgUserGroups.includes(usergroup)
                || title === "BatchDelete"
                && userSetting === true
                && wgUserGroups.includes("autoconfirmed");

        const isEnabled
            = title === "BatchUpload"
                || (defaultVisible ? userSetting !== false : userSetting === true);

        if (hasPermission && isEnabled) {
            mw.util.addPortletLink(
                "p-tb",
                `/MediaWiki:${title}`,
                text,
                `t-${title.toLowerCase()}`,
            );
        }
    });
})();
