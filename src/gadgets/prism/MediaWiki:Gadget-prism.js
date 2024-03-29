"use strict";
$(() => {
    window.Prism = { manual: true };
    const acceptsLangs = {
        // css
        css: "css",
        "sanitized-css": "css",

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
        mathml: "markup",
        svg: "markup",
        xml: "markup",
        ssml: "markup",
        atom: "markup",
        rss: "markup",

        // php
        php: "php",

        // regex
        regex: "regex",

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
    mw.hook("wikipage.content").add(
        /**
         * @param { JQuery<HTMLElement> } $content
         */
        async ($content) => {
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
                $content.find(".mw-code").addClass("linkable-line-numbers").wrapInner("<code>").children("code").addClass(`prism-prettyprint language-${lang}`).attr({
                    id: "code",
                    "data-lang": lang,
                });
                const hashWatcher = () => {
                    if (/^#L[0-9]\d*$/.test(location.hash)) {
                        location.hash = location.hash.replace(/^#L/, "#code.");
                    }
                };
                window.addEventListener("hashchange", hashWatcher);
                hashWatcher();
            }
            if (wgPageContentModel === "wikitext") {
                for (const ele of $content.find("pre, code")) {
                    let $ele = $(ele);
                    const classListWithLang = [...ele.classList].filter((cls) => /^lang(?:uage)-[\w-]+/i.test(cls));
                    const lang = acceptsLangs[ele.getAttribute("lang")] || acceptsLangs[classListWithLang[0]?.replace("lang(?:uage)-", "")];
                    if (!lang) {
                        continue;
                    }
                    langSet.add(lang);
                    if (Reflect.has(appendPluginsList, lang)) {
                        pluginsSet.add(appendPluginsList[lang]);
                    }
                    ele.classList.remove("linenums");
                    ele.removeAttribute("lang");
                    ele.dataset.lang = lang;
                    for (const cls of classListWithLang) {
                        ele.classList.remove(cls);
                    }
                    if (ele.tagName === "PRE") {
                        $ele = $ele.wrapInner("<code>").children("code");
                    }
                    $ele.addClass(`prism-prettyprint language-${lang}`);
                }
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
                    parent.classList.add("line-numbers");
                }
                ele.classList.add("match-braces", "rainbow-braces");
                Prism.highlightElement(ele);
            }
        },
    );
});
