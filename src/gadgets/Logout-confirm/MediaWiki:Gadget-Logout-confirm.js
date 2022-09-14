"use strict";
// <pre>
(function () {
    $("#pt-logout > a[href*=logoutToken]").each((_, ele) => {
        const uri = new mw.Uri(ele.href);
        Reflect.deleteProperty(uri.query, "logoutToken");
        ele.href = uri;
    });
    if (mw.config.get("wgCanonicalSpecialPageName") === "Userlogout") {
        const context = $("#mw-content-text");
        if (!context.find("#mw-returnto")[0] && context.text().includes("If you wish to log out")) {
            const link = context.find("a[href*=logoutToken]").clone();
            link.attr("target", "_self").text("点此退出").addClass("mw-ui-button mw-ui-progressive").css("margin-left", ".25em");
            context.empty().text("如果您想退出萌百账号，请").append(link);
        }
    }
})();
// </pre>
