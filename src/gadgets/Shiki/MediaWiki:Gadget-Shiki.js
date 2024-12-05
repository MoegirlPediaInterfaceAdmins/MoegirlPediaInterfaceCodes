/**
 * MediaWiki Gadget Shiki.js Code Highlighter
 * @author Dragon-Fish <dragon-fish@qq.com>
 * @license MIT
*/

/* eslint-disable prefer-arrow-functions/prefer-arrow-functions */
/* eslint-disable no-use-before-define */

"use strict";

(async () => {
    const SHIKI_CDN = "https://esm.sh/shiki@1.24.0";
    const TARGET_ELEMENTS = document.querySelectorAll(["pre.highlight", "pre.hljs", "pre.prettyprint", "pre.mw-code", "pre[lang]", "code[lang]", "pre[data-lang]", "code[data-lang]"]);

    const shiki = await import(SHIKI_CDN);
    TARGET_ELEMENTS.forEach((el) => {
        renderBlock(shiki, el);
    });
    mw.hook("npm:shiki").fire(shiki);

    const getLangFromContentModel = () => {
        const nsNumber = mw.config.get("wgNamespaceNumber");
        const pageName = mw.config.get("wgPageName");
        const contentModel = mw.config.get("wgPageContentModel", "").toLowerCase();
        if (pageName.endsWith(".js") || contentModel === "javascript") {
            return "javascript";
        } else if (pageName.endsWith(".css") || contentModel === "css") {
            return "css";
        } else if (
            // Lua
            (nsNumber === 828 || ["scribunto", "lua"].includes(contentModel))
            && !pageName.endsWith("/doc")
        ) {
            return "lua";
        }
    };

    /**
     * @param {HTMLElement} el
     */
    const getLangFromElement = (el) => {
        const lang = el.getAttribute("lang") || el.dataset.lang || Array.from(el.classList).find((c) => c.startsWith("language-") || c.startsWith("lang-"));
        if (lang) {
            return lang.includes("-") ? lang.split("-")[1] : lang;
        }
        return "";
    };

    /**
     * @param {import('shiki')} shiki
     * @param {HTMLElement} el
     * @returns {Promise<HTMLElement | null>}
     */
    async function renderBlock(shiki, el) {
        if (el.classList.contains("shiki") || !!el.dataset.shikiRendered) {
            return Promise.resolve(null);
        }
        const lang = getLangFromElement(el) || getLangFromContentModel();
        if (!lang) {
            return Promise.resolve(null);
        }

        const langInfo = shiki.bundledLanguagesInfo.find((i) => i.aliases?.includes(lang) || i.id === lang || i.name === lang);
        const langLabel = (() => {
            if (!langInfo) {
                return lang;
            }
            return [langInfo.aliases?.[0], langInfo.name, langInfo.id, lang].filter(Boolean).sort((a, b) => a.length - b.length)[0];
        })();
        console.info("[SHIKI]", "Rendering", el, lang, langInfo);

        const lineFrom = el.dataset.lineFrom || el.dataset.from || "1";

        const renderedEl = await shiki
            .codeToHtml(el.innerText.trimEnd(), {
                lang,
                theme: "one-dark-pro",
                transformers: [
                    {
                        pre: (node) => {
                            node.properties.class += ` lang-${langLabel}`;
                            node.properties.style += ";";
                            node.properties.style += `padding-right: ${(10 * langLabel.length + 12).toFixed()}px;`;
                            if (lineFrom) {
                                node.properties.class += " line-number";
                            }
                        },
                        code: (node) => {
                            node.properties.class += " shiki-code";
                            node.tagName = "div";
                            node.properties.style += `;--start: ${+lineFrom};`;
                        },
                        line: (node, line) => {
                            node.properties["data-line-number-raw"] = line;
                        },
                        postprocess: (html) => {
                            if (langLabel) {
                                return html.replace("</pre>", `<span class="shiki-lang-badge">${langLabel}</span></pre>`);
                            }
                        },
                    },
                ],
            })
            .then((html) => {
                el.style.display = "none";
                el.dataset.shikiRendered = "1";
                const wrapper = document.createElement("div");
                wrapper.innerHTML = html;
                const pre = wrapper.querySelector("pre");
                el.insertAdjacentElement("afterend", pre);
                return pre;
            })
            .catch((e) => {
                console.error("[SHIKI] Render failed", el, e);
                return null;
            });
        return renderedEl;
    };
})();
