"use strict";
(async () => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const appendRestrictionSection = ($container, action, levels) => {
        if (!Array.isArray(levels) || levels.length === 0) {
            return null;
        }
        const $requestList = $("<ul>");
        $container.append($("<br>"), document.createTextNode(`${mw.msg(action)}：${levels.map((level) => mw.msg(`protect-level-${level}`)).join("、")}`), $requestList);
        return $requestList;
    };
    const buildRequestUrl = ({ title, preload, preloadTitle, scriptPath }) => {
        const requestURL = new URL(`${scriptPath}/index.php`, location.origin);
        requestURL.searchParams.set("action", "edit");
        requestURL.searchParams.set("preload", preload);
        requestURL.searchParams.set("preloadtitle", preloadTitle);
        requestURL.searchParams.set("section", "new");
        requestURL.searchParams.set("title", title);
        return requestURL.href;
    };
    const appendRequestLink = ($list, { title, preload, preloadTitle, scriptPath, text }) => {
        $("<li>").append($("<a>", {
            href: buildRequestUrl({
                title,
                preload,
                preloadTitle,
                scriptPath,
            }),
            target: "_blank",
            "class": "external",
            css: {
                marginLeft: "1em",
            },
            text,
        })).appendTo($list);
    };
    const getRequestTitleSuffix = (userName, now) => ` - ${userName} - ${now.getFullYear()}.${libPrefixNumber(now.getMonth() + 1)}.${libPrefixNumber(now.getDate())}`;
    const getEditRequestPreload = (pageName, basePageName) => wgGetEditRequestPreload(pageName, basePageName);

    await $.ready;

    /**
     * @type { string[] | null }
     */
    const wgRestrictionCreate = mw.config.get("wgRestrictionCreate");
    const { wgRestrictionEdit, wgRestrictionMove, wgPageName, wgUserName, wgScriptPath, skin } = mw.config.get(["wgRestrictionEdit", "wgRestrictionMove", "wgPageName", "wgUserName", "wgScriptPath", "skin"]);

    if (!wgRestrictionCreate && wgRestrictionEdit.length === 0 && wgRestrictionMove.length === 0) {
        return;
    }

    let $container;
    switch (skin) {
        case "moeskin": {
            while (Number.MAX_SAFE_INTEGER > Number.MIN_SAFE_INTEGER) {
                if (!document.querySelector(".edit-button-group")) {
                    await sleep(100);
                    continue;
                }
                break;
            }
            $container = $("<div>", {
                "class": "page-info-container",
            });
            $container.prependTo($(document.querySelector("#pagetools-desktop-container .edit-button-group") || document.querySelector("#pagetools-mobile-container .mobile-page-more-actions")));
            break;
        }
        case "vector-2022":
        default: {
            $container = $("<li>", {
                "class": "page-info-container vector-tab-noicon mw-list-item",
            });
            $container.appendTo("#p-views .vector-menu-content-list");
            break;
        }
    }

    const { talkPage, basePageName } = libGetPageNames();
    const protectLevels = new Set();
    if (Array.isArray(wgRestrictionEdit) && wgRestrictionEdit.length > 0) {
        wgRestrictionEdit.forEach((level) => protectLevels.add(`protect-level-${level}`));
        protectLevels.add("edit");
    }
    if (Array.isArray(wgRestrictionMove) && wgRestrictionMove.length > 0) {
        wgRestrictionMove.forEach((level) => protectLevels.add(`protect-level-${level}`));
        protectLevels.add("move");
    }
    if (Array.isArray(wgRestrictionCreate) && wgRestrictionCreate.length > 0) {
        wgRestrictionCreate.forEach((level) => protectLevels.add(`protect-level-${level}`));
        protectLevels.add("create");
    }
    if (protectLevels.size > 0) {
        const isDark = document.documentElement.classList.contains("skin-theme-clientpref-night") || document.documentElement.classList.contains("dark");
        const api = new mw.Api();
        await api.loadMessagesIfMissing(Array.from(protectLevels));
        const intestactionsPromise = api.post({
            action: "query",
            prop: "info",
            titles: wgPageName,
            formatversion: "2",
            intestactions: "edit|move|create",
            intestactionsdetail: "boolean",
        });
        const $protectionInfoContainer = $("<a>", {
            "class": "page-info-protection annotation",
        });
        $protectionInfoContainer.appendTo($container);
        $("<img>", {
            src: `/resources/lib/ooui/themes/wikimediaui/images/icons/${isDark ? "lock-invert.svg" : "lock.svg"}`,
            alt: "",
            "aria-hidden": "true",
        }).appendTo($protectionInfoContainer);
        const $protectionInfoContent = $("<div>", {
            "class": "annotation-content",
        });
        $protectionInfoContent.append($("<b>").text(wgULS("页面受到以下保护：", "頁面受到以下保護：")));
        const $editRequestList = appendRestrictionSection($protectionInfoContent, "edit", wgRestrictionEdit);
        const $moveRequestList = appendRestrictionSection($protectionInfoContent, "move", wgRestrictionMove);
        const $createRequestList = appendRestrictionSection($protectionInfoContent, "create", wgRestrictionCreate);
        $protectionInfoContent.appendTo($protectionInfoContainer);
        $protectionInfoContainer.trigger("mouseout");
        let actions = {};
        try {
            const pageActions = (await intestactionsPromise)?.query?.pages?.[0]?.actions;
            if (pageActions && typeof pageActions === "object") {
                actions = pageActions;
            }
        } catch (error) {
            console.warn("[Gadget-pageInfo] Failed to query intestactions", error);
            actions = {};
        }
        if (wgUserName) {
            const now = new Date();
            const requestTitleSuffix = getRequestTitleSuffix(wgUserName, now);
            if (actions.edit === false && talkPage && $editRequestList) {
                appendRequestLink($editRequestList, {
                    title: talkPage,
                    preload: getEditRequestPreload(wgPageName, basePageName),
                    preloadTitle: `编辑请求${requestTitleSuffix}`,
                    scriptPath: wgScriptPath,
                    text: "提出编辑请求",
                });
            } else {
                $editRequestList?.remove();
            }
            if (actions.move === false && $moveRequestList) {
                appendRequestLink($moveRequestList, {
                    title: "萌娘百科讨论:讨论版/操作申请",
                    preload: "Template:移动请求预载",
                    preloadTitle: `移动请求${requestTitleSuffix}`,
                    scriptPath: wgScriptPath,
                    text: "提出移动请求",
                });
            } else {
                $moveRequestList?.remove();
            }
            if (actions.create === false && $createRequestList) {
                appendRequestLink($createRequestList, {
                    title: "萌娘百科讨论:讨论版/操作申请",
                    preload: "Template:创建请求预载",
                    preloadTitle: `创建请求${requestTitleSuffix}`,
                    scriptPath: wgScriptPath,
                    text: "提出创建请求",
                });
            } else {
                $createRequestList?.remove();
            }
        }
    }
})();
