"use strict";
$(() => {
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
    let hash = /^#L\d+$/u.test(location.hash);
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
            if (wgPageContentModel === "wikitext") {
                for (const ele of $content.find("pre, code")) {
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
            }
            await mw.loader.using([
                ...[...langSet].map((lang) => `ext.gadget.prism-language-${lang}`),
                ...[...pluginsSet].map((plugin) => `ext.gadget.prism-plugin-${plugin}`),
            ]);
            if (langSet.has("wiki") && !Prism.languages.wiki) {
                const workerJS = (config) => {
                    self.importScripts(`${location.origin}/MediaWiki:Gadget-prism-language-wiki.js?action=raw&ctype=text/javascript`);
                    self.Parser.config = JSON.parse(config);
                    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;" },
                        keyword = "keyword",
                        url = "url",
                        bold = "bold",
                        doctype = "doctype",
                        comment = "comment",
                        tag = "tag",
                        punctuation = "punctuation",
                        variable = "variable",
                        builtin = "builtin",
                        template = "function",
                        symbol = "symbol",
                        selector = "selector",
                        string = "string",
                        map = {
                            "redirect-syntax": keyword,
                            "redirect-target": url,
                            "link-target": `${url} ${bold}`,
                            noinclude: doctype,
                            include: doctype,
                            comment,
                            ext: tag,
                            "ext-attr-dirty": comment,
                            "ext-attr": punctuation,
                            "attr-key": "attr-name",
                            "attr-value": "attr-value",
                            arg: variable,
                            "arg-name": variable,
                            hidden: comment,
                            "magic-word": builtin,
                            "magic-word-name": builtin,
                            "invoke-function": template,
                            "invoke-module": template,
                            template,
                            "template-name": `${template} ${bold}`,
                            parameter: punctuation,
                            "parameter-key": variable,
                            heading: symbol,
                            "heading-title": bold,
                            html: tag,
                            "html-attr-dirty": comment,
                            "html-attr": punctuation,
                            table: symbol,
                            tr: symbol,
                            td: symbol,
                            "table-syntax": symbol,
                            "table-attr-dirty": comment,
                            "table-attr": punctuation,
                            "table-inter": "deleted",
                            hr: symbol,
                            "double-underscore": "constant",
                            link: url,
                            category: url,
                            file: url,
                            "gallery-image": url,
                            "imagemap-image": url,
                            "image-parameter": keyword,
                            quote: `${symbol} ${bold}`,
                            "ext-link": url,
                            "ext-link-url": url,
                            "free-ext-link": url,
                            list: symbol,
                            dd: symbol,
                            converter: selector,
                            "converter-flags": punctuation,
                            "converter-flag": string,
                            "converter-rule": punctuation,
                            "converter-rule-variant": string,
                        };
                    self.onmessage = ({ data }) => {
                        const { code } = JSON.parse(data),
                            tree = self.Parser.parse(code).json();
                        const slice = (type, parentType, start, end) => {
                            const text = code.slice(start, end).replace(/[&<>]/g, (p) => entities[p]);
                            let t = type || parentType;
                            if (parentType === "image-parameter") {
                                t = "root";
                            } else if (type === "converter" && text === ";") {
                                t = "converter-rule";
                            }
                            return Reflect.has(map, t) ? `<span class="token ${map[t]}">${text}</span>` : text;
                        };
                        const stack = [];
                        let cur = tree,
                            index = 0,
                            last = 0,
                            out = false,
                            output = "";
                        while (last < code.length) {
                            const { type, range: [, to], childNodes } = cur,
                                parentNode = stack[0]?.[0];
                            if (out || !childNodes?.length) {
                                const [, i] = stack[0];
                                if (last < to) {
                                    output += slice(type, parentNode.type, last, to);
                                    last = to;
                                }
                                index++;
                                if (index === parentNode.childNodes.length) {
                                    cur = parentNode;
                                    index = i;
                                    stack.shift();
                                    out = true;
                                } else {
                                    cur = parentNode.childNodes[index];
                                    out = false;
                                    const { range: [from] } = cur;
                                    if (last < from) {
                                        output += slice(parentNode.type, stack[1]?.[0].type, last, from);
                                        last = from;
                                    }
                                }
                            } else {
                                const child = childNodes[0],
                                    { range: [from] } = child;
                                if (last < from) {
                                    output += slice(type, parentNode?.type, last, from);
                                    last = from;
                                }
                                stack.unshift([cur, index]);
                                cur = child;
                                index = 0;
                            }
                        }
                        postMessage(output);
                        close();
                    };
                };
                const config = JSON.stringify(
                    await (await fetch("/MediaWiki:Gadget-prism-language-wiki.json?action=raw&ctype=application/json")).json(),
                );
                const filename = URL.createObjectURL(
                    new Blob([`(${String(workerJS)})(\`${config}\`)`], { type: "text/javascript" }),
                );
                Object.assign(Prism, { filename });
                Prism.languages.wiki = {};
            }
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
                Prism.highlightElement(ele, lang === "wiki");
            }
        })(),
    );
});
