"use strict";
/**
 * 这里的任何JavaScript将在 MoeSkin 皮肤下加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:MoeSkin.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0
 */
(async () => {
    /**
     * fixWikiLove
     * @FIXME WikiLove
     */
    const fixWikiLove = async () => {
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
    };

    /**
     * fix a few image issues by extending mw.Title.newFromImg
     * examples including gallery-slideshow and MultiMediaViewer
     */
    async function fixImage() {
        await mw.loader.using("mediawiki.Title");
        mw.Title.newFromImg = (img) => {
            let matches, i, regex;
            const thumbPhpRegex = /thumb\.php/,
                regexes = [
                    /\/[a-f0-9]\/[a-f0-9]{2}\/([^\s/]+)\/[^\s/]+-[^\s/]*$/,
                    /\/[a-f0-9]\/[a-f0-9]{2}\/([^\s/]+)$/,
                    /\/([^\s/]+)\/[^\s/]+-(?:\1|thumbnail)[^\s/]*$/,
                    /\/([^\s/]+)$/,
                ],
                recount = regexes.length,
                src = img.jquery ? img[0].src || img[0].dataset.lazySrc : img.src || img.dataset.lazySrc;
            matches = src.match(thumbPhpRegex);
            if (matches) {
                return mw.Title.newFromText(`File:${mw.util.getParamValue("f", src)}`);
            }
            const decodedSrc = decodeURIComponent(src);
            for (i = 0; i < recount; i++) {
                regex = regexes[i];
                matches = decodedSrc.match(regex);
                if (matches && matches[1]) {
                    return mw.Title.newFromText(`File:${matches[1]}`);
                }
            }
            return null;
        };

        /* gallery-slideshow */
        if (["loading", "loaded", "executing", "ready", "error"].includes(mw.loader.getState("mediawiki.page.gallery.slideshow"))) {
            const { getImageInfo } = mw.GallerySlideshow.prototype;
            mw.GallerySlideshow.prototype.getImageInfo = function ($img) {
                if ($img.attr("src") === undefined) {
                    $img.attr("src", $img.data("lazy-src"));
                }
                return getImageInfo.bind(this)($img);
            };
            $("li.gallerycarousel").remove();
            mw.util.$content.find(".mw-gallery-slideshow").each(function () {
                new mw.GallerySlideshow(this);
            });
        }

        /* MultiMediaViewer */
        if (mw.config.get("wgMediaViewerOnClick") && ["loading", "loaded", "executing", "ready"].includes(mw.loader.getState("mmv.bootstrap.autostart"))) {
            await mw.loader.using("mmv.bootstrap.autostart");
            $.proxy(mw.mmv.bootstrap, "processThumbs")(mw.util.$content);
        }
    }

    /* polyfill */
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

    /** 外部链接提示 */
    const externalLinkConfirm = async () => {
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
            /** @type {HTMLAnchorElement | undefined} */
            const anchor = e.target.closest("a.external");
            if (!anchor) {
                return;
            }
            if (anchor.classList.contains("image")) {
                return;
            }
            const hrefURL = new URL(anchor.href);
            if (/^(?:.+\.)moegirl\.org\.cn$/i.test(hrefURL.host)) {
                return;
            }
            e.preventDefault();
            const response = await OO.ui.confirm(getConfirmMessage(hrefURL));
            response && window.open(hrefURL.href);
        });
    };
    /* noteTAIcon */
    const noteTAIcon = () => {
        const noteTAbutton = $('<button tabindex="0" type="button"/>')
            .append('<span style="padding:1px 3px;">汉漢</span>');
        const noteTAicon = $("<span/>").attr({
            id: "p-noteTA-moeskin",
            role: "navigation",
            "class": "noteTA-button",
            title: "本页使用了标题或全文手工转换",
        }).append(noteTAbutton);
        $("#p-languages-group").append(noteTAicon);
    };
    /* 等待 document 加载完毕 */
    await $.ready;
    /* fixWikiLove */
    fixWikiLove();
    /* fixImage */
    fixImage();
    /* PageTools */
    applyPageTools();
    /* linkConfirm */
    if (Reflect.has(document, "ontouchstart") && !location.host.startsWith("mobile")) {
        externalLinkConfirm();
    }
    /* noteTAIcon */
    if ($(".noteTA")[0]) {
        noteTAIcon();
    }
})();
