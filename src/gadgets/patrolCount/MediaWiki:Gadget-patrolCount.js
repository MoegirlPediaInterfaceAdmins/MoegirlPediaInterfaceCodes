/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload, wgULS */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
// <pre>
/**
   Author: ZUO Haocheng from ZHWikipedia
   URL:https://zh.wikipedia.org/w/index.php?title=User:Zuohaocheng/patrollCount.js
   为代码能适用做出了适当修改
*/
$(function () {
    if (mw.config.get("wgAction") !== "view") {
        return;
    }
    // 在此修改监视的名字空间
    var namespaceWatched = [
        // 将你  想监视的名字空间前面去掉 //
        // 将你不想监视的名字空间前面加上 //

        "(main)",
        // "talk",
        // "user",
        // "user_talk",
        // "萌娘百科",
        // "萌娘百科_talk",
        // "file",
        // "file_talk",
        // "mediawiki",
        // "mediawiki_talk",
        "template",
        // "template_talk",
        // "help",
        // "help_talk",
        // "category",
        // "category_talk",
        // "widget",
        // "widget_talk",
        // "timedtext",
        // "timedtext_talk",
        // "模块",
        // "模块讨论",
        // "gadget",
        // "gadget_talk",
        // "gadget_definition",
        // "gadget_definition_talk": false
    ];
    var apiPrefix = mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/api.php";
    var newPageMax = 50;
    var writeCountNum = function (pages, plus) {
        var strCount = "";
        if (pages.length !== 0) {
            var vNum = Math.round(Math.random() * (pages.length - 1));
            var page = pages[vNum];
            var link = encodeURIComponent(page.title) + "&redirect=no&rcid=" + page.rcid;
            strCount = pages.length.toString();
            if (plus) {
                strCount += "+";
            }
            var title = page.title;
            if (!page.confidence) {
                title += '" class="patrollListNotConfident';
            }
            strCount = '(<a id="unpatrollArticle" href="' + mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?title=" + link + '" title="' + title + '">' + strCount + "</a>)";
            ptPatrollLink.attr("href", mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?title=Special:最新页面&hidepatrolled=1");
        } else {
            ptPatrollLink.attr("href", mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?title=Special:最新页面&hidepatrolled=0");
        }
        $("span#not-patrolled-count").html(strCount);
        generateList(pages);
        return page;
    };
    var showAllUnbind = [];
    var showAll = false;
    var prepareList = function (pages, countMax) {
        var $list = $("#patrollTooltipList").empty();
        var addItem = function (istart, iend) {
            for (var idx = istart; idx < iend; ++idx) {
                var page = pages[idx];
                var link = encodeURIComponent(page.title) + "&redirect=no&rcid=" + page.rcid;
                var shortTitle = page.title;
                if (shortTitle.length > 8) {
                    shortTitle = shortTitle.slice(0, 7) + "...";
                }
                var item = $("<li></li>").html('<a href="' + mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?title=" + link + '" title="' + page.title + '">' + shortTitle + "</a>").appendTo($list);
                if (!page.confidence) {
                    item.addClass("patrollListNotConfident");
                }
            }
        };
        var length = pages.length;
        if (length > countMax && !showAll) {
            addItem(0, countMax);
            var $showAll = $("#patrollListShowAll");
            if ($showAll.length === 0) {
                $showAll = $("<div></div>", {
                    id: "patrollListShowAll",
                }).css({
                    "text-align": "right",
                    "font-weight": "bold",
                    "margin-bottom": "10px",
                }).append($("<a></a>", {
                    text: "more...",
                    href: "#patrollListShowAll",
                    title: "Show all unpatrolled articles",
                }));
                $list.after($showAll);
            } else {
                $showAll.show();
            }
            $showAll.off("click");
            $showAll.on("click", function () {
                addItem(countMax, length);
                $showAll.hide();
                for (var idx = 0; idx < showAllUnbind.length; ++idx) {
                    showAllUnbind[idx].off("mouseover.autohide mouseout");
                }
                showAll = true;
            });
        } else {
            addItem(0, pages.length);
        }
    };
    var loadCvtooltip = function () {
        $("body").append($("<div></div>", {
            id: "patrollTooltip",
            style: "display: none;",
        }).css({
            "font-size": "0.75em",
            "margin-right": "30px",
        }).append($("<ul></ul>", {
            id: "patrollTooltipList",
        })));
        /*
         * JQuery.cvtooltip.js
         * http://www.chinavalue.net
         *
         * J.Wang
         * http://0417.cnblogs.ocm
         *
         * 2010.11.17
         */
        (function ($) {
            $.fn.cvtooltip = function (options) {
                var self = $(this);
                var defaults = {
                    panel: "body", //该参数是加载气泡提示的容器，值不同可能会导致计算的位置不同，默认为添加至body容器
                    selector: "", //用于计算定位的控件
                    width: 0, //气泡提示宽度，完全手动设置
                    left: 0, //距离panel参数的左边距
                    top: 0, //距离panel参数的上边距
                    delay: -1, //延迟关闭，单位毫秒，值为0时表示立刻关闭
                    speed: 600, //关闭时的效果，淡出速度
                    close: true, //是否显示关闭按钮
                    callback: function () {
                        $.noop(); //点击关闭后的事件
                    },
                };
                var param = $.extend({}, defaults, options || {});
                var controlID = self.attr("ID");
                // 气泡样式
                var cvToolTipCssBtm = "position: absolute; border-color: transparent transparent #A7D7F9 transparent; border-style: dashed dashed solid dashed; border-width: 7px 7px 7px 7px; width: 0; overflow: hidden; right:40px; top:-17px;";
                var cvToolTipCssTop = "position: absolute; border-color: transparent transparent #A7D7F9 transparent; border-style: dashed dashed solid dashed; border-width: 7px 7px 7px 7px; width: 0; overflow: hidden; right:40px; top:-17px;";
                var cvToolTipCss = "z-index:713; display:none; position: absolute; border: 3px solid #A7D7F9; background-color: #F3F3F3; line-height:14px; border-radius: 10px; right:" + param.left + "px; top:" + param.top + "px;";
                if (param.width !== 0) {
                    cvToolTipCss += "width: " + param.width + "px;";
                }
                // 气泡显示
                if (!document.getElementById(controlID + "Body")) {
                    var cvTipsElement = $("<div>");
                    cvTipsElement.attr({
                        id: controlID + "Body",
                        "class": "cvToolTip",
                        style: cvToolTipCss,
                    });
                    var cvTipsElementBtm = $("<span>");
                    cvTipsElementBtm.attr("style", cvToolTipCssBtm);
                    cvTipsElement.append(cvTipsElementBtm);
                    var cvTipsElementTop = $("<span>");
                    cvTipsElementTop.attr("style", cvToolTipCssTop);
                    cvTipsElement.append(cvTipsElementTop);
                    var cvTipsElementContent = $("<span>");
                    cvTipsElementContent.attr("id", controlID + "Content");
                    cvTipsElementContent.css("float", "left");
                    cvTipsElement.append(cvTipsElementContent);
                    if (param.close) {
                        var cvTipsElementClose = $("<a>");
                        cvTipsElementClose.attr("id", controlID + "Close");
                        cvTipsElementClose.css("display", "none");
                        cvTipsElementClose.html('<span style="float:right; font-family:verdana; position: absolute; top:1px; right:5px; font-size:12px; cursor:pointer;">x</span>');
                        cvTipsElement.append(cvTipsElementClose);
                    }
                    $(param.panel).append(cvTipsElement);
                }
                // 气泡容器、装载内容的容器
                var cttBody = $(document.getElementById(controlID + "Body"));
                var cttContent = $(document.getElementById(controlID + "Content"));
                var cttClose = $(document.getElementById(controlID + "Close"));
                cttBody.show();
                var ctt = {
                    body: cttBody,
                    content: function () {
                        self.show();
                        return self;
                    },
                    position: function () {
                        var p = $(param.selector).position();
                        cttBody.css({
                            top: p.top + param.top,
                            left: p.left + param.left,
                        });
                    },
                    hide: function () {
                        cttClose.hide();
                        cttBody.off();
                        cttContent.slideUp(param.speed, function () {
                            ctt.content().hide().appendTo($(param.panel));
                            cttBody.remove();
                        });
                        param.callback();
                    },
                    timer: null,
                    show: function () {
                        if (cttContent.html() === "") {
                            cttContent.append(ctt.content()).css("height", cttContent[0].scrollHeight + "px").hide().slideDown(param.speed, function () {
                                cttContent.css("height", "");
                                cttBody.on({
                                    mouseover: function () {
                                        cttClose.show();
                                    },
                                    mouseout: function () {
                                        cttClose.hide();
                                    },
                                });
                            });
                        }
                        if (param.selector !== "") {
                            ctt.position();
                        }
                        if (param.delay >= 0) {
                            setTimeout(ctt.hide, param.delay);
                        }
                    },
                };
                ctt.show();
                // 关闭气泡
                cttClose.on("click", ctt.hide);
                return ctt;
            };
        })(jQuery);
    };
    var ttListShow = false;
    var generateList = function (pages) {
        if (ttListShow) {
            prepareList(pages, 10);
        } else {
            var timer = null;
            // Why, Wikipedians, why
            // var $ptPatroll = $("#pt-patroll").off("mouseover mouseover.autohide mouseout");
            var $ptPatroll = $("#pt-patroll").off("mouseover.autohide mouseout");
            $ptPatroll.on("mouseover", function () {
                if (timer) {
                    return;
                }
                timer = setTimeout(function () {
                    timer = null;
                    if (pages.length !== 0 && !ttListShow) {
                        if (typeof $.fn.cvtooltip === "undefined") {
                            loadCvtooltip();
                        }
                        prepareList(pages, 10);
                        ttListShow = true;
                        var ctt = $("#patrollTooltip").cvtooltip({
                            left: $(window).width() - ($("#pt-patroll").offset().left + $("#pt-patroll").outerWidth()),
                            top: $("#pt-patroll").offset().top + $("#pt-patroll").height() + 10,
                            callback: function () {
                                ttListShow = false;
                                showAll = false;
                                $ptPatroll.off("mouseover.autohide mouseout");
                            },
                        });
                        var tipCloseTimer;
                        var clearHideTimer = function () {
                            if (tipCloseTimer) {
                                clearTimeout(tipCloseTimer);
                                tipCloseTimer = null;
                            }
                        };
                        ctt.body.on("mouseover.autohide", clearHideTimer);
                        $ptPatroll.on("mouseover.autohide", clearHideTimer);
                        var setHideTimer = function () {
                            if (!tipCloseTimer) {
                                tipCloseTimer = setTimeout(ctt.hide, 1000);
                            }
                        };
                        ctt.body.on("mouseout", setHideTimer);
                        $ptPatroll.on("mouseout", setHideTimer);
                        showAllUnbind = [ctt.body, $ptPatroll];
                    }
                }, 500);
                $ptPatroll.on("mouseout", function () {
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                });
            });
        }
    };
    var missingPage = {};
    var checkMissing = function (pages, plus) {
        var missingQuery = [];
        for (var idx = 0; idx < pages.length; ++idx) {
            var title = pages[idx].title;
            if (typeof title === "undefined") {
                continue;
            }
            var isMissing = missingPage[title];
            if (typeof isMissing === "undefined") {
                missingQuery.push(title);
            } else if (isMissing) {
                pages.splice(idx, 1);
            }
        }
        // 查询删除状态
        if (missingQuery.length !== 0) {
            var pagesStr = missingQuery.join("|");
            var checkMissingURI = apiPrefix + "?action=query&format=xml&prop=info";
            $.post(checkMissingURI, {
                titles: pagesStr
            }, function (result) {
                var regenerate = false;
                $(result).find("pages page").each(function () {
                    var $this = $(this);
                    var isMissing = typeof $this.attr("missing") !== "undefined";
                    var title = $this.attr("title");
                    missingPage[title] = isMissing;
                    if (isMissing) {
                        for (var idx = 0; idx < pages.length; ++idx) {
                            if (pages[idx].title === title) {
                                pages.splice(idx, 1);
                                break;
                            }
                        }
                        if (title === $("#unpatrollArticle").attr("title")) {
                            regenerate = true;
                        }
                    }
                });
                if (regenerate) {
                    writeCountNum(pages, plus);
                }
            });
        }
    };
    // 加入标记巡查按钮
    var addPatrollLink = (function () {
        var checked = false;
        var addlink = function (page) {
            var $patrollinks = $("<a></a>", {
                href: "index.php?title=" + encodeURIComponent(page.title) + "&rcid=" + encodeURIComponent(page.rcid),
                text: "标记此页面为已巡查",
            });
            var $divPatrolllink = $("<div></div>", {
                "class": "patrollink",
            }).append("[").append($patrollinks).append("]");
            $("div.printfooter").before($divPatrolllink);
            var markAsPatrol = function (e) {
                e.preventDefault();
                var data = {
                    rcid: page.rcid,
                    token: page.rctoken,
                };
                var uri = apiPrefix + "?format=xml&action=patrol";
                $patrollinks.text("Marking as patrolled...");
                $patrollinks = $patrollinks.parent();
                $.post(uri, data, function (data, status) {
                    // window.data = [data, status, request]; // DEBUG
                    if (status === "success") {
                        $patrollinks.html('<span style="color:green">Marked as patrolled</span>'); // MediaWiki:Markedaspatrolled
                        if (typeof kAjaxPatrolLinks_closeafter !== "undefined" && window.kAjaxPatrolLinks_closeafter === true) {
                            window.close();
                            // Firefox 2+ doesn't allow closing normal windows. If we're still here, open up the selfclosing page.
                            window.open("http://toolserver.org/~krinkle/close.html", "_self");
                        }
                    } else {
                        $patrollinks.html('<span style="color:red">Cannot mark as patrolled</span>'); // MediaWiki:Markedaspatrollederror
                    }
                });
            };
            $patrollinks.on("click", markAsPatrol);
        };
        return function (pages) {
            if (!checked && $("div.patrollink").length === 0) {
                var pageName = mw.config.get("wgPageName");
                for (var idx = 0; idx < pages.length; ++idx) {
                    var page = pages[idx];
                    if (page.title === pageName) {
                        addlink(page);
                        break;
                    }
                }
                checked = true;
            }
        };
    })();
    // 定时抓取未巡查的页面数量
    // 新版本：仅当鼠标移动到巡查列表上、且距上次抓取时间超过10秒时才抓取
    var namespaceList = mw.config.get("wgNamespaceIds");
    var namespaceWatchList = namespaceWatched.map(function (i) {
        return namespaceList[i === "(main)" ? "" : i];
    });
    var lastRequest = 0;
    var updateUnpatrolled = function () {
        var d = new Date();
        if (d - lastRequest < 10000) {
            return;
        }
        // console.log(`[petrolCount] Updating unpatrolled... (${d.toLocaleString()})`);
        lastRequest = d;
        var requestid = d.getTime();
        var newPages = apiPrefix + "?action=query&format=xml&list=recentchanges&rctype=new&rcnamespace=" + namespaceWatchList.join("|") + "&rcshow=!redirect|!patrolled&rctoken=patrol&rcprop=title|ids|user|tags";
        $.get(newPages, {
            rclimit: newPageMax,
            requestid: requestid,
        }, function (result) {
            var pages = [];
            var jqResult = $(result);
            jqResult.find("rc").each(function () {
                var $self = $(this);
                var confidence = typeof $self.attr("anon") === "undefined" && $self.find("tag").length === 0;
                var t = {
                    title: $self.attr("title"),
                    rcid: $self.attr("rcid"),
                    rctoken: $self.attr("patroltoken"),
                    confidence: confidence,
                };
                pages.push(t);
            });
            addPatrollLink(pages);
            var plus = jqResult.find("query-continue").length !== 0;
            if (pages.length !== 0) {
                checkMissing(pages, plus);
            }
            writeCountNum(pages, plus);
        });
    };
    // setInterval(updateUnpatrolled, 60000);
    updateUnpatrolled();
    // 在"监视列表"右边加入"最新页面"以便巡查
    var ptPatrollLink = $("<a></a>", {
        href: "Special:最新页面?hidepatrolled=1",
        title: wgULS("最新页面", "最新頁面"),
        text: wgULS("最新页面", "最新頁面"),
    });
    $("body div#mw-head div#p-personal ul li#pt-watchlist").after($("<li></li>", {
        id: "pt-patroll",
    }).append(ptPatrollLink).append($("<span></span>", {
        id: "not-patrolled-count",
    })));
    $("#pt-patroll").on("mouseover", updateUnpatrolled);
});
// </pre>