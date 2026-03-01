"use strict";
(async () => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

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

    const { wgRestrictionEdit, wgRestrictionMove, wgRestrictionCreate } = mw.config.get(["wgRestrictionEdit", "wgRestrictionMove", "wgRestrictionCreate"]);
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
        const protectionInfo = [];
        if (Array.isArray(wgRestrictionEdit) && wgRestrictionEdit.length > 0) {
            protectionInfo.push(`${mw.msg("edit")}：${wgRestrictionEdit.map((level) => mw.msg(`protect-level-${level}`)).join("、")}`);
        }
        if (Array.isArray(wgRestrictionMove) && wgRestrictionMove.length > 0) {
            protectionInfo.push(`${mw.msg("move")}：${wgRestrictionMove.map((level) => mw.msg(`protect-level-${level}`)).join("、")}`);
        }
        if (Array.isArray(wgRestrictionCreate) && wgRestrictionCreate.length > 0) {
            protectionInfo.push(`${mw.msg("create")}：${wgRestrictionCreate.map((level) => mw.msg(`protect-level-${level}`)).join("、")}`);
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
    }
})();
