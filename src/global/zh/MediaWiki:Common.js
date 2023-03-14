// <nowiki>
/* 这里的任何JavaScript将在全站加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:Common.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0 中国大陆
 *  loader模块 写法参见 https://www.mediawiki.org/wiki/ResourceLoader/Modules#mw.loader.load
 */
"use strict";
(async () => {
    /* 函数定义体 */
    /* 以下为允许添加版权声明的名字空间列表 */
    const copyRightsNameSpaces = [
        0, // （主）
        4, // 萌娘百科
        8, // MediaWiki
        10, // Template
        12, // Help
        274, //Widget
        828, //Module
    ];
    /* 检查是否为维护组成员 */
    const wgUserGroups = mw.config.get("wgUserGroups");
    const isMGPMGUser = wgUserGroups.includes("patroller") || wgUserGroups.includes("sysop");
    /* 滚动公告 */
    function startScroll() {
        $("body > #content > #siteNotice .scrollDiv:not(.scrolling), #moe-sitenotice-container > .moe-sitenotice .scrollDiv:not(.scrolling)").addClass("scrolling").each((_, ele) => {
            const self = $(ele);
            self.children().each((_, child) => {
                if (child.innerHTML.trim() === "") {
                    child.remove();
                }
            });
            const children = self.children();
            if (children.length === 0) {
                return;
            }
            const firstChild = children.first();
            const firstChildHeight = firstChild.outerHeight();
            self.height(firstChildHeight);
            children.slice(1).css("top", `${Math.ceil(firstChildHeight)}px`);
            firstChild.css("top", "0");
        });
    }
    function autoScroll() {
        setInterval(() => {
            if (!document.hidden) {
                $("body > #content > #siteNotice .scrollDiv.scrolling, #moe-sitenotice-container > .moe-sitenotice .scrollDiv.scrolling").each((_, ele) => {
                    const self = $(ele);
                    if (self.css("font-weight") === "700") {
                        return;
                    }
                    const children = self.children();
                    const all = self.add(children);
                    if (children.length === 1) {
                        return;
                    }
                    const firstChild = children.first();
                    const firstChildHeight = firstChild.outerHeight();
                    const secondChild = firstChild.next();
                    const secondChildHeight = secondChild.outerHeight();
                    const otherChild = children.slice(2);
                    let maxHeight = Math.max(firstChildHeight, secondChildHeight);
                    otherChild.each((_, child) => {
                        maxHeight = Math.max(maxHeight, $(child).outerHeight());
                    });
                    all.addClass("animation");
                    self.height(maxHeight);
                    firstChild.css("top", `-${firstChildHeight}px`);
                    secondChild.css("top", `${(maxHeight - secondChildHeight) / 2}px`);
                    otherChild.css("top", `${Math.ceil(maxHeight)}px`);
                    setTimeout(() => {
                        all.removeClass("animation");
                        firstChild.appendTo(self).css("top", Math.ceil(maxHeight));
                    }, 400);
                });
            }
        }, 5000);
    }
    /* MediaViewer#populateStatsFromXhr 错误屏蔽 */
    const getResponseHeader = XMLHttpRequest.prototype.getResponseHeader;
    XMLHttpRequest.prototype.getResponseHeader = function (name) {
        return `\n${this.getAllResponseHeaders().toLowerCase()}`.includes(`\n${name.toLowerCase()}: `) ? getResponseHeader.bind(this)(name) : (console.info(`Refused to get unsafe header "${name}"\n`, this, "\n", new Error().stack), null);
    };
    // Extension:MultimediaViewer的半透明化修改，用于保持背景文字处于原位，本应修改插件达成的，暂时先用JavaScript应急处理下
    function multimediaViewer() {
        const _scrollTo = window.scrollTo;
        let flag = location.hash.startsWith("#/media/");
        window.scrollTo = function scrollTo(x_option, y) {
            if (flag) {
                console.info("Prevent multimediaViewer called");
            } else if (y === undefined) {
                _scrollTo(x_option);
            } else {
                _scrollTo(x_option, y);
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
    }
    // 跨站重定向页顶链接
    function crossDomain_link(url) {
        const link = url.query.title;
        const domain = url.host;
        const crossDomain = $("<div/>");
        const anchor = $("<a/>");
        crossDomain.text("＜");
        anchor.attr("href", `${url}`).text(`${link} 【来自 ${domain} 的跨站重定向】`);
        crossDomain.append(anchor);
        $("#contentSub").prepend(crossDomain);
    }
    function crossDomain_link_moeskin(url) {
        const link = url.query.title;
        const domain = url.host;
        const crossDomain = $("<div/>");
        const anchor = $("<a/>");
        crossDomain.html('<span class="xicon"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 512"><path d="M31.7 239l136-136c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9L127.9 256l96.4 96.4c9.4 9.4 9.4 24.6 0 33.9L201.7 409c-9.4 9.4-24.6 9.4-33.9 0l-136-136c-9.5-9.4-9.5-24.6-.1-34z" fill="currentColor"></path></svg></span>');
        anchor.attr("href", `${url}`).text(`${link} 【来自 ${domain} 的跨站重定向】`);
        crossDomain.append(anchor);
        $("#tagline").after(crossDomain);
    }
    // 复制修改内容
    async function copyRights() {
        await mw.loader.using("mediawiki.util");
        const div =
            $("<div>", {
                css: {
                    position: "absolute",
                    left: "-99999px",
                    "z-index": "-99999",
                },
                html: `<pre></pre><br>\n阅读更多：${/%/.test(mw.util.wikiUrlencode(mw.config.get("wgPageName"))) ? `${mw.config.get("wgPageName")}（${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/${encodeURIComponent(mw.config.get("wgPageName"))} ）` : `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/${mw.config.get("wgPageName")}`}<br>\n本文引自萌娘百科(${mw.config.get("wgServer").replace(/^\/\//, "https://")} )，文字内容默认使用《知识共享 署名-非商业性使用-相同方式共享 3.0 中国大陆》协议。`,
            }).appendTo("body"),
            valueNode = div.find("pre");
        $("#mw-content-text").on("copy", () => {
            const selection = window.getSelection(),
                value = selection.toString(),
                range = selection.getRangeAt(0);
            if (!value.length || value.length < 128 || //当复制内容为空或长度小于定值时不添加声明
                $(selection.anchorNode).add(selection.basenode).add(selection.focusNode).closest(".Wikiplus-InterBox")[0]) { //如果选中了wikiplus的内容
                return;
            }
            valueNode.text(value);
            /* if (e.originalEvent.clipboardData && e.originalEvent.clipboardData.setData) {
                e.originalEvent.clipboardData.setData("text/plain", div.text());
                e.originalEvent.clipboardData.setData("text/html", div.html());
            } else { */
            selection.selectAllChildren(div[0]);
            window.setTimeout(() => { //以下将还原选区
                selection.removeAllRanges();
                selection.addRange(range);
                valueNode.empty();
            }, 0);
            // }
        });
    }
    // 页顶活动通知
    async function noticeActivityClose() {
        const noticeActivity = $("body").children("#content, #app").find("#notice-activity");
        const isMoeskin = mw.config.get("skin") === "moeskin";
        const styles = mw.config.get("skin") === "moeskin" ? {
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
        } : {
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
    }
    // 页顶通知
    function parseLocalStorageItemAsArray(key) {
        try {
            const result = JSON.parse(localStorage.getItem(key));
            return Array.isArray(result) ? result : [];
        } catch {
            return [];
        }
    }
    async function topNoticeScroll() {
        const siteNotice = $("body.skin-vector > #content > #siteNotice, body.skin-moeskin > #app > #moe-full-container > #moe-main-container > main > #moe-global-sidenav #moe-sidenav-sitenotice");
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
                const href = link.href;
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
    }
    // 跨站重定向页顶链接
    async function crossDomainDetect() {
        await mw.loader.using(["mediawiki.Uri"]);
        const rdfrom = new mw.Uri().query.rdfrom;
        if (rdfrom) {
            const rdfromUri = new mw.Uri(rdfrom);
            if (!rdfromUri.host.includes([104, 109, 111, 101].map((n) => String.fromCharCode(n)).join(""))) {
                const query = rdfromUri.query;
                if (query.title && query.redirect === "no") {
                    if (mw.config.get("skin") === "moeskin") {
                        crossDomain_link_moeskin(rdfromUri);
                    } else {
                        crossDomain_link(rdfromUri);
                    }
                }
            }
        }
    }
    // 修复用户页左侧栏头像链接
    async function leftPanelAvatarLink() {
        await mw.loader.using(["mediawiki.Uri"]);
        $("#t-viewavatar > a").each((_, ele) => {
            const uri = new mw.Uri(ele.href);
            uri.host = uri.host.replace("zh.moegirl", "commons.moegirl");
            ele.href = uri;
        });
    }
    // 修正hash跳转错误
    async function hashJump() {
        await mw.loader.using(["jquery.makeCollapsible"]);
        $(".mw-collapsible").makeCollapsible();
        const hash = location.hash;
        location.hash = "";
        location.hash = hash;
    }
    /* 函数执行体 */
    await $.ready;
    // 滚动公告
    startScroll();
    autoScroll();
    // Extension:MultimediaViewer的半透明化修改
    multimediaViewer();
    // Add "mainpage" class to the body element
    if (mw.config.get("wgMainPageTitle") === mw.config.get("wgPageName") && mw.config.get("wgAction") === "view") {
        $("body").addClass("mainpage");
    }
    // 复制内容版权声明
    if (window.getSelection && !isMGPMGUser && !["edit", "submit"].includes(mw.config.get("wgAction")) && copyRightsNameSpaces.includes(mw.config.get("wgNamespaceNumber"))) {
        copyRights();
    }
    // 修复代码编辑器$.ucFirst引用错误
    $.extend({
        ucFirst: function (_s) {
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
