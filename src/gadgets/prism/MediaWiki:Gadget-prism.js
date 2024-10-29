/* global Parser */
"use strict";
$(() => {
    const acceptsLangs = {
        // bash
        bash: "bash",
        sh: "bash",
        shell: "bash",
        bsh: "bash",

        // c
        c: "c",

        // coffeescript
        coffeescript: "coffeescript",
        coffee: "coffeescript",

        // cpp
        cpp: "cpp",
        cc: "cpp",
        cxx: "cpp",

        // c#
        csharp: "csharp",
        cs: "csharp",
        dotnet: "csharp",

        // css
        css: "css",
        "sanitized-css": "css",

        // java
        java: "java",

        // javascript
        javascript: "javascript",
        js: "javascript",

        // json
        json: "json",
        json5: "json",
        webmanifest: "json",

        // latex
        latex: "latex",
        tex: "latex",
        context: "latex",

        // lua
        lua: "lua",
        scribunto: "lua",

        // markup
        markup: "markup",
        htm: "markup",
        html: "markup",
        mxml: "markup",
        xhtml: "markup",
        xsl: "markup",
        mathml: "markup",
        svg: "markup",
        xml: "markup",
        ssml: "markup",
        atom: "markup",
        rss: "markup",

        // perl
        perl: "perl",
        pl: "perl",
        pm: "perl",

        // php
        php: "php",

        // python
        python: "python",
        py: "python",

        // regex
        regex: "regex",

        // ruby
        ruby: "ruby",
        rb: "ruby",

        // typescript
        typescript: "typescript",
        ts: "typescript",

        // wiki
        wiki: "wiki",
        wikitext: "wiki",
        mediawiki: "wiki",
        mw: "wiki",

        // yaml
        yaml: "yaml",
        yml: "yaml",
    };
    const appendPluginsList = {
        // jsdoc
        javascript: "jsdoc",
        typescript: "jsdoc",

        // phpdoc
        php: "phpdoc",

        // previewers
        // sass: "previewers",
        // stylus: "previewers",
        markup: "previewers",
        css: "previewers",
    };
    // 仅用于判断是否合法语言，无需去重
    const acceptsLangNames = Object.values(acceptsLangs);
    let hash = /^#L\d+$/.test(location.hash);
    Prism.hooks.add("complete", ({ element }) => {
        if (element) {
            const { dataset: { start = 1 } } = element.parentElement;
            $(element).children(".line-numbers-rows").children()
                .each((i, ele) => {
                    ele.id = `L${i + Number(start)}`;
                    if (hash && location.hash === `#${ele.id}`) {
                        hash = false;
                        ele.scrollIntoView();
                    }
                })
                .on("click", ({ target: { id } }) => {
                    history.replaceState(null, "", `#${id}`);
                });
        }
    });
    mw.hook("wikipage.content").add(
        /**
         * @param { JQuery<HTMLElement> } $content
         */
        ($content) => (async () => {
            const wgPageContentModel = mw.config.get("wgPageContentModel", "").toLowerCase();
            const langSet = new Set();
            const pluginsSet = new Set([
                "match-braces",
            ]);
            if (Reflect.has(acceptsLangs, wgPageContentModel)) {
                const lang = acceptsLangs[wgPageContentModel];
                langSet.add(lang);
                if (Reflect.has(appendPluginsList, lang)) {
                    pluginsSet.add(appendPluginsList[lang]);
                }
                $content.find(".mw-code").addClass("line-numbers").wrapInner("<code>").children("code").addClass(`prism-prettyprint language-${lang}`).attr({
                    "data-lang": lang,
                });
            }
            for (const ele of $content.find("pre, code").not(".mw-code, .prism-prettyprint")) {
                let $ele = $(ele);
                const classListWithLang = [...ele.classList].filter((cls) => /^lang(?:uage)?-[\w-]+$/i.test(cls));
                const lang = acceptsLangs[ele.getAttribute("lang")] || acceptsLangs[classListWithLang[0]?.replace(/^lang(?:uage)?-/, "")];
                if (!lang) {
                    continue;
                }
                langSet.add(lang);
                if (Reflect.has(appendPluginsList, lang)) {
                    pluginsSet.add(appendPluginsList[lang]);
                }
                if (ele.classList.contains("linenums")) {
                    ele.classList.remove("linenums");
                    ele.classList.add("line-numbers", "prism-prettyprint-container");
                }
                ele.removeAttribute("lang");
                for (const cls of classListWithLang) {
                    ele.classList.remove(cls);
                }
                if (ele.tagName === "PRE") {
                    $ele = $ele.wrapInner("<code>").children("code");
                }
                $ele[0].dataset.lang = lang;
                $ele.addClass(`prism-prettyprint language-${lang}`);
            }
            if (langSet.has("wiki") && !Reflect.has(window, "Parser")) {
                await libCachedCode.injectCachedCode("//testingcf.jsdelivr.net/npm/wikiparser-node@browser", "script");
                Parser.config = await (await fetch("/MediaWiki:Gadget-prism-language-wiki.json?action=raw&ctype=application/json")).json();
            }
            await mw.loader.using([
                ...[...langSet].map((lang) => `ext.gadget.prism-language-${lang}`),
                ...[...pluginsSet].map((plugin) => `ext.gadget.prism-plugin-${plugin}`),
            ]);
            for (const ele of $content.find("code.prism-prettyprint")) {
                const lang = ele.dataset.lang;
                if (!acceptsLangNames.includes(lang)) {
                    continue;
                }
                const parent = ele.parentElement;
                if (parent.tagName === "PRE") {
                    parent.classList.add("line-numbers", "prism-prettyprint-container");
                }
                ele.classList.add("match-braces", "rainbow-braces");
                Prism.highlightElement(ele);
            }
        })(),
    );
});
