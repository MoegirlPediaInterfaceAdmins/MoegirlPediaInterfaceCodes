"use strict";
/**
 * 这里的任何JavaScript将在 MoeSkin 皮肤下加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:MoeSkin.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0
 *  loader模块 写法参见 https://www.mediawiki.org/wiki/ResourceLoader/Modules#mw.loader.load
 */
(async () => {
    /**
     * fixWikiLove
     * @FIXME WikiLove
     */
    async function fixWikiLove() {
        /** @type {JQuery<HTMLAnchorElement>} */
        const $wikiLoveBtn = $("#moe-page-tools a#ca-wikilove");
        if (!$wikiLoveBtn.length) {
            return;
        }
        await mw.loader.using(["ext.wikiLove.local"]);
        $wikiLoveBtn.on("click", (e) => {
            e.preventDefault();
            $.wikiLove.openDialog();
        });
    }

    /* polyfill */
    /**
     * @returns {JQuery<HTMLDivElement>}
     */
    function useCustomSidenavBlock() {
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
    function applyPageTools() {
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
    }

    /** 外部链接提示 */
    async function externalLinkConfirm() {
        await mw.loader.using(["ext.gadget.site-lib", "oojs-ui-windows", "oojs-ui-core"]);
        /** @param {URL} url */
        const getConfirmMessage = (url) => {
            const $wrapper = $("<div>", { style: "text-align: center" });
            $wrapper.append($("<div>", { text: wgULS("您点击了一个外部链接：", "您點選了一個外部連結：") }));
            $wrapper.append($("<strong>", { text: url.href }));
            $wrapper.append($("<div>", { text: wgULS("此网页不属于萌娘百科，我们不保证其安全性，请谨慎选择是否继续访问。", "此網頁不屬於萌娘百科，我們不保證其安全性，請謹慎選擇是否繼續訪問。") }));
            return $wrapper;
        };
        document.getElementById("mw-content-text")?.addEventListener("click", async (e) => {
            if (e.target.tagName !== "A") {
                return;
            }
            /** @type {HTMLAnchorElement} */
            const anchor = e.target;
            const hrefText = anchor.getAttribute("href");
            if (!hrefText || hrefText.startsWith("#") || hrefText.startsWith("javascript:") || anchor.classList.contains("image")) {
                return;
            }
            const hrefURL = new URL(anchor.href);
            if (hrefURL.host.endsWith("moegirl.org.cn") || hrefURL.host.endsWith("moegirl.org")) {
                return;
            }
            e.preventDefault();
            const response = await OO.ui.confirm(getConfirmMessage(hrefURL));
            response && window.open(hrefURL.href);
        });
    }

    /**
     * 修复 lazyload 与 MultimediaViewer 不兼容的问题
     */
    async function fixMultimediaViewer() {
        /** @type {NodeListOf<HTMLImageElement>} */
        const thumbs = document.getElementById("mw-content-text")?.querySelectorAll([
            ".gallery .image img",
            "a.image img", "#file a img",
            'figure[typeof*="mw:Image"] > *:first-child > img',
            'span[typeof*="mw:Image"] img',
        ].join(","));

        if (!thumbs) {
            return;
        }
        await mw.loader.using("mmv.bootstrap");

        thumbs.forEach((el) => {
            if (el.src) {
                return mw?.mmv?.bootstrap?.processThumb(el);
            }
            const observer = new MutationObserver((entries) => {
                /** @type {HTMLImageElement} */
                const img = entries[0].target;
                if (img.src) {
                    mw?.mmv?.bootstrap?.processThumb(img);
                    observer.disconnect();
                }
            });
            observer.observe(el, { attributes: true, attributeFilter: ["src"] });
        });
    }

    /** 等待 document 加载完毕 */
    await $.ready;
    /** fixWikiLove */
    fixWikiLove();
    /** PageTools */
    applyPageTools();
    /** fixMultimediaViewer */
    fixMultimediaViewer();
    /** linkConfirm */
    if ("ontouchstart" in document && !location.host.startsWith("mobile")) {
        externalLinkConfirm();
    }
})();
