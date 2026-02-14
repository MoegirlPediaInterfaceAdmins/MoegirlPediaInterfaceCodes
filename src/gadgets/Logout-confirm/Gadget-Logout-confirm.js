"use strict";
// <pre>
$(() => {
    $("#pt-logout > a[href*=logoutToken], .moe-user-dropdown-inner #logout").each((_, ele) => {
        const url = new URL(ele.href, location.origin);
        url.searchParams.delete("logoutToken");
        ele.href = url;
    });
    if (mw.config.get("wgCanonicalSpecialPageName") === "Userlogout") {
        const context = $("#mw-content-text");
        if (!context.find("#mw-returnto")[0] && context.text().includes("If you wish to log out")) {
            const link = context.find("a[href*=logoutToken]").clone();
            link.attr("target", "_self").text(wgULS("点此退出", "點此登出")).addClass("mw-ui-button mw-ui-progressive").css("margin-left", ".25em");
            context.empty().text("如果您想退出萌娘百科账号，请", "如果您想登出萌娘百科賬號，請").append(link);
        }
    }
});
// </pre>
