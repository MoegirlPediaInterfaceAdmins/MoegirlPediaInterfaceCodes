"use strict";
/* 这里的任何JavaScript将在 MoeSkin 皮肤下加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:MoeSkin.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0
 *  loader模块 写法参见 https://www.mediawiki.org/wiki/ResourceLoader/Modules#mw.loader.load
 */
(async () => {
    /* 函数定义体 */
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
    /* PageTools */
    function PageTools() {
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
        /* 触屏链接提示 */
        async function linkConfirm() {
            await mw.loader.using(["mediawiki.Uri", "ext.gadget.site-lib"]);
            if ($("body").css("position") === "static") {
                $("body").css("position", "relative");
            }
            const prompt = $("<div/>").attr("class", "linkConfirmprompt");
            prompt.css("max-width", $("#mw-content-text").width() - 4);
            const textnode = $("<div/>").attr("class", "linkConfirmpromptTextnode");
            const text = $("<span/>");
            textnode.append(text);
            const ifSupported = window.CSS && CSS.supports && CSS.supports("-webkit-line-clamp", "2");
            if (ifSupported) {
                text.css({
                    display: "-webkit-box",
                    "-webkit-line-clamp": "2",
                    "-webkit-box-orient": "vertical",
                    "word-break": "break-all",
                    "text-overflow": "ellipsis",
                    overflow: "hidden",
                });
            }
            prompt.append(wgULS("您点击了一个链接，地址为：", "您點擊了一條連結，網址為："))
                .append(textnode)
                .append($("<div/>").attr("class", "linkConfirmpromptAlert").append(wgULS("此网页不属于本网站，不保证其安全性", "該網頁不屬於本網站，不保證其安全性")).hide());
            prompt.append($("<a/>").text(wgULS("继续访问", "繼續前往")).on("click", () => {
                //window.open(prompt.data('href'), '_blank', "noopener,noreferrer");
                window.open("javascript:window.name;", `<script>location.replace("${prompt.data("href")}");/* ${Math.random()} */</script>`);
            })).append($("<a/>").text("取消")).on("click", (e) => {
                if (!$(e.target).is("a")) {
                    return false;
                }
                prompt.fadeOut(137);
            });
            prompt.appendTo("body");
            $("body").on("click", (e) => {
                const self = $(e.target);
                if (!self.is("#mw-content-text a, .comment-text a")) {
                    return;
                }
                if (!e.target.href || /^javascript:/.test(e.target.href) || $(e.target).is(".image")) {
                    return true;
                }
                if (!e.target.dataset.linkid) {
                    e.target.dataset.linkid = uuidv4();
                }
                if (prompt.is(":visible") && prompt.data("linkid") === e.target.dataset.linkid) {
                    return false;
                }
                prompt.fadeOut(137);
                const uri = new mw.Uri(e.target.href);
                if (/\.moegirl\.org(?:\.cn)?$/.test(uri.host)) {
                    if (!self.closest(".heimu")[0] && !self.find(".heimu")[0] || self.parent().is(".reference")) {
                        return true;
                    }
                    text.text(decodeURI(e.target.href));
                    $(".linkConfirmpromptAlert").hide();
                } else {
                    text.text(decodeURI(e.target.href));
                    $(".linkConfirmpromptAlert").show();
                }
                let promptTop = 0, promptLeft = 0;
                let offsetParent = self;
                do {
                    promptTop += offsetParent.offset().top;
                    promptLeft += offsetParent.offset().left;
                    offsetParent = offsetParent.offsetParent();
                } while (!offsetParent.is("html, body"));
                promptTop += self.outerHeight() + 3;
                promptLeft += self.outerWidth() / 2 - prompt.outerWidth() / 2;
                if (promptTop + prompt.outerHeight() > $(document).height() - 3) {
                    promptTop = $(document).height() - prompt.outerHeight() - 3;
                }
                if (promptLeft + prompt.outerWidth() > $(window).width() - 3) {
                    promptLeft = $(window).width() - prompt.outerWidth() - 3;
                }
                if (promptLeft < 0) {
                    promptLeft = 3;
                }
                prompt.css({
                    top: `${promptTop}px`,
                    left: `${promptLeft}px`,
                });
                if (!ifSupported) {
                    window.setTimeout(() => {
                        if (text.height() > 44.8) {
                            text.text(`${text.text()}……`);
                            while (text.height() > 44.8) {
                                text.text(`${text.text().slice(0, -3)}……`);
                            }
                        }
                    }, 0);
                }
                prompt.data({
                    href: e.target.href,
                    linkid: self[0].dataset.linkid,
                });
                prompt.fadeIn(137);
                return false;
            });
        }
    }
    /* 函数执行体 */
    await $.ready;
    /* fixWikiLove */
    fixWikiLove();
    /* PageTools */
    PageTools();
    if ("ontouchstart" in document) {
        linkConfirm();
    }
})();
