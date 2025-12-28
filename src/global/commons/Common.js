/* 这里的任何JavaScript将为所有用户在每次页面载入时加载。 */
"use strict";
(async () => {
    const allowedInNamespace = [-1, -2, 6, 14, 8, 10, 12, 828].includes(mw.config.get("wgNamespaceNumber"));
    const allowedGroups = ["sysop", "patroller", "staff"];
    const allowedInGroup = mw.config.get("wgUserGroups").filter((group) => allowedGroups.includes(group)).length > 0;

    const { body } = document;
    const html = document.documentElement;
    const $body = $(body);
    const $window = $(window);
    /* 浮动滚动条 */
    $window.on("resize", () => {
        const { innerWidth } = window;
        let scrollbarWidth;
        switch ("scroll") {
            case getComputedStyle(body).overflowY: {
                scrollbarWidth = innerWidth - body.clientWidth;
                break;
            }
            case getComputedStyle(html).overflowY: {
                scrollbarWidth = innerWidth - html.clientWidth;
                break;
            }
            default: {
                const backup = body.style.overflowY;
                body.style.overflowY = "scroll";
                scrollbarWidth = innerWidth - body.clientWidth;
                body.style.overflowY = backup;
            }
        }
        $body[scrollbarWidth === 0 ? "addClass" : "removeClass"]("overlay-scrollbars");
    }).trigger("resize");
    // 修复代码编辑器$.ucFirst引用错误
    jQuery.extend({
        ucFirst: (s) => `${`${s}`.charAt(0).toUpperCase()}${`${s}`.substring(1)}`,
    });
    /* 函数定义体 */
    // 禁止编辑相关
    const editSet = async () => {
        await mw.loader.using(["mediawiki.util"]);
        if (/\.(?:js|css)$/.test(mw.util.getParamValue("title") || location.pathname)) {
            return;
        }
        if ([2, 3].includes(mw.config.get("wgNamespaceNumber")) && mw.config.get("wgAction") === "edit" && mw.config.get("wgArticleId") === 0) {
            location.host = location.host.replace("commons.moegirl", "zh.moegirl");
            return;
        }
        if (mw.config.get("wgArticleId") === 0 && !allowedInNamespace && !allowedInGroup) {
            $('a[href*="veaction=edit"]').remove();
            if ($('[class*="ve-init"]').length > 0) {
                $window.off();
                location.replace(`/${mw.config.get("wgPageName")}`);
            }
            $('#wikiEditor-ui-toolbar, #wpSummaryLabel, #wpSummaryWidget, [name="wpSummary"], .editCheckboxes, #wpMinoreditWidget, [name="wpMinoredit"], #wpWatchthisWidget, [name="wpWatchthis"], #editpage-copywarn, #wpSaveWidget, [name="wpSave"], #wpPreviewWidget, [name="wpPreview"], #wpDiffWidget, [name="wpDiff"], [name="wpEditToken"]').remove();
            $(".editOptions").prepend(`<p>本站仅供上传图片用，请勿在本站创建页面，如有需要请到<a target="_blank" rel="nofollow noreferrer noopener" class="external text" href="${mw.config.get("wgServer").replace("commons.moegirl", "zh.moegirl")}${mw.config.get("wgScriptPath")}">主站</a>。</p>`);
            $('#editform, [name="editform"]').each((_, ele) => {
                $(ele).removeAttr("action");
                ele.addEventListener("submit", (e) => {
                    e.preventDefault();
                }, {
                    capture: true,
                });
            });
        }
    };
    // 页顶返回主站
    const topGoback = () => {
        if (`${new mw.Uri(document.referrer)}`.startsWith(`${`${mw.config.get("wgServer").replace("commons.moegirl", "zh.moegirl")}${mw.config.get("wgScriptPath")}`}/`)) {
            $("#back").removeAttr("style").on("click", () => {
                if (history.length > 1) {
                    history.go(-1);
                } else {
                    location.href = document.referrer;
                }
            });
        }
    };
    // 文件信息
    const fileInfo = () => {
        if ($(".fileInfo")[0]) {
            $(".mw-ui-button-group.mw-mmv-filepage-buttons:first").prepend($("<a/>", {
                "class": "mw-mmv-view-expanded mw-ui-button mw-ui-icon",
                text: "在萌娘百科上查看文件说明页",
            }).on("click", () => {
                window.open(mw.config.get("wgServer").replace("commons.moegirl", "zh.moegirl") + mw.config.get("wgScriptPath") + location.pathname + location.search, "_blank");
            }));
        }
    };
    // 主站用户页链接
    const zhUserPage = () => {
        $("#mw-content-text a").each(function () {
            try {
                const link = new mw.Uri(this.href);
                if (link.toString().startsWith(`${mw.config.get("wgServer") + mw.config.get("wgScriptPath")}/`)) {
                    return;
                }
                if (/^\/api\.php/i.test(link.path)) {
                    return;
                }
                if (!link.query.title && /\.php$/i.test(link.path)) {
                    return;
                }
                if (link.query && (link.query.action || link.query.diff)) {
                    return;
                }
                const href = ((link.query.title || decodeURI(link.path.substring(1))).match(/^user(?:[ _]talk)?:[^/]+/i) || [null])[0];
                if (href) {
                    $(this).after(`<sub>[<a target="_blank" title="主站上的用户 ${href.replace(/user(_talk)?:/i, "")}" href="${mw.config.get("wgServer").replace("commons.moegirl", "zh.moegirl")}${mw.config.get("wgScriptPath")}/${href}">主</a>]</sub>`);
                }
            } catch (_e) {
                return;
            }
        });
    };
    // 授权协议检测
    const license = () => {
        if (mw.config.get("wgCanonicalSpecialPageName") === "Upload") {
            const wpLicense = $("#wpLicense");
            wpLicense.val("Copyright").trigger("change");
            $("#mw-upload-form").on("submit", () => {
                if (wpLicense.val() === "Authorized") {
                    localStorage.setItem(`AnnTools-license-authorized-${encodeURIComponent(`File:${$("#wpDestFile").val().replace(/ /g, "_")}`)}`, "true");
                }
            });
        } else if (mw.config.get("wgAction") === "edit" && mw.util.getParamValue("authorized") === "1") {
            const wpTextbox1 = $("#wpTextbox1");
            wpTextbox1.val(wpTextbox1.val().replace("{{Authorized}}", "{{Authorized\n|作者名=<!--适用于作者授权百科长期使用其作品的情形，此时直接填入作者名即可-->\n|授权证明=<!--适用于作者仅授权单张图片的情形，可以在此填写授权证明的文件链接、或是相关请求授权的讨论链接等-->\n}}"));
            setTimeout(() => {
                alert("请在编辑框内填入相关授权信息！");
            }, 0);
        } else {
            const wgPageName = encodeURIComponent((mw.config.get("wgPageName") || "").replace(/ /g, "_"));
            if (localStorage.getItem(`AnnTools-license-authorized-${wgPageName}`) === "true") {
                localStorage.removeItem(`AnnTools-license-authorized-${wgPageName}`);
                location.replace(`${mw.config.get("wgServer") + mw.config.get("wgScriptPath")}/index.php?title=${wgPageName}&action=edit&authorized=1`);
            }
        }
    };
    // 文件页面
    const filePage = async () => {
        if (mw.config.get("wgNamespaceNumber") === 6 && (mw.config.get("wgArticleId") || -1) > 0 && mw.config.get("wgAction") === "view" && (mw.config.get("wgRevisionId") || -1) === (mw.config.get("wgCurRevisionId") || -2) && !document.querySelector(".license-info")) {
            if (document.querySelector(".common-box") && mw.config.get("wgUserId", -1) > 0) {
                await mw.loader.using("mediawiki.api");
                return new mw.Api().post({
                    action: "purge",
                    pageids: mw.config.get("wgArticleId", -1),
                });
            }
            const editbutton = document.querySelector("#ca-edit a");
            const loginbutton = document.querySelector("#pt-login a");
            $("#mw-imagepage-content, #mw-imagepage-content .mw-parser-output").last().append(`<table class="common-box license-info" style="margin: 0.5em 10%; width:80%; background: #FBFBFB; border-left: 10px solid Salmon;"><tbody><tr><td style="padding: 2px 0 2px 0.5em"><img alt="Red copyright.svg" src="https://storage.moegirl.org.cn/moegirl/commons/1/1d/Red_copyright.svg" width="50" height="50"></td><td style="padding: 0.25em 0.5em"><div><span style="font-weight: bold;">由于上传者未填写授权协议</span>，本作品默认仅以介绍为目的在此百科中以非盈利性方式合理使用。</div>${loginbutton || editbutton ? `<div>您知道该文件的作者是如何授权的吗？如果您知道的话欢迎<span style="font-weight: bold;">${editbutton ? `<a href="${editbutton.href}">编辑该页面</a>` : `<a href="${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?title=Special:%E7%94%A8%E6%88%B7%E7%99%BB%E5%BD%95&returntoquery=action%3Dedit&returnto=${encodeURIComponent(mw.config.get("wgPageName"))}">登录后编辑该页面</a>`}</span>填写授权协议~~</div>` : ""}</td></tr></tbody></table>`);
        }
    };
    // Summary预加载
    const mwSaveDialogSummary = () => {
        let isInitSummary = false;
        mw.hook("ve.saveDialog.stateChanged").add(() => {
            if (!isInitSummary) {
                $("div.ve-ui-mwSaveDialog-summaryLabel span.mw-summary-preset-item > a")
                    .removeAttr("target")
                    .on("click", function (e) {
                        e.preventDefault();
                        const summaryBox = $("div.ve-ui-mwSaveDialog-summary > textarea");
                        summaryBox.val(`${summaryBox.val()} ${$(this).text()}`.trim());
                        summaryBox.on("focus");
                    });
                isInitSummary = true;
            }
        });
        mw.hook("ve.activationComplete").add(() => {
            isInitSummary = false;
        });
    };
    /* 函数执行体 */
    await $.ready;
    // 禁止编辑相关
    editSet();
    // 页顶返回主站
    topGoback();
    // 文件信息
    fileInfo();
    // 文件页面
    filePage();
    // 主站用户页链接
    zhUserPage();
    // 授权协议检测
    license();
    // 禁止移动被挂删的页面
    if (!allowedInGroup && $(".will2Be2Deleted")[0]) {
        $("#ca-move").remove();
    }
    // Summary预加载
    if (["edit", "submit"].includes(mw.config.get("wgAction"))) {
        // 2017版wikitext编辑器
        mwSaveDialogSummary();
        // 2010版wikitext编辑器
        $('[for="wpSummary"] .mw-summary-preset-item a').on("click", function () {
            const summaryBox = $('[name="wpSummary"]');
            summaryBox.val(`${summaryBox.val()} ${$(this).text()}`.trim());
            summaryBox.on("focus");
            return false;
        });
    } else if (mw.config.get("wgAction") === "view") {
        // 可视化编辑器
        mw.hook("ve.activationComplete").add(() => {
            mwSaveDialogSummary();
        });
    }
    $window.on("load", () => {
        editSet();
    });
})();
