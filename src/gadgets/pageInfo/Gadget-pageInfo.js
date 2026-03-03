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

    let $container;
    switch (mw.config.get("skin")) {
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

    const { wgRestrictionEdit, wgRestrictionMove, wgRestrictionCreate, wgPageName } = mw.config.get(["wgRestrictionEdit", "wgRestrictionMove", "wgRestrictionCreate", "wgPageName"]);
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
            titles: "Mainpage",
            formatversion: "2",
            intestactions: "edit|move|create",
            intestactionsdetail: "boolean",
        });
        const protectionInfo = [];
        if (Array.isArray(wgRestrictionEdit) && wgRestrictionEdit.length > 0) {
            protectionInfo.push(`${mw.msg("edit")}：${wgRestrictionEdit.map((level) => mw.msg(`protect-level-${level}`)).join("、")}<ul id="edit-protection-request" style="display: none;"></ul>`); // 临时隐藏编辑请求按钮
        }
        if (Array.isArray(wgRestrictionMove) && wgRestrictionMove.length > 0) {
            protectionInfo.push(`${mw.msg("move")}：${wgRestrictionMove.map((level) => mw.msg(`protect-level-${level}`)).join("、")}<ul id="move-protection-request"></ul>`);
        }
        if (Array.isArray(wgRestrictionCreate) && wgRestrictionCreate.length > 0) {
            protectionInfo.push(`${mw.msg("create")}：${wgRestrictionCreate.map((level) => mw.msg(`protect-level-${level}`)).join("、")}<ul id="create-protection-request"></ul>`);
        }
        const $protectionInfoContainer = $("<a>", {
            "class": "page-info-protection annotation",
        });
        $protectionInfoContainer.appendTo($container);
        const $protectionInfoImage = $("<img>", {
            src: "/resources/lib/ooui/themes/wikimediaui/images/icons/lock.svg",
        });
        $protectionInfoImage.appendTo($protectionInfoContainer);
        const $protectionInfoText = $("<span>", {
            "class": "annotation-content",
            html: [
                `<b>${wgULS("页面受到以下保护：", "頁面受到以下保護：")}</b>`,
                ...protectionInfo,
            ].join("<br>"),
        });
        $protectionInfoText.appendTo($protectionInfoContainer);
        $protectionInfoContainer.trigger("mouseout");
        const { query: { pages: [{ actions }] } } = await intestactionsPromise;
        const now = new Date();
        const requestTitleSuffix = ` - ${mw.config.get("wgUserName")} - ${now.getFullYear()}.${prefixNumber(now.getMonth() + 1)}.${prefixNumber(now.getDate())}`;
        if (actions.edit === false && talkPage) {
            $("<a/>").attr("href", "javascript:void(0);").addClass("external").text("提出编辑请求").on("click", () => {
                const editRequestURL = new URL(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php`);
                editRequestURL.searchParams.set("action", "edit");
                editRequestURL.searchParams.set("preload", `Template:编辑请求/${basePageName !== false && /^MediaWiki:Conversiontable\/zh-[a-z]+$/.test(wgPageName) ? basePageName : "comment"}`);
                editRequestURL.searchParams.set("preloadtitle", `编辑请求${requestTitleSuffix}`);
                editRequestURL.searchParams.set("section", "new");
                editRequestURL.searchParams.set("title", talkPage);
                window.open(editRequestURL, "_blank");
            }).appendTo($("<li/>").appendTo($protectionInfoContainer.find("#edit-protection-request")));
        }
        if (actions.move === false) {
            $("<a/>").attr("href", "javascript:void(0);").addClass("external").text("提出移动请求").on("click", () => {
                const moveRequestURL = new URL(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php`);
                moveRequestURL.searchParams.set("action", "edit");
                moveRequestURL.searchParams.set("preload", "Template:移动请求");
                moveRequestURL.searchParams.set("preloadtitle", `移动请求${requestTitleSuffix}`);
                moveRequestURL.searchParams.set("section", "new");
                moveRequestURL.searchParams.set("title", "萌娘百科讨论:讨论版/操作申请");
                window.open(moveRequestURL, "_blank");
            }).appendTo($("<li/>").appendTo($protectionInfoContainer.find("#move-protection-request")));
        }
        if (actions.create === false) {
            $("<a/>").attr("href", "javascript:void(0);").addClass("external").text("提出创建请求").on("click", () => {
                const createRequestURL = new URL(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php`);
                createRequestURL.searchParams.set("action", "edit");
                createRequestURL.searchParams.set("preload", "Template:创建请求");
                createRequestURL.searchParams.set("preloadtitle", `创建请求${requestTitleSuffix}`);
                createRequestURL.searchParams.set("section", "new");
                createRequestURL.searchParams.set("title", "萌娘百科讨论:讨论版/操作申请");
                window.open(createRequestURL, "_blank");
            }).appendTo($("<li/>").appendTo($protectionInfoContainer.find("#create-protection-request")));
        }
    }
})();
