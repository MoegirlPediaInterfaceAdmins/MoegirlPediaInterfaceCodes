/* 这里的任何JavaScript将只在移动端加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:Common.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0
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
// <pre>
(function ($, mw) {
    function wgUXS(wg, hans, hant, cn, tw, hk, sg, zh, mo, my) {
        var ret = {
            zh: zh || hans || hant || cn || tw || hk || sg || mo || my,
            "zh-hans": hans || cn || sg || my,
            "zh-hant": hant || tw || hk || mo,
            "zh-cn": cn || hans || sg || my,
            "zh-sg": sg || hans || cn || my,
            "zh-tw": tw || hant || hk || mo,
            "zh-hk": hk || hant || mo || tw,
            "zh-mo": mo || hant || hk || tw,
        };
        return ret[wg] || zh || hans || hant || cn || tw || hk || sg || mo || my; //保證每一語言有值
    }
    function wgULS(hans, hant, cn, tw, hk, sg, zh, mo, my) {
        return wgUXS(mw.config.get("wgUserLanguage"), hans, hant, cn, tw, hk, sg, zh, mo, my);
    }
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
    //用户资料页相关
    function isUserProfile() {
        return mw.config.get("wgCanonicalSpecialPageName") === "UserProfile" && mw.config.get("wgArticleId") === "0";
    }
    //页顶提示模板相关
    function commonBoxs() {
        if (window.mw && !!mw.config.get("wgNamespaceNumber")) {
            return;
        }
        var contentParent = $("#mw-content-text")[0] ? $("#mw-content-text") : $("#content"), commonBoxes = contentParent.find(".common-box");
        if (!commonBoxes[0]) {
            return;
        }
        var commonBoxContainer = $('<div id="commonBoxContainer"><div id="commonBoxInfo"></div></div>').prependTo(contentParent), commonBoxList = $('<div id="commonBoxList"></div>').appendTo("#commonBoxInfo");
        commonBoxes.each(function () {
            var commonBoxButton = $('<div class="commonBoxButton"></div>').appendTo(commonBoxList), commonBox = $(this);
            commonBoxButton.data("element", commonBox).css({
                "border-color": commonBox.css("border-left-color"),
                "background-image": "url(" + commonBox.find("tbody > tr > td:first-child img").prop("src") + ")",
            }).on("click", function () {
                if (commonBox.is(":visible")[0]) {
                    commonBoxes.hide();
                    $(this).add($(this).siblings()).removeClass("current");
                    commonBoxList.removeClass("open");
                } else {
                    commonBoxes.filter(":visible").not(commonBox).hide();
                    commonBox.show();
                    $(this).toggleClass("current", commonBox.is(":visible")).siblings().removeClass("current");
                    commonBoxList.toggleClass("open", commonBox.is(":visible"));
                }
            });
        }).appendTo(commonBoxContainer).hide();
    }
    //uuid
    function uuidv4() {
        var result;
        do {
            result = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
                return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
            });
        } while (document.querySelector('a[data-linkid="' + result + '"]'));
        return result;
    }
    //链接提示
    function linkConfirm() {
        mw.loader.using("mediawiki.Uri").then(function () {
            if ($("body").css("position") === "static") {
                $("body").css("position", "relative");
            }
            var prompt = $("<div/>").attr("class", "linkConfirmprompt");
            prompt.css("max-width", $("#mw-content-text").width() - 4);
            var textnode = $("<div/>").attr("class", "linkConfirmpromptTextnode");
            var text = $("<span/>");
            textnode.append(text);
            var check = window.CSS && CSS.supports && CSS.supports("-webkit-line-clamp", "2") ? (function () {
                text.css({
                    display: "-webkit-box",
                    "-webkit-line-clamp": "2",
                    "-webkit-box-orient": "vertical",
                    "word-break": "break-all",
                    "text-overflow": "ellipsis",
                    overflow: "hidden",
                });
                return $.noop;
            })() : function (text) {
                if (text.height() > 44.8) {
                    text.text(text.text() + "……");
                    while (text.height() > 44.8) {
                        text.text(text.text().slice(0, -3) + "……");
                    }
                }
            };
            prompt.append(wgULS("您点击了一个链接，地址为：", "您點擊了一條連結，網址為："))
                .append(textnode)
                .append($("<div/>").attr("class", "linkConfirmpromptAlert").append(wgULS("此网页不属于本网站，不保证其安全性", "該網頁不屬於本網站，不保證其安全性")).hide());
            prompt.append($("<a/>").text(wgULS("继续访问", "繼續前往")).on("click", function () {
                //window.open(prompt.data('href'), '_blank', "noopener,noreferrer");
                window.open("javascript:window.name;", '<script>location.replace("' + prompt.data("href") + '");/* ' + Math.random() + " */</script>");
            })).append($("<a/>").text("取消")).on("click", function (e) {
                if (!$(e.target).is("a")) {
                    return false;
                }
                prompt.fadeOut(137);
            });
            prompt.appendTo("body");
            $("body").on("click", function (e) {
                var self = $(e.target);
                if (!self.is("#mw-content-text a, .comment-text a")) {
                    return;
                }
                if (!e.target.href || /^javascript:/.test(e.target.href) || $(e.target).is(".image")) {
                    return true;
                }
                if (!e.target.dataset.linkid) {
                    e.target.dataset.linkid = uuidv4();
                }
                if (prompt.is(":visible") && prompt.data("linkid") === e.target.dataset.linkid) {
                    return false;
                }
                prompt.fadeOut(137);
                var uri = new mw.Uri(e.target.href);
                if (/\.moegirl\.org(?:\.cn)?$/.test(uri.host)) {
                    if (!self.closest(".heimu")[0] && !self.find(".heimu")[0] || self.parent().is(".reference")) {
                        return true;
                    }
                    text.text(decodeURI(e.target.href));
                    $(".linkConfirmpromptAlert").hide();
                } else {
                    text.text(decodeURI(e.target.href));
                    $(".linkConfirmpromptAlert").show();
                }
                var promptTop = 0, promptLeft = 0;
                var offsetParent = self;
                do {
                    promptTop += offsetParent.offset().top;
                    promptLeft += offsetParent.offset().left;
                    offsetParent = offsetParent.offsetParent();
                } while (!offsetParent.is("html, body"));
                promptTop += self.outerHeight() + 3;
                promptLeft += self.outerWidth() / 2 - prompt.outerWidth() / 2;
                if (promptTop + prompt.outerHeight() > $(document).height() - 3) {
                    promptTop = $(document).height() - prompt.outerHeight() - 3;
                }
                if (promptLeft + prompt.outerWidth() > $(window).width() - 3) {
                    promptLeft = $(window).width() - prompt.outerWidth() - 3;
                }
                if (promptLeft < 0) {
                    promptLeft = 3;
                }
                prompt.css({
                    top: promptTop + "px",
                    left: promptLeft + "px",
                });
                window.setTimeout(check, 0, text);
                prompt.data({
                    href: e.target.href,
                    linkid: self[0].dataset.linkid,
                });
                prompt.fadeIn(137);
                return false;
            });
        });
    }
    //来自搜索引擎的访问默认跳转zh版
    function searchReferrerJump() {
        if (/\/\/www.(?:google|baidu|bing).com\//.test(document.referrer)) {
            var mobileTags = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPod"];
            if (!/\sVR\s/g.test(navigator.userAgent)) {
                for (var i = 0, l = mobileTags.length; i < l; i++) {
                    if (navigator.userAgent.includes(mobileTags[i])) {
                        return;
                    }
                }
                var toggleLink = document.querySelector("#mw-mf-display-toggle");
                window.location.replace(toggleLink.href);
            }
        }
    }
    //移动版编辑界面强制跳转
    function mobileEdit() {
        $(window).on("hashchange", function () {
            var hash = location.hash;
            if (/^#\/editor\/(?:new|\d+)$/.test(hash)) {
                var url = new URL(location.href);
                url.hash = "";
                url.searchParams.set("action", "edit");
                url.searchParams.set("section", hash.match(/^#\/editor\/(new|\d+)$/)[1]);
                location.replace(url, "_self");
            } else if (/^#\/talk\/(?:new|\d+)$/.test(hash)) {
                var url2 = new URL(location.href);
                var curNsid = mw.config.get("wgNamespaceNumber");
                var talkNsid = Math.floor(curNsid / 2) * 2 + 1;
                var wgNamespaceIds = mw.config.get("wgNamespaceIds");
                var wgNamespaceNames = Object.keys(wgNamespaceIds);
                var talkNsName;
                for (var i in wgNamespaceNames) {
                    var nsName = wgNamespaceNames[i];
                    if (wgNamespaceIds[nsName] === talkNsid) {
                        talkNsName = nsName;
                        break;
                    }
                }
                url2.hash = "";
                url2.pathname = "index.php";
                url2.searchParams.set("title", talkNsName + ":" + mw.config.get("wgTitle"));
                url2.searchParams.set("action", "edit");
                url2.searchParams.set("section", hash.match(/^#\/talk\/(new|\d+)$/)[1]);
                location.replace(url2, "_self");
            }
        });
    }
    //特定系统消息返回 jQuery
    function patchMwMsg() {
        var msgNames = ["mobile-frontend-editor-blocked-info-loggedin"];
        mw.msg = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var msgName = args[0];
            if (msgNames.includes(msgName)) {
                var message = mw.messages.get(msgName);
                args.forEach(function (arg, index) {
                    if (index === 0) {
                        return;
                    }
                    message = message.replace(RegExp("\\$" + index, "g"), arg);
                });
                return $("<div>").html(message);
            }
            return mw.message.apply(mw.message, args).toString();
        };
    }
    //侧边栏
    function mobilesidebar() {
        var oouiIcon = function (icon, title) {
            return new OO.ui.IconWidget({ icon: icon, title: title }).$element.prop("outerHTML");
        };
        var oouiIndicator = function () {
            return new OO.ui.IndicatorWidget({ indicator: "down" }).$element.prop("outerHTML");
        };
        var generateMenuLi = function (_a) {
            var href = _a.href, text = _a.text, iconName = _a.iconName, className = _a.className;
            return "<li " + (className ? "class=" + className : "") + '><a href="' + href + '" class="mw-ui-icon">' + (iconName ? oouiIcon(iconName, text) : "") + text + (className === "mobilesidebar-caption" ? oouiIndicator() : "") + "</a></li>";
        };
        var mobilesidebartimer = setInterval(function () {
            if ($(".menu ul").length > 0 && $(".mobilesidebar-level1").length === 0) {
                clearInterval(mobilesidebartimer);
                mw.loader.addStyleTag(".mobilesidebar-caption { transition: .5s ease-in-out all; } .mobilesidebar-caption.active { box-shadow: inset 4px 0 0 0 #3366cc; text-decoration: none; } nav ul li.mobilesidebar-caption a { box-shadow: none; padding-right: 12px; } .mw-special-MobileMenu .navigation-drawer { position: static; } .mobilesidebar-level1 .oo-ui-iconElement, .mobilesidebar-level1 .oo-ui-indicatorElement { filter: invert(34%) sepia(4%) saturate(703%) hue-rotate(164deg) brightness(96%) contrast(91%); } .mobilesidebar-level1 .oo-ui-iconElement { width: 1.5em; height: 1.5em; margin-right: 1em; font-size: 16px; } .mobilesidebar-level1 .oo-ui-indicatorElement { float: right; }");
                $(".menu > ul:not(.hlist)").last().before([
                    '<ul class="mobilesidebar-level1" id="mobilesidebar-navigation">',
                    generateMenuLi({ href: "#", text: wgULS("导航工具", "導覽工具"), iconName: "mapPin", className: "mobilesidebar-caption" }),
                    '<ul class="mobilesidebar-level2" style="padding-bottom:0px">',
                    generateMenuLi({ href: "/Special:Recentchanges", iconName: "recentChanges", text: wgULS("最近更改", "近期變更") }),
                    generateMenuLi({ href: "/Special:Newpages", iconName: "viewDetails", text: wgULS("最新页面", "最新頁面"), className: "patroller-show" }),
                    generateMenuLi({ href: "/cm:Special:新建文件", iconName: "imageGallery", text: wgULS("最新文件", "最新檔案") }),
                    generateMenuLi({ href: "/萌娘百科_talk:讨论版", iconName: "speechBubbles", text: wgULS("讨论版", "討論版") }),
                    generateMenuLi({ href: "/Category:积压工作", iconName: "viewCompact", text: wgULS("积压工作", "積壓工作"), className: "patroller-show" }),
                    "</ul>",
                    "</ul>",
                    '<ul class="mobilesidebar-level1" id="mobilesidebar-help">',
                    generateMenuLi({ href: "#", text: wgULS("帮助文档", "說明文件"), iconName: "journal", className: "mobilesidebar-caption" }),
                    '<ul class="mobilesidebar-level2" style="padding-bottom:0px">',
                    generateMenuLi({ href: "/Help:沙盒", iconName: "sandbox", text: "沙盒" }),
                    generateMenuLi({ href: "/Help:Wiki入门", iconName: "keyboard", text: wgULS("Wiki入门", "Wiki入門") }),
                    generateMenuLi({ href: "/Help:萌百编辑简明指南/欢迎", iconName: "lightbulb", text: wgULS("编辑简明指南", "萌百編輯教程") }),
                    generateMenuLi({ href: "/萌娘百科:编辑规范", iconName: "articleCheck", text: wgULS("萌百编辑规范", "萌百編輯規範") }),
                    generateMenuLi({ href: "/Template:萌娘百科政策文件", iconName: "unStar", text: "萌百政策文件" }),
                    generateMenuLi({ href: "/萌娘百科:常见问题与解答", iconName: "help", text: "FAQ" }),
                    "</ul>",
                    "</ul>",
                    '<ul class="mobilesidebar-level1" id="mobilesidebar-categoryindex">',
                    generateMenuLi({ href: "#", text: wgULS("分类索引", "分類索引"), iconName: "search", className: "mobilesidebar-caption" }),
                    '<ul class="mobilesidebar-level2" style="padding-bottom:0px">',
                    generateMenuLi({ href: "/Category:作品", iconName: "doubleChevronEnd", text: "作品" }),
                    generateMenuLi({ href: "/Category:人物", iconName: "doubleChevronEnd", text: "人物" }),
                    generateMenuLi({ href: "/Category:组织", iconName: "doubleChevronEnd", text: wgULS("组织", "組織") }),
                    generateMenuLi({ href: "/Category:概念用语", iconName: "doubleChevronEnd", text: wgULS("概念用语", "概念用語") }),
                    generateMenuLi({ href: "/Category:设定", iconName: "doubleChevronEnd", text: wgULS("设定", "設定") }),
                    generateMenuLi({ href: "/Category:软件", iconName: "doubleChevronEnd", text: wgULS("软件", "軟體") }),
                    generateMenuLi({ href: "/Category:活动", iconName: "doubleChevronEnd", text: wgULS("活动", "活動") }),
                    "</ul>",
                    "</ul>",
                ].join(""));
                //用户页面则在页面工具后插入用户工具
                var wgNamespaceNumber = mw.config.get("wgNamespaceNumber");
                if ([2, 3].includes(wgNamespaceNumber)) {
                    var userName = mw.util.wikiUrlencode(mw.config.get("wgTitle").split("/")[0]);
                    $(".menu > ul:not(.hlist)").last().before([
                        '<ul class="mobilesidebar-level1" id="mobilesidebar-userpage">',
                        generateMenuLi({ href: "#", text: wgULS("用户工具", "使用者工具", null, null, "用戶工具"), iconName: "userAdd", className: "mobilesidebar-caption" }),
                        '<ul class="mobilesidebar-level2" style="padding-bottom:0px">',
                        generateMenuLi({ href: "/User_talk:" + userName, iconName: "userTalk", text: wgULS("讨论页", "對話頁", null, null, "討論頁") }),
                        generateMenuLi({ href: "/Special:Contributions/" + userName, iconName: "userContributions", text: wgULS("用户贡献", "使用者貢獻", null, null, "用戶貢獻") }),
                        generateMenuLi({ href: "/cm:Special:ViewAvatar/" + userName, iconName: "userAnonymous", text: wgULS("查看头像", "檢視頭像") }),
                        generateMenuLi({ href: "/Special:Block/" + userName, iconName: "block", text: wgULS("封禁用户", "封鎖使用者", null, null, "封鎖用戶"), className: "patroller-show" }),
                        generateMenuLi({ href: "/Special:Userrights/" + userName, iconName: "userGroup", text: wgULS("用户权限", "使用者權限", null, null, "用戶權限") }),
                        generateMenuLi({ href: "/Special:Log/" + userName, iconName: "textFlow", text: wgULS("用户日志", "使用者日誌", null, null, "用戶日誌") }),
                        "</ul>",
                        "</ul>",
                    ].join(""));
                }
                //内容页面则在中间插入页面工具
                if (wgNamespaceNumber >= 0 && mw.config.get("wgUserGroups").includes("autoconfirmed")) {
                    var pageName = mw.util.wikiUrlencode(mw.config.get("wgPageName"));
                    $(".menu > ul:not(.hlist)").last().before([
                        '<ul class="mobilesidebar-level1" id="mobilesidebar-articlepage">',
                        generateMenuLi({ href: "#", text: wgULS("页面工具", "頁面工具"), iconName: "articles", className: "mobilesidebar-caption" }),
                        '<ul class="mobilesidebar-level2" style="padding-bottom:0px">',
                        generateMenuLi({ href: "/" + pageName + "?action=edit", iconName: "edit", text: wgULS("编辑全文", "編輯全文") }),
                        generateMenuLi({ href: "/Special:Movepage/" + pageName, iconName: "move", text: wgULS("移动页面", "移動頁面") }),
                        generateMenuLi({ href: "/cm:Special:Upload", iconName: "upload", text: wgULS("上传文件", "上傳檔案", null, null, "上載檔案") }),
                        generateMenuLi({ href: "/" + pageName + "?action=delete", iconName: "trash", text: wgULS("删除页面", "刪除頁面"), className: "sysop-show" }),
                        generateMenuLi({ href: "/" + pageName + "?action=protect", iconName: "lock", text: wgULS("保护页面", "保護頁面"), className: "sysop-show" }),
                        generateMenuLi({ href: "/Special:Whatlinkshere/" + pageName, iconName: "link", text: wgULS("链入页面", "連結至此的頁面") }),
                        generateMenuLi({ href: "/" + pageName + "?action=info", iconName: "infoFilled", text: wgULS("页面信息", "頁面資訊") }),
                        "</ul>",
                        "</ul>",
                    ].join("\n"));
                }
                // 登录用户插入参数设置
                if (mw.config.get("wgUserGroups").includes("user")) {
                    $(".menu > ul:not(.hlist)").last().prepend('<li><a href="/index.php?title=Special:Preferences" class="mw-ui-icon mw-ui-icon-before mw-ui-icon-minerva-settings">' + wgULS("参数设置", "偏好設定") + "</a></li>");
                }
                $(".menu .mobilesidebar-level2").hide();
                $(".mobilesidebar-caption").on("click", function (_a) {
                    _a.preventDefault();
                    var target = _a.target;
                    var $ele = $(target).closest(".mobilesidebar-level1");
                    $ele.find(".mobilesidebar-caption").toggleClass("active");
                    $ele.find(".oo-ui-indicatorElement").toggleClass("oo-ui-indicator-down").toggleClass("oo-ui-indicator-up");
                    $ele.find(".mobilesidebar-level2").slideToggle(500);
                });
            }
        }, 700);
    }
    /* 函数执行体 */
    $(function () {
        //来自搜索引擎的访问默认跳转zh版
        searchReferrerJump();
        //页顶提示模板相关
        commonBoxs();
        //用户资料页
        if (isUserProfile()) {
            var cardContainer = $(".card-container"), containerImage = cardContainer.find(".card"), containerImageFile = containerImage.find("a.image"), containerImageCaption = containerImage.find(".caption");
            containerImageCaption.css("padding", "0 8px");
            containerImageFile.before('<div id="#containerImage" class="listThumb list-thumb-placeholder" style="text-align: center;"><img src="https://img.moegirl.org.cn/common/a/a4/Placeholder-upload.png" style="height:32px" /></div>');
        }
        //黑幕
        $(".heimu a").on("click", function () {
            if (!$(this).closest(".heimu").is(":active, :focus")) {
                return false;
            }
        });
        //Template:hide
        if ($(".mw-collapsible")[0]) {
            mw.loader.using("jquery.makeCollapsible").then(function () {
                //console.debug('jquery.makeCollapsible is loaded.');
                $(".mw-collapsible").makeCollapsible();
            });
        }
        //链接提示
        linkConfirm();
        //移动版编辑界面强制跳转
        mobileEdit();
        //特定系统消息返回 jQuery
        patchMwMsg();
        mw.loader.using("mediawiki.Uri").then(function () {
            // 桌面版页面外链改为移动端域名
            document.body.addEventListener("click", function (e) {
                e.composedPath().forEach(function (ele) {
                    if (ele instanceof HTMLAnchorElement && ele.hasAttribute("href")) {
                        try {
                            var url = new mw.Uri(ele.href);
                            if (/^zh\.moegirl\.org(?:\.cn)?$/.test(url.host) && url.query.mobileaction !== "toggle_view_desktop") {
                                url.host = mw.config.get("wgServer").replace(/^(?:(?:https?:)?\/\/)?zh/, "mzh");
                                ele.href = url;
                            }
                        } catch (_) { }
                    }
                });
            }, captureSupported ? {
                capture: true,
            } : true);
        });
        // 最近更改点历史会跳view
        if (mw.config.get("wgCanonicalSpecialPageName") === "Recentchanges") {
            $(".mw-changeslist-history").attr("href", function (_, val) {
                return val.replace(/&curid=\d+/g, "");
            });
        }
        //侧边栏
        mw.loader.using([
            "oojs-ui-core",
            "oojs-ui.styles.icons-movement",
            "oojs-ui.styles.icons-moderation",
            "oojs-ui.styles.icons-editing-core",
            "oojs-ui.styles.icons-editing-advanced",
            "oojs-ui.styles.icons-location",
            "oojs-ui.styles.icons-user",
            "oojs-ui.styles.icons-layout",
            "ext.gadget.sidebaricons"
        ]).then(mobilesidebar);
        // 用以临时修复在移动端上AjaxPoll未加载代码块的问题，更新后需要去除
        if ($(".ajaxpoll").length > 0) {
            mw.loader.load("https://zh.moegirl.org.cn/load.php?modules=ext.ajaxpoll");
        }
        // 用以修复移动端切换语言菜单的bug
        document.querySelector("#mw-mf-viewport").addEventListener("click", function (e) {
            const $target = $(e.target);
            if ($target.closest(".suggested-languages").length === 0) {
                return;
            }
            const $a = $target.closest("a");
            if ($a.length > 0 && !$a.hasClass("encoded")) {
                $a.attr("href", $a.attr("href").replace(/%/g, "%25").replace(/\?/g, "%3F")).addClass("encoded");
            }
        }, {
            capture: true,
        });
    });
})(jQuery, mediaWiki); //立即执行匿名函数并传递原始变量
//</pre>