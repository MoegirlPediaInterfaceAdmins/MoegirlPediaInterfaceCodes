"use strict";
(() => {
    const { wgUserGroups } = mw.config.get();
    window.BatchToolkit ??= {};
    [
        ["BatchEdit", wgULS("批量编辑", "批量編輯"), "autoconfirmed"],
        ["BatchUpload", wgULS("批量上传", "批量上傳"), "user"],
        ["BatchMove", wgULS("批量移动", "批量移動"), "autoconfirmed"],
        ["BatchDelete", wgULS("批量删除", "批量刪除"), "patroller"],
        ["BatchUndelete", wgULS("批量还原", "批量還原"), "sysop"],
        ["BatchCheckuser", wgULS("批量查核", "批量查核"), "checkuser"],
    ].forEach(([title, text, usergroup]) => {
        if (
            wgUserGroups.includes(usergroup)
            && window.BatchToolkit?.[title] !== false
        ) {
            mw.util.addPortletLink(
                "p-tb",
                `/MediaWiki:${title}`,
                text,
                `t-${title.toLowerCase()}`,
            );
        }
    });
})();
