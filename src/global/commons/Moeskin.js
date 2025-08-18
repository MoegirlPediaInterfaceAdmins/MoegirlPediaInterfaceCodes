"use strict";
/**
 * 这里的任何JavaScript将在 MoeSkin 皮肤下加载
 */
(async () => {
    /**
     * @returns {JQuery<HTMLDivElement>}
     */
    const useCustomSidenavBlock = () => {
        let $block = $("aside#moe-global-siderail #moe-custom-sidenav-block");
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
            $("aside#moe-global-siderail .moe-siderail-sticky").before($block);
        }
        return $block;
    };
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
    const addPortletLink = (portletId, href, text, id, tooltip, accesskey, nextnode) => {
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
    };
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
                configurable: true,
            },
            useCustomSidenavBlock: {
                value: useCustomSidenavBlock,
                configurable: true,
            },
        });
    } catch (e) {
        console.warn("[MoeSkin] addPortletLink", "Faild to bind global variables", e);
    }
    await mw.loader.using(["mediawiki.util"]);
    Reflect.defineProperty(mw.util, "addPortletLink", {
        value: addPortletLink,
        configurable: true,
    });
    mw.hook("moeskin.addPortletLink").fire({ addPortletLink, useCustomSidenavBlock });

    /* applyPageTools */
    const applyPageTools = () => {
        /**
         * @returns {JQuery<HTMLDivElement>}
         */
        const usePageTools = () => $("main > #moe-article > #moe-page-tools-container > #moe-page-tools");
        /**
         * @returns {JQuery<HTMLAnchorElement>}
         */
        const usePageToolsButton = () => usePageTools().find(".content-actions > a:first-of-type").clone().removeAttr("id href").removeClass("selected").find(".tooltip, .xicon").empty().end();
        /**
         * @param {string?} tooltip
         * @param {(string | HTMLOrSVGElement)?} icon raw html string or SVG element
         * @param {('action' | 'extra')?} type
         * @returns {JQuery<HTMLAnchorElement>}
         */
        const addPageToolsButton = (icon, tooltip, type = "action") => {
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
        };
        mw.hook("moeskin.pagetools").fire({
            usePageTools,
            usePageToolsButton,
            addPageToolsButton,
        });
    };
    await $.ready;
    /* PageTools */
    applyPageTools();
})();
