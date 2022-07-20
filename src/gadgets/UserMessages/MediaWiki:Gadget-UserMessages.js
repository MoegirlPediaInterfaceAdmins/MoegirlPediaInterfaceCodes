// <nowiki>
/**
 * https://commons.wikimedia.org/w/index.php?oldid=494706072
 */
"use strict";
(() => {
    const linktext = wgULS("向该用户发出提醒", "對此使用者發送提醒", null, null, "對此用戶發送提醒"), nsNr = mw.config.get("wgNamespaceNumber");
    if (nsNr === 3 || nsNr === 2 ||
        nsNr === -1 &&
        ["Contributions", "DeletedContributions", "Block", "CentralAuth", "Userrights", "Listfiles", "Log"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
        const loadFullScript = () => {
            mw.loader.using(["ext.gadget.AxUserMsg"]);
        };
        if (window.installOldLinks || window.AxUserMsgFireAsYouClick) {
            if (window.AxUserMsgFireAsYouClick) {
                window.installOldLinks = true;
            }
            // User wants old links - therefore we have to load the whole script each time
            loadFullScript();
            return;
        }
        $(() => {
            if (window.installOldLinks || window.AxUserMsgFireAsYouClick) {
                if (window.AxUserMsgFireAsYouClick) {
                    window.installOldLinks = true;
                }
                // User js was loaded later, so do it now!
                loadFullScript();
                return;
            }
            if ($("#t-AjaxUserMessage").length === 0 && $("#t-AjaxUserMessageLOD").length === 0) {
                const pHref = mw.util.addPortletLink("p-tb", "#", linktext, "t-AjaxUserMessageLOD", "加载 UserMessages 小工具");
                if (!pHref) {
                    mw.notify("UserMessages 小工具：无法添加小工具链接入口!");
                }
                const $pHref = $(pHref);
                $pHref.on("click.umBootStrap", (e) => {
                    let $linknode = $pHref.find("a");
                    if ($linknode.length === 0) {
                        $linknode = $pHref;
                    }
                    e.preventDefault();
                    $linknode.text("加载中……");
                    $(document).on("scriptLoaded", (_, st, o) => {
                        if (st) {
                            if (st === "AxUserMsg" && o) {
                                $linknode.text(linktext);
                                o.umNotifyUser();
                            }
                        }
                    });
                    $pHref.off("click.umBootStrap");
                    loadFullScript();
                });
            }
        });
    } // Namespace Guard
})();