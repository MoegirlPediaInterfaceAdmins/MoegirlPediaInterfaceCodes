/* eslint-disable no-use-before-define, camelcase */
/**
 * @source https://github.com/PrismJS/prism
 * 更新后请同步更新上面链接到最新版本
 */
/**
 * @file 引自 https://github.com/PrismJS/prism，遵守 MIT 协议，Copyright (c) 2012 Lea Verou.
 */
// <pre>
"use strict";
(() => {
    // @ts-expect-error 加载Prism前的预设置
    window.Prism = { manual: true };
    const workerJS = (config) => {
        self.importScripts("https://testingcf.jsdelivr.net/npm/wikiparser-node@1.6.2-b/bundle/bundle.min.js");
        self.Parser.config = JSON.parse(config);
        const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;" },
            commentType = "comment italic",
            tagType = "attr-name bold",
            attrType = "attr-name",
            tableType = "regex bold",
            syntaxType = "atrule bold",
            linkType = "atrule",
            templateType = "symbol bold",
            magicType = "property bold",
            invokeType = "property",
            parameterType = "symbol",
            converterType = "operator bold",
            ruleType = "operator",
            map = {
                "table-inter": "deleted",
                hidden: commentType,
                noinclude: commentType,
                include: commentType,
                comment: commentType,
                "ext-attr-dirty": commentType,
                "html-attr-dirty": commentType,
                "table-attr-dirty": commentType,
                ext: tagType,
                html: tagType,
                "ext-attr": attrType,
                "html-attr": attrType,
                "table-attr": attrType,
                "attr-key": attrType,
                "attr-value": attrType,
                arg: tableType,
                "arg-name": tableType,
                "arg-default": "regex",
                template: templateType,
                "template-name": templateType,
                "magic-word": magicType,
                "magic-word-name": magicType,
                "invoke-function": invokeType,
                "invoke-module": invokeType,
                parameter: parameterType,
                "parameter-key": parameterType,
                heading: linkType,
                "image-parameter": linkType,
                "heading-title": "bold",
                table: tableType,
                tr: tableType,
                td: tableType,
                "table-syntax": tableType,
                "double-underscore": syntaxType,
                hr: syntaxType,
                quote: syntaxType,
                list: syntaxType,
                dd: syntaxType,
                "redirect-syntax": syntaxType,
                link: linkType,
                category: linkType,
                file: linkType,
                "gallery-image": linkType,
                "imagemap-image": linkType,
                "redirect-target": linkType,
                "link-target": linkType,
                "ext-link": linkType,
                "ext-link-url": linkType,
                "free-ext-link": linkType,
                converter: converterType,
                "converter-flags": converterType,
                "converter-flag": converterType,
                "converter-rule": ruleType,
                "converter-rule-variant": ruleType,
            };
        self.onmessage = ({ data }) => {
            const { code } = JSON.parse(data),
                tree = self.Parser.parse(code).json();
            const slice = (type, parentType, start, end) => {
                const text = code.slice(start, end).replace(/[&<>]/gu, (p) => entities[p]);
                let t = type || parentType;
                if (parentType === "image-parameter") {
                    t = "root";
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
    const alias = {
            "sanitized-css": "css",
            scribunto: "lua",
            wikitext: "wiki",
            mediawiki: "wiki",
            mw: "wiki",
        },
        contentModel = mw.config.get("wgPageContentModel").toLowerCase(),
        regexAlias = new RegExp(`\\blang(?:uage)?-(${Object.keys(alias).join("|")})\\b`, "iu");
    let config, filename;
    const main = async ($content) => {
        if (contentModel === "wikitext") {
            $content.find("pre[class*=lang-], pre[class*=language-], code[class*=lang-], code[class*=language-]")
                .each(function () {
                    this.className = this.className.replace(regexAlias, (_, lang) => `lang-${alias[lang]}`)
                        .replace(/\blinenums\b/u, "line-numbers");
                });
            $content.find("pre[lang], code.prettyprint[lang]").addClass(function () {
                const lang = this.lang.toLowerCase();
                return `${this.tagName === "PRE" ? "line-numbers " : ""}lang-${alias[lang] ?? lang}`;
            });
        } else {
            $content.find(".mw-code").addClass(`line-numbers lang-${alias[contentModel] || contentModel}`);
        }
        const $block = $content.find("pre, code").filter((_, { className }) => /\blang(?:uage)?-/iu.test(className));
        if ($block.length === 0) {
            return;
        }
        const src = "https://testingcf.jsdelivr.net/npm/prismjs/plugins/autoloader/prism-autoloader.min.js";
        Object.assign(Prism.util, {
            currentScript: () => ({
                src,
                getAttribute: () => null,
            }),
        });
        if ($block.filter(".lang-wiki, .language-wiki").length) {
            config = JSON.stringify(
                await (await fetch("/MediaWiki:Gadget-prism.json?action=raw&ctype=application/json")).json(),
            );
            filename = URL.createObjectURL(
                new Blob([`(${String(workerJS)})('${config}')`], { type: "application/javascript" }),
            );
            Object.assign(Prism, { filename });
            Prism.languages.wiki ||= {};
        }
        $block.filter("pre").wrapInner("<code>").children("code").add($block.filter("code"))
            .each((_, code) => {
                const lang = Prism.util.getLanguage(code);
                const callback = () => {
                    let hash = /^#L\d+$/u.test(location.hash);
                    const { dataset: { start = 1 } } = code.parentElement;
                    $(code).children(".line-numbers-rows").children().each((i, ele) => {
                        ele.id = `L${i + Number(start)}`;
                        if (hash && location.hash === `#${ele.id}`) {
                            hash = false;
                            ele.scrollIntoView();
                        }
                    });
                };
                if (lang === "wiki") {
                    Prism.highlightElement(code, true, callback);
                } else {
                    Prism.highlightElement(code);
                    callback();
                }
            });
    };

    /// <reference lib="WebWorker"/>

    const _self = typeof window !== "undefined"
        ? window // if in browser
        : typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope
            ? self // if in worker
            : {} // if in node js
    ;

    /**
    * Prism: Lightweight, robust, elegant syntax highlighting
    *
    * @license MIT <https://opensource.org/licenses/MIT>
    * @author Lea Verou <https://lea.verou.me>
    * @namespace
    * @public
    */
    var Prism = (function (_self) {
    // Private helper vars
        const lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i;
        let uniqueId = 0;

        // The grammar object for plaintext
        const plainTextGrammar = {};

        var _ = {
        /**
         * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
         * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
         * additional languages or plugins yourself.
         *
         * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
         *
         * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
         * empty Prism object into the global scope before loading the Prism script like this:
         *
         * ```js
         * window.Prism = window.Prism || {};
         * Prism.manual = true;
         * // add a new <script> to load Prism's script
         * ```
         *
         * @default false
         * @type {boolean}
         * @memberof Prism
         * @public
         */
            manual: _self.Prism && _self.Prism.manual,
            /**
         * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
         * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
         * own worker, you don't want it to do this.
         *
         * By setting this value to `true`, Prism will not add its own listeners to the worker.
         *
         * You obviously have to change this value before Prism executes. To do this, you can add an
         * empty Prism object into the global scope before loading the Prism script like this:
         *
         * ```js
         * window.Prism = window.Prism || {};
         * Prism.disableWorkerMessageHandler = true;
         * // Load Prism's script
         * ```
         *
         * @default false
         * @type {boolean}
         * @memberof Prism
         * @public
         */
            disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,

            /**
         * A namespace for utility methods.
         *
         * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
         * change or disappear at any time.
         *
         * @namespace
         * @memberof Prism
         */
            util: {
                encode: (tokens) => {
                    if (tokens instanceof Token) {
                        return new Token(tokens.type, encode(tokens.content), tokens.alias);
                    } else if (Array.isArray(tokens)) {
                        return tokens.map(encode);
                    }
                    return tokens.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
                },

                /**
             * Returns the name of the type of the given value.
             *
             * @param {any} o
             * @returns {string}
             * @example
             * type(null)      === 'Null'
             * type(undefined) === 'Undefined'
             * type(123)       === 'Number'
             * type('foo')     === 'String'
             * type(true)      === 'Boolean'
             * type([1, 2])    === 'Array'
             * type({})        === 'Object'
             * type(String)    === 'Function'
             * type(/abc+/)    === 'RegExp'
             */
                type: (o) => Object.prototype.toString.call(o).slice(8, -1),

                /**
             * Returns a unique number for the given object. Later calls will still return the same number.
             *
             * @param {Object} obj
             * @returns {number}
             */
                objId: (obj) => {
                    if (!obj.__id) {
                        Object.defineProperty(obj, "__id", { value: ++uniqueId });
                    }
                    return obj.__id;
                },

                /**
             * Creates a deep clone of the given object.
             *
             * The main intended use of this function is to clone language definitions.
             *
             * @param {T} o
             * @param {Record<number, any>} [visited]
             * @returns {T}
             * @template T
             */
                clone: (o, visited) => {
                    visited ||= {};

                    let clone; let id;
                    switch (_.util.type(o)) {
                        case "Object":
                            id = _.util.objId(o);
                            if (visited[id]) {
                                return visited[id];
                            }
                            clone = /** @type {Record<string, any>} */ {};
                            visited[id] = clone;

                            for (const key in o) {
                                if (o.hasOwnProperty(key)) {
                                    clone[key] = deepClone(o[key], visited);
                                }
                            }

                            return /** @type {any} */ clone;

                        case "Array":
                            id = _.util.objId(o);
                            if (visited[id]) {
                                return visited[id];
                            }
                            clone = [];
                            visited[id] = clone;

                            /** @type {Array} *//** @type {any} */o.forEach((v, i) => {
                                clone[i] = deepClone(v, visited);
                            });

                            return /** @type {any} */ clone;

                        default:
                            return o;
                    }
                },

                /**
             * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
             *
             * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
             *
             * @param {Element} element
             * @returns {string}
             */
                getLanguage: (element) => {
                    while (element) {
                        const m = lang.exec(element.className);
                        if (m) {
                            return m[1].toLowerCase();
                        }
                        element = element.parentElement;
                    }
                    return "none";
                },

                /**
             * Sets the Prism `language-xxxx` class of the given element.
             *
             * @param {Element} element
             * @param {string} language
             * @returns {void}
             */
                setLanguage: (element, language) => {
                // remove all `language-xxxx` classes
                // (this might leave behind a leading space)
                    element.className = element.className.replace(RegExp(lang, "gi"), "");

                    // add the new `language-xxxx` class
                    // (using `classList` will automatically clean up spaces for us)
                    element.classList.add(`language-${language}`);
                },

                /**
             * Returns the script element that is currently executing.
             *
             * This does __not__ work for line script element.
             *
             * @returns {HTMLScriptElement | null}
             */
                currentScript: () => {
                    if (typeof document === "undefined") {
                        return null;
                    }
                    if ("currentScript" in document && 1 < 2 /* hack to trip TS' flow analysis */) {
                        return /** @type {any} */ document.currentScript;
                    }

                    // IE11 workaround
                    // we'll get the src of the current script by parsing IE11's error stack trace
                    // this will not work for inline scripts

                    try {
                        throw new Error();
                    } catch (err) {
                    // Get file src url from stack. Specifically works with the format of stack traces in IE.
                    // A stack will look like this:
                    //
                    // Error
                    //    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
                    //    at Global code (http://localhost/components/prism-core.js:606:1)

                        const src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
                        if (src) {
                            const scripts = document.getElementsByTagName("script");
                            for (const i in scripts) {
                                if (scripts[i].src == src) {
                                    return scripts[i];
                                }
                            }
                        }
                        return null;
                    }
                },

                /**
             * Returns whether a given class is active for `element`.
             *
             * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
             * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
             * given class is just the given class with a `no-` prefix.
             *
             * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
             * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
             * ancestors have the given class or the negated version of it, then the default activation will be returned.
             *
             * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
             * version of it, the class is considered active.
             *
             * @param {Element} element
             * @param {string} className
             * @param {boolean} [defaultActivation=false]
             * @returns {boolean}
             */
                isActive: (element, className, defaultActivation) => {
                    const no = `no-${className}`;

                    while (element) {
                        const classList = element.classList;
                        if (classList.contains(className)) {
                            return true;
                        }
                        if (classList.contains(no)) {
                            return false;
                        }
                        element = element.parentElement;
                    }
                    return !!defaultActivation;
                },
            },

            /**
         * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
         *
         * @namespace
         * @memberof Prism
         * @public
         */
            languages: {
            /**
             * The grammar for plain, unformatted text.
             */
                plain: plainTextGrammar,
                plaintext: plainTextGrammar,
                text: plainTextGrammar,
                txt: plainTextGrammar,

                /**
             * Creates a deep copy of the language with the given id and appends the given tokens.
             *
             * If a token in `redef` also appears in the copied language, then the existing token in the copied language
             * will be overwritten at its original position.
             *
             * ## Best practices
             *
             * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
             * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
             * understand the language definition because, normally, the order of tokens matters in Prism grammars.
             *
             * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
             * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
             *
             * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
             * @param {Grammar} redef The new tokens to append.
             * @returns {Grammar} The new language created.
             * @public
             * @example
             * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
             *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
             *     // at its original position
             *     'comment': { ... },
             *     // CSS doesn't have a 'color' token, so this token will be appended
             *     'color': /\b(?:red|green|blue)\b/
             * });
             */
                extend: (id, redef) => {
                    const lang = _.util.clone(_.languages[id]);

                    for (const key in redef) {
                        lang[key] = redef[key];
                    }

                    return lang;
                },

                /**
             * Inserts tokens _before_ another token in a language definition or any other grammar.
             *
             * ## Usage
             *
             * This helper method makes it easy to modify existing languages. For example, the CSS language definition
             * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
             * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
             * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
             * this:
             *
             * ```js
             * Prism.languages.markup.style = {
             *     // token
             * };
             * ```
             *
             * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
             * before existing tokens. For the CSS example above, you would use it like this:
             *
             * ```js
             * Prism.languages.insertBefore('markup', 'cdata', {
             *     'style': {
             *         // token
             *     }
             * });
             * ```
             *
             * ## Special cases
             *
             * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
             * will be ignored.
             *
             * This behavior can be used to insert tokens after `before`:
             *
             * ```js
             * Prism.languages.insertBefore('markup', 'comment', {
             *     'comment': Prism.languages.markup.comment,
             *     // tokens after 'comment'
             * });
             * ```
             *
             * ## Limitations
             *
             * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
             * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
             * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
             * deleting properties which is necessary to insert at arbitrary positions.
             *
             * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
             * Instead, it will create a new object and replace all references to the target object with the new one. This
             * can be done without temporarily deleting properties, so the iteration order is well-defined.
             *
             * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
             * you hold the target object in a variable, then the value of the variable will not change.
             *
             * ```js
             * var oldMarkup = Prism.languages.markup;
             * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
             *
             * assert(oldMarkup !== Prism.languages.markup);
             * assert(newMarkup === Prism.languages.markup);
             * ```
             *
             * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
             * object to be modified.
             * @param {string} before The key to insert before.
             * @param {Grammar} insert An object containing the key-value pairs to be inserted.
             * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
             * object to be modified.
             *
             * Defaults to `Prism.languages`.
             * @returns {Grammar} The new grammar object.
             * @public
             */
                insertBefore: function (inside, before, insert, root) {
                    root = root || /** @type {any} */ _.languages;
                    const grammar = root[inside];
                    /** @type {Grammar} */
                    const ret = {};

                    for (const token in grammar) {
                        if (grammar.hasOwnProperty(token)) {
                            if (token == before) {
                                for (const newToken in insert) {
                                    if (insert.hasOwnProperty(newToken)) {
                                        ret[newToken] = insert[newToken];
                                    }
                                }
                            }

                            // Do not insert token which also occur in insert. See #1525
                            if (!insert.hasOwnProperty(token)) {
                                ret[token] = grammar[token];
                            }
                        }
                    }

                    const old = root[inside];
                    root[inside] = ret;

                    // Update references in other language definitions
                    _.languages.DFS(_.languages, function (key, value) {
                        if (value === old && key != inside) {
                            this[key] = ret;
                        }
                    });

                    return ret;
                },

                // Traverse a language definition with Depth First Search
                DFS: (o, callback, type, visited) => {
                    visited ||= {};

                    const objId = _.util.objId;

                    for (const i in o) {
                        if (o.hasOwnProperty(i)) {
                            callback.call(o, i, o[i], type || i);

                            const property = o[i];
                            const propertyType = _.util.type(property);

                            if (propertyType === "Object" && !visited[objId(property)]) {
                                visited[objId(property)] = true;
                                DFS(property, callback, null, visited);
                            } else if (propertyType === "Array" && !visited[objId(property)]) {
                                visited[objId(property)] = true;
                                DFS(property, callback, i, visited);
                            }
                        }
                    }
                },
            },

            plugins: {},

            /**
         * This is the most high-level function in Prism’s API.
         * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
         * each one of them.
         *
         * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
         *
         * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
         * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
         * @memberof Prism
         * @public
         */
            highlightAll: (async, callback) => {
                _.highlightAllUnder(document, async, callback);
            },

            /**
         * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
         * {@link Prism.highlightElement} on each one of them.
         *
         * The following hooks will be run:
         * 1. `before-highlightall`
         * 2. `before-all-elements-highlight`
         * 3. All hooks of {@link Prism.highlightElement} for each element.
         *
         * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
         * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
         * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
         * @memberof Prism
         * @public
         */
            highlightAllUnder: (container, async, callback) => {
                const env = {
                    callback: callback,
                    container: container,
                    selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code',
                };

                _.hooks.run("before-highlightall", env);

                env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

                _.hooks.run("before-all-elements-highlight", env);

                for (var i = 0, element; element = env.elements[i++];) {
                    _.highlightElement(element, async === true, env.callback);
                }
            },

            /**
         * Highlights the code inside a single element.
         *
         * The following hooks will be run:
         * 1. `before-sanity-check`
         * 2. `before-highlight`
         * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
         * 4. `before-insert`
         * 5. `after-highlight`
         * 6. `complete`
         *
         * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
         * the element's language.
         *
         * @param {Element} element The element containing the code.
         * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
         * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
         * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
         * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
         *
         * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
         * asynchronous highlighting to work. You can build your own bundle on the
         * [Download page](https://prismjs.com/download.html).
         * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
         * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
         * @memberof Prism
         * @public
         */
            highlightElement: (element, async, callback) => {
            // Find language
                const language = _.util.getLanguage(element);
                const grammar = _.languages[language];

                // Set language on the element, if not present
                _.util.setLanguage(element, language);

                // Set language on the parent, for styling
                let parent = element.parentElement;
                if (parent && parent.nodeName.toLowerCase() === "pre") {
                    _.util.setLanguage(parent, language);
                }

                const code = element.textContent;

                const env = {
                    element: element,
                    language: language,
                    grammar: grammar,
                    code: code,
                };

                const insertHighlightedCode = (highlightedCode) => {
                    env.highlightedCode = highlightedCode;

                    _.hooks.run("before-insert", env);

                    env.element.innerHTML = env.highlightedCode;

                    _.hooks.run("after-highlight", env);
                    _.hooks.run("complete", env);
                    callback && callback.call(env.element);
                };

                _.hooks.run("before-sanity-check", env);

                // plugins may change/add the parent/element
                parent = env.element.parentElement;
                if (parent && parent.nodeName.toLowerCase() === "pre" && !parent.hasAttribute("tabindex")) {
                    parent.setAttribute("tabindex", "0");
                }

                if (!env.code) {
                    _.hooks.run("complete", env);
                    callback && callback.call(env.element);
                    return;
                }

                _.hooks.run("before-highlight", env);

                if (!env.grammar) {
                    insertHighlightedCode(_.util.encode(env.code));
                    return;
                }

                if (async && _self.Worker) {
                    const worker = new Worker(_.filename);

                    worker.onmessage = (evt) => {
                        insertHighlightedCode(evt.data);
                    };

                    worker.postMessage(JSON.stringify({
                        language: env.language,
                        code: env.code,
                        immediateClose: true,
                    }));
                } else {
                    insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
                }
            },

            /**
         * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
         * and the language definitions to use, and returns a string with the HTML produced.
         *
         * The following hooks will be run:
         * 1. `before-tokenize`
         * 2. `after-tokenize`
         * 3. `wrap`: On each {@link Token}.
         *
         * @param {string} text A string with the code to be highlighted.
         * @param {Grammar} grammar An object containing the tokens to use.
         *
         * Usually a language definition like `Prism.languages.markup`.
         * @param {string} language The name of the language definition passed to `grammar`.
         * @returns {string} The highlighted HTML.
         * @memberof Prism
         * @public
         * @example
         * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
         */
            highlight: (text, grammar, language) => {
                const env = {
                    code: text,
                    grammar: grammar,
                    language: language,
                };
                _.hooks.run("before-tokenize", env);
                if (!env.grammar) {
                    throw new Error(`The language "${env.language}" has no grammar.`);
                }
                env.tokens = _.tokenize(env.code, env.grammar);
                _.hooks.run("after-tokenize", env);
                return Token.stringify(_.util.encode(env.tokens), env.language);
            },

            /**
         * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
         * and the language definitions to use, and returns an array with the tokenized code.
         *
         * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
         *
         * This method could be useful in other contexts as well, as a very crude parser.
         *
         * @param {string} text A string with the code to be highlighted.
         * @param {Grammar} grammar An object containing the tokens to use.
         *
         * Usually a language definition like `Prism.languages.markup`.
         * @returns {TokenStream} An array of strings and tokens, a token stream.
         * @memberof Prism
         * @public
         * @example
         * let code = `var foo = 0;`;
         * let tokens = Prism.tokenize(code, Prism.languages.javascript);
         * tokens.forEach(token => {
         *     if (token instanceof Prism.Token && token.type === 'number') {
         *         console.log(`Found numeric literal: ${token.content}`);
         *     }
         * });
         */
            tokenize: (text, grammar) => {
                const rest = grammar.rest;
                if (rest) {
                    for (const token in rest) {
                        grammar[token] = rest[token];
                    }

                    delete grammar.rest;
                }

                const tokenList = new LinkedList();
                addAfter(tokenList, tokenList.head, text);

                matchGrammar(text, tokenList, grammar, tokenList.head, 0);

                return toArray(tokenList);
            },

            /**
         * @namespace
         * @memberof Prism
         * @public
         */
            hooks: {
                all: {},

                /**
             * Adds the given callback to the list of callbacks for the given hook.
             *
             * The callback will be invoked when the hook it is registered for is run.
             * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
             *
             * One callback function can be registered to multiple hooks and the same hook multiple times.
             *
             * @param {string} name The name of the hook.
             * @param {HookCallback} callback The callback function which is given environment variables.
             * @public
             */
                add: (name, callback) => {
                    const hooks = _.hooks.all;

                    hooks[name] = hooks[name] || [];

                    hooks[name].push(callback);
                },

                /**
             * Runs a hook invoking all registered callbacks with the given environment variables.
             *
             * Callbacks will be invoked synchronously and in the order in which they were registered.
             *
             * @param {string} name The name of the hook.
             * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
             * @public
             */
                run: (name, env) => {
                    const callbacks = _.hooks.all[name];

                    if (!callbacks || !callbacks.length) {
                        return;
                    }

                    for (var i = 0, callback; callback = callbacks[i++];) {
                        callback(env);
                    }
                },
            },

            Token: Token,
        };
        _self.Prism = _;

        // Typescript note:
        // The following can be used to import the Token type in JSDoc:
        //
        //   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

        /**
     * Creates a new token.
     *
     * @param {string} type See {@link Token#type type}
     * @param {string | TokenStream} content See {@link Token#content content}
     * @param {string|string[]} [alias] The alias(es) of the token.
     * @param {string} [matchedStr=""] A copy of the full string this token was created from.
     * @class
     * @global
     * @public
     */
        function Token(type, content, alias, matchedStr) {
        /**
         * The type of the token.
         *
         * This is usually the key of a pattern in a {@link Grammar}.
         *
         * @type {string}
         * @see GrammarToken
         * @public
         */
            this.type = type;
            /**
         * The strings or tokens contained by this token.
         *
         * This will be a token stream if the pattern matched also defined an `inside` grammar.
         *
         * @type {string | TokenStream}
         * @public
         */
            this.content = content;
            /**
         * The alias(es) of the token.
         *
         * @type {string|string[]}
         * @see GrammarToken
         * @public
         */
            this.alias = alias;
            // Copy of the full string this token was created from
            this.length = (matchedStr || "").length | 0;
        }

        /**
     * A token stream is an array of strings and {@link Token Token} objects.
     *
     * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
     * them.
     *
     * 1. No adjacent strings.
     * 2. No empty strings.
     *
     *    The only exception here is the token stream that only contains the empty string and nothing else.
     *
     * @typedef {Array<string | Token>} TokenStream
     * @global
     * @public
     */

        /**
     * Converts the given token or token stream to an HTML representation.
     *
     * The following hooks will be run:
     * 1. `wrap`: On each {@link Token}.
     *
     * @param {string | Token | TokenStream} o The token or token stream to be converted.
     * @param {string} language The name of current language.
     * @returns {string} The HTML representation of the token or token stream.
     * @memberof Token
     * @static
     */
        Token.stringify = (o, language) => {
            if (typeof o === "string") {
                return o;
            }
            if (Array.isArray(o)) {
                let s = "";
                o.forEach((e) => {
                    s += stringify(e, language);
                });
                return s;
            }

            const env = {
                type: o.type,
                content: stringify(o.content, language),
                tag: "span",
                classes: ["token", o.type],
                attributes: {},
                language: language,
            };

            const aliases = o.alias;
            if (aliases) {
                if (Array.isArray(aliases)) {
                    Array.prototype.push.apply(env.classes, aliases);
                } else {
                    env.classes.push(aliases);
                }
            }

            _.hooks.run("wrap", env);

            let attributes = "";
            for (const name in env.attributes) {
                attributes += ` ${name}="${(env.attributes[name] || "").replace(/"/g, "&quot;")}"`;
            }

            return `<${env.tag} class="${env.classes.join(" ")}"${attributes}>${env.content}</${env.tag}>`;
        };

        /**
     * @param {RegExp} pattern
     * @param {number} pos
     * @param {string} text
     * @param {boolean} lookbehind
     * @returns {RegExpExecArray | null}
     */
        const matchPattern = (pattern, pos, text, lookbehind) => {
            pattern.lastIndex = pos;
            const match = pattern.exec(text);
            if (match && lookbehind && match[1]) {
            // change the match to remove the text matched by the Prism lookbehind group
                const lookbehindLength = match[1].length;
                match.index += lookbehindLength;
                match[0] = match[0].slice(lookbehindLength);
            }
            return match;
        };

        /**
     * @param {string} text
     * @param {LinkedList<string | Token>} tokenList
     * @param {any} grammar
     * @param {LinkedListNode<string | Token>} startNode
     * @param {number} startPos
     * @param {RematchOptions} [rematch]
     * @returns {void}
     * @private
     *
     * @typedef RematchOptions
     * @property {string} cause
     * @property {number} reach
     */
        const matchGrammar = (text, tokenList, grammar, startNode, startPos, rematch) => {
            for (const token in grammar) {
                if (!grammar.hasOwnProperty(token) || !grammar[token]) {
                    continue;
                }

                let patterns = grammar[token];
                patterns = Array.isArray(patterns) ? patterns : [patterns];

                for (let j = 0; j < patterns.length; ++j) {
                    if (rematch && rematch.cause == `${token},${j}`) {
                        return;
                    }

                    const patternObj = patterns[j];
                    const inside = patternObj.inside;
                    const lookbehind = !!patternObj.lookbehind;
                    const greedy = !!patternObj.greedy;
                    const alias = patternObj.alias;

                    if (greedy && !patternObj.pattern.global) {
                    // Without the global flag, lastIndex won't work
                        const flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
                        patternObj.pattern = RegExp(patternObj.pattern.source, `${flags}g`);
                    }

                    /** @type {RegExp} */
                    const pattern = patternObj.pattern || patternObj;

                    for ( // iterate the token list and keep track of the current token/string position
                        let currentNode = startNode.next, pos = startPos;
                        currentNode !== tokenList.tail;
                        pos += currentNode.value.length, currentNode = currentNode.next
                    ) {
                        if (rematch && pos >= rematch.reach) {
                            break;
                        }

                        let str = currentNode.value;

                        if (tokenList.length > text.length) {
                        // Something went terribly wrong, ABORT, ABORT!
                            return;
                        }

                        if (str instanceof Token) {
                            continue;
                        }

                        let removeCount = 1; // this is the to parameter of removeBetween
                        var match;

                        if (greedy) {
                            match = matchPattern(pattern, pos, text, lookbehind);
                            if (!match || match.index >= text.length) {
                                break;
                            }

                            var from = match.index;
                            const to = match.index + match[0].length;
                            let p = pos;

                            // find the node that contains the match
                            p += currentNode.value.length;
                            while (from >= p) {
                                currentNode = currentNode.next;
                                p += currentNode.value.length;
                            }
                            // adjust pos (and p)
                            p -= currentNode.value.length;
                            pos = p;

                            // the current node is a Token, then the match starts inside another Token, which is invalid
                            if (currentNode.value instanceof Token) {
                                continue;
                            }

                            // find the last node which is affected by this match
                            for (
                                let k = currentNode;
                                k !== tokenList.tail && (p < to || typeof k.value === "string");
                                k = k.next
                            ) {
                                removeCount++;
                                p += k.value.length;
                            }
                            removeCount--;

                            // replace with the new match
                            str = text.slice(pos, p);
                            match.index -= pos;
                        } else {
                            match = matchPattern(pattern, 0, str, lookbehind);
                            if (!match) {
                                continue;
                            }
                        }

                        // eslint-disable-next-line no-redeclare
                        var from = match.index;
                        const matchStr = match[0];
                        const before = str.slice(0, from);
                        const after = str.slice(from + matchStr.length);

                        const reach = pos + str.length;
                        if (rematch && reach > rematch.reach) {
                            rematch.reach = reach;
                        }

                        let removeFrom = currentNode.prev;

                        if (before) {
                            removeFrom = addAfter(tokenList, removeFrom, before);
                            pos += before.length;
                        }

                        removeRange(tokenList, removeFrom, removeCount);

                        const wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
                        currentNode = addAfter(tokenList, removeFrom, wrapped);

                        if (after) {
                            addAfter(tokenList, currentNode, after);
                        }

                        if (removeCount > 1) {
                        // at least one Token object was removed, so we have to do some rematching
                        // this can only happen if the current pattern is greedy

                            /** @type {RematchOptions} */
                            const nestedRematch = {
                                cause: `${token},${j}`,
                                reach: reach,
                            };
                            matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);

                            // the reach might have been extended because of the rematching
                            if (rematch && nestedRematch.reach > rematch.reach) {
                                rematch.reach = nestedRematch.reach;
                            }
                        }
                    }
                }
            }
        };

        /**
     * @typedef LinkedListNode
     * @property {T} value
     * @property {LinkedListNode<T> | null} prev The previous node.
     * @property {LinkedListNode<T> | null} next The next node.
     * @template T
     * @private
     */

        /**
     * @template T
     * @private
     */
        function LinkedList() {
        /** @type {LinkedListNode<T>} */
            const head = { value: null, prev: null, next: null };
            /** @type {LinkedListNode<T>} */
            const tail = { value: null, prev: head, next: null };
            head.next = tail;

            /** @type {LinkedListNode<T>} */
            this.head = head;
            /** @type {LinkedListNode<T>} */
            this.tail = tail;
            this.length = 0;
        }

        /**
     * Adds a new node with the given value to the list.
     *
     * @param {LinkedList<T>} list
     * @param {LinkedListNode<T>} node
     * @param {T} value
     * @returns {LinkedListNode<T>} The added node.
     * @template T
     */
        const addAfter = (list, node, value) => {
        // assumes that node != list.tail && values.length >= 0
            const next = node.next;

            const newNode = { value: value, prev: node, next: next };
            node.next = newNode;
            next.prev = newNode;
            list.length++;

            return newNode;
        };
        /**
     * Removes `count` nodes after the given node. The given node will not be removed.
     *
     * @param {LinkedList<T>} list
     * @param {LinkedListNode<T>} node
     * @param {number} count
     * @template T
     */
        const removeRange = (list, node, count) => {
            let next = node.next;
            for (var i = 0; i < count && next !== list.tail; i++) {
                next = next.next;
            }
            node.next = next;
            next.prev = node;
            list.length -= i;
        };
        /**
     * @param {LinkedList<T>} list
     * @returns {T[]}
     * @template T
     */
        const toArray = (list) => {
            const array = [];
            let node = list.head.next;
            while (node !== list.tail) {
                array.push(node.value);
                node = node.next;
            }
            return array;
        };

        if (!_self.document) {
            if (!_self.addEventListener) {
            // in Node.js
                return _;
            }

            if (!_.disableWorkerMessageHandler) {
            // In worker
                _self.addEventListener("message", (evt) => {
                    const message = JSON.parse(evt.data);
                    const lang = message.language;
                    const code = message.code;
                    const immediateClose = message.immediateClose;

                    _self.postMessage(_.highlight(code, _.languages[lang], lang));
                    if (immediateClose) {
                        _self.close();
                    }
                }, false);
            }

            return _;
        }

        // Get current script and highlight
        const script = _.util.currentScript();

        if (script) {
            _.filename = script.src;

            if (script.hasAttribute("data-manual")) {
                _.manual = true;
            }
        }

        const highlightAutomaticallyCallback = () => {
            if (!_.manual) {
                _.highlightAll();
            }
        };

        if (!_.manual) {
        // If the document state is "loading", then we'll use DOMContentLoaded.
        // If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
        // DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
        // might take longer one animation frame to execute which can create a race condition where only some plugins have
        // been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
        // See https://github.com/PrismJS/prism/issues/2102
            const readyState = document.readyState;
            if (readyState === "loading" || readyState === "interactive" && script && script.defer) {
                document.addEventListener("DOMContentLoaded", highlightAutomaticallyCallback);
            } else {
                if (window.requestAnimationFrame) {
                    window.requestAnimationFrame(highlightAutomaticallyCallback);
                } else {
                    window.setTimeout(highlightAutomaticallyCallback, 16);
                }
            }
        }

        return _;
    }(_self));

    if (typeof module !== "undefined" && module.exports) {
        module.exports = Prism;
    }

    // hack for components to work correctly in node.js
    if (typeof global !== "undefined") {
        global.Prism = Prism;
    }

    // some additional documentation/types

    /**
    * The expansion of a simple `RegExp` literal to support additional properties.
    *
    * @typedef GrammarToken
    * @property {RegExp} pattern The regular expression of the token.
    * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
    * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
    * @property {boolean} [greedy=false] Whether the token is greedy.
    * @property {string|string[]} [alias] An optional alias or list of aliases.
    * @property {Grammar} [inside] The nested grammar of this token.
    *
    * The `inside` grammar will be used to tokenize the text value of each token of this kind.
    *
    * This can be used to make nested and even recursive language definitions.
    *
    * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
    * each another.
    * @global
    * @public
    */

    /**
    * @typedef Grammar
    * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
    * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
    * @global
    * @public
    */

    /**
    * A function which will invoked after an element was successfully highlighted.
    *
    * @callback HighlightCallback
    * @param {Element} element The element successfully highlighted.
    * @returns {void}
    * @global
    * @public
    */

    /**
    * @callback HookCallback
    * @param {Object<string, any>} env The environment variables of the hook.
    * @returns {void}
    * @global
    * @public
    */

    ((Prism) => {
        const string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;

        Prism.languages.css = {
            comment: /\/\*[\s\S]*?\*\//,
            atrule: {
                pattern: RegExp(`@[\\w-](?:${/[^;{\s"']|\s+(?!\s)/.source}|${string.source})*?${/(?:;|(?=\s*\{))/.source}`),
                inside: {
                    rule: /^@[\w-]+/,
                    "selector-function-argument": {
                        pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
                        lookbehind: true,
                        alias: "selector",
                    },
                    keyword: {
                        pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
                        lookbehind: true,
                    },
                    // See rest below
                },
            },
            url: {
                // https://drafts.csswg.org/css-values-3/#urls
                pattern: RegExp(`\\burl\\((?:${string.source}|${/(?:[^\\\r\n()"']|\\[\s\S])*/.source})\\)`, "i"),
                greedy: true,
                inside: {
                    "function": /^url/i,
                    punctuation: /^\(|\)$/,
                    string: {
                        pattern: RegExp(`^${string.source}$`),
                        alias: "url",
                    },
                },
            },
            selector: {
                pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|${string.source})*(?=\\s*\\{)`),
                lookbehind: true,
            },
            string: {
                pattern: string,
                greedy: true,
            },
            property: {
                pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
                lookbehind: true,
            },
            important: /!important\b/i,
            "function": {
                pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
                lookbehind: true,
            },
            punctuation: /[(){};:,]/,
        };

        Prism.languages.css.atrule.inside.rest = Prism.languages.css;

        const markup = Prism.languages.markup;
        if (markup) {
            markup.tag.addInlined("style", "css");
            markup.tag.addAttribute("style", "css");
        }
    })(Prism);

    ((Prism) => {
        const string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;
        let selectorInside;

        Prism.languages.css.selector = {
            pattern: Prism.languages.css.selector.pattern,
            lookbehind: true,
            inside: selectorInside = {
                "pseudo-element": /:(?:after|before|first-letter|first-line|selection)|::[-\w]+/,
                "pseudo-class": /:[-\w]+/,
                "class": /\.[-\w]+/,
                id: /#[-\w]+/,
                attribute: {
                    pattern: RegExp(`\\[(?:[^[\\]"']|${string.source})*\\]`),
                    greedy: true,
                    inside: {
                        punctuation: /^\[|\]$/,
                        "case-sensitivity": {
                            pattern: /(\s)[si]$/i,
                            lookbehind: true,
                            alias: "keyword",
                        },
                        namespace: {
                            pattern: /^(\s*)(?:(?!\s)[-*\w\xA0-\uFFFF])*\|(?!=)/,
                            lookbehind: true,
                            inside: {
                                punctuation: /\|$/,
                            },
                        },
                        "attr-name": {
                            pattern: /^(\s*)(?:(?!\s)[-\w\xA0-\uFFFF])+/,
                            lookbehind: true,
                        },
                        "attr-value": [
                            string,
                            {
                                pattern: /(=\s*)(?:(?!\s)[-\w\xA0-\uFFFF])+(?=\s*$)/,
                                lookbehind: true,
                            },
                        ],
                        operator: /[|~*^$]?=/,
                    },
                },
                "n-th": [
                    {
                        pattern: /(\(\s*)[+-]?\d*[\dn](?:\s*[+-]\s*\d+)?(?=\s*\))/,
                        lookbehind: true,
                        inside: {
                            number: /[\dn]+/,
                            operator: /[+-]/,
                        },
                    },
                    {
                        pattern: /(\(\s*)(?:even|odd)(?=\s*\))/i,
                        lookbehind: true,
                    },
                ],
                combinator: />|\+|~|\|\|/,

                // the `tag` token has been existed and removed.
                // because we can't find a perfect tokenize to match it.
                // if you want to add it, please read https://github.com/PrismJS/prism/pull/2373 first.

                punctuation: /[(),]/,
            },
        };

        Prism.languages.css.atrule.inside["selector-function-argument"].inside = selectorInside;

        Prism.languages.insertBefore("css", "property", {
            variable: {
                pattern: /(^|[^-\w\xA0-\uFFFF])--(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*/i,
                lookbehind: true,
            },
        });

        const unit = {
            pattern: /(\b\d+)(?:%|[a-z]+(?![\w-]))/,
            lookbehind: true,
        };
        // 123 -123 .123 -.123 12.3 -12.3
        const number = {
            pattern: /(^|[^\w.-])-?(?:\d+(?:\.\d+)?|\.\d+)/,
            lookbehind: true,
        };

        Prism.languages.insertBefore("css", "function", {
            operator: {
                pattern: /(\s)[+\-*\/](?=\s)/,
                lookbehind: true,
            },
            // CAREFUL!
            // Previewers and Inline color use hexcode and color.
            hexcode: {
                pattern: /\B#[\da-f]{3,8}\b/i,
                alias: "color",
            },
            color: [
                {
                    pattern: /(^|[^\w-])(?:AliceBlue|AntiqueWhite|Aqua|Aquamarine|Azure|Beige|Bisque|Black|BlanchedAlmond|Blue|BlueViolet|Brown|BurlyWood|CadetBlue|Chartreuse|Chocolate|Coral|CornflowerBlue|Cornsilk|Crimson|Cyan|DarkBlue|DarkCyan|DarkGoldenRod|DarkGr[ae]y|DarkGreen|DarkKhaki|DarkMagenta|DarkOliveGreen|DarkOrange|DarkOrchid|DarkRed|DarkSalmon|DarkSeaGreen|DarkSlateBlue|DarkSlateGr[ae]y|DarkTurquoise|DarkViolet|DeepPink|DeepSkyBlue|DimGr[ae]y|DodgerBlue|FireBrick|FloralWhite|ForestGreen|Fuchsia|Gainsboro|GhostWhite|Gold|GoldenRod|Gr[ae]y|Green|GreenYellow|HoneyDew|HotPink|IndianRed|Indigo|Ivory|Khaki|Lavender|LavenderBlush|LawnGreen|LemonChiffon|LightBlue|LightCoral|LightCyan|LightGoldenRodYellow|LightGr[ae]y|LightGreen|LightPink|LightSalmon|LightSeaGreen|LightSkyBlue|LightSlateGr[ae]y|LightSteelBlue|LightYellow|Lime|LimeGreen|Linen|Magenta|Maroon|MediumAquaMarine|MediumBlue|MediumOrchid|MediumPurple|MediumSeaGreen|MediumSlateBlue|MediumSpringGreen|MediumTurquoise|MediumVioletRed|MidnightBlue|MintCream|MistyRose|Moccasin|NavajoWhite|Navy|OldLace|Olive|OliveDrab|Orange|OrangeRed|Orchid|PaleGoldenRod|PaleGreen|PaleTurquoise|PaleVioletRed|PapayaWhip|PeachPuff|Peru|Pink|Plum|PowderBlue|Purple|RebeccaPurple|Red|RosyBrown|RoyalBlue|SaddleBrown|Salmon|SandyBrown|SeaGreen|SeaShell|Sienna|Silver|SkyBlue|SlateBlue|SlateGr[ae]y|Snow|SpringGreen|SteelBlue|Tan|Teal|Thistle|Tomato|Transparent|Turquoise|Violet|Wheat|White|WhiteSmoke|Yellow|YellowGreen)(?![\w-])/i,
                    lookbehind: true,
                },
                {
                    pattern: /\b(?:hsl|rgb)\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)\B|\b(?:hsl|rgb)a\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*(?:0|0?\.\d+|1)\s*\)\B/i,
                    inside: {
                        unit: unit,
                        number: number,
                        "function": /[\w-]+(?=\()/,
                        punctuation: /[(),]/,
                    },
                },
            ],
            // it's important that there is no boundary assertion after the hex digits
            entity: /\\[\da-f]{1,8}/i,
            unit: unit,
            number: number,
        });
    })(Prism);

    Prism.languages.clike = {
        comment: [
            {
                pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
                lookbehind: true,
                greedy: true,
            },
            {
                pattern: /(^|[^\\:])\/\/.*/,
                lookbehind: true,
                greedy: true,
            },
        ],
        string: {
            pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
            greedy: true,
        },
        "class-name": {
            pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
            lookbehind: true,
            inside: {
                punctuation: /[.\\]/,
            },
        },
        keyword: /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
        "boolean": /\b(?:false|true)\b/,
        "function": /\b\w+(?=\()/,
        number: /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
        operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
        punctuation: /[{}[\];(),.:]/,
    };

    Prism.languages.javascript = Prism.languages.extend("clike", {
        "class-name": [
            Prism.languages.clike["class-name"],
            {
                pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
                lookbehind: true,
            },
        ],
        keyword: [
            {
                pattern: /((?:^|\})\s*)catch\b/,
                lookbehind: true,
            },
            {
                pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
                lookbehind: true,
            },
        ],
        // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
        "function": /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
        number: {
            pattern: RegExp(
                `${/(^|[^\w$])/.source
                }(?:${

                    // constant
                    /NaN|Infinity/.source
                }|${
                    // binary integer
                    /0[bB][01]+(?:_[01]+)*n?/.source
                }|${
                    // octal integer
                    /0[oO][0-7]+(?:_[0-7]+)*n?/.source
                }|${
                    // hexadecimal integer
                    /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source
                }|${
                    // decimal bigint
                    /\d+(?:_\d+)*n/.source
                }|${
                    // decimal number (integer or float) but no bigint
                    /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source
                })${
                    /(?![\w$])/.source}`,
            ),
            lookbehind: true,
        },
        operator: /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/,
    });

    Prism.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;

    Prism.languages.insertBefore("javascript", "keyword", {
        regex: {
            pattern: RegExp(
                // lookbehind
                // eslint-disable-next-line regexp/no-dupe-characters-character-class
                `${/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source
                // Regex pattern:
                // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
                // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
                // with the only syntax, so we have to define 2 different regex patterns.
                + /\//.source
                }(?:${
                    /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source
                }|${
                // `v` flag syntax. This supports 3 levels of nested character classes.
                    /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source
                })${
                // lookahead
                    /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source}`,
            ),
            lookbehind: true,
            greedy: true,
            inside: {
                "regex-source": {
                    pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
                    lookbehind: true,
                    alias: "language-regex",
                    inside: Prism.languages.regex,
                },
                "regex-delimiter": /^\/|\/$/,
                "regex-flags": /^[a-z]+$/,
            },
        },
        // This must be declared before keyword because we use "function" inside the look-forward
        "function-variable": {
            pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
            alias: "function",
        },
        parameter: [
            {
                pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
                lookbehind: true,
                inside: Prism.languages.javascript,
            },
            {
                pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
                lookbehind: true,
                inside: Prism.languages.javascript,
            },
            {
                pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
                lookbehind: true,
                inside: Prism.languages.javascript,
            },
            {
                pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
                lookbehind: true,
                inside: Prism.languages.javascript,
            },
        ],
        constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/,
    });

    Prism.languages.insertBefore("javascript", "string", {
        hashbang: {
            pattern: /^#!.*/,
            greedy: true,
            alias: "comment",
        },
        "template-string": {
            pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
            greedy: true,
            inside: {
                "template-punctuation": {
                    pattern: /^`|`$/,
                    alias: "string",
                },
                interpolation: {
                    pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
                    lookbehind: true,
                    inside: {
                        "interpolation-punctuation": {
                            pattern: /^\$\{|\}$/,
                            alias: "punctuation",
                        },
                        rest: Prism.languages.javascript,
                    },
                },
                string: /[\s\S]+/,
            },
        },
        "string-property": {
            pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
            lookbehind: true,
            greedy: true,
            alias: "property",
        },
    });

    Prism.languages.insertBefore("javascript", "operator", {
        "literal-property": {
            pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
            lookbehind: true,
            alias: "property",
        },
    });

    if (Prism.languages.markup) {
        Prism.languages.markup.tag.addInlined("script", "javascript");

        // add attribute support for all DOM events.
        // https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events
        Prism.languages.markup.tag.addAttribute(
            /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
            "javascript",
        );
    }

    Prism.languages.js = Prism.languages.javascript;

    Prism.languages.lua = {
        comment: /^#!.+|--(?:\[(=*)\[[\s\S]*?\]\1\]|.*)/m,
        // \z may be used to skip the following space
        string: {
            pattern: /(["'])(?:(?!\1)[^\\\r\n]|\\z(?:\r\n|\s)|\\(?:\r\n|[^z]))*\1|\[(=*)\[[\s\S]*?\]\2\]/,
            greedy: true,
        },
        number: /\b0x[a-f\d]+(?:\.[a-f\d]*)?(?:p[+-]?\d+)?\b|\b\d+(?:\.\B|(?:\.\d*)?(?:e[+-]?\d+)?\b)|\B\.\d+(?:e[+-]?\d+)?\b/i,
        keyword: /\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/,
        "function": /(?!\d)\w+(?=\s*(?:[({]))/,
        operator: [
            /[-+*%^&|#]|\/\/?|<[<=]?|>[>=]?|[=~]=?/,
            {
                // Match ".." but don't break "..."
                pattern: /(^|[^.])\.\.(?!\.)/,
                lookbehind: true,
            },
        ],
        punctuation: /[\[\](){},;]|\.+|:+/,
    };

    (() => {
        if (typeof Prism === "undefined" || typeof document === "undefined") {
            return;
        }

        /**
         * Plugin name which is used as a class name for <pre> which is activating the plugin
         *
         * @type {string}
         */
        const PLUGIN_NAME = "line-numbers";

        /**
         * Regular expression used for determining line breaks
         *
         * @type {RegExp}
         */
        const NEW_LINE_EXP = /\n(?!$)/g;

        /**
         * Global exports
         */
        const config = Prism.plugins.lineNumbers = {
            /**
             * Get node for provided line number
             *
             * @param {Element} element pre element
             * @param {number} number line number
             * @returns {Element|undefined}
             */
            getLine: (element, number) => {
                if (element.tagName !== "PRE" || !element.classList.contains(PLUGIN_NAME)) {
                    return;
                }

                const lineNumberRows = element.querySelector(".line-numbers-rows");
                if (!lineNumberRows) {
                    return;
                }
                const lineNumberStart = parseInt(element.getAttribute("data-start"), 10) || 1;
                const lineNumberEnd = lineNumberStart + (lineNumberRows.children.length - 1);

                if (number < lineNumberStart) {
                    number = lineNumberStart;
                }
                if (number > lineNumberEnd) {
                    number = lineNumberEnd;
                }

                const lineIndex = number - lineNumberStart;

                return lineNumberRows.children[lineIndex];
            },

            /**
             * Resizes the line numbers of the given element.
             *
             * This function will not add line numbers. It will only resize existing ones.
             *
             * @param {HTMLElement} element A `<pre>` element with line numbers.
             * @returns {void}
             */
            resize: (element) => {
                resizeElements([element]);
            },

            /**
             * Whether the plugin can assume that the units font sizes and margins are not depended on the size of
             * the current viewport.
             *
             * Setting this to `true` will allow the plugin to do certain optimizations for better performance.
             *
             * Set this to `false` if you use any of the following CSS units: `vh`, `vw`, `vmin`, `vmax`.
             *
             * @type {boolean}
             */
            assumeViewportIndependence: true,
        };

        /**
         * Resizes the given elements.
         *
         * @param {HTMLElement[]} elements
         */
        const resizeElements = (elements) => {
            elements = elements.filter((e) => {
                const codeStyles = getStyles(e);
                const whiteSpace = codeStyles["white-space"];
                return whiteSpace === "pre-wrap" || whiteSpace === "pre-line";
            });

            if (elements.length == 0) {
                return;
            }

            const infos = elements.map((element) => {
                const codeElement = element.querySelector("code");
                const lineNumbersWrapper = element.querySelector(".line-numbers-rows");
                if (!codeElement || !lineNumbersWrapper) {
                    return undefined;
                }

                /** @type {HTMLElement} */
                let lineNumberSizer = element.querySelector(".line-numbers-sizer");
                const codeLines = codeElement.textContent.split(NEW_LINE_EXP);

                if (!lineNumberSizer) {
                    lineNumberSizer = document.createElement("span");
                    lineNumberSizer.className = "line-numbers-sizer";

                    codeElement.appendChild(lineNumberSizer);
                }

                lineNumberSizer.innerHTML = "0";
                lineNumberSizer.style.display = "block";

                const oneLinerHeight = lineNumberSizer.getBoundingClientRect().height;
                lineNumberSizer.innerHTML = "";

                return {
                    element: element,
                    lines: codeLines,
                    lineHeights: [],
                    oneLinerHeight: oneLinerHeight,
                    sizer: lineNumberSizer,
                };
            }).filter(Boolean);

            infos.forEach((info) => {
                const lineNumberSizer = info.sizer;
                const lines = info.lines;
                const lineHeights = info.lineHeights;
                const oneLinerHeight = info.oneLinerHeight;

                lineHeights[lines.length - 1] = undefined;
                lines.forEach((line, index) => {
                    if (line && line.length > 1) {
                        const e = lineNumberSizer.appendChild(document.createElement("span"));
                        e.style.display = "block";
                        e.textContent = line;
                    } else {
                        lineHeights[index] = oneLinerHeight;
                    }
                });
            });

            infos.forEach((info) => {
                const lineNumberSizer = info.sizer;
                const lineHeights = info.lineHeights;

                let childIndex = 0;
                for (let i = 0; i < lineHeights.length; i++) {
                    if (lineHeights[i] === undefined) {
                        lineHeights[i] = lineNumberSizer.children[childIndex++].getBoundingClientRect().height;
                    }
                }
            });

            infos.forEach((info) => {
                const lineNumberSizer = info.sizer;
                const wrapper = info.element.querySelector(".line-numbers-rows");

                lineNumberSizer.style.display = "none";
                lineNumberSizer.innerHTML = "";

                info.lineHeights.forEach((height, lineNumber) => {
                    wrapper.children[lineNumber].style.height = `${height}px`;
                });
            });
        };

        /**
         * Returns style declarations for the element
         *
         * @param {Element} element
         */
        const getStyles = (element) => {
            if (!element) {
                return null;
            }

            return window.getComputedStyle ? getComputedStyle(element) : element.currentStyle || null;
        };

        let lastWidth = undefined;
        window.addEventListener("resize", () => {
            if (config.assumeViewportIndependence && lastWidth === window.innerWidth) {
                return;
            }
            lastWidth = window.innerWidth;

            resizeElements(Array.prototype.slice.call(document.querySelectorAll(`pre.${PLUGIN_NAME}`)));
        });

        Prism.hooks.add("complete", (env) => {
            if (!env.code) {
                return;
            }

            const code = /** @type {Element} */ env.element;
            const pre = /** @type {HTMLElement} */ code.parentNode;

            // works only for <code> wrapped inside <pre> (not inline)
            if (!pre || !/pre/i.test(pre.nodeName)) {
                return;
            }

            // Abort if line numbers already exists
            if (code.querySelector(".line-numbers-rows")) {
                return;
            }

            // only add line numbers if <code> or one of its ancestors has the `line-numbers` class
            if (!Prism.util.isActive(code, PLUGIN_NAME)) {
                return;
            }

            // Remove the class 'line-numbers' from the <code>
            code.classList.remove(PLUGIN_NAME);
            // Add the class 'line-numbers' to the <pre>
            pre.classList.add(PLUGIN_NAME);

            const match = env.code.match(NEW_LINE_EXP);
            const linesNum = match ? match.length + 1 : 1;
            let lineNumbersWrapper;

            const lines = new Array(linesNum + 1).join("<span></span>");

            lineNumbersWrapper = document.createElement("span");
            lineNumbersWrapper.setAttribute("aria-hidden", "true");
            lineNumbersWrapper.className = "line-numbers-rows";
            lineNumbersWrapper.innerHTML = lines;

            if (pre.hasAttribute("data-start")) {
                pre.style.counterReset = `linenumber ${parseInt(pre.getAttribute("data-start"), 10) - 1}`;
            }

            env.element.appendChild(lineNumbersWrapper);

            resizeElements([pre]);

            Prism.hooks.run("line-numbers", env);
        });

        Prism.hooks.add("line-numbers", (env) => {
            env.plugins = env.plugins || {};
            env.plugins.lineNumbers = true;
        });
    })();

    (() => {
        if (typeof Prism === "undefined" || typeof document === "undefined") {
            return;
        }

        // Copied from the markup language definition
        const HTML_TAG = /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/g;

        // a regex to validate hexadecimal colors
        const HEX_COLOR = /^#?((?:[\da-f]){3,4}|(?:[\da-f]{2}){3,4})$/i;

        /**
         * Parses the given hexadecimal representation and returns the parsed RGBA color.
         *
         * If the format of the given string is invalid, `undefined` will be returned.
         * Valid formats are: `RGB`, `RGBA`, `RRGGBB`, and `RRGGBBAA`.
         *
         * Hexadecimal colors are parsed because they are not fully supported by older browsers, so converting them to
         * `rgba` functions improves browser compatibility.
         *
         * @param {string} hex
         * @returns {string | undefined}
         */
        const parseHexColor = (hex) => {
            const match = HEX_COLOR.exec(hex);
            if (!match) {
                return undefined;
            }
            hex = match[1]; // removes the leading "#"

            // the width and number of channels
            const channelWidth = hex.length >= 6 ? 2 : 1;
            const channelCount = hex.length / channelWidth;

            // the scale used to normalize 4bit and 8bit values
            const scale = channelWidth == 1 ? 1 / 15 : 1 / 255;

            // normalized RGBA channels
            const channels = [];
            for (let i = 0; i < channelCount; i++) {
                const int = parseInt(hex.substr(i * channelWidth, channelWidth), 16);
                channels.push(int * scale);
            }
            if (channelCount == 3) {
                channels.push(1); // add alpha of 100%
            }

            // output
            const rgb = channels.slice(0, 3).map((x) => String(Math.round(x * 255))).join(",");
            const alpha = String(Number(channels[3].toFixed(3))); // easy way to round 3 decimal places

            return `rgba(${rgb},${alpha})`;
        };

        /**
         * Validates the given Color using the current browser's internal implementation.
         *
         * @param {string} color
         * @returns {string | undefined}
         */
        const validateColor = (color) => {
            const s = new Option().style;
            s.color = color;
            return s.color ? color : undefined;
        };

        /**
         * An array of function which parse a given string representation of a color.
         *
         * These parser serve as validators and as a layer of compatibility to support color formats which the browser
         * might not support natively.
         *
         * @type {((value: string) => (string|undefined))[]}
         */
        const parsers = [
            parseHexColor,
            validateColor,
        ];

        Prism.hooks.add("wrap", (env) => {
            if (env.type === "color" || env.classes.indexOf("color") >= 0) {
                const content = env.content;

                // remove all HTML tags inside
                const rawText = content.split(HTML_TAG).join("");

                let color;
                for (let i = 0, l = parsers.length; i < l && !color; i++) {
                    color = parsers[i](rawText);
                }

                if (!color) {
                    return;
                }

                const previewElement = `<span class="inline-color-wrapper"><span class="inline-color" style="background-color:${color};"></span></span>`;
                env.content = previewElement + content;
            }
        });
    })();

    (() => {
        if (typeof Prism === "undefined" || typeof document === "undefined") {
            return;
        }

        /* eslint-disable */
    
        /**
         * The dependencies map is built automatically with gulp.
         *
         * @type {Object<string, string | string[]>}
         */
        var lang_dependencies = /*dependencies_placeholder[*/{
            "javascript": "clike",
            "actionscript": "javascript",
            "apex": [
                "clike",
                "sql"
            ],
            "arduino": "cpp",
            "aspnet": [
                "markup",
                "csharp"
            ],
            "birb": "clike",
            "bison": "c",
            "c": "clike",
            "csharp": "clike",
            "cpp": "c",
            "cfscript": "clike",
            "chaiscript": [
                "clike",
                "cpp"
            ],
            "cilkc": "c",
            "cilkcpp": "cpp",
            "coffeescript": "javascript",
            "crystal": "ruby",
            "css-extras": "css",
            "d": "clike",
            "dart": "clike",
            "django": "markup-templating",
            "ejs": [
                "javascript",
                "markup-templating"
            ],
            "etlua": [
                "lua",
                "markup-templating"
            ],
            "erb": [
                "ruby",
                "markup-templating"
            ],
            "fsharp": "clike",
            "firestore-security-rules": "clike",
            "flow": "javascript",
            "ftl": "markup-templating",
            "gml": "clike",
            "glsl": "c",
            "go": "clike",
            "gradle": "clike",
            "groovy": "clike",
            "haml": "ruby",
            "handlebars": "markup-templating",
            "haxe": "clike",
            "hlsl": "c",
            "idris": "haskell",
            "java": "clike",
            "javadoc": [
                "markup",
                "java",
                "javadoclike"
            ],
            "jolie": "clike",
            "jsdoc": [
                "javascript",
                "javadoclike",
                "typescript"
            ],
            "js-extras": "javascript",
            "json5": "json",
            "jsonp": "json",
            "js-templates": "javascript",
            "kotlin": "clike",
            "latte": [
                "clike",
                "markup-templating",
                "php"
            ],
            "less": "css",
            "lilypond": "scheme",
            "liquid": "markup-templating",
            "markdown": "markup",
            "markup-templating": "markup",
            "mongodb": "javascript",
            "n4js": "javascript",
            "objectivec": "c",
            "opencl": "c",
            "parser": "markup",
            "php": "markup-templating",
            "phpdoc": [
                "php",
                "javadoclike"
            ],
            "php-extras": "php",
            "plsql": "sql",
            "processing": "clike",
            "protobuf": "clike",
            "pug": [
                "markup",
                "javascript"
            ],
            "purebasic": "clike",
            "purescript": "haskell",
            "qsharp": "clike",
            "qml": "javascript",
            "qore": "clike",
            "racket": "scheme",
            "cshtml": [
                "markup",
                "csharp"
            ],
            "jsx": [
                "markup",
                "javascript"
            ],
            "tsx": [
                "jsx",
                "typescript"
            ],
            "reason": "clike",
            "ruby": "clike",
            "sass": "css",
            "scss": "css",
            "scala": "java",
            "shell-session": "bash",
            "smarty": "markup-templating",
            "solidity": "clike",
            "soy": "markup-templating",
            "sparql": "turtle",
            "sqf": "clike",
            "squirrel": "clike",
            "stata": [
                "mata",
                "java",
                "python"
            ],
            "t4-cs": [
                "t4-templating",
                "csharp"
            ],
            "t4-vb": [
                "t4-templating",
                "vbnet"
            ],
            "tap": "yaml",
            "tt2": [
                "clike",
                "markup-templating"
            ],
            "textile": "markup",
            "twig": "markup-templating",
            "typescript": "javascript",
            "v": "clike",
            "vala": "clike",
            "vbnet": "basic",
            "velocity": "markup",
            "wiki": "markup",
            "xeora": "markup",
            "xml-doc": "markup",
            "xquery": "markup"
        }/*]*/;
    
        var lang_aliases = /*aliases_placeholder[*/{
            "html": "markup",
            "xml": "markup",
            "svg": "markup",
            "mathml": "markup",
            "ssml": "markup",
            "atom": "markup",
            "rss": "markup",
            "js": "javascript",
            "g4": "antlr4",
            "ino": "arduino",
            "arm-asm": "armasm",
            "art": "arturo",
            "adoc": "asciidoc",
            "avs": "avisynth",
            "avdl": "avro-idl",
            "gawk": "awk",
            "sh": "bash",
            "shell": "bash",
            "shortcode": "bbcode",
            "rbnf": "bnf",
            "oscript": "bsl",
            "cs": "csharp",
            "dotnet": "csharp",
            "cfc": "cfscript",
            "cilk-c": "cilkc",
            "cilk-cpp": "cilkcpp",
            "cilk": "cilkcpp",
            "coffee": "coffeescript",
            "conc": "concurnas",
            "jinja2": "django",
            "dns-zone": "dns-zone-file",
            "dockerfile": "docker",
            "gv": "dot",
            "eta": "ejs",
            "xlsx": "excel-formula",
            "xls": "excel-formula",
            "gamemakerlanguage": "gml",
            "po": "gettext",
            "gni": "gn",
            "ld": "linker-script",
            "go-mod": "go-module",
            "hbs": "handlebars",
            "mustache": "handlebars",
            "hs": "haskell",
            "idr": "idris",
            "gitignore": "ignore",
            "hgignore": "ignore",
            "npmignore": "ignore",
            "webmanifest": "json",
            "kt": "kotlin",
            "kts": "kotlin",
            "kum": "kumir",
            "tex": "latex",
            "context": "latex",
            "ly": "lilypond",
            "emacs": "lisp",
            "elisp": "lisp",
            "emacs-lisp": "lisp",
            "md": "markdown",
            "moon": "moonscript",
            "n4jsd": "n4js",
            "nani": "naniscript",
            "objc": "objectivec",
            "qasm": "openqasm",
            "objectpascal": "pascal",
            "px": "pcaxis",
            "pcode": "peoplecode",
            "plantuml": "plant-uml",
            "pq": "powerquery",
            "mscript": "powerquery",
            "pbfasm": "purebasic",
            "purs": "purescript",
            "py": "python",
            "qs": "qsharp",
            "rkt": "racket",
            "razor": "cshtml",
            "rpy": "renpy",
            "res": "rescript",
            "robot": "robotframework",
            "rb": "ruby",
            "sh-session": "shell-session",
            "shellsession": "shell-session",
            "smlnj": "sml",
            "sol": "solidity",
            "sln": "solution-file",
            "rq": "sparql",
            "sclang": "supercollider",
            "t4": "t4-cs",
            "trickle": "tremor",
            "troy": "tremor",
            "trig": "turtle",
            "ts": "typescript",
            "tsconfig": "typoscript",
            "uscript": "unrealscript",
            "uc": "unrealscript",
            "url": "uri",
            "vb": "visual-basic",
            "vba": "visual-basic",
            "webidl": "web-idl",
            "mathematica": "wolfram",
            "nb": "wolfram",
            "wl": "wolfram",
            "xeoracube": "xeora",
            "yml": "yaml"
        }/*]*/;
    
        /* eslint-enable */

        /**
         * @typedef LangDataItem
         * @property {{ success?: () => void, error?: () => void }[]} callbacks
         * @property {boolean} [error]
         * @property {boolean} [loading]
         */
        /** @type {Object<string, LangDataItem>} */
        const lang_data = {};

        const ignored_language = "none";
        let languages_path = "components/";

        const script = Prism.util.currentScript();
        if (script) {
            const autoloaderFile = /\bplugins\/autoloader\/prism-autoloader\.(?:min\.)?js(?:\?[^\r\n/]*)?$/i;
            const prismFile = /(^|\/)[\w-]+\.(?:min\.)?js(?:\?[^\r\n/]*)?$/i;

            const autoloaderPath = script.getAttribute("data-autoloader-path");
            if (autoloaderPath != null) {
                // data-autoloader-path is set, so just use it
                languages_path = autoloaderPath.trim().replace(/\/?$/, "/");
            } else {
                const src = script.src;
                if (autoloaderFile.test(src)) {
                    // the script is the original autoloader script in the usual Prism project structure
                    languages_path = src.replace(autoloaderFile, "components/");
                } else if (prismFile.test(src)) {
                    // the script is part of a bundle like a custom prism.js from the download page
                    languages_path = src.replace(prismFile, "$1components/");
                }
            }
        }

        const config = Prism.plugins.autoloader = {
            languages_path: languages_path,
            use_minified: true,
            loadLanguages: loadLanguages,
        };

        /**
         * Lazily loads an external script.
         *
         * @param {string} src
         * @param {() => void} [success]
         * @param {() => void} [error]
         */
        const addScript = (src, success, error) => {
            const s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.onload = () => {
                document.body.removeChild(s);
                success && success();
            };
            s.onerror = () => {
                document.body.removeChild(s);
                error && error();
            };
            document.body.appendChild(s);
        };

        /**
         * Returns all additional dependencies of the given element defined by the `data-dependencies` attribute.
         *
         * @param {Element} element
         * @returns {string[]}
         */
        const getDependencies = (element) => {
            let deps = (element.getAttribute("data-dependencies") || "").trim();
            if (!deps) {
                const parent = element.parentElement;
                if (parent && parent.tagName.toLowerCase() === "pre") {
                    deps = (parent.getAttribute("data-dependencies") || "").trim();
                }
            }
            return deps ? deps.split(/\s*,\s*/g) : [];
        };

        /**
         * Returns whether the given language is currently loaded.
         *
         * @param {string} lang
         * @returns {boolean}
         */
        const isLoaded = (lang) => {
            if (lang.indexOf("!") >= 0) {
                // forced reload
                return false;
            }

            lang = lang_aliases[lang] || lang; // resolve alias

            if (lang in Prism.languages) {
                // the given language is already loaded
                return true;
            }

            // this will catch extensions like CSS extras that don't add a grammar to Prism.languages
            const data = lang_data[lang];
            return data && !data.error && data.loading === false;
        };

        /**
         * Returns the path to a grammar, using the language_path and use_minified config keys.
         *
         * @param {string} lang
         * @returns {string}
         */
        const getLanguagePath = (lang) => `${config.languages_path}prism-${lang}${config.use_minified ? ".min" : ""}.js`;

        /**
         * Loads all given grammars concurrently.
         *
         * @param {string[]|string} languages
         * @param {(languages: string[]) => void} [success]
         * @param {(language: string) => void} [error] This callback will be invoked on the first language to fail.
         */
        const loadLanguages = (languages, success, error) => {
            if (typeof languages === "string") {
                languages = [languages];
            }

            const total = languages.length;
            let completed = 0;
            let failed = false;

            if (total === 0) {
                if (success) {
                    setTimeout(success, 0);
                }
                return;
            }

            const successCallback = () => {
                if (failed) {
                    return;
                }
                completed++;
                if (completed === total) {
                    success && success(languages);
                }
            };

            languages.forEach((lang) => {
                loadLanguage(lang, successCallback, () => {
                    if (failed) {
                        return;
                    }
                    failed = true;
                    error && error(lang);
                });
            });
        };

        /**
         * Loads a grammar with its dependencies.
         *
         * @param {string} lang
         * @param {() => void} [success]
         * @param {() => void} [error]
         */
        const loadLanguage = (lang, success, error) => {
            const force = lang.indexOf("!") >= 0;

            lang = lang.replace("!", "");
            lang = lang_aliases[lang] || lang;

            const load = () => {
                let data = lang_data[lang];
                if (!data) {
                    data = lang_data[lang] = {
                        callbacks: [],
                    };
                }
                data.callbacks.push({
                    success: success,
                    error: error,
                });

                if (!force && isLoaded(lang)) {
                    // the language is already loaded and we aren't forced to reload
                    languageCallback(lang, "success");
                } else if (!force && data.error) {
                    // the language failed to load before and we don't reload
                    languageCallback(lang, "error");
                } else if (force || !data.loading) {
                    // the language isn't currently loading and/or we are forced to reload
                    data.loading = true;
                    data.error = false;

                    addScript(getLanguagePath(lang), () => {
                        data.loading = false;
                        languageCallback(lang, "success");
                    }, () => {
                        data.loading = false;
                        data.error = true;
                        languageCallback(lang, "error");
                    });
                }
            };

            const dependencies = lang_dependencies[lang];
            if (dependencies && dependencies.length) {
                loadLanguages(dependencies, load, error);
            } else {
                load();
            }
        };

        /**
         * Runs all callbacks of the given type for the given language.
         *
         * @param {string} lang
         * @param {"success" | "error"} type
         */
        const languageCallback = (lang, type) => {
            if (lang_data[lang]) {
                const callbacks = lang_data[lang].callbacks;
                for (let i = 0, l = callbacks.length; i < l; i++) {
                    const callback = callbacks[i][type];
                    if (callback) {
                        setTimeout(callback, 0);
                    }
                }
                callbacks.length = 0;
            }
        };

        Prism.hooks.add("complete", (env) => {
            const element = env.element;
            const language = env.language;
            if (!element || !language || language === ignored_language) {
                return;
            }

            const deps = getDependencies(element);
            if (/^diff-./i.test(language)) {
                // the "diff-xxxx" format is used by the Diff Highlight plugin
                deps.push("diff");
                deps.push(language.substr("diff-".length));
            } else {
                deps.push(language);
            }

            if (!deps.every(isLoaded)) {
                // the language or some dependencies aren't loaded
                loadLanguages(deps, () => {
                    Prism.highlightElement(element);
                });
            }
        });
    })();

    mw.hook("wikipage.content").add(($content) => {
        void main($content);
    });
})();
// </pre>
