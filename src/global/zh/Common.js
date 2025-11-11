// <nowiki>
/* 这里的任何JavaScript将在全站加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:Common.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0 中国大陆
 */
"use strict";
(async () => {
    /* 函数定义体 */
    const { wgUserGroups, wgServer, wgServerName, wgScriptPath, wgPageName, wgAction, skin, wgNamespaceNumber, wgMainPageTitle } = mw.config.get();
    /* 以下为允许添加版权声明的命名空间列表 */
    const copyRightsNameSpaces = [
        0, // （主）
        4, // 萌娘百科
        8, // MediaWiki
        10, // Template
        12, // Help
        274, // Widget
        828, // Module
    ];
    /* 检查是否为维护人员 */
    const allowedGroups = ["sysop", "patroller", "staff"];
    const allowedInGroup = wgUserGroups.filter((group) => allowedGroups.includes(group)).length > 0;
    /* MediaViewer#populateStatsFromXhr 错误屏蔽 */
    const { getResponseHeader } = XMLHttpRequest.prototype;
    XMLHttpRequest.prototype.getResponseHeader = function (name) {
        return `\n${this.getAllResponseHeaders().toLowerCase()}`.includes(`\n${name.toLowerCase()}: `) ? getResponseHeader.bind(this)(name) : (console.info(`Refused to get unsafe header "${name}"\n`, this, "\n", new Error().stack), null);
    };
    // Extension:MultimediaViewer的半透明化修改，用于保持背景文字处于原位，本应修改插件达成的，暂时先用JavaScript应急处理下
    const multimediaViewer = () => {
        const _scrollTo = window.scrollTo;
        let flag = location.hash.startsWith("#/media/");
        window.scrollTo = (xORoption, y) => {
            if (flag) {
                console.info("Prevent multimediaViewer called");
            } else if (y === undefined) {
                _scrollTo(xORoption);
            } else {
                _scrollTo(xORoption, y);
            }
        };
        setInterval(() => {
            $("a.image img[data-file-width], a.image img[data-file-height], .mw-mmv-filepage-buttons a.mw-mmv-view-expanded").not(".multimediaViewerScrollSet").each((_, ele) => {
                ele.addEventListener("click", (e) => {
                    if ($(e.target).closest(".TabLabelText")[0] || $(e.target).closest("a").closest(".mw-customtoggle")[0]) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        $($(e.target).closest(".TabLabelText")[0] || $(e.target).closest("a").closest(".mw-customtoggle")[0]).trigger("click");
                        return false;
                    }
                    flag = true;
                }, {
                    capture: true,
                });
                $(ele).addClass("multimediaViewerScrollSet");
            });
            if (document.querySelector(".mw-mmv-close")) {
                if (mw.config.get("wgMultimediaViewerInjected") !== "on") {
                    mw.config.set("wgMultimediaViewerInjected", "on");
                    $(".mw-mmv-image").off("click")[0].addEventListener("click", (e) => {
                        if ($(e.target).is("img")) {
                            window.open($(e.target).attr("src").replace(/(img\.moegirl\.org\.cn\/common\/)thumb\/([a-z\d]+\/[a-z\d]+\/)([^/]+)\/\d+px-\3/i, "$1$2$3"), "_blank").focus();
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            return false;
                        } else if ($(e.target).closest(".error-box")[0]) {
                            return;
                        }
                        $(".mw-mmv-close").trigger("click");
                    }, {
                        capture: true,
                    });
                }
            } else if (mw.config.get("wgMultimediaViewerInjected") === "on") {
                flag = false;
                mw.config.set("wgMultimediaViewerInjected", "off");
            }
        }, 137);
    };
    // 跨站重定向页顶链接
    const crossDomainLink = (url) => {
        const link = url.query.title;
        const domain = url.host;
        const crossDomain = $("<div/>");
        const anchor = $("<a/>");
        crossDomain.text("＜");
        anchor.attr("href", `${url}`).text(`${link} 【来自 ${domain} 的跨站重定向】`);
        crossDomain.append(anchor);
        $("#contentSub").prepend(crossDomain);
    };
    const crossDomainLinkMoeskin = (url) => {
        const link = url.query.title;
        const domain = url.host;
        const crossDomain = $("<div/>");
        const anchor = $("<a/>");
        crossDomain.html('<span class="moe-icon"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 512"><path d="M31.7 239l136-136c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9L127.9 256l96.4 96.4c9.4 9.4 9.4 24.6 0 33.9L201.7 409c-9.4 9.4-24.6 9.4-33.9 0l-136-136c-9.5-9.4-9.5-24.6-.1-34z" fill="currentColor"></path></svg></span>');
        anchor.attr("href", `${url}`).text(`${link} 【来自 ${domain} 的跨站重定向】`);
        crossDomain.append(anchor);
        $("#tagline").after(crossDomain);
    };
    // 复制修改内容
    const copyRights = async () => {
        await mw.loader.using("mediawiki.util");
        const div = $("<div>", {
                css: {
                    position: "absolute",
                    left: "-99999px",
                    "z-index": "-99999",
                },
                html: `<pre></pre><br>\n阅读更多：${/%/.test(mw.util.wikiUrlencode(wgPageName)) ? `${wgPageName}（${wgServer}${wgScriptPath}/${encodeURIComponent(wgPageName)} ）` : `${wgServer}${wgScriptPath}/${wgPageName}`}<br>\n本文引自萌娘百科(${wgServer.replace(/^\/\//, "https://")} )，文字内容默认使用《知识共享 署名-非商业性使用-相同方式共享 3.0 中国大陆》协议。`,
            }).appendTo("body"),
            valueNode = div.find("pre");
        $("#mw-content-text").on("copy", () => {
            const selection = window.getSelection(),
                value = selection.toString(),
                range = selection.getRangeAt(0);
            if (!value.length || value.length < 128 // 当复制内容为空或长度小于定值时不添加声明
                || $(selection.anchorNode).add(selection.basenode).add(selection.focusNode).closest(".Wikiplus-InterBox")[0]) { // 如果选中了wikiplus的内容
                return;
            }
            valueNode.text(value);
            /* if (e.originalEvent.clipboardData && e.originalEvent.clipboardData.setData) {
                e.originalEvent.clipboardData.setData("text/plain", div.text());
                e.originalEvent.clipboardData.setData("text/html", div.html());
            } else { */
            selection.selectAllChildren(div[0]);
            window.setTimeout(() => { // 以下将还原选区
                selection.removeAllRanges();
                selection.addRange(range);
                valueNode.empty();
            }, 0);
            // }
        });
    };
    // 页顶活动通知
    const noticeActivityClose = async () => {
        const noticeActivity = $("body").children("#content, #app").find("#notice-activity");
        const isMoeskin = skin === "moeskin";
        const styles = skin === "moeskin"
            ? {
                visible: {
                    "user-select": "none",
                    "text-align": "center",
                    "box-sizing": "inherit",
                    background: "none",
                    margin: "0",
                    border: "0",
                    font: "inherit",
                    "vertical-align": "baseline",
                    "text-decoration": "none",
                    position: "absolute",
                    top: ".2rem",
                    color: "#fff",
                    "background-color": "#00000080",
                    "border-radius": "99em",
                    padding: ".1rem .5rem",
                    "line-height": "1.5",
                    right: ".2rem",
                    "z-index": "999999",
                    cursor: "pointer",
                },
                hidden: {
                    top: "-0.8rem",
                },
            }
            : {
                visible: {
                    position: "absolute",
                    right: "1rem",
                    top: "50%",
                    transform: "translate(0,-50%)",
                    fontSize: "1rem",
                },
                hidden: {
                    transform: "translate(0,0)",
                },
            };
        if (noticeActivity.length > 0) {
            await mw.loader.using(["user.options"]);
            if (+mw.user.options.get("gadget-noticeActivity") === 1) {
                // noticeActivity.hide();
                // return;
            }
            const topNoticeId = noticeActivity.data("topNoticeId");
            const container = isMoeskin ? noticeActivity.parent() : noticeActivity;
            container.css("position", "relative");
            const children = container.children();
            const button = $("<span>");
            button.css(styles.visible);
            const link = $("<a>");
            link.attr({
                href: "javascript:void(0);",
            }).text("隐藏活动通知");
            button.append(link);
            if (!isMoeskin) {
                button.prepend("[").append(link).append("]");
            } else {
                link.css({
                    color: "white",
                });
            }
            container.append(button);
            let status = true;
            link.on("click", () => {
                if (status) {
                    status = false;
                    children.hide();
                    noticeActivity.css({
                        height: "0px",
                    });
                    container.css({
                        overflow: "visible",
                        "background-color": "transparent",
                    });
                    button.css(styles.hidden);
                    localStorage.setItem("AnnTools-notice-activity", topNoticeId);
                    link.text("显示活动通知");
                } else {
                    status = true;
                    children.show();
                    noticeActivity.css({
                        height: "auto",
                    });
                    container.css({
                        overflow: "visible",
                        "background-color": isMoeskin ? "var(--theme-card-background-color)" : "transparent",
                    });
                    button.css(styles.visible);
                    localStorage.removeItem("AnnTools-notice-activity");
                    link.text("隐藏活动通知");
                }
            });
            const localStorageValue = localStorage.getItem("AnnTools-notice-activity");
            if (localStorageValue === topNoticeId) {
                link.trigger("click");
            }
        }
    };
    // 页顶通知
    const parseLocalStorageItemAsArray = (key) => {
        try {
            const result = JSON.parse(localStorage.getItem(key));
            return Array.isArray(result) ? result : [];
        } catch {
            return [];
        }
    };
    const topNoticeScroll = async () => {
        const siteNotice = $("body.skin-vector-2022 > #content > #siteNotice, body.skin-moeskin > #app > #moe-full-container > #moe-main-container > main > #moe-global-sidenav #moe-sidenav-sitenotice");
        const noticeType = {
            pinnedAnnouncement: "置顶公告",
            newAnnouncement: "7日内新公告",
            discussing: "新的讨论中提案、申请",
            voting: "新的投票中提案、申请",
            voted: "新的已投票结束提案、申请",
        };
        const newNotices = [];
        Object.keys(noticeType).forEach((type) => {
            const id = type;
            const links = siteNotice.find(`#topNotice-${type}`).find("a");
            const existLinks = parseLocalStorageItemAsArray(`AnnTools-top-notice-exist-${id}`);
            const currentLinks = [];
            const newLinks = [];
            links.each((_, link) => {
                const { href } = link;
                const text = link.text.trim();
                currentLinks.push(href);
                if (!existLinks.includes(href)) {
                    newLinks.push({
                        href: href,
                        text: text,
                    });
                }
            });
            localStorage.setItem(`AnnTools-top-notice-exist-${id}`, JSON.stringify(currentLinks));
            if (newLinks.length > 0) {
                newNotices.push({
                    type: noticeType[id],
                    links: newLinks,
                });
            }
        });
        if (newNotices.length > 0) {
            $("#mw-notification-area").appendTo("body");
            const notification = $("<dl>");
            newNotices.forEach((newNotice) => {
                notification.append(`<dt class="mw-parser-output" style="font-weight: 400;">${newNotice.type}：</dt>`);
                const dd = $("<dd>");
                const ul = $("<ul>");
                dd.css("marginLeft", ".9em");
                newNotice.links.forEach((link) => {
                    const li = $("<li>");
                    const a = $("<a>");
                    a.attr({
                        href: link.href,
                        target: "_blank",
                        "class": "external",
                    }).text(link.text);
                    a.appendTo(li);
                    li.appendTo(ul);
                });
                ul.appendTo(dd);
                dd.appendTo(notification);
            });
            notification.find("a").on("click", (e) => {
                e.stopImmediatePropagation();
                e.stopPropagation();
            });
            await mw.loader.using(["mediawiki.notification", "mediawiki.notify"]);
            mw.notify(notification, {
                autoHide: false,
                title: "有新的站务通知（点击通知空白处关闭）",
            });
        }
    };
    // 跨站重定向页顶链接
    const crossDomainDetect = async () => {
        await mw.loader.using(["mediawiki.Uri"]);
        const { rdfrom } = new mw.Uri().query;
        if (rdfrom) {
            const rdfromUri = new mw.Uri(rdfrom);
            if (!rdfromUri.host.includes([104, 109, 111, 101].map((n) => String.fromCharCode(n)).join(""))) {
                const { query } = rdfromUri;
                if (query.title && query.redirect === "no") {
                    if (skin === "moeskin") {
                        crossDomainLinkMoeskin(rdfromUri);
                    } else {
                        crossDomainLink(rdfromUri);
                    }
                }
            }
        }
    };
    // 修复用户页左侧栏头像链接
    const leftPanelAvatarLink = async () => {
        await mw.loader.using(["mediawiki.Uri"]);
        $("#t-viewavatar > a").each((_, ele) => {
            const uri = new mw.Uri(ele.href);
            uri.host = uri.host.replace("zh.moegirl", "commons.moegirl");
            ele.href = uri;
        });
    };
    // 修正hash跳转错误
    const hashJump = async () => {
        await mw.loader.using(["jquery.makeCollapsible"]);
        $(".mw-collapsible").makeCollapsible();
        const { hash } = location;
        location.hash = "";
        location.hash = hash;
    };
    /* 函数执行体 */
    await $.ready;
    // Extension:MultimediaViewer的半透明化修改
    multimediaViewer();
    // Add "mainpage" class to the body element
    if (wgMainPageTitle === wgPageName && wgAction === "view") {
        $("body").addClass("mainpage");
    }
    // 复制内容版权声明
    if (window.getSelection && !allowedInGroup && !["edit", "submit"].includes(wgAction) && copyRightsNameSpaces.includes(wgNamespaceNumber)) {
        copyRights();
    }
    // 修复代码编辑器$.ucFirst引用错误
    $.extend({
        ucFirst: (_s) => {
            const s = `${_s}`;
            return s.charAt(0).toUpperCase() + s.substring(1);
        },
    });
    // 注释内列表
    $(".reference-text > ul,.reference-text > ol").each((_, ele) => {
        if (ele.parentElement.childNodes[0] === ele) {
            $(ele).addClass("listInRef");
        }
    });
    // 修正hash跳转错误
    if ($(".mw-collapsible")[0] && location.hash !== "") {
        hashJump();
    }
    noticeActivityClose();
    // 跨站重定向页顶链接
    crossDomainDetect();
    // 修复用户页左侧栏头像链接
    leftPanelAvatarLink();
    if (wgUserGroups.includes("user")) {
        topNoticeScroll();
    }
    // 禁止移动被挂删的页面
    if (!allowedInGroup && $(".will2Be2Deleted")[0]) {
        $("#ca-move").remove();
    }
    // 修正navbar、T:User中编辑链接从zh/mzh跳转到其他
    if (["mzh.moegirl.org.cn", "zh.moegirl.org.cn"].includes(wgServerName)) {
        $('a.external.text[href$="&action=edit"], .plainlinks.userlink .external').each((_, ele) => {
            const $ele = $(ele);
            $ele.attr("href", $ele.attr("href").replace(/(?:mobile|mzh|zh)\.moegirl\.org\.cn/, wgServerName));
        });
    }
    // 以下代码必须在全部内容加载完成后才能正常工作
    $(window).on("load", () => {
        // 语言对应
        $(".mw-helplink").each((_, ele) => {
            if (!ele.href.endsWith("/zh")) {
                ele.href += "/zh";
            }
        });
    });
})();
// </nowiki>
