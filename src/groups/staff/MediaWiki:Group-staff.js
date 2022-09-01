"use strict";
/* JS placed here will affect staffs only */
/* 函数执行体 */
$(() => {
    // 自授权管理员增加更短的时间选项
    if (mw.config.get("wgCanonicalSpecialPageName") === "Userrights") {
        const wpExpiry = document.querySelector("#mw-input-wpExpiry-sysop");
        Array.from(wpExpiry.options).filter((ele) => {
            return ele.value === "1 day";
        })[0].before(new Option("30分钟", "30 minutes"), new Option("2小时", "2 hours"), new Option("6小时", "6 hours"));
    }
    //替换文本默认不勾选「通过Special:最近更改和监视列表通知这些编辑」
    if (mw.config.get("wgCanonicalSpecialPageName") === "ReplaceText" && $("#doAnnounce")[0]) {
        $("#doAnnounce").prop("checked", false);
    }
});
