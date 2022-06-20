/* JS placed here will affect staffs only */
/* 函数执行体 */
$(function () {
    // 自授权管理员增加更短的时间选项
    if (mw.config.get("wgCanonicalSpecialPageName") === "Userrights") {
        var wpExpiry = document.querySelector("#mw-input-wpExpiry-sysop");
        Array.from(wpExpiry.options).filter(function (ele) {
            return ele.value === "1 day";
        })[0].before(new Option("30分钟", "30 minutes"), new Option("2小时", "2 hours"), new Option("6小时", "6 hours"));
    }
});