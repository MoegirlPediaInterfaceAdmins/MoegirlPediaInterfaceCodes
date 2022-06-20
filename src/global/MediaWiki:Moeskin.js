/* 此处放置的 JavaScript 会影响使用 MoeSkin 皮肤的用户 */
"use strict";

/** @FIXME WikiLove */
// eslint-disable-next-line prefer-arrow-callback
$(function () {
    /** @type {JQuery<HTMLAnchorElement>} */
    const $wikiLoveBtn = $("#moe-page-tools a#ca-wikilove");
    if (!$wikiLoveBtn.length) {
        return;
    }
    mw.loader.using("ext.wikiLove.local").then(() => {
        $wikiLoveBtn.on("click", (e) => {
            e.preventDefault();
            $.wikiLove.openDialog();
        });
    });
});

/** @pollify mw.util.addPortletLink */
(() => {
    /**
     * @returns {JQuery<HTMLDivElement>}
     */
    function useCustomSidenavBlock() {
        let $block = $("aside#moe-global-sidenav #moe-custom-sidenav-block");
        if (!$block.length) {
            $block = $("<div>", {
                "class": "moe-card",
                id: "moe-custom-sidenav-block",
            });
            $block.append(
                $("<div>", {
                    "class": "mw-parser-output",
                }).append($("<h2>", { text: "自定义工具" }), $("<ul>", { id: "moe-custom-sidenav-block-list" })),
            );
            $("aside#moe-global-sidenav .moe-sidenav-sticky-rail").before($block);
        }
        return $block;
    }

    /**
     * @param {string} portletId
     * @param {string} href
     * @param {string} text
     * @param {string?} id
     * @param {string?} tooltip
     * @param {string?} accesskey
     * @param {string?} nextnode
     * @returns {HTMLLIElement}
     */
    function addPortletLink(portletId, href, text, id, tooltip, accesskey, nextnode) {
        const $block = useCustomSidenavBlock();
        const $li = $("<li>", {
            id,
            "data-portletId": portletId,
            "data-nextnode": nextnode,
        }).append(
            $("<a>", {
                text,
                href,
                title: tooltip,
                accesskey,
            }),
        );
        $block.find("#moe-custom-sidenav-block-list").append($li);
        return $li.get(0);
    }

    // assign functions
    try {
        /**
         * @desc MediaWiki 似乎会将 window.addPortletLink 设置为只读
         *       至于原因我暂且蒙古里
         * @by 机智的小鱼君 2022年4月24日
         */
        Object.defineProperties(window, {
            addPortletLink: {
                value: addPortletLink,
            },
            useCustomSidenavBlock: {
                value: useCustomSidenavBlock,
            },
        });
    } catch (e) {
        console.warn("[MoeSkin] addPortletLink", "Faild to bind global variables", e);
    }
    mw.loader.using("mediawiki.util").then(() => {
        Object.defineProperty(mw.util, "addPortletLink", {
            value: addPortletLink,
        });
        mw.hook("moeskin.addPortletLink").fire({ addPortletLink, useCustomSidenavBlock });
    });
})();

/** PageTools */
// eslint-disable-next-line prefer-arrow-callback
$(function () {
    /**
     * @returns {JQuery<HTMLDivElement>}
     */
    function usePageTools() {
        return $("main > #moe-article > #moe-page-tools-container > #moe-page-tools");
    }
    /**
     * @returns {JQuery<HTMLAnchorElement>}
     */
    function usePageToolsButton() {
        const $pageTools = usePageTools();
        const $button = $pageTools.find(".content-actions > a:first-of-type").clone();
        $button.removeAttr("id");
        $button.removeAttr("href");
        $button.removeClass("selected");
        $button.find(".tooltip, .xicon").empty();
        return $button;
    }
    /**
     * @param {string?} tooltip
     * @param {(string | HTMLOrSVGElement)?} icon raw html string or SVG element
     * @param {('action' | 'extra')?} type
     * @returns {JQuery<HTMLAnchorElement>}
     */
    function addPageToolsButton(icon, tooltip, type = "action") {
        const $pageTools = usePageTools();
        const $button = usePageToolsButton();
        $button.find("> .xicon").append(icon || "?");
        $button.find("> .tooltip").text(tooltip);

        switch (type) {
            case "extra":
                $($pageTools.find(".tools-extra")).prepend($button);
                break;
            case "action":
            default:
                $($pageTools.find(".content-actions #ca-more-actions")).before($button);
                break;
        }

        return $button;
    }

    mw.hook("moeskin.pagetools").fire({
        usePageTools,
        usePageToolsButton,
        addPageToolsButton,
    });
});