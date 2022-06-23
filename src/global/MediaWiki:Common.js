// <nowiki>
/* 这里的任何JavaScript将在全站加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:Common.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0
 *  loader模块 写法参见 https://www.mediawiki.org/wiki/ResourceLoader/Modules#mw.loader.load
 */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable prefer-rest-params */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload, wgULS */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
(function (mw) {
    /* capture支持检测 */
    var captureSupported = false;
    try {
        var options = Object.defineProperty({}, "capture", {
            get: function () {
                captureSupported = true;
                return true;
            },
        });
        window.addEventListener("test", null, options);
    } catch (err) { /* */ }
    /* 函数定义体 */
    /* 检查是否为维护组成员 */
    var wgUserGroups = mw.config.get("wgUserGroups");
    var isMGPMGUser = wgUserGroups.includes("patroller") || wgUserGroups.includes("sysop");
    /* 滚动公告 */
    function startScroll() {
        $("body > #content > #siteNotice .scrollDiv:not(.scrolling)").addClass("scrolling").each(function (_, ele) {
            var self = $(ele);
            self.children().each(function (_, child) {
                if (child.innerHTML.trim() === "") {
                    child.remove();
                }
            });
            var children = self.children();
            if (children.length === 0) {
                return;
            }
            var firstChild = children.first();
            var firstChildHeight = firstChild.outerHeight();
            self.height(firstChildHeight);
            children.slice(1).css("top", Math.ceil(firstChildHeight) + "px");
            firstChild.css("top", "0");
        });
    }
    function autoScroll() {
        setInterval(function () {
            if (!document.hidden) {
                $("body > #content > #siteNotice .scrollDiv.scrolling").each(function (_, ele) {
                    var self = $(ele);
                    if (self.css("font-weight") === 700) {
                        return;
                    }
                    var children = self.children();
                    var all = self.add(children);
                    if (children.length === 1) {
                        return;
                    }
                    var firstChild = children.first();
                    var firstChildHeight = firstChild.outerHeight();
                    var secondChild = firstChild.next();
                    var secondChildHeight = secondChild.outerHeight();
                    var otherChild = children.slice(2);
                    var maxHeight = Math.max(firstChildHeight, secondChildHeight);
                    otherChild.each(function (_, child) {
                        maxHeight = Math.max(maxHeight, $(child).outerHeight());
                    });
                    all.addClass("animation");
                    self.height(maxHeight);
                    firstChild.css("top", "-" + firstChildHeight + "px");
                    secondChild.css("top", (maxHeight - secondChildHeight) / 2 + "px");
                    otherChild.css("top", Math.ceil(maxHeight) + "px");
                    setTimeout(function () {
                        all.removeClass("animation");
                        firstChild.appendTo(self).css("top", Math.ceil(maxHeight));
                    }, 400);
                });
            }
        }, 5000);
    }
    /* MediaViewer#populateStatsFromXhr 错误屏蔽 */
    var getResponseHeader = XMLHttpRequest.prototype.getResponseHeader;
    XMLHttpRequest.prototype.getResponseHeader = function (name) {
        return ("\n" + this.getAllResponseHeaders().toLowerCase()).includes("\n" + name.toLowerCase() + ": ") ? getResponseHeader.call(this, name) : (console.debug('Refused to get unsafe header "' + name + '"\n', this, "\n", new Error().stack), null);
    };
    // Extension:MultimediaViewer的半透明化修改，用于保持背景文字处于原位，本应修改插件达成的，暂时先用JavaScript应急处理下
    function multimediaViewer() {
        var _scrollTo = window.scrollTo;
        var flag = location.hash.startsWith("#/media/");
        window.scrollTo = function scrollTo(x_option, y) {
            if (flag) {
                console.info("Prevent multimediaViewer called");
            } else {
                if (y === undefined) { _scrollTo(x_option); } else { _scrollTo(x_option, y); }
            }
        };
        setInterval(function () {
            $("a.image img[data-file-width], a.image img[data-file-height], .mw-mmv-filepage-buttons a.mw-mmv-view-expanded").not(".multimediaViewerScrollSet").each(function () {
                this.addEventListener("click", function (e) {
                    if ($(e.target).closest(".TabLabelText")[0] || $(e.target).closest("a").closest(".mw-customtoggle")[0]) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        $($(e.target).closest(".TabLabelText")[0] || $(e.target).closest("a").closest(".mw-customtoggle")[0]).click();
                        return false;
                    }
                    flag = true;
                }, captureSupported ? {
                    capture: true,
                } : true);
                $(this).addClass("multimediaViewerScrollSet");
            });
            if ($(".mw-mmv-close")[0]) {
                if (mw.config.get("wgMultimediaViewerInjected") !== "on") {
                    mw.config.set("wgMultimediaViewerInjected", "on");
                    $(".mw-mmv-image").off("click")[0].addEventListener("click", function (e) {
                        if ($(e.target).is("img")) {
                            window.open($(e.target).attr("src").replace(/(img\.moegirl\.org\.cn\/common\/)thumb\/([a-z\d]+\/[a-z\d]+\/)([^/]+)\/\d+px-\3/i, "$1$2$3"), "_blank").focus();
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            return false;
                        } else if ($(e.target).closest(".error-box")[0]) { return; }
                        $(".mw-mmv-close").click();
                    }, captureSupported ? {
                        capture: true,
                    } : true);
                }
            } else if (mw.config.get("wgMultimediaViewerInjected") === "on") {
                flag = false;
                mw.config.set("wgMultimediaViewerInjected", "off");
            }
        }, 137);
    }
    // 跨站重定向页顶链接
    function crossDomain_link() {
        var url = new mw.Uri(new mw.Uri().query.rdfrom);
        var link = url.query.title;
        var domain = url.host;
        var crossDomain = $("<div/>");
        var anchor = $("<a/>");
        crossDomain.text("＜");
        anchor.attr("href", url + "").text(link + "【来自 " + domain + "】的跨站重定向");
        crossDomain.append(anchor);
        $("#contentSub").prepend(crossDomain);
    }
    function crossDomain_link_moeskin() {
        var url = new mw.Uri(new mw.Uri().query.rdfrom);
        var link = url.query.title;
        var domain = url.host;
        var crossDomain = $("<div/>");
        var anchor = $("<a/>");
        crossDomain.html('<span class="xicon"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 512"><path d="M31.7 239l136-136c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9L127.9 256l96.4 96.4c9.4 9.4 9.4 24.6 0 33.9L201.7 409c-9.4 9.4-24.6 9.4-33.9 0l-136-136c-9.5-9.4-9.5-24.6-.1-34z" fill="currentColor"></path></svg></span>');
        anchor.attr("href", url + "").text(link + "【来自 " + domain + "】的跨站重定向");
        crossDomain.append(anchor);
        $("#tagline").after(crossDomain);
    }
    // 复制修改内容
    function copyRights() {
        var div =
            $("<div>", {
                css: {
                    position: "absolute",
                    left: "-99999px",
                    "z-index": "-99999",
                },
                html: "<pre></pre><br>\n阅读更多：" + (/%/.test(mw.util.wikiUrlencode(mw.config.get("wgPageName"))) ? mw.config.get("wgPageName") + "（" + mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/" + encodeURIComponent(mw.config.get("wgPageName")) + " ）" : mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/" + mw.config.get("wgPageName")) + "<br>\n本文引自萌娘百科(" + mw.config.get("wgServer").replace(/^\/\//, "https://") + " )，文字内容默认使用《知识共享 署名-非商业性使用-相同方式共享 3.0》协议。",
            }).appendTo("body"),
            valueNode = div.find("pre");
        $("#mw-content-text").on("copy", function () {
            var selection = window.getSelection(),
                value = selection.toString(),
                range = selection.getRangeAt(0);
            if (!value.length || value.length < 128 || //当复制内容为空或长度小于定值时不添加声明
                $(selection.anchorNode).add(selection.basenode).add(selection.focusNode).closest(".Wikiplus-InterBox")[0]) //如果选中了wikiplus的内容
            { return; }
            valueNode.text(value);
            /* if (e.originalEvent.clipboardData && e.originalEvent.clipboardData.setData) {
                e.originalEvent.clipboardData.setData("text/plain", div.text());
                e.originalEvent.clipboardData.setData("text/html", div.html());
            } else { */
            selection.selectAllChildren(div[0]);
            window.setTimeout(function () { //以下将还原选区
                selection.removeAllRanges();
                selection.addRange(range);
                valueNode.empty();
            }, 0);
            // }
        });
    }
    // 页顶活动通知
    function noticeActivityClose() {
        var noticeActivity = $("body > #content #notice-activity");
        if (noticeActivity.length > 0) {
            if (+mw.user.options.get("gadget-noticeActivity") === 1) {
                noticeActivity.hide();
                return;
            }
            var topNoticeId = noticeActivity.data("topNoticeId");
            noticeActivity.css("position", "relative");
            var children = noticeActivity.children();
            var button = $("<span>");
            button.css({
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translate(0,-50%)",
                fontSize: "1rem"
            });
            var link = $("<a>");
            link.attr({
                href: "javascript:void(0);",
            }).text("隐藏活动通知");
            button.append("[").append(link).append("]");
            noticeActivity.append(button);
            var status = true;
            link.on("click", function () {
                if (status) {
                    status = false;
                    children.hide();
                    noticeActivity.css({
                        height: "0px",
                        overflow: "visible"
                    });
                    button.css("transform", "translate(0,0)");
                    localStorage.setItem("AnnTools-notice-activity", topNoticeId);
                    link.text("显示活动通知");
                } else {
                    status = true;
                    children.show();
                    noticeActivity.css({
                        height: "auto",
                        overflow: "visible"
                    });
                    button.css("transform", "translate(0,-50%)");
                    localStorage.removeItem("AnnTools-notice-activity");
                    link.text("隐藏活动通知");
                }
            });
            var localStorageValue = localStorage.getItem("AnnTools-notice-activity");
            if (localStorageValue === topNoticeId) {
                link.trigger("click");
            }
        }
    }
    // 页顶通知
    function parseLocalStorageItemAsArray(key) {
        try {
            var result = JSON.parse(localStorage.getItem(key));
            return Array.isArray(result) ? result : [];
        } catch (_) {
            return [];
        }
    }
    function topNoticeScroll() {
        var siteNotice = $("body.skin-vector > #content > #siteNotice, body.skin-moeskin > #app > #moe-full-container > #moe-main-container > main > #moe-global-sidenav #moe-sidenav-sitenotice");
        var noticeType = {
            newAnnouncement: "7日内新公告",
            discussing: "新的讨论中提案、申请",
            voting: "新的投票中提案、申请",
            voted: "新的已投票结束提案、申请"
        };
        var newNotices = [];
        Object.keys(noticeType).map(function (type) {
            return {
                id: type,
                ele: siteNotice.find("#topNotice-" + type)[0],
            };
        }).forEach(function (notice) {
            var id = notice.id;
            var links = $(notice.ele).find("a");
            var existLinks = parseLocalStorageItemAsArray("AnnTools-top-notice-exist-" + id);
            var currentLinks = [];
            var newLinks = [];
            links.each(function (_, link) {
                var href = link.href;
                var text = link.text.trim();
                currentLinks.push(href);
                if (!existLinks.includes(href)) {
                    newLinks.push({
                        href: href,
                        text: text,
                    });
                }
            });
            localStorage.setItem("AnnTools-top-notice-exist-" + id, JSON.stringify(currentLinks));
            if (newLinks.length > 0) {
                newNotices.push({
                    type: noticeType[id],
                    links: newLinks
                });
            }
        });
        if (newNotices.length > 0) {
            $("#mw-notification-area").appendTo("body");
            var notification = $("<dl>");
            newNotices.forEach(function (newNotice) {
                notification.append('<dt style="font-weight: 400;">' + newNotice.type + "：</dt>");
                var dd = $("<dd>");
                var ul = $("<ul>");
                ul.addClass("mw-parser-output");
                newNotice.links.forEach(function (link) {
                    var li = $("<li>");
                    var a = $("<a>");
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
            notification.find("a").on("click", function (e) {
                e.stopImmediatePropagation();
                e.stopPropagation();
            });
            mw.notify(notification, {
                autoHide: false,
                title: "有新的站务通知（点击通知空白处关闭）"
            });
        }
    }
    /* 函数执行体 */
    $(function () {
        var copyRightsNameSpaces = [ // 以下为允许添加版权声明的名字空间列表
            0, // （主）
            4, // 萌娘百科
            8, // MediaWiki
            10, // Template
            12, // Help
            274, //Widget
            828, //Module
        ];
        // 滚动公告
        startScroll();
        autoScroll();
        // Extension:MultimediaViewer的半透明化修改
        multimediaViewer();
        // Add "mainpage" class to the body element
        if (mw.config.get("wgMainPageTitle") === mw.config.get("wgPageName") && mw.config.get("wgAction") === "view") { $("body").addClass("mainpage"); }
        // 需要时载入对应的 scripts
        if (["edit", "submit"].includes(mw.config.get("wgAction"))) { mw.loader.load("/index.php?title=MediaWiki:Common.js/edit.js&action=raw&ctype=text/javascript"); }
        mw.loader.using("mediawiki.Uri").then(function () {
            // 跨站重定向页顶链接
            var rdfrom = new mw.Uri().query.rdfrom;
            if (rdfrom) {
                var query = new mw.Uri(rdfrom).query;
                if (query.title && query.redirect === "no") {
                    if (mw.config.get("skin") === "moeskin") {
                        crossDomain_link_moeskin();
                    } else {
                        crossDomain_link();
                    }
                }
            }
            // 修复用户页左侧栏头像链接
            $("#t-viewavatar > a").each(function (_, ele) {
                var uri = new mw.Uri(ele.href);
                uri.host = uri.host.replace("zh.moegirl", "commons.moegirl");
                ele.href = uri;
            });
        });
        // 复制内容版权声明
        if (window.getSelection && !isMGPMGUser && !["edit", "submit"].includes(mw.config.get("wgAction")) && copyRightsNameSpaces.includes(mw.config.get("wgNamespaceNumber"))) { copyRights(); }
        // 修复代码编辑器$.ucFirst引用错误
        $.extend({
            ucFirst: function (_s) {
                var s = _s + "";
                return s.charAt(0).toUpperCase() + s.substring(1);
            },
        });
        // 注释内列表
        $(".reference-text > ul,.reference-text > ol").each(function () {
            if (this.parentElement.childNodes[0] === this) {
                $(this).addClass("listInRef");
            }
        });
        // 修正hash跳转错误
        if ($(".mw-collapsible")[0] && location.hash !== "") {
            mw.loader.using("jquery.makeCollapsible", function () {
                $(".mw-collapsible").makeCollapsible();
                var hash = location.hash;
                location.hash = "";
                location.hash = hash;
            });
        }
        // 以下代码必须在全部内容加载完成后才能正常工作
        $(window).on("load", function () {
            // 语言对应
            $(".mw-helplink").each(function () {
                var linkHref = this.href;
                if (linkHref.indexOf("/zh") !== linkHref.length - 3) { this.href += "/zh"; }
            });
        });
        mw.loader.using(["user.options"]).then(noticeActivityClose);
        if (wgUserGroups.includes("user")) {
            mw.loader.using(["mediawiki.notification", "mediawiki.notify"]).then(topNoticeScroll);
        }
    });
})(mediaWiki);
// </nowiki>