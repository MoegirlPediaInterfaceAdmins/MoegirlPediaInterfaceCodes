"use strict";
(async () => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const prefixNumber = (num) => {
        let result = `${num}`;
        if (result.length === 1) {
            result = `0${result}`;
        }
        return result;
    };

    await $.ready;

    /**
     * @type { string[] | null }
     */
    const wgRestrictionCreate = mw.config.get("wgRestrictionCreate");
    const { wgRestrictionEdit, wgRestrictionMove, wgPageName, wgUserName, wgScriptPath, skin } = mw.config.get(["wgRestrictionEdit", "wgRestrictionMove", "wgPageName", "wgUserName", "wgScriptPath", "skin"]);

    let $container;
    switch (skin) {
        case "vector-2022": {
            $container = $("<li>", {
                "class": "page-info-container vector-tab-noicon mw-list-item",
            });
            $container.appendTo("#p-views .vector-menu-content-list");
            break;
        }
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
    }

    const { talkPage, basePageName } = wgGetPageNames();
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
            src: "/resources/lib/ooui/themes/wikimediaui/images/icons/lock.svg",
        }).appendTo($protectionInfoContainer);
        const $protectionInfoContent = $("<div>", {
            "class": "annotation-content",
        });
        $protectionInfoContent.append($("<b>").text(wgULS("页面受到以下保护：", "頁面受到以下保護：")));
        let $editRequestList, $moveRequestList, $createRequestList;
        if (Array.isArray(wgRestrictionEdit) && wgRestrictionEdit.length > 0) {
            $editRequestList = $("<ul>");
            $protectionInfoContent.append($("<br>"), document.createTextNode(`${mw.msg("edit")}：${wgRestrictionEdit.map((level) => mw.msg(`protect-level-${level}`)).join("、")}`), $editRequestList);
        }
        if (Array.isArray(wgRestrictionMove) && wgRestrictionMove.length > 0) {
            $moveRequestList = $("<ul>");
            $protectionInfoContent.append($("<br>"), document.createTextNode(`${mw.msg("move")}：${wgRestrictionMove.map((level) => mw.msg(`protect-level-${level}`)).join("、")}`), $moveRequestList);
        }
        if (Array.isArray(wgRestrictionCreate) && wgRestrictionCreate.length > 0) {
            $createRequestList = $("<ul>");
            $protectionInfoContent.append($("<br>"), document.createTextNode(`${mw.msg("create")}：${wgRestrictionCreate.map((level) => mw.msg(`protect-level-${level}`)).join("、")}`), $createRequestList);
        }
        $protectionInfoContent.appendTo($protectionInfoContainer);
        $protectionInfoContainer.trigger("mouseout");
        let actions = {};
        try {
            const pageActions = (await intestactionsPromise)?.query?.pages?.[0]?.actions;
            if (pageActions && typeof pageActions === "object") {
                actions = pageActions;
            }
        } catch (error) {
            mw.log.warn("[Gadget-pageInfo] Failed to query intestactions", error);
            actions = {};
        }
        if (wgUserName) {
            const now = new Date();
            const requestTitleSuffix = ` - ${wgUserName} - ${now.getFullYear()}.${prefixNumber(now.getMonth() + 1)}.${prefixNumber(now.getDate())}`;
            if (actions.edit === false && talkPage && $editRequestList) {
                const editRequestURL = new URL(`${wgScriptPath}/index.php`, location.origin);
                editRequestURL.searchParams.set("action", "edit");
                editRequestURL.searchParams.set("preload", `Template:编辑请求/${basePageName !== false && /^MediaWiki:Conversiontable\/zh-[a-z]+$/.test(wgPageName) ? basePageName : "comment"}`);
                editRequestURL.searchParams.set("preloadtitle", `编辑请求${requestTitleSuffix}`);
                editRequestURL.searchParams.set("section", "new");
                editRequestURL.searchParams.set("title", talkPage);
                $("<li>").append($("<a>", { href: editRequestURL.href, target: "_blank", "class": "external", text: "提出编辑请求" })).appendTo($editRequestList);
            }
            if (actions.move === false && $moveRequestList) {
                const moveRequestURL = new URL(`${wgScriptPath}/index.php`, location.origin);
                moveRequestURL.searchParams.set("action", "edit");
                moveRequestURL.searchParams.set("preload", "Template:移动请求预载");
                moveRequestURL.searchParams.set("preloadtitle", `移动请求${requestTitleSuffix}`);
                moveRequestURL.searchParams.set("section", "new");
                moveRequestURL.searchParams.set("title", "萌娘百科讨论:讨论版/操作申请");
                $("<li>").append($("<a>", { href: moveRequestURL.href, target: "_blank", "class": "external", text: "提出移动请求" })).appendTo($moveRequestList);
            }
            if (actions.create === false && $createRequestList) {
                const createRequestURL = new URL(`${wgScriptPath}/index.php`, location.origin);
                createRequestURL.searchParams.set("action", "edit");
                createRequestURL.searchParams.set("preload", "Template:创建请求预载");
                createRequestURL.searchParams.set("preloadtitle", `创建请求${requestTitleSuffix}`);
                createRequestURL.searchParams.set("section", "new");
                createRequestURL.searchParams.set("title", "萌娘百科讨论:讨论版/操作申请");
                $("<li>").append($("<a>", { href: createRequestURL.href, target: "_blank", "class": "external", text: "提出创建请求" })).appendTo($createRequestList);
            }
        }
    }
})();
