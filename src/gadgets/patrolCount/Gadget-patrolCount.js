/* eslint-disable no-use-before-define */
// <pre>
/**
   Author: ZUO Haocheng from ZHWikipedia
   URL:https://zh.wikipedia.org/w/index.php?title=User:Zuohaocheng/patrollCount.js
   为代码能适用做出了适当修改
*/
"use strict";
$(() => {
    // 在此修改监视的命名空间
    const namespaceWatched = [
        // 将你  想监视的命名空间前面去掉 //
        // 将你不想监视的命名空间前面加上 //

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
    const apiPrefix = `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/api.php`;
    const newPageMax = 50;
    const writeCountNum = (pages, plus) => {
        let strCount = "";
        let page;
        if (pages.length !== 0) {
            const vNum = Math.round(Math.random() * (pages.length - 1));
            page = pages[vNum];
            const link = `${encodeURIComponent(page.title)}&redirect=no&rcid=${page.rcid}`;
            strCount = pages.length.toString();
            if (plus) {
                strCount += "+";
            }
            let { title } = page;
            if (!page.confidence) {
                title += '" class="patrollListNotConfident';
            }
            strCount = `(<a id="unpatrollArticle" href="${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?title=${link}" title="${title}">${strCount}</a>)`;
            ptPatrollLink.attr("href", `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?title=Special:最新页面&hidepatrolled=1`);
        } else {
            ptPatrollLink.attr("href", `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?title=Special:最新页面&hidepatrolled=0`);
        }
        $("span#not-patrolled-count").html(strCount);
        generateList(pages);
        return page;
    };
    let showAllUnbind = [];
    let showAll = false;
    const prepareList = (pages, countMax) => {
        const $list = $("#patrollTooltipList").empty();
        const addItem = (istart, iend) => {
            for (let idx = istart; idx < iend; ++idx) {
                const page = pages[idx];
                const link = `${encodeURIComponent(page.title)}&redirect=no&rcid=${page.rcid}`;
                let shortTitle = page.title;
                if (shortTitle.length > 8) {
                    shortTitle = `${shortTitle.slice(0, 7)}...`;
                }
                const item = $("<li></li>").html(`<a href="${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?title=${link}" title="${page.title}">${shortTitle}</a>`).appendTo($list);
                if (!page.confidence) {
                    item.addClass("patrollListNotConfident");
                }
            }
        };
        const { length } = pages;
        if (length > countMax && !showAll) {
            addItem(0, countMax);
            let $showAll = $("#patrollListShowAll");
            if ($showAll.length === 0) {
                $showAll = $("<div></div>", {
                    id: "patrollListShowAll",
                }).css({
                    "text-align": "right",
                    "font-weight": "bold",
                    "margin-bottom": "10px",
                }).append($("<a></a>", {
                    text: "更多……",
                    href: "#patrollListShowAll",
                    title: wgULS("显示所有未巡查页面", "顯示所有未巡查的頁面"),
                }));
                $list.after($showAll);
            } else {
                $showAll.show();
            }
            $showAll.off("click");
            $showAll.on("click", () => {
                addItem(countMax, length);
                $showAll.hide();
                for (let idx = 0; idx < showAllUnbind.length; ++idx) {
                    showAllUnbind[idx].off("mouseover.autohide mouseout");
                }
                showAll = true;
            });
        } else {
            addItem(0, pages.length);
        }
    };
    const loadCvtooltip = () => {
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
        (($) => {
            $.fn.cvtooltip = function (options) {
                const self = $(this);
                const defaults = {
                    panel: "body", // 该参数是加载气泡提示的容器，值不同可能会导致计算的位置不同，默认为添加至body容器
                    selector: "", // 用于计算定位的控件
                    width: 0, // 气泡提示宽度，完全手动设置
                    left: 0, // 距离panel参数的左边距
                    top: 0, // 距离panel参数的上边距
                    delay: -1, // 延迟关闭，单位毫秒，值为0时表示立刻关闭
                    speed: 600, // 关闭时的效果，淡出速度
                    close: true, // 是否显示关闭按钮
                    callback: () => {
                        $.noop(); // 点击关闭后的事件
                    },
                };
                const param = $.extend({}, defaults, options || {});
                const controlID = self.attr("ID");
                // 气泡样式
                const cvToolTipCssBtm = "position: absolute; border-color: transparent transparent #A7D7F9 transparent; border-style: dashed dashed solid dashed; border-width: 7px 7px 7px 7px; width: 0; overflow: hidden; right:40px; top:-17px;";
                const cvToolTipCssTop = "position: absolute; border-color: transparent transparent #A7D7F9 transparent; border-style: dashed dashed solid dashed; border-width: 7px 7px 7px 7px; width: 0; overflow: hidden; right:40px; top:-17px;";
                let cvToolTipCss = `z-index:713; display:none; position: absolute; border: 3px solid #A7D7F9; background-color: #F3F3F3; line-height:14px; border-radius: 10px; right:${param.left}px; top:${param.top}px;`;
                if (param.width !== 0) {
                    cvToolTipCss += `width: ${param.width}px;`;
                }
                // 气泡显示
                if (!document.getElementById(`${controlID}Body`)) {
                    const cvTipsElement = $("<div>");
                    cvTipsElement.attr({
                        id: `${controlID}Body`,
                        "class": "cvToolTip",
                        style: cvToolTipCss,
                    });
                    const cvTipsElementBtm = $("<span>");
                    cvTipsElementBtm.attr("style", cvToolTipCssBtm);
                    cvTipsElement.append(cvTipsElementBtm);
                    const cvTipsElementTop = $("<span>");
                    cvTipsElementTop.attr("style", cvToolTipCssTop);
                    cvTipsElement.append(cvTipsElementTop);
                    const cvTipsElementContent = $("<span>");
                    cvTipsElementContent.attr("id", `${controlID}Content`);
                    cvTipsElementContent.css("float", "left");
                    cvTipsElement.append(cvTipsElementContent);
                    if (param.close) {
                        const cvTipsElementClose = $("<a>");
                        cvTipsElementClose.attr("id", `${controlID}Close`);
                        cvTipsElementClose.css("display", "none");
                        cvTipsElementClose.html('<span style="float:right; font-family:verdana; position: absolute; top:1px; right:5px; font-size:12px; cursor:pointer;">x</span>');
                        cvTipsElement.append(cvTipsElementClose);
                    }
                    $(param.panel).append(cvTipsElement);
                }
                // 气泡容器、装载内容的容器
                const cttBody = $(document.getElementById(`${controlID}Body`));
                const cttContent = $(document.getElementById(`${controlID}Content`));
                const cttClose = $(document.getElementById(`${controlID}Close`));
                cttBody.show();
                const ctt = {
                    body: cttBody,
                    content: () => {
                        self.show();
                        return self;
                    },
                    position: () => {
                        const p = $(param.selector).position();
                        cttBody.css({
                            top: p.top + param.top,
                            left: p.left + param.left,
                        });
                    },
                    hide: () => {
                        cttClose.hide();
                        cttBody.off();
                        cttContent.slideUp(param.speed, () => {
                            ctt.content().hide().appendTo($(param.panel));
                            cttBody.remove();
                        });
                        param.callback();
                    },
                    timer: null,
                    show: () => {
                        if (cttContent.html() === "") {
                            cttContent.append(ctt.content()).css("height", `${cttContent[0].scrollHeight}px`).hide().slideDown(param.speed, () => {
                                cttContent.css("height", "");
                                cttBody.on({
                                    mouseover: () => {
                                        cttClose.show();
                                    },
                                    mouseout: () => {
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
    let ttListShow = false;
    const generateList = (pages) => {
        if (ttListShow) {
            prepareList(pages, 10);
        } else {
            let timer = null;
            // Why, Wikipedians, why
            // var $ptPatroll = $("#pt-patroll").off("mouseover mouseover.autohide mouseout");
            const $ptPatroll = $("#pt-patroll").off("mouseover.autohide mouseout");
            $ptPatroll.on("mouseover", () => {
                if (timer) {
                    return;
                }
                timer = setTimeout(() => {
                    timer = null;
                    if (pages.length !== 0 && !ttListShow) {
                        if (typeof $.fn.cvtooltip === "undefined") {
                            loadCvtooltip();
                        }
                        prepareList(pages, 10);
                        ttListShow = true;
                        const ctt = $("#patrollTooltip").cvtooltip({
                            left: $(window).width() - ($("#pt-patroll").offset().left + $("#pt-patroll").outerWidth()),
                            top: $("#pt-patroll").offset().top + $("#pt-patroll").height() + 10,
                            callback: () => {
                                ttListShow = false;
                                showAll = false;
                                $ptPatroll.off("mouseover.autohide mouseout");
                            },
                        });
                        let tipCloseTimer;
                        const clearHideTimer = () => {
                            if (tipCloseTimer) {
                                clearTimeout(tipCloseTimer);
                                tipCloseTimer = null;
                            }
                        };
                        ctt.body.on("mouseover.autohide", clearHideTimer);
                        $ptPatroll.on("mouseover.autohide", clearHideTimer);
                        const setHideTimer = () => {
                            if (!tipCloseTimer) {
                                tipCloseTimer = setTimeout(ctt.hide, 1000);
                            }
                        };
                        ctt.body.on("mouseout", setHideTimer);
                        $ptPatroll.on("mouseout", setHideTimer);
                        showAllUnbind = [ctt.body, $ptPatroll];
                    }
                }, 500);
                $ptPatroll.on("mouseout", () => {
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                });
            });
        }
    };
    const missingPage = {};
    const checkMissing = (pages, plus) => {
        const missingQuery = [];
        for (let idx = pages.length - 1; idx >= 0; idx--) {
            const { title } = pages[idx];
            if (typeof title === "undefined") {
                continue;
            }
            const isMissing = missingPage[title];
            if (typeof isMissing === "undefined") {
                missingQuery.push(title);
            } else if (isMissing) {
                pages.splice(idx, 1);
            }
        }
        // 查询删除状态
        if (missingQuery.length !== 0) {
            const pagesStr = missingQuery.join("|");
            const checkMissingURI = `${apiPrefix}?action=query&format=xml&prop=info`;
            $.post(checkMissingURI, {
                titles: pagesStr,
            }, (result) => {
                let regenerate = false;
                $(result).find("pages page").each(function () {
                    const $this = $(this);
                    const isMissing = typeof $this.attr("missing") !== "undefined";
                    const title = $this.attr("title");
                    missingPage[title] = isMissing;
                    if (isMissing) {
                        for (let idx = pages.length - 1; idx >= 0; idx--) {
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
    const addPatrollLink = (() => {
        let checked = false;
        const addlink = (page) => {
            let $patrollinks = $("<a></a>", {
                href: `index.php?title=${encodeURIComponent(page.title)}&rcid=${encodeURIComponent(page.rcid)}`,
                text: wgULS("标记此页面为已巡查", "標記此頁面為已巡查"),
            });
            const $divPatrolllink = $("<div></div>", {
                "class": "patrollink",
            }).append("[").append($patrollinks).append("]");
            $("div.printfooter").before($divPatrolllink);
            const markAsPatrol = (e) => {
                e.preventDefault();
                const data = {
                    rcid: page.rcid,
                    token: page.rctoken,
                };
                const uri = `${apiPrefix}?format=xml&action=patrol`;
                $patrollinks.text("Marking as patrolled...");
                $patrollinks = $patrollinks.parent();
                // eslint-disable-next-line no-unused-vars
                $.post(uri, data, (data, status) => {
                    // window.data = [data, status, request]; // DEBUG
                    if (status === "success") {
                        $patrollinks.html('<span style="color:green">Marked as patrolled</span>'); // MediaWiki:Markedaspatrolled
                        // eslint-disable-next-line camelcase
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
        return (pages) => {
            if (!checked && $("div.patrollink").length === 0) {
                const pageName = mw.config.get("wgPageName");
                for (let idx = 0; idx < pages.length; ++idx) {
                    const page = pages[idx];
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
    const namespaceList = mw.config.get("wgNamespaceIds");
    const namespaceWatchList = namespaceWatched.map((i) => namespaceList[i === "(main)" ? "" : i]);
    let lastRequest = 0;
    const updateUnpatrolled = () => {
        const d = new Date();
        if (d - lastRequest < 10000) {
            return;
        }
        // console.log(`[petrolCount] Updating unpatrolled... (${d.toLocaleString()})`);
        lastRequest = d;
        const requestid = d.getTime();
        const newPages = `${apiPrefix}?action=query&format=xml&list=recentchanges&rctype=new&rcnamespace=${namespaceWatchList.join("|")}&rcshow=!redirect|!patrolled&meta=tokens&type=patrol&rcprop=title|ids|user|tags`;
        $.get(newPages, {
            rclimit: newPageMax,
            requestid: requestid,
        }, (result) => {
            const pages = [];
            const jqResult = $(result);
            jqResult.find("rc").each(function () {
                const $self = $(this);
                const confidence = typeof $self.attr("anon") === "undefined" && $self.find("tag").length === 0;
                const t = {
                    title: $self.attr("title"),
                    rcid: $self.attr("rcid"),
                    rctoken: jqResult.find("tokens"),
                    confidence: confidence,
                };
                pages.push(t);
            });
            addPatrollLink(pages);
            const plus = jqResult.find("query-continue").length !== 0;
            if (pages.length !== 0) {
                checkMissing(pages, plus);
            }
            writeCountNum(pages, plus);
        });
    };
    // setInterval(updateUnpatrolled, 60000);
    updateUnpatrolled();
    // 在"监视列表"右边加入"最新页面"以便巡查
    const ptPatrollLink = $("<a></a>", {
        href: "Special:最新页面?hidepatrolled=1",
        title: wgULS("最新页面", "最新頁面"),
        text: wgULS("最新页面", "最新頁面"),
    });
    $("#pt-watchlist-2").after($("<li></li>", {
        id: "pt-patroll",
    }).append(ptPatrollLink).append($("<span></span>", {
        id: "not-patrolled-count",
    })));
    $("#pt-patroll").on("mouseover", updateUnpatrolled);
});
// </pre>
