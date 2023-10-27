"use strict";
(async () => {
    /* 函数定义块 */
    //添加删除原因链接
    const addLink = ($obj, act) => {
        const href = $obj.css("margin-left", "1em")[0].href,
            reasonPageName = href.slice(href.indexOf("title=") + 6, href.indexOf("&action"));
        $obj.before(`<a target="_blank" href="/${reasonPageName}">浏览${act}原因</a>`);
    };
    /* 函数执行块 */
    await $.ready;
    //删除、保护、版本删除原因浏览链接
    if (mw.config.get("wgAction") === "delete") {
        if ($(".mw-delete-editreasons")[0]) {
            addLink($(".mw-delete-editreasons > a"), "删除");
        }
        if ($(".mw-filedelete-editreasons")[0]) {
            addLink($(".mw-filedelete-editreasons > a"), "删除");
        }
    }
    if (/protect$/.test(mw.config.get("wgAction")) && $(".mw-protect-editreasons")[0]) {
        addLink($(".mw-protect-editreasons > a"), "保护");
    }
    if (mw.config.get("wgCanonicalSpecialPageName") === "Revisiondelete" && $(".mw-revdel-editreasons")[0]) {
        addLink($(".mw-revdel-editreasons > a"), "删除");
    }
    //替换文本默认不勾选「通过Special:最近更改和监视列表通知这些编辑」
    if (mw.config.get("wgCanonicalSpecialPageName") === "ReplaceText" && $("#doAnnounce")[0]) {
        $("#doAnnounce, #mw-search-ns0").prop("checked", false);
        $("#mw-search-ns6").prop("checked", true);
    }
    //批量删除默认选择运行者为「you」
    if (mw.config.get("wgCanonicalSpecialPageName") === "DeleteBatch" && $("#wpMode")[0]) {
        $("#wpMode").val("you");
    }
})();
// </pre>
