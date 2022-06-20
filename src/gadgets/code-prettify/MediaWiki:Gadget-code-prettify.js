"use strict";
/* global prettyPrint */
// <pre>
$(() => {
    if (mw.config.get("wgPageName").match(/\.js$/)) {
        $(".mw-code").addClass("prettyprint lang-js");
    }
    if (mw.config.get("wgPageName").match(/\.css$/)) {
        $(".mw-code").addClass("prettyprint lang-css");
    }
    const acceptsLangs = {
        ts: "ts",
        typescript: "ts",
        js: "js",
        javascript: "js",
        json: "json",
        css: "css",
        htm: "html",
        html: "html",
        xml: "xml",
        scribunto: "lua",
        lua: "lua",
        php: "php",
        regex: "regex",
        latex: "latex",
        tex: "latex",
        wiki: "wiki",
        wikitext: "wiki",
        mediawiki: "wiki",
        mw: "wiki",
    };
    const wgPageContentModel = mw.config.get("wgPageContentModel", "").toLowerCase();
    if (wgPageContentModel in acceptsLangs) {
        $(".mw-code").addClass(`prettyprint lang-${acceptsLangs[wgPageContentModel]}`);
    }
    $("pre[lang]").each(function () {
        const self = $(this);
        const lang = self.attr("lang").toLowerCase();
        if (lang in acceptsLangs) {
            self.addClass(`prettyprint lang-${acceptsLangs[lang]}`);
        }
    });
    if ($('.prettyprint[class*=" lang-"]').length > 0) {
        $('pre.prettyprint[class*=" lang-"]').each((_, ele) => {
            const start = ele.dataset.start;
            if (/^[1-9]\d*$/.test(start)) {
                $(ele).removeClass("linenums").addClass(`linenums:${start}`);
            } else {
                $(ele).addClass("linenums");
            }
        });
        $.ajax({
            url: `${mw.config.get("wgServer") + mw.config.get("wgScriptPath")}/index.php?title=MediaWiki:Gadget-code-prettify-core.js&action=raw&ctype=text/javascript`,
            dataType: "script",
            cache: true,
            success: function () {
                prettyPrint();
                if (mw.config.get("wgPageName").match(/\.(js|css)$/)) {
                    $(window).on("hashchange", () => {
                        const frag = new mw.Uri().fragment;
                        if (/^L\d+$/.test(frag)) {
                            const firstCode = $(`#${frag}`)[0] || $(".prettyprint.prettyprinted > .linenums").first().children().eq(+frag.substring(1) - 1)[0];
                            if (firstCode) {
                                const $firstCode = $(firstCode).addClass("linenums-active");
                                $("html, body").animate({
                                    scrollTop: $firstCode.offset().top - $firstCode.outerHeight(),
                                });
                            }
                        }
                    }).trigger("hashchange");
                }
            },
        });
    }
});
// </pre>