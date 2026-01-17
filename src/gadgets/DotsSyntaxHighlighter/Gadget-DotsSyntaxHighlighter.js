/**
 * @source https://www.mediawiki.org/wiki/_?oldid=5678566
 * 更新后请同步更新上面链接到最新版本
 */
/* Based on https://www.mediawiki.org/wiki/User:Remember_the_dot/Syntax_highlighter.js */
/* https://www.mediawiki.org/wiki/User:NicoV/Syntax_highlighter.js */
/* This file may be used under the terms of any of the following
   licenses, as well as any later version of the same licenses:

   GNU General Public License 2.0
   <https://www.gnu.org/licenses/old-licenses/gpl-2.0.html>

   Creative Commons Attribution-ShareAlike 3.0 Unported License
   <https://creativecommons.org/licenses/by-sa/3.0/>

   GNU Free Documentation License 1.2
   <https://www.gnu.org/licenses/old-licenses/fdl-1.2.html>
*/

"use strict";
(() => {
    if (mw.user.options.get("usecodemirror")) {
        return;
    }
    let wpTextbox0;
    let wpTextbox1;
    let syntaxStyleTextNode;
    let lastText;
    let maxSpanNumber = -1;
    let highlightSyntaxIfNeededIntervalID;
    let attributeObserver;
    let parentObserver;

    const syntaxHighlighterSiteConfig = window.syntaxHighlighterSiteConfig ||= {};
    const syntaxHighlighterConfig = window.syntaxHighlighterConfig ||= {};

    const wgUrlProtocols = mw.config.get("wgUrlProtocols");
    const entityRegexBase = "&(?:(?:n(?:bsp|dash)|m(?:dash|inus)|lt|e[mn]sp|thinsp|amp|quot|gt|shy|zwn?j|lrm|rlm|Alpha|Beta|Epsilon|Zeta|Eta|Iota|Kappa|[Mm]u|micro|Nu|[Oo]micron|[Rr]ho|Tau|Upsilon|Chi)|#x[0-9a-fA-F]+);\n*";
    const breakerRegexBase = `\\[(?:\\[|(?:${wgUrlProtocols}))|\\{(?:\\{\\{?|\\|)|<(?:[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:\\w\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD-\\.\u00B7\u0300-\u036F\u203F-\u203F-\u2040]*(?=/?>| |\n)|!--[^]*?-->\n*)|(?:${wgUrlProtocols.replace("|\\/\\/", "")})[^\\s"<>[\\]{-}]*[^\\s",\\.:;<>[\\]{-}]\n*|^(?:=|[*#:;]+\n*|-{4,}\n*)|\\\\'\\\\'(?:\\\\')?|~{3,5}\n*|${entityRegexBase}`;
    const breakerRegexWithPrefix = (prefix) => new RegExp(`(${prefix})\n*|${breakerRegexBase}`, "gm");
    const nowikiTagBreakerRegex = (tagName) => new RegExp(`(</${tagName}>)\n*|${entityRegexBase}`, "gm");
    const defaultBreakerRegex = new RegExp(breakerRegexBase, "gm");
    const wikilinkBreakerRegex = breakerRegexWithPrefix("]][a-zA-Z]*");
    const namedExternalLinkBreakerRegex = breakerRegexWithPrefix("]");
    const parameterBreakerRegex = breakerRegexWithPrefix("}}}");
    const templateBreakerRegex = breakerRegexWithPrefix("}}");
    const tableBreakerRegex = breakerRegexWithPrefix("\\|}");
    const headingBreakerRegex = breakerRegexWithPrefix("\n");
    const tagBreakerRegexCache = {};
    const nowikiTagBreakerRegexCache = {};

    const syncScrollX = () => {
        wpTextbox0.scrollLeft = wpTextbox1.scrollLeft;
    };

    const syncScrollY = () => {
        wpTextbox0.scrollTop = wpTextbox1.scrollTop;
    };

    const highlightSyntax = () => {
        lastText = wpTextbox1.value;
        const text = `${lastText.replace(/['\\]/g, "\\BODY")}\n`;
        let i = 0;

        let css = "";
        let spanNumber = 0;
        let lastColor;

        const writeText = (text, color) => {
            if (color !== lastColor) {
                css += "'}";
                if (color) {
                    css += `#s${spanNumber}{background-color:${color}}`;
                }
                css += `#s${spanNumber}::after{content:'`;
                lastColor = color;
                spanNumber++;
            }
            css += text;
        };

        const highlightBlock = (color, breakerRegex, _assumedBold, _assumedItalic) => {
            let match;
            let assumedBold = _assumedBold;
            let assumedItalic = _assumedItalic;
            breakerRegex.lastIndex = i;
            while (Number.MAX_SAFE_INTEGER > Number.MIN_SAFE_INTEGER) {
                match = breakerRegex.exec(text);
                if (match[1]) {
                    writeText(text.substring(i, breakerRegex.lastIndex), color);
                    i = breakerRegex.lastIndex;
                    return;
                }

                const endIndexOfLastColor = breakerRegex.lastIndex - match[0].length;
                if (i < endIndexOfLastColor) {
                    writeText(text.substring(i, endIndexOfLastColor), color);
                }

                i = breakerRegex.lastIndex;

                switch (match[0].charAt(0)) {
                    case "[":
                        if (match[0].charAt(1) === "[") {
                            writeText("[[", syntaxHighlighterConfig.wikilinkColor || color);
                            highlightBlock(syntaxHighlighterConfig.wikilinkColor || color, wikilinkBreakerRegex);
                        } else {
                            writeText(match[0], syntaxHighlighterConfig.externalLinkColor || color);
                            highlightBlock(syntaxHighlighterConfig.externalLinkColor || color, namedExternalLinkBreakerRegex);
                        }
                        break;
                    case "{":
                        if (match[0].charAt(1) === "{") {
                            if (match[0].length === 3) {
                                writeText("{{{", syntaxHighlighterConfig.parameterColor || color);
                                highlightBlock(syntaxHighlighterConfig.parameterColor || color, parameterBreakerRegex);
                            } else {
                                writeText("{{", syntaxHighlighterConfig.templateColor || color);
                                highlightBlock(syntaxHighlighterConfig.templateColor || color, templateBreakerRegex);
                            }
                        } else {
                            writeText("{|", syntaxHighlighterConfig.tableColor || color);
                            highlightBlock(syntaxHighlighterConfig.tableColor || color, tableBreakerRegex);
                        }
                        break;
                    case "<":
                        if (match[0].charAt(1) === "!") {
                            writeText(match[0], syntaxHighlighterConfig.commentColor || color);
                            break;
                        } else {
                            const tagEnd = text.indexOf(">", i) + 1;
                            if (tagEnd === 0) {
                                writeText("<", color);
                                i = i - match[0].length + 1;
                                break;
                            }

                            if (text.charAt(tagEnd - 2) === "/" || syntaxHighlighterConfig.voidTags.includes(match[0].substring(1))) {
                                writeText(text.substring(i - match[0].length, tagEnd), syntaxHighlighterConfig.tagColor || color);
                                i = tagEnd;
                            } else {
                                const tagName = match[0].substring(1);

                                if (syntaxHighlighterConfig.sourceTags.includes(tagName)) {
                                    const stopAfter = `</${tagName}>`;
                                    let endIndex = text.indexOf(stopAfter, i);
                                    if (endIndex === -1) {
                                        endIndex = text.length;
                                    } else {
                                        endIndex += stopAfter.length;
                                    }
                                    writeText(text.substring(i - match[0].length, endIndex), syntaxHighlighterConfig.tagColor || color);
                                    i = endIndex;
                                } else if (syntaxHighlighterConfig.nowikiTags.includes(tagName)) {
                                    writeText(text.substring(i - match[0].length, tagEnd), syntaxHighlighterConfig.tagColor || color);
                                    i = tagEnd;
                                    highlightBlock(syntaxHighlighterConfig.tagColor || color, nowikiTagBreakerRegexCache[tagName]);
                                } else {
                                    writeText(text.substring(i - match[0].length, tagEnd), syntaxHighlighterConfig.tagColor || color);
                                    i = tagEnd;
                                    if (!tagBreakerRegexCache[tagName]) {
                                        tagBreakerRegexCache[tagName] = breakerRegexWithPrefix(`</${tagName}>`);
                                    }
                                    highlightBlock(syntaxHighlighterConfig.tagColor || color, tagBreakerRegexCache[tagName]);
                                }
                            }
                        }
                        break;
                    case "=":
                        if (/[^=]=+$/.test(text.substring(i, text.indexOf("\n", i)))) {
                            writeText("=", syntaxHighlighterConfig.headingColor || color);
                            highlightBlock(syntaxHighlighterConfig.headingColor || color, headingBreakerRegex);
                        } else {
                            writeText("=", color);
                        }
                        break;
                    case "*":
                    case "#":
                    case ":":
                        writeText(match[0], syntaxHighlighterConfig.listOrIndentColor || color);
                        break;
                    case ";":
                        writeText(";", syntaxHighlighterConfig.headingColor || color);
                        highlightBlock(syntaxHighlighterConfig.headingColor || color, headingBreakerRegex);
                        break;
                    case "-":
                        writeText(match[0], syntaxHighlighterConfig.hrColor || color);
                        break;
                    case "\\":
                        writeText(match[0], syntaxHighlighterConfig.boldOrItalicColor || color);
                        if (match[0].length === 6) {
                            if (assumedBold) {
                                if (assumedItalic) {
                                    assumedBold = false;
                                } else {
                                    return;
                                }
                            } else {
                                if (assumedItalic) {
                                    assumedBold = true;
                                } else {
                                    highlightBlock(syntaxHighlighterConfig.boldOrItalicColor || color, defaultBreakerRegex, true, false);
                                }
                            }
                        } else {
                            if (assumedItalic) {
                                if (assumedBold) {
                                    assumedItalic = false;
                                } else {
                                    return;
                                }
                            } else {
                                if (assumedBold) {
                                    assumedItalic = true;
                                } else {
                                    highlightBlock(syntaxHighlighterConfig.boldOrItalicColor || color, defaultBreakerRegex, false, true);
                                }
                            }
                        }
                        break;
                    case "&":
                        writeText(match[0], syntaxHighlighterConfig.entityColor || color);
                        break;
                    case "~":
                        writeText(match[0], syntaxHighlighterConfig.signatureColor || color);
                        break;
                    default:
                        writeText(match[0], syntaxHighlighterConfig.externalLinkColor || color);
                }
                breakerRegex.lastIndex = i;
            }
        };

        const startTime = Date.now();
        highlightBlock("", defaultBreakerRegex);

        if (i < text.length) {
            writeText(text.substring(i), "");
        }

        const endTime = Date.now();

        if (endTime - startTime > syntaxHighlighterConfig.timeout) {
            clearInterval(highlightSyntaxIfNeededIntervalID);
            wpTextbox1.removeEventListener("input", highlightSyntax);
            wpTextbox1.removeEventListener("scroll", syncScrollX);
            wpTextbox1.removeEventListener("scroll", syncScrollY);
            attributeObserver.disconnect();
            parentObserver.disconnect();
            syntaxStyleTextNode.nodeValue = "";

            let errorMessage = {
                zh: "由于渲染耗时过长， Syntax highlighting 已在本页禁用。在设定中渲染时间被限制在$1毫秒以内，但这次我们耗去了$2毫秒。您可以尝试关闭一些标签页和程序，并点击“显示预览”或“显示更改”。如果这不起作用，请尝试更换一个不同的浏览器。如果这还不起作用，请尝试更换一个更快的电脑=w=。",
                en: "Syntax highlighting on this page was disabled because it took too long. The maximum allowed highlighting time is $1ms, and your computer took $2ms. Try closing some tabs and programs and clicking \"Show preview\" or \"Show changes\". If that doesn't work, try a different web browser, and if that doesn't work, try a faster computer.",
            };
            const wgUserLanguage = mw.config.get("wgUserLanguage");

            errorMessage = errorMessage[wgUserLanguage] || errorMessage[wgUserLanguage.substring(0, wgUserLanguage.indexOf("-"))] || errorMessage.en;

            wpTextbox1.style.backgroundColor = "";
            wpTextbox1.style.marginTop = "0";
            wpTextbox0.removeAttribute("dir");
            wpTextbox0.removeAttribute("lang");
            wpTextbox0.setAttribute("style", "color:red; font-size:small");

            wpTextbox0.textContent = errorMessage.replace("$1", syntaxHighlighterConfig.timeout).replace("$2", endTime - startTime);
            return;
        }

        if (maxSpanNumber < spanNumber) {
            const fragment = document.createDocumentFragment();
            do {
                fragment.appendChild(document.createElement("span")).id = `s${++maxSpanNumber}`;
            }
            while (maxSpanNumber < spanNumber);
            wpTextbox0.appendChild(fragment);
        }

        syntaxStyleTextNode.nodeValue = `${css.substring(2).replace(/\n/g, "\\A ")}'}#wpTextbox0>span::after{visibility:hidden}`;
    };

    const syncTextDirection = () => {
        wpTextbox0.dir = wpTextbox1.dir;
    };

    const syncParent = () => {
        if (wpTextbox1.previousSibling !== wpTextbox0) {
            wpTextbox1.parentNode.insertBefore(wpTextbox0, wpTextbox1);
            parentObserver.disconnect();
            parentObserver.observe(wpTextbox1.parentNode, { childList: true });
        }
    };

    const highlightSyntaxIfNeeded = () => {
        if (wpTextbox1.value !== lastText) {
            highlightSyntax();
        }
        if (wpTextbox1.scrollLeft !== wpTextbox0.scrollLeft) {
            syncScrollX();
        }
        if (wpTextbox1.scrollTop !== wpTextbox0.scrollTop) {
            syncScrollY();
        }
        if (wpTextbox1.offsetHeight !== wpTextbox0.offsetHeight) {
            const height = `${wpTextbox1.offsetHeight}px`;
            wpTextbox0.style.height = height;
            wpTextbox1.style.marginTop = `-${height}`;
        }
    };

    const setup = () => {
        wpTextbox1 = document.getElementById("wpTextbox1");
        if (!wpTextbox1) {
            return;
        }
        if (document.getElementById("wpTextbox0")) {
            return;
        }
        const configureColor = (parameterName, hardcodedFallback, defaultOk) => {
            if (typeof syntaxHighlighterConfig[parameterName] === "undefined") {
                syntaxHighlighterConfig[parameterName] = syntaxHighlighterSiteConfig[parameterName];
            }

            if (syntaxHighlighterConfig[parameterName] === "normal") {
                syntaxHighlighterConfig[parameterName] = hardcodedFallback;
            } else if (typeof syntaxHighlighterConfig[parameterName] !== "undefined") {
                return;
            } else if (typeof syntaxHighlighterConfig.defaultColor !== "undefined" && defaultOk) {
                syntaxHighlighterConfig[parameterName] = syntaxHighlighterConfig.defaultColor;
            } else {
                syntaxHighlighterConfig[parameterName] = hardcodedFallback;
            }
        };

        configureColor("backgroundColor", "#FFF", false);
        configureColor("foregroundColor", "#000", false);
        configureColor("boldOrItalicColor", "#EEE", true);
        configureColor("commentColor", "#EFE", true);
        configureColor("entityColor", "#DFD", true);
        configureColor("externalLinkColor", "#EFF", true);
        configureColor("headingColor", "#EEE", true);
        configureColor("hrColor", "#EEE", true);
        configureColor("listOrIndentColor", "#EFE", true);
        configureColor("parameterColor", "#FC6", true);
        configureColor("signatureColor", "#FC6", true);
        configureColor("tagColor", "#FEF", true);
        configureColor("tableColor", "#FFC", true);
        configureColor("templateColor", "#FFC", true);
        configureColor("wikilinkColor", "#EEF", true);
        syntaxHighlighterConfig.nowikiTags ||= syntaxHighlighterSiteConfig.nowikiTags || ["nowiki", "pre"];
        syntaxHighlighterConfig.sourceTags ||= syntaxHighlighterSiteConfig.sourceTags || ["math", "syntaxhighlight", "source", "timeline", "hiero", "score"];
        syntaxHighlighterConfig.voidTags ||= syntaxHighlighterSiteConfig.voidTags || ["br", "hr"];
        syntaxHighlighterConfig.timeout ||= syntaxHighlighterSiteConfig.timeout || 20;

        syntaxHighlighterConfig.nowikiTags.forEach((tagName) => {
            nowikiTagBreakerRegexCache[tagName] = nowikiTagBreakerRegex(tagName);
        });

        wpTextbox0 = document.createElement("div");
        wpTextbox1 = document.getElementById("wpTextbox1");

        const syntaxStyleElement = document.createElement("style");
        syntaxStyleTextNode = syntaxStyleElement.appendChild(document.createTextNode(""));

        const wpTextbox1Style = window.getComputedStyle(wpTextbox1);

        const resize = wpTextbox1Style.resize === "vertical" || wpTextbox1Style.resize === "both" ? "vertical" : "none";

        wpTextbox0.dir = wpTextbox1.dir;
        wpTextbox0.id = "wpTextbox0";
        wpTextbox0.lang = wpTextbox1.lang; // lang determines which font "monospace" is
        wpTextbox0.style.backgroundColor = syntaxHighlighterConfig.backgroundColor;
        wpTextbox0.style.borderBottomLeftRadius = wpTextbox1Style.borderBottomLeftRadius;
        wpTextbox0.style.borderBottomRightRadius = wpTextbox1Style.borderBottomRightRadius;
        wpTextbox0.style.borderBottomStyle = wpTextbox1Style.borderBottomStyle;
        wpTextbox0.style.borderBottomWidth = wpTextbox1Style.borderBottomWidth;
        wpTextbox0.style.borderColor = "transparent";
        wpTextbox0.style.borderLeftStyle = wpTextbox1Style.borderLeftStyle;
        wpTextbox0.style.borderLeftWidth = wpTextbox1Style.borderLeftWidth;
        wpTextbox0.style.borderRightStyle = wpTextbox1Style.borderRightStyle;
        wpTextbox0.style.borderRightWidth = wpTextbox1Style.borderRightWidth;
        wpTextbox0.style.borderTopLeftRadius = wpTextbox1Style.borderTopLeftRadius;
        wpTextbox0.style.borderTopRightRadius = wpTextbox1Style.borderTopRightRadius;
        wpTextbox0.style.borderTopStyle = wpTextbox1Style.borderTopStyle;
        wpTextbox0.style.borderTopWidth = wpTextbox1Style.borderTopWidth;
        wpTextbox0.style.boxSizing = "border-box";
        wpTextbox0.style.clear = wpTextbox1Style.clear;
        wpTextbox0.style.fontFamily = wpTextbox1Style.fontFamily;
        wpTextbox0.style.fontSize = wpTextbox1Style.fontSize;
        wpTextbox0.style.lineHeight = "normal";
        wpTextbox0.style.marginBottom = "0";
        wpTextbox0.style.marginLeft = "0";
        wpTextbox0.style.marginRight = "0";
        wpTextbox0.style.marginTop = "0";
        wpTextbox0.style.overflowX = "auto";
        wpTextbox0.style.overflowY = "scroll";
        wpTextbox0.style.resize = resize;
        wpTextbox0.style.tabSize = wpTextbox1Style.tabSize;
        wpTextbox0.style.whiteSpace = "pre-wrap";
        wpTextbox0.style.width = "100%";
        wpTextbox0.style.wordWrap = "normal"; // see below

        wpTextbox1.style.backgroundColor = "transparent";
        wpTextbox1.style.borderBottomLeftRadius = wpTextbox1Style.borderBottomLeftRadius;
        wpTextbox1.style.borderBottomRightRadius = wpTextbox1Style.borderBottomRightRadius;
        wpTextbox1.style.borderBottomStyle = wpTextbox1Style.borderBottomStyle;
        wpTextbox1.style.borderBottomWidth = wpTextbox1Style.borderBottomWidth;
        wpTextbox1.style.borderLeftStyle = wpTextbox1Style.borderLeftStyle;
        wpTextbox1.style.borderLeftWidth = wpTextbox1Style.borderLeftWidth;
        wpTextbox1.style.borderRightStyle = wpTextbox1Style.borderRightStyle;
        wpTextbox1.style.borderRightWidth = wpTextbox1Style.borderRightWidth;
        wpTextbox1.style.borderTopLeftRadius = wpTextbox1Style.borderTopLeftRadius;
        wpTextbox1.style.borderTopRightRadius = wpTextbox1Style.borderTopRightRadius;
        wpTextbox1.style.borderTopStyle = wpTextbox1Style.borderTopStyle;
        wpTextbox1.style.borderTopWidth = wpTextbox1Style.borderTopWidth;
        wpTextbox1.style.boxSizing = "border-box";
        wpTextbox1.style.clear = wpTextbox1Style.clear;
        wpTextbox1.style.color = syntaxHighlighterConfig.foregroundColor;
        wpTextbox1.style.fontFamily = wpTextbox1Style.fontFamily;
        wpTextbox1.style.fontSize = wpTextbox1Style.fontSize;
        wpTextbox1.style.lineHeight = "normal";
        wpTextbox1.style.marginBottom = wpTextbox1Style.marginBottom; // lock to pixel value because the top margin was also locked to a pixel value when it was moved to wpTextbox0
        wpTextbox1.style.marginLeft = "0";
        wpTextbox1.style.marginRight = "0";
        wpTextbox1.style.overflowX = "auto";
        wpTextbox1.style.overflowY = "scroll";
        wpTextbox1.style.padding = "0";
        wpTextbox1.style.resize = resize;
        wpTextbox1.style.tabSize = wpTextbox1Style.tabSize;
        wpTextbox1.style.whiteSpace = "pre-wrap";
        wpTextbox1.style.width = "100%";
        wpTextbox1.style.wordWrap = "normal"; // overall more visually appealing

        // lock both heights to pixel values so that the browser zoom feature works better
        wpTextbox1.style.height = wpTextbox0.style.height = `${wpTextbox1.offsetHeight}px`;

        // insert wpTextbox0 underneath wpTextbox1
        wpTextbox1.style.marginTop = `${-wpTextbox1.offsetHeight}px`;
        wpTextbox1.parentNode.insertBefore(wpTextbox0, wpTextbox1);

        document.head.appendChild(syntaxStyleElement);

        wpTextbox1.addEventListener("input", highlightSyntax);
        wpTextbox1.addEventListener("scroll", syncScrollX);
        wpTextbox1.addEventListener("scroll", syncScrollY);
        attributeObserver = new MutationObserver(syncTextDirection);
        attributeObserver.observe(wpTextbox1, { attributes: true });
        parentObserver = new MutationObserver(syncParent);
        parentObserver.observe(wpTextbox1.parentNode, { childList: true });
        highlightSyntaxIfNeededIntervalID = setInterval(highlightSyntaxIfNeeded, 500);
        highlightSyntax();
    };

    const wgAction = mw.config.get("wgAction");
    const layoutEngine = $.client.profile().layout;
    if ((wgAction === "edit" || wgAction === "submit") && mw.config.get("wgPageContentModel") === "wikitext" && layoutEngine !== "trident" && layoutEngine !== "edge") {
        if (document.readyState === "complete") {
            setup();
        } else {
            window.addEventListener("load", setup);
        }
    }
})();
