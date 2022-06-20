// <nowiki>
/**
 * https://commons.wikimedia.org/w/index.php?oldid=494706072
 */
"use strict";
(function () {
    const linktext = wgULS("向该用户发出提醒", "對此使用者發送提醒", null , null ,"對此用戶發送提醒") , nsNr = mw.config.get("wgNamespaceNumber");
    if (nsNr === 3 || nsNr === 2 ||
        nsNr === -1 &&
            ["Contributions", "DeletedContributions", "Block", "CentralAuth", "Userrights", "Listfiles", "Log"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
        var loadFullScript_1 = function () {
            mw.loader.load(`${mw.config.get("wgServer") + mw.config.get("wgScript") }?title=MediaWiki:AxUserMsg.js&action=raw&ctype=text/javascript&dummy=1`);
            setTimeout(() => {
                if (!window.AxUserMsg) {
                    loadFullScript_1();
                }
            }, 4500);
        };
        if (window.installOldLinks || window.AxUserMsgFireAsYouClick) {
            if (window.AxUserMsgFireAsYouClick) {
                window.installOldLinks = true;
            }
            // User wants old links - therefore we have to load the whole script each time
            loadFullScript_1();
            return;
        }
        $(() => {
            mw.loader.using(["mediawiki.util"], () => {
                if (window.installOldLinks || window.AxUserMsgFireAsYouClick) {
                    if (window.AxUserMsgFireAsYouClick) {
                        window.installOldLinks = true;
                    }
                    // User js was loaded later, so do it now!
                    loadFullScript_1();
                    return;
                }
                if ($("#t-AjaxUserMessage").length === 0 && $("#t-AjaxUserMessageLOD").length === 0) {
                    const pHref = mw.util.addPortletLink("p-tb", "#", linktext, "t-AjaxUserMessageLOD", "加载 UserMessages 小工具");
                    if (!pHref) {
                        mw.notify("UserMessages 小工具：无法添加小工具链接入口!");
                    }
                    $(pHref).on("click.umBootStrap", function (e) {
                        let $linknode = $(this).find("a");
                        if ($linknode.length === 0) {
                            $linknode = $(this);
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
                        $(this).off("click.umBootStrap");
                        loadFullScript_1();
                    });
                }
            });
        });
    } // Namespace Guard
})();