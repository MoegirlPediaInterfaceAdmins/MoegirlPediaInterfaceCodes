/* eslint-disable no-use-before-define */
/**
   Author: ZUO Haocheng from ZHWikipedia
   URL:https://zh.wikipedia.org/w/index.php?title=User:Zuohaocheng/patrollCount.js
   为代码能适用做出了适当修改
*/
"use strict";
$(() => {
    // 在此修改监视的命名空间
    const namespaceWatched = [
        "(main)",
        "template",
        "draft",
        "creation",
        "document",
    ];
    const instanceRAF = new libRequestAnimationFrame.LibRequestAnimationFrame();
    const apiPrefix = `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/api.php`;
    const newPageMax = 50;
    const indexPrefix = `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php`;
    const writeCountNum = (pages, plus) => {
        const $count = $("span#not-patrolled-count").empty();
        let page;
        if (pages.length !== 0) {
            const vNum = Math.round(Math.random() * (pages.length - 1));
            page = pages[vNum];
            let strCount = pages.length.toString();
            if (plus) {
                strCount += "+";
            }
            const $link = $("<a>", {
                id: "unpatrollArticle",
                href: `${indexPrefix}?title=${encodeURIComponent(page.title)}&redirect=no&rcid=${page.rcid}`,
                title: page.title,
                text: strCount,
            });
            if (!page.confidence) {
                $link.addClass("patrollListNotConfident");
            }
            $count.append("(", $link, ")");
            ptPatrollLink.attr("href", "/Special:最新页面?hidepatrolled=1");
        } else {
            ptPatrollLink.attr("href", "/Special:最新页面?hidepatrolled=0");
        }
        generateList(pages);
        return page;
    };
    let showAll = false;
    let currentPages = [];
    let popup = null;
    let $list = null;
    let $showAll = null;
    const listMax = 10;
    const titleMax = 30;
    const addItem = (istart, iend) => {
        for (let idx = istart; idx < iend; ++idx) {
            const page = currentPages[idx];
            const shortTitle = page.title.length > titleMax ? `${page.title.slice(0, titleMax - 1)}...` : page.title;
            const $item = $("<li>").append($("<a>", {
                href: `${indexPrefix}?title=${encodeURIComponent(page.title)}&redirect=no&rcid=${page.rcid}`,
                title: page.title,
                text: shortTitle,
            })).appendTo($list);
            if (!page.confidence) {
                $item.addClass("patrollListNotConfident");
            }
        }
    };
    const prepareList = () => {
        $list.empty();
        const { length } = currentPages;
        if (length > listMax && !showAll) {
            addItem(0, listMax);
            $showAll.show();
        } else {
            addItem(0, length);
            $showAll.hide();
        }
    };
    const ensurePopup = () => {
        if (popup) {
            return;
        }
        $list = $("<ul>", { id: "patrollTooltipList" });
        $showAll = $("<div>", { id: "patrollListShowAll" }).css({
            "text-align": "right",
            "font-weight": "bold",
        }).append($("<a>", {
            text: "更多……",
            href: "#patrollListShowAll",
            title: wgULS("显示所有未巡查页面", "顯示所有未巡查的頁面"),
        }));
        $showAll.on("click", (e) => {
            e.preventDefault();
            showAll = true;
            prepareList();
            popup.updateDimensions();
        });
        popup = new OO.ui.PopupWidget({
            $content: $("<div>").css("font-size", "0.75em").append($list, $showAll),
            $floatableContainer: $("#pt-patroll"),
            padded: true,
            width: 300,
            height: null,
            align: "backwards",
            autoClose: false,
            hideWhenOutOfView: false,
            classes: ["patrollCount-popup"],
        });
        $(document.body).append(popup.$element);
    };
    let hoverBound = false;
    const bindHover = () => {
        if (hoverBound) {
            return;
        }
        hoverBound = true;
        const $ptPatroll = $("#pt-patroll");
        let openTimer = null;
        let closeTimer = null;
        const clearClose = () => {
            if (closeTimer) {
                clearTimeout(closeTimer);
                closeTimer = null;
            }
        };
        const scheduleClose = () => {
            if (!closeTimer && popup && popup.isVisible()) {
                closeTimer = setTimeout(() => {
                    closeTimer = null;
                    popup.toggle(false);
                    showAll = false;
                }, 1000);
            }
        };
        $ptPatroll.on("mouseenter", () => {
            clearClose();
            if (openTimer || popup && popup.isVisible()) {
                return;
            }
            openTimer = setTimeout(() => {
                openTimer = null;
                if (currentPages.length === 0) {
                    return;
                }
                const first = !popup;
                ensurePopup();
                if (first) {
                    popup.$element.on("mouseenter", clearClose).on("mouseleave", scheduleClose);
                }
                prepareList();
                popup.toggle(true);
                popup.updateDimensions();
            }, 500);
        });
        $ptPatroll.on("mouseleave", () => {
            if (openTimer) {
                clearTimeout(openTimer);
                openTimer = null;
            }
            scheduleClose();
        });
    };
    const generateList = (pages) => {
        currentPages = pages;
        bindHover();
        if (popup && popup.isVisible()) {
            if (pages.length === 0) {
                popup.toggle(false);
            } else {
                prepareList();
                popup.updateDimensions();
            }
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
        "class": "cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only",
        href: "/Special:最新页面?hidepatrolled=1",
        title: wgULS("最新页面", "最新頁面"),
    }).append(
        $("<span>", {
            "class": "vector-icon mw-ui-icon-wikimedia-article",
        }),
        $("<span>", {
            text: wgULS("最新页面", "最新頁面"),
        }),
    );
    $("#pt-watchlist-2").after($("<li></li>", {
        id: "pt-patroll",
    }).append(ptPatrollLink));
    $("#pt-patroll").on("mouseover", () => {
        instanceRAF.request(updateUnpatrolled);
    });
});
