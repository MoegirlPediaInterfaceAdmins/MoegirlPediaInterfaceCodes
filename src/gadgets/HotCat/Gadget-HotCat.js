/* eslint-disable no-unused-vars, prefer-arrow-functions/prefer-arrow-functions, require-atomic-updates, no-use-before-define, camelcase */
/**
 * @source https://commons.wikimedia.org/wiki/_?oldid=818790002
 * 更新后请同步更新上面链接到最新版本
 */
"use strict";
/**
  * 全部内容引自 https://commons.wikimedia.org/wiki/MediaWiki:Gadget-HotCat.js
  * 合并了 User:Func 对繁体分类的修正，本页面 diff：https://zh.moegirl.org.cn/_?diff=5710070&oldid=5611586 ，User:Func 的修正参见 https://zh.moegirl.org.cn/_?diff=4533156&oldid=5710033
  * 修改了alert为OOUI版本
  * 修改了 jsonp 为原生请求 - https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/commit/134859937c596c818e4a33f9d174022dc79d7bb8
  **/
// <nowiki>
/**
HotCat V2.43

Documentation: https://commons.wikimedia.org/wiki/Help:Gadget-HotCat
List of main authors: https://commons.wikimedia.org/wiki/Help:Gadget-HotCat/Version_history

License: Quadruple licensed GFDL, GPL, LGPL and Creative Commons Attribution 3.0 (CC-BY-3.0)
*/
window.hotcat_translations_from_commons = false; // 禁止从维基共享获取翻译
(async () => {
    await $.ready;
    /**
     * @type {{ wgServer: string, [keys: string]: any }}
     */
    const conf = new Proxy({}, {
        get: (_, name) => {
            if (name === "wgServer") {
                return `https://${location.hostname}`;
            }
            return mw.config.get(name);
        },
    });
    if (window.HotCat && !window.HotCat.nodeName || conf.wgAction === "edit") {
        return;
    }
    const userRights = await mw.user.getRights();
    const autopatrol = userRights.includes("autopatrol");
    window.hotcat_no_autocommit = !autopatrol;
    window.hotcat_del_needs_diff = !autopatrol;
    const HC = window.HotCat = {
        messages: {
            cat_removed: "removed [[Category:$1]]",
            template_removed: "removed {{[[Category:$1]]}}",
            cat_added: "added [[Category:$1]]",
            cat_keychange: 'new key for [[Category:$1]]: "$2"',
            cat_notFound: 'Category "$1" not found',
            cat_exists: 'Category "$1" already exists; not added.',
            cat_resolved: " (redirect [[Category:$1]] resolved)",
            uncat_removed: "removed {{uncategorized}}",
            separator: "; ",
            prefix: "",
            using: " using [[Help:Gadget-HotCat|HotCat]]",
            multi_change: "$1 categories",
            commit: "Save",
            ok: "OK",
            cancel: "Cancel",
            multi_error: "Could not retrieve the page text from the server. Therefore, your category changes cannot be saved. We apologize for the inconvenience.",
            short_catchange: null,
        },
        categories: "Categories",
        disambig_category: "Disambiguation",
        redir_category: "Category redirects",
        links: {
            change: "(±)",
            remove: "(−)",
            add: "(+)",
            restore: "(×)",
            undo: "(×)",
            down: "(↓)",
            up: "(↑)",
        },
        changeTag: "HotCat",
        automationChangeTag: "Automation tool",
        tooltips: {
            change: "Modify",
            remove: "Remove",
            add: "Add a new category",
            restore: "Undo changes",
            undo: "Undo changes",
            down: "Open for modifying and display subcategories",
            up: "Open for modifying and display parent categories",
        },
        addmulti: "<span>+<sup>+</sup></span>",
        multi_tooltip: "Modify several categories",
        disable: () => {
            const ns = mw.config.get("wgNamespaceNumber");
            const nsIds = mw.config.get("wgNamespaceIds");
            return ns < 0 || ns === nsIds.template || ns === nsIds.module || ns === nsIds.mediawiki || ns === nsIds.file && !mw.config.get("wgArticleId") || ns === nsIds.creator || ns === nsIds.timedtext || ns === nsIds.institution || mw.config.get("wgPageContentModel") !== "wikitext";
        },
        uncat_regexp: /\{\{\s*[Uu]ncategorized\s*[^}]*\}\}\s*(<!--.*?-->\s*)?/g,
        existsYes: "https://storage.moegirl.org.cn/moegirl/commons/b/be/P_yes.svg",
        existsNo: "https://storage.moegirl.org.cn/moegirl/commons/4/42/P_no.svg",
        template_categories: {},
        engine_names: {
            searchindex: "Search index",
            pagelist: "Page list",
            combined: "Combined search",
            subcat: "Subcategories",
            parentcat: "Parent categories",
        },
        capitalizePageNames: null,
        upload_disabled: false,
        blacklist: null,
        bg_changed: "#FCA",
        no_autocommit: !autopatrol,
        del_needs_diff: !autopatrol,
        suggest_delay: 100,
        editbox_width: 40,
        suggestions: "combined",
        fixed_search: false,
        use_up_down: true,
        listSize: 5,
        single_minor: true,
        dont_add_to_watchlist: false,
        shortcuts: null,
        addShortcuts: (map) => {
            if (!map) {
                return;
            }
            window.HotCat.shortcuts ||= {};
            for (let k in map) {
                if (!Object.prototype.hasOwnProperty.bind(map)(k) || typeof k !== "string") {
                    continue;
                }
                let v = map[k];
                if (typeof v !== "string") {
                    continue;
                }
                k = k.replace(/^\s+|\s+$/g, "");
                v = v.replace(/^\s+|\s+$/g, "");
                if (!k.length || !v.length) {
                    continue;
                }
                window.HotCat.shortcuts[k] = v;
            }
        },
    };
    const ua = navigator.userAgent.toLowerCase();
    const is_webkit = /applewebkit\/\d+/.test(ua) && ua.indexOf("spoofer") < 0;
    let cat_prefix = null;
    let noSuggestions = false;
    class LoadTrigger {
        queue = [];
        constructor(needed) {
            this.needed = needed;
        }
        register(callback) {
            if (this.needed <= 0) {
                callback();
            } else {
                this.queue.push(callback);
            }
        }
        loaded() {
            this.needed--;
            if (this.needed === 0) {
                for (let i = 0; i < this.queue.length; i++) {
                    this.queue[i]();
                }
                this.queue = [];
            }
        }
    }
    const loadTrigger = new LoadTrigger(2);
    loadTrigger.loaded(); // 原本要加载 MediaWiki:Gadget-HotCat.js/local_defaults 后才执行的，被删除了就直接执行了
    if (conf.wgUserLanguage !== "en") { // 原本要异步加载翻译的，直接内嵌了
        const local = {
            messages: {
                cat_removed: "移除[[分类:$1]]",
                template_removed: "移除{{[[分类:$1]]}}",
                cat_added: "添加[[分类:$1]]",
                cat_keychange: "为[[分类:$1]]设定新索引：“$2”",
                cat_notFound: "分类“$1”未找到",
                cat_exists: "分类“$1”已存在，不执行添加操作",
                cat_resolved: "（已处理[[分类:$1]]的重定向）",
                uncat_removed: "", // 萌百没有Template:Uncategorized
                separator: "; ",
                prefix: "",
                using: "——[[Help:HotCat小工具|HotCat]]",
                multi_change: "$1个分类",
                commit: "保存",
                ok: "确定",
                cancel: "取消",
                multi_error: "无法连接到萌百服务器，因此您的分类更改无法保存，由此引发的不便我们深表歉意。",
                short_catchange: null,
            },
            categories: "分类",
            redir_category: "分类重定向",
            tooltips: {
                change: "修改",
                remove: "移除",
                add: "新增一个分类",
                restore: "回退更改",
                undo: "回退更改",
                down: "打开以便修改并显示子分类",
                up: "打开以便修改并显示父分类",
            },
            multi_tooltip: "修改多个分类",
            engine_names: {
                searchindex: "搜索索引",
                pagelist: "页面列表",
                combined: "合并搜索",
                subcat: "子分类",
                parentcat: "父分类",
            },
            disambig_category: "消歧义页",
            blacklist: /(?:不可|已)索引页面|(?:调用重复模板参数|有(?:过多高开销解析器函数调用|忽略显示标题|模板循环|脚本错误|投票|参考文献错误)|含有(?:略过模板参数|受损文件链接)|展开模板后长度超过上限|扩展深度超出限制|使用无效自封闭HTML标签|受到保护无法编辑|即将删除)的页面|有错误的Scribunto模块|隐藏分类|页面的节点数超出限制|需要帮助/i,
        };
        $.extend(HC, local, true);
    }
    loadTrigger.loaded(); // 原本要加载完翻译才执行的，直接内嵌了就直接执行了
    const wikiTextBlank = "[\\t _\\xA0\\u1680\\u180E\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]+";
    const wikiTextBlankRE = new RegExp(wikiTextBlank, "g");
    const wikiTextBlankOrBidi = "[\\t _\\xA0\\u1680\\u180E\\u2000-\\u200B\\u200E\\u200F\\u2028-\\u202F\\u205F\\u3000]*";
    const formattedNamespaces = conf.wgFormattedNamespaces;
    const namespaceIds = conf.wgNamespaceIds;
    function autoLocalize(namespaceNumber, _fallback) {
        let fallback = _fallback;
        function createRegexpStr(name) {
            if (!name || !name.length) {
                return "";
            }
            let regex_name = "";
            for (let i = 0; i < name.length; i++) {
                const initial = name.charAt(i),
                    ll = initial.toLowerCase(),
                    ul = initial.toUpperCase();
                if (ll === ul) {
                    regex_name += initial;
                } else {
                    regex_name += `[${ll}${ul}]`;
                }
            }
            return regex_name.replace(/([\\^$.?*+()])/g, "\\$1").replace(wikiTextBlankRE, wikiTextBlank);
        }
        fallback = fallback.toLowerCase();
        const canonical = formattedNamespaces[`${namespaceNumber}`].toLowerCase();
        let regexp = createRegexpStr(canonical);
        if (fallback && canonical !== fallback) {
            regexp += `|${createRegexpStr(fallback)}`;
        }
        if (namespaceIds) {
            for (const cat_name in namespaceIds) {
                if (typeof cat_name === "string" && cat_name.toLowerCase() !== canonical && cat_name.toLowerCase() !== fallback && namespaceIds[cat_name] === namespaceNumber) {
                    regexp += `|${createRegexpStr(cat_name)}`;
                }
            }
        }
        return regexp;
    }
    HC.category_canonical = formattedNamespaces["14"];
    HC.category_regexp = autoLocalize(14, "category");
    if (formattedNamespaces["10"]) {
        HC.template_regexp = autoLocalize(10, "template");
    }
    function make(arg, literal) {
        if (!arg) {
            return null;
        }
        return literal ? document.createTextNode(arg) : document.createElement(arg);
    }
    function param(name, _uri) {
        const uri = _uri || document.location.href;
        const re = new RegExp(`[&?]${name}=([^&#]*)`);
        const m = re.exec(uri);
        if (m && m.length > 1) {
            return decodeURIComponent(m[1]);
        }
        return null;
    }
    function title(href) {
        if (!href) {
            return null;
        }
        const script = `${conf.wgScript}?`;
        if (href.indexOf(script) === 0 || href.indexOf(`${conf.wgServer}${script}`) === 0 || conf.wgServer.substring(0, 2) === "//" && href.indexOf(`${document.location.protocol}${conf.wgServer}${script}`) === 0) {
            return param("title", href);
        }
        let prefix = conf.wgArticlePath.replace("$1", "");
        if (href.indexOf(prefix)) {
            prefix = `${conf.wgServer}${prefix}`;
        }
        if (href.indexOf(prefix) && prefix.substring(0, 2) === "//") {
            prefix = document.location.protocol + prefix;
        }
        if (href.indexOf(prefix) === 0) {
            return decodeURIComponent(href.substring(prefix.length));
        }

        return null;
    }
    function hasClass(elem, name) {
        return ` ${elem.className} `.indexOf(` ${name} `) >= 0;
    }
    function capitalize(str) {
        if (!str || !str.length) {
            return str;
        }
        return str.substr(0, 1).toUpperCase() + str.substr(1);
    }
    function wikiPagePath(pageName) {
        return conf.wgArticlePath.replace("$1", encodeURIComponent(pageName).replace(/%3A/g, ":").replace(/%2F/g, "/"));
    }
    function escapeRE(str) {
        return str.replace(/([\\^$.?*+()[\]])/g, "\\$1");
    }
    function substituteFactory(_options) {
        const options = _options || {};
        const lead = options.indicator || "$";
        const indicator = escapeRE(lead);
        const lbrace = escapeRE(options.lbrace || "{");
        const rbrace = escapeRE(options.rbrace || "}");
        const re = new RegExp(`(?:${indicator}(${indicator}))|(?:${indicator}(\\d+))|(?:${indicator}(?:${lbrace}([^${lbrace}${rbrace}]+)${rbrace}))|(?:${indicator}(?!(?:[${indicator}${lbrace}]|\\d))(\\S+?)\\b)`, "g");
        return function (str, map) {
            if (!map) {
                return str;
            }
            return str.replace(re, (match, prefix, idx, key, alpha) => {
                if (prefix === lead) {
                    return lead;
                }
                const k = alpha || key || idx;
                const replacement = typeof map[k] === "function" ? map[k](match, k) : map[k];
                return typeof replacement === "string" ? replacement : replacement || match;
            });
        };
    }
    const substitute = substituteFactory();
    const replaceShortcuts = (function () {
        const replaceHash = substituteFactory({
            indicator: "#",
            lbrace: "[",
            rbrace: "]",
        });
        return function (str, map) {
            const s = replaceHash(str, map);
            return HC.capitalizePageNames ? capitalize(s) : s;
        };
    })();
    const findCatsRE = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(?:${HC.category_regexp})${wikiTextBlankOrBidi}:[^\\]]+\\]\\]`, "g");
    function replaceByBlanks(match) {
        return match.replace(/(\s|\S)/g, " ");
    }
    function find_category(wikitext, category, once) {
        let cat_regex = null;
        if (HC.template_categories[category]) {
            cat_regex = new RegExp(`\\{\\{${wikiTextBlankOrBidi}(${HC.template_regexp}(?=${wikiTextBlankOrBidi}:))?${wikiTextBlankOrBidi}(?:${HC.template_categories[category]})${wikiTextBlankOrBidi}(\\|.*?)?\\}\\}`, "g");
        } else {
            const cat_name = escapeRE(category);
            const initial = cat_name.substr(0, 1);
            cat_regex = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(${HC.category_regexp})${wikiTextBlankOrBidi}:${wikiTextBlankOrBidi}${initial === "\\" || !HC.capitalizePageNames ? initial : `[${initial.toUpperCase()}${initial.toLowerCase()}]`}${cat_name.substring(1).replace(wikiTextBlankRE, wikiTextBlank)}${wikiTextBlankOrBidi}(\\|.*?)?\\]\\]`, "g");
        }
        if (once) {
            return cat_regex.exec(wikitext);
        }
        const copiedtext = wikitext.replace(/<!--(\s|\S)*?-->/g, replaceByBlanks).replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, replaceByBlanks);
        const result = [];
        let curr_match = null;
        while ((curr_match = cat_regex.exec(copiedtext)) !== null) {
            result.push({
                match: curr_match,
            });
        }
        result.re = cat_regex;
        return result;
    }
    let interlanguageRE = null;
    function change_category(_wikitext, toRemove, toAdd, _key, is_hidden) {
        let key = _key;
        let wikitext = _wikitext;
        function find_insertionpoint(wikitext) {
            const copiedtext = wikitext.replace(/<!--(\s|\S)*?-->/g, replaceByBlanks).replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, replaceByBlanks);
            let index = -1;
            findCatsRE.lastIndex = 0;
            while (findCatsRE.exec(copiedtext) !== null) {
                index = findCatsRE.lastIndex;
            }
            if (index < 0) {
                let match = null;
                if (!interlanguageRE) {
                    match = /((^|\n\r?)(\[\[\s*(([a-z]{2,3}(-[a-z]+)*)|simple|tokipona)\s*:[^\]]+\]\]\s*))+$/.exec(copiedtext);
                } else {
                    match = interlanguageRE.exec(copiedtext);
                }
                if (match) {
                    index = match.index;
                }
                return {
                    idx: index,
                    onCat: false,
                };
            }
            return {
                idx: index,
                onCat: index >= 0,
            };
        }
        const summary = [],
            nameSpace = HC.category_canonical,
            keyChange = toRemove && toAdd && toRemove === toAdd && toAdd.length;
        let cat_point = -1,
            matches;
        if (key) {
            key = `|${key}`;
        }
        if (toRemove && toRemove.length) {
            matches = find_category(wikitext, toRemove);
            if (!matches || !matches.length) {
                return {
                    text: wikitext,
                    summary: summary,
                    error: HC.messages.cat_notFound.replace(/\$1/g, toRemove),
                };
            }
            let before = wikitext.substring(0, matches[0].match.index),
                after = wikitext.substring(matches[0].match.index + matches[0].match[0].length);
            if (matches.length > 1) {
                matches.re.lastIndex = 0;
                after = after.replace(matches.re, "");
            }
            if (toAdd) {
                if (key === null) {
                    key = matches[0].match[2];
                }
            }
            let i = before.length - 1;
            while (i >= 0 && before.charAt(i) !== "\n" && before.substr(i, 1).search(/\s/) >= 0) {
                i--;
            }
            let j = 0;
            while (j < after.length && after.charAt(j) !== "\n" && after.substr(j, 1).search(/\s/) >= 0) {
                j++;
            }
            if (i >= 0 && before.charAt(i) === "\n" && (!after.length || j < after.length && after.charAt(j) === "\n")) {
                i--;
            }
            if (i >= 0) {
                before = before.substring(0, i + 1);
            } else {
                before = "";
            }
            if (j < after.length) {
                after = after.substring(j);
            } else {
                after = "";
            }
            if (before.length && before.substring(before.length - 1).search(/\S/) >= 0 && after.length && after.substr(0, 1).search(/\S/) >= 0) {
                before += " ";
            }
            cat_point = before.length;
            if (cat_point === 0 && after.length && after.substr(0, 1) === "\n") {
                after = after.substr(1);
            }
            wikitext = before + after;
            if (!keyChange) {
                if (HC.template_categories[toRemove]) {
                    summary.push(HC.messages.template_removed.replace(/\$1/g, toRemove));
                } else {
                    summary.push(HC.messages.cat_removed.replace(/\$1/g, toRemove));
                }
            }
        }
        if (toAdd && toAdd.length) {
            matches = find_category(wikitext, toAdd);
            if (matches && matches.length) {
                return {
                    text: wikitext,
                    summary: summary,
                    error: HC.messages.cat_exists.replace(/\$1/g, toAdd),
                };
            }
            let onCat = false;
            if (cat_point < 0) {
                const point = find_insertionpoint(wikitext);
                cat_point = point.idx;
                onCat = point.onCat;
            } else {
                onCat = true;
            }
            const newcatstring = `[[${nameSpace}:${toAdd}${key || ""}]]`;
            if (cat_point >= 0) {
                const suffix = wikitext.substring(cat_point);
                wikitext = wikitext.substring(0, cat_point) + (cat_point > 0 ? "\n" : "") + newcatstring + (!onCat ? "\n" : "");
                if (suffix.length && suffix.substr(0, 1) !== "\n") {
                    wikitext += `\n${suffix}`;
                } else {
                    wikitext += suffix;
                }
            } else {
                if (wikitext.length && wikitext.substr(wikitext.length - 1, 1) !== "\n") {
                    wikitext += "\n";
                }
                wikitext += (wikitext.length ? "\n" : "") + newcatstring;
            }
            if (keyChange) {
                let k = key || "";
                if (k.length) {
                    k = k.substr(1);
                }
                summary.push(substitute(HC.messages.cat_keychange, [null, toAdd, k]));
            } else {
                summary.push(HC.messages.cat_added.replace(/\$1/g, toAdd));
            }
            if (HC.uncat_regexp && !is_hidden) {
                const txt = wikitext.replace(HC.uncat_regexp, "");
                if (txt.length !== wikitext.length) {
                    wikitext = txt;
                    summary.push(HC.messages.uncat_removed);
                }
            }
        }
        return {
            text: wikitext,
            summary: summary,
            error: null,
        };
    }
    function evtKeys(e) {
        let code = 0;
        if (e.ctrlKey) {
            if (e.ctrlKey || e.metaKey) {
                code |= 1;
            }
            if (e.shiftKey) {
                code |= 2;
            }
        }
        return code;
    }
    function evtKill(e) {
        if (e.preventDefault) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
        return false;
    }
    let catLine = null,
        onUpload = false,
        editors = [],
        commitButton = null,
        commitForm = null,
        multiSpan = null,
        pageText = null,
        pageTime = null,
        pageWatched = false,
        watchCreate = false,
        watchEdit = false,
        minorEdits = false,
        editToken = null,
        is_rtl = false,
        serverTime = null,
        lastRevId = null,
        pageTextRevId = null,
        conflictingUser = null,
        newDOM = false;
    class CategoryEditor {
        static UNCHANGED = 0;
        static OPEN = 1;
        static CHANGE_PENDING = 2;
        static CHANGED = 3;
        static DELETED = 4;
        callbackObj = null;
        constructor(line, _span, _after, key, is_hidden) {
            let span = _span;
            let after = _after;
            if (!span) {
                this.isAddCategory = true;
                this.originalCategory = "";
                this.originalKey = null;
                this.originalExists = false;
                if (!newDOM) {
                    span = make("span");
                    span.className = "noprint";
                    if (key) {
                        span.appendChild(make(" | ", true));
                        if (after) {
                            after.parentNode.insertBefore(span, after.nextSibling);
                            after = after.nextSibling;
                        } else {
                            line.appendChild(span);
                        }
                    } else if (line.firstChild) {
                        span.appendChild(make(" ", true));
                        line.appendChild(span);
                    }
                }
                this.linkSpan = make("span");
                this.linkSpan.className = "noprint nopopups hotcatlink";
                const lk = make("a");
                lk.href = "#catlinks";
                lk.onclick = this.open.bind(this);
                lk.appendChild(make(HC.links.add, true));
                lk.title = HC.tooltips.add;
                this.linkSpan.appendChild(lk);
                span = make(newDOM ? "li" : "span");
                span.className = "noprint";
                if (is_rtl) {
                    span.dir = "rtl";
                }
                span.appendChild(this.linkSpan);
                if (after) {
                    after.parentNode.insertBefore(span, after.nextSibling);
                } else {
                    line.appendChild(span);
                }
                this.normalLinks = null;
                this.undelLink = null;
                this.catLink = null;
            } else {
                if (is_rtl) {
                    span.dir = "rtl";
                }
                this.isAddCategory = false;
                this.catLink = span.firstChild;
                this.originalCategory = Array.isArray(after) ? after[0] : after;
                this.originalKey = key && key.length > 1 ? key.substr(1) : null;
                this.originalExists = !hasClass(this.catLink, "new");
                this.makeLinkSpan();
                if (!this.originalExists && this.upDownLinks) {
                    this.upDownLinks.style.display = "none";
                }
                span.appendChild(this.linkSpan);
            }
            this.originalHidden = is_hidden;
            this.line = line;
            this.engine = HC.suggestions;
            this.span = span;
            this.currentCategory = !this.isAddCategory && Array.isArray(after) ? after[1] : this.originalCategory;
            this.currentExists = this.originalExists;
            this.currentHidden = this.originalHidden;
            this.currentKey = this.originalKey;
            this.state = CategoryEditor.UNCHANGED;
            this.lastSavedState = CategoryEditor.UNCHANGED;
            this.lastSavedCategory = this.currentCategory;
            this.lastSavedKey = this.originalKey;
            this.lastSavedExists = this.originalExists;
            this.lastSavedHidden = this.originalHidden;
            if (this.catLink && this.currentKey) {
                this.catLink.title = this.currentKey;
            }
            editors[editors.length] = this;
        }
        makeLinkSpan() {
            this.normalLinks = make("span");
            let lk = null;
            if (this.originalCategory && this.originalCategory.length) {
                lk = make("a");
                lk.href = "#catlinks";
                lk.onclick = this.remove.bind(this);
                lk.appendChild(make(HC.links.remove, true));
                lk.title = HC.tooltips.remove;
                this.normalLinks.appendChild(make(" ", true));
                this.normalLinks.appendChild(lk);
            }
            if (!HC.template_categories[this.originalCategory]) {
                lk = make("a");
                lk.href = "#catlinks";
                lk.onclick = this.open.bind(this);
                lk.appendChild(make(HC.links.change, true));
                lk.title = HC.tooltips.change;
                this.normalLinks.appendChild(make(" ", true));
                this.normalLinks.appendChild(lk);
                if (!noSuggestions && HC.use_up_down) {
                    this.upDownLinks = make("span");
                    lk = make("a");
                    lk.href = "#catlinks";
                    lk.onclick = this.down.bind(this);
                    lk.appendChild(make(HC.links.down, true));
                    lk.title = HC.tooltips.down;
                    this.upDownLinks.appendChild(make(" ", true));
                    this.upDownLinks.appendChild(lk);
                    lk = make("a");
                    lk.href = "#catlinks";
                    lk.onclick = this.up.bind(this);
                    lk.appendChild(make(HC.links.up, true));
                    lk.title = HC.tooltips.up;
                    this.upDownLinks.appendChild(make(" ", true));
                    this.upDownLinks.appendChild(lk);
                    this.normalLinks.appendChild(this.upDownLinks);
                }
            }
            this.linkSpan = make("span");
            this.linkSpan.className = "noprint nopopups hotcatlink";
            this.linkSpan.appendChild(this.normalLinks);
            this.undelLink = make("span");
            this.undelLink.className = "nopopups hotcatlink";
            this.undelLink.style.display = "none";
            lk = make("a");
            lk.href = "#catlinks";
            lk.onclick = this.restore.bind(this);
            lk.appendChild(make(HC.links.restore, true));
            lk.title = HC.tooltips.restore;
            this.undelLink.appendChild(make(" ", true));
            this.undelLink.appendChild(lk);
            this.linkSpan.appendChild(this.undelLink);
        }
        invokeSuggestions(dont_autocomplete) {
            if (this.engine && suggestionConfigs[this.engine] && suggestionConfigs[this.engine].temp && !dont_autocomplete) {
                this.engine = HC.suggestions;
            }
            this.state = CategoryEditor.CHANGE_PENDING;
            const self = this;
            window.setTimeout(() => {
                self.textchange(dont_autocomplete);
            }, HC.suggest_delay);
        }
        makeForm() {
            const form = make("form");
            form.method = "POST";
            form.onsubmit = this.accept.bind(this);
            this.form = form;
            const self = this;
            const text = make("input");
            text.type = "text";
            text.size = HC.editbox_width;
            if (!noSuggestions) {
                text.onkeyup = function (evt) {
                    const key = evt.keyCode || 0;
                    if (self.ime && self.lastKey === IME && !self.usesComposition && (key === TAB || key === RET || key === ESC || key === SPACE)) {
                        self.ime = false;
                    }
                    if (self.ime) {
                        return true;
                    }
                    if (key === UP || key === DOWN || key === PGUP || key === PGDOWN) {
                        if (self.keyCount === 0) {
                            return self.processKey(evt);
                        }
                    } else {
                        if (key === ESC && self.lastKey !== IME) {
                            if (!self.resetKeySelection()) {
                                self.cancel();
                                return;
                            }
                        }
                        self.invokeSuggestions(key === BS || key === DEL || key === ESC);
                    }
                    return true;
                };
                text.onkeydown = function (evt) {
                    const key = evt.keyCode || 0;
                    self.lastKey = key;
                    self.keyCount = 0;
                    if (!self.ime && key === IME && !self.usesComposition) {
                        self.ime = true;
                    } else if (self.ime && key !== IME && !(key >= 16 && key <= 20 || key >= 91 && key <= 93 || key === 144)) {
                        self.ime = false;
                    }
                    if (self.ime) {
                        return true;
                    }
                    if (key === RET) {
                        return self.accept(evt);
                    }
                    return key === ESC ? evtKill(evt) : true;
                };
                text.onkeypress = function (evt) {
                    self.keyCount++;
                    return self.processKey(evt);
                };
                $(text).on("focus", () => {
                    makeActive(self);
                });
                $(text).on(text.onbeforedeactivate !== undefined && text.createTextRange ? "beforedeactivate" : "blur", this.saveView.bind(this));
                try {
                    $(text).on("compositionstart", () => {
                        self.lastKey = IME;
                        self.usesComposition = true;
                        self.ime = true;
                    });
                    $(text).on("compositionend", () => {
                        self.lastKey = IME;
                        self.usesComposition = true;
                        self.ime = false;
                    });
                    $(text).on("textInput", () => {
                        self.ime = false;
                        self.invokeSuggestions(false);
                    });
                } catch { }
                $(text).on("blur", () => {
                    self.usesComposition = false;
                    self.ime = false;
                });
            }
            this.text = text;
            this.icon = make("img");
            this.icon.width = "20";
            let list = null;
            if (!noSuggestions) {
                list = make("select");
                list.onclick = function () {
                    if (self.highlightSuggestion(0)) {
                        self.textchange(false, true);
                    }
                };
                list.ondblclick = function (e) {
                    if (self.highlightSuggestion(0)) {
                        self.accept(e);
                    }
                };
                list.onchange = function () {
                    self.highlightSuggestion(0);
                    self.text.focus();
                };
                list.onkeyup = function (evt) {
                    if (evt.keyCode === ESC) {
                        self.resetKeySelection();
                        self.text.focus();
                        window.setTimeout(() => {
                            self.textchange(true);
                        }, HC.suggest_delay);
                    } else if (evt.keyCode === RET) {
                        self.accept(evt);
                    }
                };
                if (!HC.fixed_search) {
                    const engineSelector = make("select");
                    for (const key in suggestionConfigs) {
                        if (suggestionConfigs[key].show) {
                            const opt = make("option");
                            opt.value = key;
                            if (key === this.engine) {
                                opt.selected = true;
                            }
                            opt.appendChild(make(suggestionConfigs[key].name, true));
                            engineSelector.appendChild(opt);
                        }
                    }
                    engineSelector.onchange = function () {
                        self.engine = self.engineSelector.options[self.engineSelector.selectedIndex].value;
                        self.text.focus();
                        self.textchange(true, true);
                    };
                    this.engineSelector = engineSelector;
                }
            }
            this.list = list;
            function button_label(id, defaultText) {
                let label = null;
                if (onUpload && window.UFUI !== undefined && window.UIElements !== undefined && window.UFUI.getLabel instanceof Function) {
                    try {
                        label = window.UFUI.getLabel(id, true);
                        while (label && label.nodeType !== 3) {
                            label = label.firstChild;
                        }
                    } catch (ex) {
                        label = null;
                    }
                }
                if (!label || !label.data) {
                    return defaultText;
                }
                return label.data;
            }
            const OK = make("input");
            OK.type = "button";
            OK.value = button_label("wpOkUploadLbl", HC.messages.ok);
            OK.onclick = this.accept.bind(this);
            this.ok = OK;
            const cancel = make("input");
            cancel.type = "button";
            cancel.value = button_label("wpCancelUploadLbl", HC.messages.cancel);
            cancel.onclick = this.cancel.bind(this);
            this.cancelButton = cancel;
            const span = make("span");
            span.className = "hotcatinput";
            span.style.position = "relative";
            span.appendChild(text);
            span.appendChild(make(" ", true));
            span.style.whiteSpace = "nowrap";
            if (list) {
                span.appendChild(list);
            }
            if (this.engineSelector) {
                span.appendChild(this.engineSelector);
            }
            if (!noSuggestions) {
                span.appendChild(this.icon);
            }
            span.appendChild(OK);
            span.appendChild(cancel);
            form.appendChild(span);
            form.style.display = "none";
            this.span.appendChild(form);
        }
        display(evt) {
            if (this.isAddCategory && !onUpload) {
                new CategoryEditor(this.line, null, this.span, true);
            }
            if (!commitButton && !onUpload) {
                for (let i = 0; i < editors.length; i++) {
                    if (editors[i].state !== CategoryEditor.UNCHANGED) {
                        setMultiInput();
                        break;
                    }
                }
            }
            if (!this.form) {
                this.makeForm();
            }
            if (this.list) {
                this.list.style.display = "none";
            }
            if (this.engineSelector) {
                this.engineSelector.style.display = "none";
            }
            this.currentCategory = this.lastSavedCategory;
            this.currentExists = this.lastSavedExists;
            this.currentHidden = this.lastSavedHidden;
            this.currentKey = this.lastSavedKey;
            this.icon.src = this.currentExists ? HC.existsYes : HC.existsNo;
            this.text.value = this.currentCategory + (this.currentKey !== null ? `|${this.currentKey}` : "");
            this.originalState = this.state;
            this.lastInput = this.currentCategory;
            this.inputExists = this.currentExists;
            this.state = this.state === CategoryEditor.UNCHANGED ? CategoryEditor.OPEN : CategoryEditor.CHANGE_PENDING;
            this.lastSelection = {
                start: this.currentCategory.length,
                end: this.currentCategory.length,
            };
            this.showsList = false;
            if (this.catLink) {
                this.catLink.style.display = "none";
            }
            this.linkSpan.style.display = "none";
            this.form.style.display = "inline";
            this.ok.disabled = false;
            const result = evtKill(evt);
            this.text.focus();
            this.text.readOnly = false;
            checkMultiInput();
            return result;
        }
        show(evt, engine, readOnly) {
            const result = this.display(evt);
            const v = this.lastSavedCategory;
            if (!v.length) {
                return result;
            }
            this.text.readOnly = !!readOnly;
            this.engine = engine;
            this.textchange(false, true);
            forceRedraw();
            return result;
        }
        open(evt) {
            return this.show(evt, this.engine && suggestionConfigs[this.engine].temp ? HC.suggestions : this.engine);
        }
        down(evt) {
            return this.show(evt, "subcat", true);
        }
        up(evt) {
            return this.show(evt, "parentcat");
        }
        cancel() {
            if (this.isAddCategory && !onUpload) {
                this.removeEditor();
                return;
            }
            this.inactivate();
            this.form.style.display = "none";
            if (this.catLink) {
                this.catLink.style.display = "";
            }
            this.linkSpan.style.display = "";
            this.state = this.originalState;
            this.currentCategory = this.lastSavedCategory;
            this.currentKey = this.lastSavedKey;
            this.currentExists = this.lastSavedExists;
            this.currentHidden = this.lastSavedHidden;
            if (this.catLink) {
                if (this.currentKey && this.currentKey.length) {
                    this.catLink.title = this.currentKey;
                } else {
                    this.catLink.title = "";
                }
            }
            if (this.state === CategoryEditor.UNCHANGED) {
                if (this.catLink) {
                    this.catLink.style.backgroundColor = "transparent";
                }
            } else {
                if (!onUpload) {
                    try {
                        this.catLink.style.backgroundColor = HC.bg_changed;
                    } catch { }
                }
            }
            checkMultiInput();
            forceRedraw();
        }
        removeEditor() {
            if (!newDOM) {
                const next = this.span.nextSibling;
                if (next) {
                    next.parentNode.removeChild(next);
                }
            }
            if (this.span && this.span.parentNode) {
                this.span.parentNode.removeChild(this.span);
            }
            for (let i = 0; i < editors.length; i++) {
                if (editors[i] === this) {
                    editors.splice(i, 1);
                    break;
                }
            }
            checkMultiInput();
        }
        rollback(evt) {
            this.undoLink.parentNode.removeChild(this.undoLink);
            this.undoLink = null;
            this.currentCategory = this.originalCategory;
            this.currentKey = this.originalKey;
            this.currentExists = this.originalExists;
            this.currentHidden = this.originalHidden;
            this.lastSavedCategory = this.originalCategory;
            this.lastSavedKey = this.originalKey;
            this.lastSavedExists = this.originalExists;
            this.lastSavedHidden = this.originalHidden;
            this.state = CategoryEditor.UNCHANGED;
            if (!this.currentCategory || !this.currentCategory.length) {
                this.removeEditor();
            } else {
                this.catLink.removeChild(this.catLink.firstChild);
                this.catLink.appendChild(make(this.currentCategory, true));
                this.catLink.href = wikiPagePath(`${HC.category_canonical}:${this.currentCategory}`);
                this.catLink.title = this.currentKey || "";
                this.catLink.className = this.currentExists ? "" : "new";
                this.catLink.style.backgroundColor = "transparent";
                if (this.upDownLinks) {
                    this.upDownLinks.style.display = this.currentExists ? "" : "none";
                }
                checkMultiInput();
            }
            return evtKill(evt);
        }
        inactivate() {
            if (this.list) {
                this.list.style.display = "none";
            }
            if (this.engineSelector) {
                this.engineSelector.style.display = "none";
            }
            this.is_active = false;
        }
        acceptCheck(dontCheck) {
            this.sanitizeInput();
            const value = this.text.value.split("|");
            let key = null;
            if (value.length > 1) {
                key = value[1];
            }
            let v = value[0].replace(/_/g, " ").replace(/^\s+|\s+$/g, "");
            if (HC.capitalizePageNames) {
                v = capitalize(v);
            }
            this.lastInput = v;
            v = replaceShortcuts(v, HC.shortcuts);
            if (!v.length) {
                this.cancel();
                return false;
            }
            if (!dontCheck && (conf.wgNamespaceNumber === 14 && v === conf.wgTitle || HC.blacklist && HC.blacklist.test(v))) {
                this.cancel();
                return false;
            }
            this.currentCategory = v;
            this.currentKey = key;
            this.currentExists = this.inputExists;
            return true;
        }
        accept(evt) {
            this.noCommit = (evtKeys(evt) & 1) !== 0;
            const result = evtKill(evt);
            if (this.acceptCheck()) {
                const toResolve = [this];
                const original = this.currentCategory;
                resolveMulti(toResolve, (resolved) => {
                    if (resolved[0].dab) {
                        showDab(resolved[0]);
                    } else {
                        if (resolved[0].acceptCheck(true)) {
                            resolved[0].commit(resolved[0].currentCategory !== original ? HC.messages.cat_resolved.replace(/\$1/g, original) : null);
                        }
                    }
                });
            }
            return result;
        }
        close() {
            if (!this.catLink) {
                this.catLink = make("a");
                this.catLink.appendChild(make("foo", true));
                this.catLink.style.display = "none";
                this.span.insertBefore(this.catLink, this.span.firstChild.nextSibling);
            }
            this.catLink.removeChild(this.catLink.firstChild);
            this.catLink.appendChild(make(this.currentCategory, true));
            this.catLink.href = wikiPagePath(`${HC.category_canonical}:${this.currentCategory}`);
            this.catLink.className = this.currentExists ? "" : "new";
            this.lastSavedCategory = this.currentCategory;
            this.lastSavedKey = this.currentKey;
            this.lastSavedExists = this.currentExists;
            this.lastSavedHidden = this.currentHidden;
            this.inactivate();
            this.form.style.display = "none";
            this.catLink.title = this.currentKey || "";
            this.catLink.style.display = "";
            if (this.isAddCategory) {
                if (onUpload) {
                    new CategoryEditor(this.line, null, this.span, true);
                }
                this.isAddCategory = false;
                this.linkSpan.parentNode.removeChild(this.linkSpan);
                this.makeLinkSpan();
                this.span.appendChild(this.linkSpan);
            }
            if (!this.undoLink) {
                const span = make("span");
                const lk = make("a");
                lk.href = "#catlinks";
                lk.onclick = this.rollback.bind(this);
                lk.appendChild(make(HC.links.undo, true));
                lk.title = HC.tooltips.undo;
                span.appendChild(make(" ", true));
                span.appendChild(lk);
                this.normalLinks.appendChild(span);
                this.undoLink = span;
                if (!onUpload) {
                    try {
                        this.catLink.style.backgroundColor = HC.bg_changed;
                    } catch { }
                }
            }
            if (this.upDownLinks) {
                this.upDownLinks.style.display = this.lastSavedExists ? "" : "none";
            }
            this.linkSpan.style.display = "";
            this.state = CategoryEditor.CHANGED;
            checkMultiInput();
            forceRedraw();
        }
        commit() {
            if (this.currentCategory === this.originalCategory && (this.currentKey === this.originalKey || this.currentKey === null && !this.originalKey.length) || conf.wgNamespaceNumber === 14 && this.currentCategory === conf.wgTitle || HC.blacklist && HC.blacklist.test(this.currentCategory)) {
                this.cancel();
                return;
            }
            this.close();
            if (!commitButton && !onUpload) {
                const self = this;
                initiateEdit((failure) => {
                    performChanges(failure, self);
                }, (msg) => {
                    oouiDialog.alert(oouiDialog.sanitize(msg), {
                        title: "HotCat 小工具",
                    });
                });
            }
        }
        remove(evt) {
            this.doRemove(evtKeys(evt) & 1);
            return evtKill(evt);
        }
        doRemove(noCommit) {
            if (this.isAddCategory) {
                this.cancel();
                return;
            }
            if (!commitButton && !onUpload) {
                for (let i = 0; i < editors.length; i++) {
                    if (editors[i].state !== CategoryEditor.UNCHANGED) {
                        setMultiInput();
                        break;
                    }
                }
            }
            if (commitButton) {
                this.catLink.title = "";
                this.catLink.style.cssText += "; text-decoration : line-through !important;";
                try {
                    this.catLink.style.backgroundColor = HC.bg_changed;
                } catch { }
                this.originalState = this.state;
                this.state = CategoryEditor.DELETED;
                this.normalLinks.style.display = "none";
                this.undelLink.style.display = "";
                checkMultiInput();
            } else {
                if (onUpload) {
                    this.removeEditor();
                } else {
                    this.originalState = this.state;
                    this.state = CategoryEditor.DELETED;
                    this.noCommit = noCommit || HC.del_needs_diff;
                    const self = this;
                    initiateEdit((failure) => {
                        performChanges(failure, self);
                    }, (msg) => {
                        self.state = self.originalState;
                        oouiDialog.alert(oouiDialog.sanitize(msg), {
                            title: "HotCat 小工具",
                        });
                    });
                }
            }
        }
        restore(evt) {
            this.catLink.title = this.currentKey || "";
            this.catLink.style.textDecoration = "";
            this.state = this.originalState;
            if (this.state === CategoryEditor.UNCHANGED) {
                this.catLink.style.backgroundColor = "transparent";
            } else {
                try {
                    this.catLink.style.backgroundColor = HC.bg_changed;
                } catch { }
            }
            this.normalLinks.style.display = "";
            this.undelLink.style.display = "none";
            checkMultiInput();
            return evtKill(evt);
        }
        selectEngine(engineName) {
            if (!this.engineSelector) {
                return;
            }
            for (let i = 0; i < this.engineSelector.options.length; i++) {
                this.engineSelector.options[i].selected = this.engineSelector.options[i].value === engineName;
            }
        }
        sanitizeInput() {
            let v = this.text.value || "";
            v = v.replace(/^(\s|_)+/, "");
            const re = new RegExp(`^(${HC.category_regexp}):`);
            if (re.test(v)) {
                v = v.substring(v.indexOf(":") + 1).replace(/^(\s|_)+/, "");
            }
            v = v.replace(/\u200E$/, "");
            if (HC.capitalizePageNames) {
                v = capitalize(v);
            }
            if (this.text.value !== null && this.text.value !== v) {
                const cursorPos = this.text.selectionStart;
                this.text.value = v;
                this.text.setSelectionRange(cursorPos, cursorPos);
            }
        }
        makeCall(url, callbackObj, engine, queryKey, cleanKey) {
            let cb = callbackObj;
            const e = engine,
                v = queryKey,
                z = cleanKey;
            $.ajax({
                url,
                method: "GET",
                dataType: "json",
                success: (json) => {
                    const titles = e.handler(json, z);
                    if (titles && titles.length) {
                        if (cb.allTitles === null) {
                            cb.allTitles = titles;
                        } else {
                            cb.allTitles = cb.allTitles.concat(titles);
                        }
                        if (titles.exists) {
                            cb.exists = true;
                        }
                        if (titles.normalized) {
                            cb.normalized = titles.normalized;
                        }
                    }
                },
                error: (req) => {
                    if (!req) {
                        noSuggestions = true;
                    }
                    cb.dontCache = true;
                },
                complete: () => {
                    cb.callsMade++;
                    if (cb.callsMade === cb.nofCalls) {
                        if (cb.exists) {
                            cb.allTitles.exists = true;
                        }
                        if (cb.normalized) {
                            cb.allTitles.normalized = cb.normalized;
                        }
                        if (!cb.dontCache && !suggestionConfigs[cb.engineName].cache[z]) {
                            suggestionConfigs[cb.engineName].cache[z] = cb.allTitles;
                        }
                        this.text.readOnly = false;
                        if (!cb.cancelled) {
                            this.showSuggestions(cb.allTitles, cb.noCompletion, v, cb.engineName);
                        }
                        if (cb === this.callbackObj) {
                            this.callbackObj = null;
                        }
                        cb = undefined;
                    }
                },
            });
        }
        textchange(_dont_autocomplete, force) {
            makeActive(this);
            this.sanitizeInput();
            let v = this.text.value;
            const pipe = v.indexOf("|");
            if (pipe >= 0) {
                this.currentKey = v.substring(pipe + 1);
                v = v.substring(0, pipe);
            } else {
                this.currentKey = null;
            }
            if (this.lastInput === v && !force) {
                return;
            }
            if (this.lastInput !== v) {
                checkMultiInput();
            }
            this.lastInput = v;
            this.lastRealInput = v;
            this.ok.disabled = v.length && HC.blacklist && HC.blacklist.test(v);
            if (noSuggestions) {
                if (this.list) {
                    this.list.style.display = "none";
                }
                if (this.engineSelector) {
                    this.engineSelector.style.display = "none";
                }
                if (this.icon) {
                    this.icon.style.display = "none";
                }
                return;
            }
            if (!v.length) {
                this.showSuggestions([]);
                return;
            }
            let cleanKey = v.replace(/[\u200E\u200F\u202A-\u202E]/g, "").replace(wikiTextBlankRE, " ");
            cleanKey = replaceShortcuts(cleanKey, HC.shortcuts);
            cleanKey = cleanKey.replace(/^\s+|\s+$/g, "");
            if (!cleanKey.length) {
                this.showSuggestions([]);
                return;
            }
            if (this.callbackObj) {
                this.callbackObj.cancelled = true;
            }
            const engineName = suggestionConfigs[this.engine] ? this.engine : "combined";
            const dont_autocomplete = _dont_autocomplete || suggestionConfigs[engineName].noCompletion;
            if (suggestionConfigs[engineName].cache[cleanKey]) {
                this.showSuggestions(suggestionConfigs[engineName].cache[cleanKey], dont_autocomplete, v, engineName);
                return;
            }
            const engines = suggestionConfigs[engineName].engines;
            this.callbackObj = {
                allTitles: null,
                callsMade: 0,
                nofCalls: engines.length,
                noCompletion: dont_autocomplete,
                engineName: engineName,
            };
            this.makeCalls(engines, this.callbackObj, v, cleanKey);
        }
        makeCalls(engines, cb, v, cleanKey) {
            for (let j = 0; j < engines.length; j++) {
                const engine = suggestionEngines[engines[j]];
                const url = `${conf.wgServer}${conf.wgScriptPath}${engine.uri.replace(/\$1/g, encodeURIComponent(cleanKey))}`;
                this.makeCall(url, cb, engine, v, cleanKey);
            }
        }
        showSuggestions(titles, dontAutocomplete, queryKey, engineName) {
            this.text.readOnly = false;
            this.dab = null;
            this.showsList = false;
            if (!this.list) {
                return;
            }
            if (noSuggestions) {
                if (this.list) {
                    this.list.style.display = "none";
                }
                if (this.engineSelector) {
                    this.engineSelector.style.display = "none";
                }
                if (this.icon) {
                    this.icon.style.display = "none";
                }
                this.inputExists = true;
                return;
            }
            this.engineName = engineName;
            if (engineName) {
                if (!this.engineSelector) {
                    this.engineName = null;
                }
            } else {
                if (this.engineSelector) {
                    this.engineSelector.style.display = "none";
                }
            }
            if (queryKey) {
                if (this.lastInput.indexOf(queryKey)) {
                    return;
                }
                if (this.lastQuery && this.lastInput.indexOf(this.lastQuery) === 0 && this.lastQuery.length > queryKey.length) {
                    return;
                }
            }
            this.lastQuery = queryKey;
            let v = this.text.value.split("|");
            const key = v.length > 1 ? `|${v[1]}` : "";
            v = HC.capitalizePageNames ? capitalize(v[0]) : v[0];
            let vNormalized = v;
            const knownToExist = titles && titles.exists;
            let i;
            if (titles) {
                if (titles.normalized && v.indexOf(queryKey) === 0) {
                    vNormalized = titles.normalized + v.substring(queryKey.length);
                }
                const vLow = vNormalized.toLowerCase();
                if (HC.blacklist) {
                    for (i = 0; i < titles.length; i++) {
                        if (HC.blacklist.test(titles[i])) {
                            titles.splice(i, 1);
                            i--;
                        }
                    }
                }
                titles.sort((a, b) => {
                    if (a === b) {
                        return 0;
                    }
                    if (a.indexOf(b) === 0) {
                        return 1;
                    }
                    if (b.indexOf(a) === 0) {
                        return -1;
                    }
                    let prefixMatchA = a.indexOf(vNormalized) === 0 ? 1 : 0;
                    let prefixMatchB = b.indexOf(vNormalized) === 0 ? 1 : 0;
                    if (prefixMatchA !== prefixMatchB) {
                        return prefixMatchB - prefixMatchA;
                    }
                    const aLow = a.toLowerCase(),
                        bLow = b.toLowerCase();
                    prefixMatchA = aLow.indexOf(vLow) === 0 ? 1 : 0;
                    prefixMatchB = bLow.indexOf(vLow) === 0 ? 1 : 0;
                    if (prefixMatchA !== prefixMatchB) {
                        return prefixMatchB - prefixMatchA;
                    }
                    if (a < b) {
                        return -1;
                    }
                    if (b < a) {
                        return 1;
                    }
                    return 0;
                });
                for (i = 0; i < titles.length; i++) {
                    if (i + 1 < titles.length && titles[i] === titles[i + 1] || conf.wgNamespaceNumber === 14 && titles[i] === conf.wgTitle) {
                        titles.splice(i, 1);
                        i--;
                    }
                }
            }
            if (!titles || !titles.length) {
                if (this.list) {
                    this.list.style.display = "none";
                }
                if (this.engineSelector) {
                    this.engineSelector.style.display = "none";
                }
                if (engineName && suggestionConfigs[engineName] && !suggestionConfigs[engineName].temp) {
                    if (this.icon) {
                        this.icon.src = HC.existsNo;
                    }
                    this.inputExists = false;
                }
                return;
            }
            const firstTitle = titles[0];
            const completed = this.autoComplete(firstTitle, v, vNormalized, key, dontAutocomplete);
            const existing = completed || knownToExist || firstTitle === replaceShortcuts(v, HC.shortcuts);
            if (engineName && suggestionConfigs[engineName] && !suggestionConfigs[engineName].temp) {
                this.icon.src = existing ? HC.existsYes : HC.existsNo;
                this.inputExists = existing;
            }
            if (completed) {
                this.lastInput = firstTitle;
                if (titles.length === 1) {
                    this.list.style.display = "none";
                    if (this.engineSelector) {
                        this.engineSelector.style.display = "none";
                    }
                    return;
                }
            }
            while (this.list.firstChild) {
                this.list.removeChild(this.list.firstChild);
            }
            for (i = 0; i < titles.length; i++) {
                const opt = make("option");
                opt.appendChild(make(titles[i], true));
                opt.selected = completed && i === 0;
                this.list.appendChild(opt);
            }
            this.displayList();
        }
        displayList() {
            this.showsList = true;
            if (!this.is_active) {
                this.list.style.display = "none";
                if (this.engineSelector) {
                    this.engineSelector.style.display = "none";
                }
                return;
            }
            let nofItems = this.list.options.length > HC.listSize ? HC.listSize : this.list.options.length;
            if (nofItems <= 1) {
                nofItems = 2;
            }
            this.list.size = nofItems;
            this.list.style.align = is_rtl ? "right" : "left";
            this.list.style.zIndex = 5;
            this.list.style.position = "absolute";
            const anchor = is_rtl ? "right" : "left";
            let listh = 0;
            if (this.list.style.display === "none") {
                this.list.style.top = `${this.text.offsetTop}px`;
                this.list.style[anchor] = "-10000px";
                this.list.style.display = "";
                listh = this.list.offsetHeight;
                this.list.style.display = "none";
            } else {
                listh = this.list.offsetHeight;
            }
            let maxListHeight = listh;
            if (nofItems < HC.listSize) {
                maxListHeight = listh / nofItems * HC.listSize;
            }
            function viewport(what) {
                if (is_webkit && !document.evaluate) {
                    return window[`inner${what}`];
                }
                const s = `client${what}`;
                if (window.opera) {
                    return document.body[s];
                }
                return (document.documentElement ? document.documentElement[s] : 0) || document.body[s] || 0;
            }
            function scroll_offset(what) {
                const s = `scroll${what}`;
                let result = (document.documentElement ? document.documentElement[s] : 0) || document.body[s] || 0;
                if (is_rtl && what === "Left") {
                    if (result < 0) {
                        result = -result;
                    }
                    if (!is_webkit) {
                        result = scroll_offset("Width") - viewport("Width") - result;
                    }
                }
                return result;
            }
            function position(_node) {
                let node = _node;
                if (node.getBoundingClientRect) {
                    const box = node.getBoundingClientRect();
                    return {
                        x: Math.round(box.left + scroll_offset("Left")),
                        y: Math.round(box.top + scroll_offset("Top")),
                    };
                }
                let t = 0,
                    l = 0;
                do {
                    t += node.offsetTop || 0;
                    l += node.offsetLeft || 0;
                    node = node.offsetParent;
                } while (node);
                return {
                    x: l,
                    y: t,
                };
            }
            const textPos = position(this.text),
                nl = 0,
                textBoxWidth = this.text.offsetWidth || this.text.clientWidth;
            let nt = 0,
                offset = 0;
            if (this.engineName) {
                this.engineSelector.style.zIndex = 5;
                this.engineSelector.style.position = "absolute";
                this.engineSelector.style.width = `${textBoxWidth}px`;
                if (this.engineSelector.style.display === "none") {
                    this.engineSelector.style[anchor] = "-10000px";
                    this.engineSelector.style.top = "0";
                    this.engineSelector.style.display = "";
                    offset = this.engineSelector.offsetHeight;
                    this.engineSelector.style.display = "none";
                } else {
                    offset = this.engineSelector.offsetHeight;
                }
                this.engineSelector.style[anchor] = `${nl}px`;
            }
            if (textPos.y < maxListHeight + offset + 1) {
                nt = this.text.offsetHeight + offset + 1;
                if (this.engineName) {
                    this.engineSelector.style.top = `${this.text.offsetHeight}px`;
                }
            } else {
                nt = -listh - offset - 1;
                if (this.engineName) {
                    this.engineSelector.style.top = `${-(offset + 1)}px`;
                }
            }
            this.list.style.top = `${nt}px`;
            this.list.style.width = "";
            this.list.style[anchor] = `${nl}px`;
            if (this.engineName) {
                this.selectEngine(this.engineName);
                this.engineSelector.style.display = "";
            }
            this.list.style.display = "block";
            if (this.list.offsetWidth < textBoxWidth) {
                this.list.style.width = `${textBoxWidth}px`;
                return;
            }
            const scroll = scroll_offset("Left");
            const view_w = viewport("Width");
            let w = this.list.offsetWidth;
            const l_pos = position(this.list);
            let left = l_pos.x;
            let right = left + w;
            if (left < scroll || right > scroll + view_w) {
                if (w > view_w) {
                    w = view_w;
                    this.list.style.width = `${w}px`;
                    if (is_rtl) {
                        left = right - w;
                    } else {
                        right = left + w;
                    }
                }
                let relative_offset = 0;
                if (left < scroll) {
                    relative_offset = scroll - left;
                } else if (right > scroll + view_w) {
                    relative_offset = -(right - scroll - view_w);
                }
                if (is_rtl) {
                    relative_offset = -relative_offset;
                }
                if (relative_offset) {
                    this.list.style[anchor] = `${nl + relative_offset}px`;
                }
            }
        }
        autoComplete(newVal, _actVal, normalizedActVal, key, dontModify) {
            let actVal = _actVal;
            if (newVal === actVal) {
                return true;
            }
            if (dontModify || this.ime || !this.canSelect()) {
                return false;
            }
            if (newVal.indexOf(actVal)) {
                if (normalizedActVal && newVal.indexOf(normalizedActVal) === 0) {
                    if (this.lastRealInput === actVal) {
                        this.lastRealInput = normalizedActVal;
                    }
                    actVal = normalizedActVal;
                } else {
                    return false;
                }
            }
            this.text.focus();
            this.text.value = newVal + key;
            this.setSelection(actVal.length, newVal.length);
            return true;
        }
        canSelect() {
            return this.text.setSelectionRange || this.text.createTextRange || this.text.selectionStart !== undefined && this.text.selectionEnd !== undefined;
        }
        setSelection(from, to) {
            if (!this.text.value) {
                return;
            }
            if (this.text.setSelectionRange) {
                this.text.setSelectionRange(from, to);
            } else if (this.text.selectionStart !== undefined) {
                if (from > this.text.selectionStart) {
                    this.text.selectionEnd = to;
                    this.text.selectionStart = from;
                } else {
                    this.text.selectionStart = from;
                    this.text.selectionEnd = to;
                }
            } else if (this.text.createTextRange) {
                const new_selection = this.text.createTextRange();
                new_selection.move("character", from);
                new_selection.moveEnd("character", to - from);
                new_selection.select();
            }
        }
        getSelection() {
            let from = 0,
                to = 0;
            if (!this.text.value) {
                return {
                    start: from,
                    end: to,
                };
            }
            if (this.text.selectionStart !== undefined) {
                from = this.text.selectionStart;
                to = this.text.selectionEnd;
            } else if (document.selection && document.selection.createRange) {
                const rng = document.selection.createRange().duplicate();
                if (rng.parentElement() === this.text) {
                    try {
                        const textRng = this.text.createTextRange();
                        textRng.move("character", 0);
                        textRng.setEndPoint("EndToEnd", rng);
                        to = textRng.text.length;
                        textRng.setEndPoint("EndToStart", rng);
                        from = textRng.text.length;
                    } catch (notFocused) {
                        from = this.text.value.length;
                        to = from;
                    }
                }
            }
            return {
                start: from,
                end: to,
            };
        }
        saveView() {
            this.lastSelection = this.getSelection();
        }
        processKey(evt) {
            let dir = 0;
            switch (this.lastKey) {
                case UP:
                    dir = -1;
                    break;
                case DOWN:
                    dir = 1;
                    break;
                case PGUP:
                    dir = -HC.listSize;
                    break;
                case PGDOWN:
                    dir = HC.listSize;
                    break;
                case ESC:
                    return evtKill(evt);
            }
            if (dir) {
                if (this.list.style.display !== "none") {
                    this.highlightSuggestion(dir);
                    return evtKill(evt);
                } else if (this.keyCount <= 1 && (!this.callbackObj || this.callbackObj.callsMade === this.callbackObj.nofCalls)) {
                    this.textchange();
                }
            }
            return true;
        }
        highlightSuggestion(dir) {
            if (noSuggestions || !this.list || this.list.style.display === "none") {
                return false;
            }
            const curr = this.list.selectedIndex;
            let tgt = -1;
            if (dir === 0) {
                if (curr < 0 || curr >= this.list.options.length) {
                    return false;
                }
                tgt = curr;
            } else {
                tgt = curr < 0 ? 0 : curr + dir;
                tgt = tgt < 0 ? 0 : tgt;
                if (tgt >= this.list.options.length) {
                    tgt = this.list.options.length - 1;
                }
            }
            if (tgt !== curr || dir === 0) {
                if (curr >= 0 && curr < this.list.options.length && dir !== 0) {
                    this.list.options[curr].selected = false;
                }
                this.list.options[tgt].selected = true;
                const v = this.text.value.split("|");
                const key = v.length > 1 ? `|${v[1]}` : "";
                const completed = this.autoComplete(this.list.options[tgt].text, this.lastRealInput, null, key, false);
                if (!completed || this.list.options[tgt].text === this.lastRealInput) {
                    this.text.value = this.list.options[tgt].text + key;
                    if (this.canSelect()) {
                        this.setSelection(this.list.options[tgt].text.length, this.list.options[tgt].text.length);
                    }
                }
                this.lastInput = this.list.options[tgt].text;
                this.inputExists = true;
                if (this.icon) {
                    this.icon.src = HC.existsYes;
                }
                this.state = CategoryEditor.CHANGE_PENDING;
            }
            return true;
        }
        resetKeySelection() {
            if (noSuggestions || !this.list || this.list.style.display === "none") {
                return false;
            }
            const curr = this.list.selectedIndex;
            if (curr >= 0 && curr < this.list.options.length) {
                this.list.options[curr].selected = false;
                const v = this.text.value.split("|");
                const key = v.length > 1 ? `|${v[1]}` : "";
                let result = v[0] !== this.lastInput;
                if (v[0] !== this.lastRealInput) {
                    this.text.value = this.lastRealInput + key;
                    result = true;
                }
                this.lastInput = this.lastRealInput;
                return result;
            }
            return false;
        }
    }
    function setPage(json) {
        let startTime = null;
        if (json && json.query) {
            if (json.query.pages) {
                const page = json.query.pages[!conf.wgArticleId ? "-1" : `${conf.wgArticleId}`];
                if (page) {
                    if (page.revisions && page.revisions.length) {
                        pageText = page.revisions[0]["*"];
                        if (page.revisions[0].timestamp) {
                            pageTime = page.revisions[0].timestamp.replace(/\D/g, "");
                        }
                        if (page.revisions[0].revid) {
                            pageTextRevId = page.revisions[0].revid;
                        }
                        if (page.revisions.length > 1) {
                            conflictingUser = page.revisions[1].user;
                        }
                    }
                    if (page.lastrevid) {
                        lastRevId = page.lastrevid;
                    }
                    if (page.starttimestamp) {
                        startTime = page.starttimestamp.replace(/\D/g, "");
                    }
                    pageWatched = typeof page.watched === "string";
                    if (json.query.tokens) {
                        editToken = json.query.tokens.csrftoken;
                    }
                    if (page.langlinks && (!json["query-continue"] || !json["query-continue"].langlinks)) {
                        let re = "";
                        for (let i = 0; i < page.langlinks.length; i++) {
                            re += (i > 0 ? "|" : "") + page.langlinks[i].lang.replace(/([\\^$.?*+()])/g, "\\$1");
                        }
                        if (re.length) {
                            interlanguageRE = new RegExp(`((^|\\n\\r?)(\\[\\[\\s*(${re})\\s*:[^\\]]+\\]\\]\\s*))+$`);
                        }
                    }
                }
            }
            if (json.query.general) {
                if (json.query.general.time && !startTime) {
                    startTime = json.query.general.time.replace(/\D/g, "");
                }
                if (HC.capitalizePageNames === null) {
                    HC.capitalizePageNames = json.query.general.case === "first-letter";
                }
            }
            serverTime = startTime;
            if (json.query.userinfo && json.query.userinfo.options) {
                watchCreate = !HC.dont_add_to_watchlist && json.query.userinfo.options.watchcreations === "1";
                watchEdit = !HC.dont_add_to_watchlist && json.query.userinfo.options.watchdefault === "1";
                minorEdits = json.query.userinfo.options.minordefault === 1;
                if (minorEdits) {
                    HC.single_minor = true;
                }
            }
        }
    }
    let saveInProgress = false;
    async function initiateEdit(doEdit, failure) {
        if (saveInProgress) {
            return;
        }
        saveInProgress = true;
        let oldButtonState;
        if (commitButton) {
            oldButtonState = commitButton.disabled;
            commitButton.disabled = true;
        }
        function fail(...args) {
            saveInProgress = false;
            if (commitButton) {
                commitButton.disabled = oldButtonState;
            }
            failure(...args);
        }
        try {
            const json = await $.getJSON(`${conf.wgServer}${conf.wgScriptPath}/api.php?format=json&action=query&rawcontinue=&titles=${encodeURIComponent(conf.wgPageName)}&prop=info%7Crevisions%7Clanglinks&inprop=watched&rvprop=content%7Ctimestamp%7Cids%7Cuser&lllimit=500&rvlimit=2&rvdir=newer&rvstartid=${conf.wgCurRevisionId}&meta=siteinfo%7Cuserinfo%7Ctokens&type=csrf&uiprop=options`);
            setPage(json);
            doEdit(fail);
        } catch (req) {
            fail(`${req.status} ${req.statusText}`);
        }
    }
    function multiChangeMsg(count) {
        let msg = HC.messages.multi_change;
        if (typeof msg !== "string" && msg.length) {
            if (mw.language && mw.language.convertPlural) {
                msg = mw.language.convertPlural(count, msg);
            } else {
                msg = msg[msg.length - 1];
            }
        }
        return substitute(msg, [null, `${count}`]);
    }
    function currentTimestamp() {
        const now = new Date();
        let ts = `${now.getUTCFullYear()}`;
        function two(s) {
            return s.substr(s.length - 2);
        }
        ts += two(`0${now.getUTCMonth() + 1}`) + two(`0${now.getUTCDate()}`) + two(`00${now.getUTCHours()}`) + two(`00${now.getUTCMinutes()}`) + two(`00${now.getUTCSeconds()}`);
        return ts;
    }
    function performChanges(failure, singleEditor) {
        if (pageText === null) {
            failure(HC.messages.multi_error);
            return;
        }
        if (HC.messages.cat_keychange.indexOf("$2") < 0) {
            HC.messages.cat_keychange += '"$2"';
        }
        if (!HC.messages.short_catchange) {
            HC.messages.short_catchange = `[[${HC.category_canonical}:$1]]`;
        }
        let action;
        const selfEditConflict = (lastRevId !== null && lastRevId !== conf.wgCurRevisionId || pageTextRevId !== null && pageTextRevId !== conf.wgCurRevisionId) && conflictingUser && conflictingUser === conf.wgUserName;
        if (singleEditor && !singleEditor.noCommit && !HC.no_autocommit && editToken && !selfEditConflict) {
            commitForm.wpEditToken.value = editToken;
            action = commitForm.wpDiff;
            if (action) {
                action.name = action.value = "wpSave";
                commitForm.wpChangeTags.value += `,${HC.automationChangeTag}`;
            }
        } else {
            action = commitForm.wpSave;
            if (action) {
                action.name = action.value = "wpDiff";
            }
        }
        let result = {
            text: pageText,
        };
        const changed = [],
            added = [],
            deleted = [],
            toEdit = singleEditor ? [singleEditor] : editors;
        let changes = 0,
            error = null,
            edit, i;
        for (i = 0; i < toEdit.length; i++) {
            edit = toEdit[i];
            if (edit.state === CategoryEditor.CHANGED) {
                result = change_category(result.text, edit.originalCategory, edit.currentCategory, edit.currentKey, edit.currentHidden);
                if (!result.error) {
                    changes++;
                    if (!edit.originalCategory || !edit.originalCategory.length) {
                        added.push(edit.currentCategory);
                    } else {
                        changed.push({
                            from: edit.originalCategory,
                            to: edit.currentCategory,
                        });
                    }
                } else if (error === null) {
                    error = result.error;
                }
            } else if (edit.state === CategoryEditor.DELETED && edit.originalCategory && edit.originalCategory.length) {
                result = change_category(result.text, edit.originalCategory, null, null, false);
                if (!result.error) {
                    changes++;
                    deleted.push(edit.originalCategory);
                } else if (error === null) {
                    error = result.error;
                }
            }
        }
        if (error !== null) {
            action = commitForm.wpSave;
            if (action) {
                action.name = action.value = "wpDiff";
            }
        }
        commitForm.wpMinoredit.checked = minorEdits;
        commitForm.wpWatchthis.checked = !conf.wgArticleId && watchCreate || watchEdit || pageWatched;
        if (conf.wgArticleId || !!singleEditor) {
            if (action && action.value === "wpSave") {
                if (HC.changeTag) {
                    commitForm.wpChangeTags.value = `${HC.changeTag},${HC.automationChangeTag}`;
                    HC.messages.using = "";
                    HC.messages.prefix = "";
                }
            } else {
                commitForm.wpAutoSummary.value = HC.changeTag;
            }
            if (changes === 1) {
                if (result.summary && result.summary.length) {
                    commitForm.wpSummary.value = HC.messages.prefix + result.summary.join(HC.messages.separator) + HC.messages.using;
                }
                commitForm.wpMinoredit.checked = HC.single_minor || minorEdits;
            } else if (changes) {
                let summary = [];
                const shortSummary = [];
                for (i = 0; i < deleted.length; i++) {
                    summary.push(`-${substitute(HC.messages.short_catchange, [null, deleted[i]])}`);
                }
                if (deleted.length === 1) {
                    shortSummary.push(`-${substitute(HC.messages.short_catchange, [null, deleted[0]])}`);
                } else if (deleted.length) {
                    shortSummary.push(`- ${multiChangeMsg(deleted.length)}`);
                }
                for (i = 0; i < added.length; i++) {
                    summary.push(`+${substitute(HC.messages.short_catchange, [null, added[i]])}`);
                }
                if (added.length === 1) {
                    shortSummary.push(`+${substitute(HC.messages.short_catchange, [null, added[0]])}`);
                } else if (added.length) {
                    shortSummary.push(`+ ${multiChangeMsg(added.length)}`);
                }
                const arrow = is_rtl ? "←" : "→";
                for (i = 0; i < changed.length; i++) {
                    if (changed[i].from !== changed[i].to) {
                        summary.push(`±${substitute(HC.messages.short_catchange, [null, changed[i].from])}${arrow}${substitute(HC.messages.short_catchange, [null, changed[i].to])}`);
                    } else {
                        summary.push(`±${substitute(HC.messages.short_catchange, [null, changed[i].from])}`);
                    }
                }
                if (changed.length === 1) {
                    if (changed[0].from !== changed[0].to) {
                        shortSummary.push(`±${substitute(HC.messages.short_catchange, [null, changed[0].from])}${arrow}${substitute(HC.messages.short_catchange, [null, changed[0].to])}`);
                    } else {
                        shortSummary.push(`±${substitute(HC.messages.short_catchange, [null, changed[0].from])}`);
                    }
                } else if (changed.length) {
                    shortSummary.push(`± ${multiChangeMsg(changed.length)}`);
                }
                if (summary.length) {
                    summary = summary.join(HC.messages.separator);
                    if (summary.length > 200 - HC.messages.prefix.length - HC.messages.using.length) {
                        summary = shortSummary.join(HC.messages.separator);
                    }
                    commitForm.wpSummary.value = HC.messages.prefix + summary + HC.messages.using;
                }
            }
        }
        commitForm.wpTextbox1.value = result.text;
        commitForm.wpStarttime.value = serverTime || currentTimestamp();
        commitForm.wpEdittime.value = pageTime || commitForm.wpStarttime.value;
        if (selfEditConflict) {
            commitForm.oldid.value = `${pageTextRevId || conf.wgCurRevisionId}`;
        }
        commitForm.hcCommit.click();
    }
    function resolveOne(page, toResolve) {
        const cats = page.categories,
            lks = page.links,
            is_hidden = page.categoryinfo && typeof page.categoryinfo.hidden === "string",
            is_missing = typeof page.missing === "string";
        let is_dab = false,
            is_redir = typeof page.redirect === "string",
            i;
        for (i = 0; i < toResolve.length; i++) {
            if (i && toResolve[i].dabInputCleaned !== page.title.substring(page.title.indexOf(":") + 1)) {
                continue;
            }
            toResolve[i].currentHidden = is_hidden;
            toResolve[i].inputExists = !is_missing;
            toResolve[i].icon.src = is_missing ? HC.existsNo : HC.existsYes;
        }
        if (is_missing) {
            return;
        }
        if (!is_redir && cats && (HC.disambig_category || HC.redir_category)) {
            for (let c = 0; c < cats.length; c++) {
                let cat = cats[c].title;
                if (cat) {
                    cat = cat.substring(cat.indexOf(":") + 1).replace(/_/g, " ");
                    if (cat === HC.disambig_category) {
                        is_dab = true;
                        break;
                    } else if (cat === HC.redir_category) {
                        is_redir = true;
                        break;
                    }
                }
            }
        }
        if (!is_redir && !is_dab) {
            return;
        }
        if (!lks || !lks.length) {
            return;
        }
        const titles = [];
        for (i = 0; i < lks.length; i++) {
            if (lks[i].ns === 14 && lks[i].title && lks[i].title.length) {
                let match = lks[i].title;
                match = match.substring(match.indexOf(":") + 1);
                if (!HC.blacklist || !HC.blacklist.test(match)) {
                    titles.push(match);
                }
            }
        }
        if (!titles.length) {
            return;
        }
        for (i = 0; i < toResolve.length; i++) {
            if (i && toResolve[i].dabInputCleaned !== page.title.substring(page.title.indexOf(":") + 1)) {
                continue;
            }
            toResolve[i].inputExists = true;
            toResolve[i].icon.src = HC.existsYes;
            if (titles.length > 1) {
                toResolve[i].dab = titles;
            } else {
                toResolve[i].text.value = titles[0] + (toResolve[i].currentKey !== null ? `|${toResolve[i].currentKey}` : "");
            }
        }
    }
    function resolveRedirects(toResolve, params) {
        if (!params || !params.query || !params.query.pages) {
            return;
        }
        for (const p in params.query.pages) {
            resolveOne(params.query.pages[p], toResolve);
        }
    }
    async function resolveMulti(toResolve, callback) {
        let i;
        for (i = 0; i < toResolve.length; i++) {
            toResolve[i].dab = null;
            toResolve[i].dabInput = toResolve[i].lastInput;
        }
        if (noSuggestions) {
            callback(toResolve);
            return;
        }
        let args = `action=query&prop=info%7Clinks%7Ccategories%7Ccategoryinfo&plnamespace=14&pllimit=${toResolve.length * 10}&cllimit=${toResolve.length * 10}&format=json&titles=`;
        for (i = 0; i < toResolve.length; i++) {
            let v = toResolve[i].dabInput;
            v = replaceShortcuts(v, HC.shortcuts);
            toResolve[i].dabInputCleaned = v;
            args += encodeURIComponent(`Category:${v}`);
            if (i + 1 < toResolve.length) {
                args += "%7C";
            }
        }
        try {
            const json = await $.getJSON(`${conf.wgServer}${conf.wgScriptPath}/api.php?${args}`);
            resolveRedirects(toResolve, json);
            callback(toResolve);
        } catch (req) {
            if (!req) {
                noSuggestions = true;
            }
            callback(toResolve);
        }
    }
    function makeActive(which) {
        if (which.is_active) {
            return;
        }
        for (let i = 0; i < editors.length; i++) {
            if (editors[i] !== which) {
                editors[i].inactivate();
            }
        }
        which.is_active = true;
        if (which.dab) {
            showDab(which);
        } else {
            const expectedInput = which.lastRealInput || which.lastInput || "";
            const actualValue = which.text.value || "";
            if (!expectedInput.length && actualValue.length || expectedInput.length && actualValue.indexOf(expectedInput)) {
                which.showsList = false;
                const v = actualValue.split("|");
                which.lastRealInput = which.lastInput = v[0];
                if (v.length > 1) {
                    which.currentKey = v[1];
                }
                if (which.lastSelection) {
                    which.lastSelection = {
                        start: v[0].length,
                        end: v[0].length,
                    };
                }
            }
            if (which.showsList) {
                which.displayList();
            }
            if (which.lastSelection) {
                if (is_webkit) {
                    window.setTimeout(() => {
                        which.setSelection(which.lastSelection.start, which.lastSelection.end);
                    }, 1);
                } else {
                    which.setSelection(which.lastSelection.start, which.lastSelection.end);
                }
            }
        }
    }
    function showDab(which) {
        if (!which.is_active) {
            makeActive(which);
        } else {
            which.showSuggestions(which.dab, false, null, null);
            which.dab = null;
        }
    }
    function multiSubmit() {
        const toResolve = [];
        for (let i = 0; i < editors.length; i++) {
            if (editors[i].state === CategoryEditor.CHANGE_PENDING || editors[i].state === CategoryEditor.OPEN) {
                toResolve.push(editors[i]);
            }
        }
        if (!toResolve.length) {
            initiateEdit((failure) => {
                performChanges(failure);
            }, (msg) => {
                oouiDialog.alert(oouiDialog.sanitize(msg), {
                    title: "HotCat 小工具",
                });
            });
            return;
        }
        resolveMulti(toResolve, (resolved) => {
            let firstDab = null;
            let dontChange = false;
            for (let i = 0; i < resolved.length; i++) {
                if (resolved[i].lastInput !== resolved[i].dabInput) {
                    dontChange = true;
                } else {
                    if (resolved[i].dab) {
                        if (!firstDab) {
                            firstDab = resolved[i];
                        }
                    } else {
                        if (resolved[i].acceptCheck(true)) {
                            resolved[i].commit();
                        }
                    }
                }
            }
            if (firstDab) {
                showDab(firstDab);
            } else if (!dontChange) {
                initiateEdit((failure) => {
                    performChanges(failure);
                }, (msg) => {
                    oouiDialog.alert(oouiDialog.sanitize(msg), {
                        title: "HotCat 小工具",
                    });
                });
            }
        });
    }
    function setMultiInput() {
        if (commitButton || onUpload) {
            return;
        }
        commitButton = make("input");
        commitButton.type = "button";
        commitButton.value = HC.messages.commit;
        commitButton.onclick = multiSubmit;
        if (multiSpan) {
            multiSpan.parentNode.replaceChild(commitButton, multiSpan);
        } else {
            catLine.appendChild(commitButton);
        }
    }
    function checkMultiInput() {
        if (!commitButton) {
            return;
        }
        let hasChanges = false;
        for (let i = 0; i < editors.length; i++) {
            if (editors[i].state !== CategoryEditor.UNCHANGED) {
                hasChanges = true;
                break;
            }
        }
        commitButton.disabled = !hasChanges;
    }
    const suggestionEngines = {
        opensearch: {
            uri: "/api.php?format=json&action=opensearch&namespace=14&limit=30&search=Category:$1",
            handler: function (queryResult, queryKey) {
                if (queryResult && queryResult.length >= 2) {
                    const key = queryResult[0].substring(queryResult[0].indexOf(":") + 1);
                    const titles = queryResult[1];
                    let exists = false;
                    if (!cat_prefix) {
                        cat_prefix = new RegExp(`^(${HC.category_regexp}):`);
                    }
                    for (let i = 0; i < titles.length; i++) {
                        cat_prefix.lastIndex = 0;
                        const m = cat_prefix.exec(titles[i]);
                        if (m && m.length > 1) {
                            titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
                            if (key === titles[i]) {
                                exists = true;
                            }
                        } else {
                            titles.splice(i, 1);
                            i--;
                        }
                    }
                    titles.exists = exists;
                    if (queryKey !== key) {
                        titles.normalized = key;
                    }
                    return titles;
                }
                return null;
            },
        },
        internalsearch: {
            uri: "/api.php?format=json&action=query&list=allpages&apnamespace=14&aplimit=30&apfrom=$1&apprefix=$1",
            handler: function (queryResult) {
                if (queryResult && queryResult.query && queryResult.query.allpages) {
                    const titles = queryResult.query.allpages;
                    for (let i = 0; i < titles.length; i++) {
                        titles[i] = titles[i].title.substring(titles[i].title.indexOf(":") + 1);
                    }
                    return titles;
                }
                return null;
            },
        },
        exists: {
            uri: "/api.php?format=json&action=query&prop=info&titles=Category:$1",
            handler: function (queryResult, queryKey) {
                if (queryResult && queryResult.query && queryResult.query.pages && !queryResult.query.pages[-1]) {
                    for (const p in queryResult.query.pages) {
                        let title = queryResult.query.pages[p].title;
                        title = title.substring(title.indexOf(":") + 1);
                        const titles = [title];
                        titles.exists = true;
                        if (queryKey !== title) {
                            titles.normalized = title;
                        }
                        return titles;
                    }
                }
                return null;
            },
        },
        subcategories: {
            uri: "/api.php?format=json&action=query&list=categorymembers&cmtype=subcat&cmlimit=max&cmtitle=Category:$1",
            handler: function (queryResult) {
                if (queryResult && queryResult.query && queryResult.query.categorymembers) {
                    const titles = queryResult.query.categorymembers;
                    for (let i = 0; i < titles.length; i++) {
                        titles[i] = titles[i].title.substring(titles[i].title.indexOf(":") + 1);
                    }
                    return titles;
                }
                return null;
            },
        },
        parentcategories: {
            uri: "/api.php?format=json&action=query&prop=categories&titles=Category:$1&cllimit=max",
            handler: function (queryResult) {
                if (queryResult && queryResult.query && queryResult.query.pages) {
                    for (const p in queryResult.query.pages) {
                        if (queryResult.query.pages[p].categories) {
                            const titles = queryResult.query.pages[p].categories;
                            for (let i = 0; i < titles.length; i++) {
                                titles[i] = titles[i].title.substring(titles[i].title.indexOf(":") + 1);
                            }
                            return titles;
                        }
                    }
                }
                return null;
            },
        },
    };
    const suggestionConfigs = {
        searchindex: {
            name: "Search index",
            engines: ["opensearch"],
            cache: {},
            show: true,
            temp: false,
            noCompletion: false,
        },
        pagelist: {
            name: "Page list",
            engines: ["internalsearch", "exists"],
            cache: {},
            show: true,
            temp: false,
            noCompletion: false,
        },
        combined: {
            name: "Combined search",
            engines: ["opensearch", "internalsearch"],
            cache: {},
            show: true,
            temp: false,
            noCompletion: false,
        },
        subcat: {
            name: "Subcategories",
            engines: ["subcategories"],
            cache: {},
            show: true,
            temp: true,
            noCompletion: true,
        },
        parentcat: {
            name: "Parent categories",
            engines: ["parentcategories"],
            cache: {},
            show: true,
            temp: true,
            noCompletion: true,
        },
    };
    const dummyElement = make(" ", true);
    function forceRedraw() {
        if (dummyElement.parentNode) {
            document.body.removeChild(dummyElement);
        } else {
            document.body.appendChild(dummyElement);
        }
    }
    const BS = 8,
        TAB = 9,
        RET = 13,
        ESC = 27,
        SPACE = 32,
        PGUP = 33,
        PGDOWN = 34,
        UP = 38,
        DOWN = 40,
        DEL = 46,
        IME = 229;
    function initialize() {
        const config = window.JSconfig !== undefined && window.JSconfig.keys ? window.JSconfig.keys : {};
        HC.dont_add_to_watchlist = window.hotcat_dont_add_to_watchlist !== undefined ? !!window.hotcat_dont_add_to_watchlist : config.HotCatDontAddToWatchlist !== undefined ? config.HotCatDontAddToWatchlist : HC.dont_add_to_watchlist;
        HC.no_autocommit = window.hotcat_no_autocommit !== undefined ? !!window.hotcat_no_autocommit : config.HotCatNoAutoCommit !== undefined ? config.HotCatNoAutoCommit : conf.wgNamespaceNumber % 2 ? true : HC.no_autocommit;
        HC.del_needs_diff = window.hotcat_del_needs_diff !== undefined ? !!window.hotcat_del_needs_diff : config.HotCatDelNeedsDiff !== undefined ? config.HotCatDelNeedsDiff : HC.del_needs_diff;
        HC.suggest_delay = window.hotcat_suggestion_delay || config.HotCatSuggestionDelay || HC.suggest_delay;
        HC.editbox_width = window.hotcat_editbox_width || config.HotCatEditBoxWidth || HC.editbox_width;
        HC.suggestions = window.hotcat_suggestions || config.HotCatSuggestions || HC.suggestions;
        if (typeof HC.suggestions !== "string" || !suggestionConfigs[HC.suggestions]) {
            HC.suggestions = "combined";
        }
        HC.fixed_search = window.hotcat_suggestions_fixed !== undefined ? !!window.hotcat_suggestions_fixed : config.HotCatFixedSuggestions !== undefined ? config.HotCatFixedSuggestions : HC.fixed_search;
        HC.single_minor = window.hotcat_single_changes_are_minor !== undefined ? !!window.hotcat_single_changes_are_minor : config.HotCatMinorSingleChanges !== undefined ? config.HotCatMinorSingleChanges : HC.single_minor;
        HC.bg_changed = window.hotcat_changed_background || config.HotCatChangedBackground || HC.bg_changed;
        HC.use_up_down = window.hotcat_use_category_links !== undefined ? !!window.hotcat_use_category_links : config.HotCatUseCategoryLinks !== undefined ? config.HotCatUseCategoryLinks : HC.use_up_down;
        HC.listSize = window.hotcat_list_size || config.HotCatListSize || HC.listSize;
        if (conf.wgDBname !== "commonswiki") {
            HC.changeTag = config.HotCatChangeTag || "";
        }
        if (HC.changeTag) {
            const eForm = document.editform,
                catRegExp = new RegExp(`^\\[\\[(${HC.category_regexp}):`);
            let oldTxt;
            const isMinorChange = function () {
                let newTxt = eForm.wpTextbox1;
                if (!newTxt) {
                    return;
                }
                newTxt = newTxt.value;
                const oldLines = oldTxt.match(/^.*$/gm),
                    newLines = newTxt.match(/^.*$/gm);
                let cArr;
                const except = function (aArr, bArr) {
                    const result = [];
                    let lArr, sArr;
                    if (aArr.length < bArr.length) {
                        lArr = bArr;
                        sArr = aArr;
                    } else {
                        lArr = aArr;
                        sArr = bArr;
                    }
                    for (let i = 0; i < lArr.length; i++) {
                        const item = lArr[i];
                        const ind = $.inArray(item, sArr);
                        if (ind === -1) {
                            result.push(item);
                        } else {
                            sArr.splice(ind, 1);
                        }
                    }
                    return result.concat(sArr);
                };
                cArr = except(oldLines, newLines);
                if (cArr.length) {
                    cArr = $.grep(cArr, (_c) => {
                        const c = $.trim(_c);
                        return c && !catRegExp.test(c);
                    });
                }
                if (!cArr.length) {
                    oldTxt = newTxt;
                    return true;
                }
            };
            if (conf.wgAction === "submit" && conf.wgArticleId && eForm && eForm.wpSummary && document.getElementById("wikiDiff")) {
                const sum = eForm.wpSummary,
                    sumA = eForm.wpAutoSummary;
                if (sum.value && sumA.value === HC.changeTag) {
                    sumA.value = sumA.value.replace(HC.changeTag, "d41d8cd98f00b204e9800998ecf8427e");
                    const $ct = $('<input type="hidden" name="wpChangeTags">').val(HC.changeTag);
                    $(eForm).append($ct);
                    oldTxt = eForm.wpTextbox1.value;
                    $("#wpSave").one("click", () => {
                        if ($ct.val()) {
                            sum.value = sum.value.replace(HC.messages.using || HC.messages.prefix, "");
                        }
                    });
                    const removeChangeTag = () => {
                        $(eForm.wpTextbox1).add(sum).one("input", () => {
                            window.setTimeout(() => {
                                if (!isMinorChange()) {
                                    $ct.val("");
                                } else {
                                    removeChangeTag();
                                }
                            }, 500);
                        });
                    };
                    removeChangeTag();
                }
            }
        }
        HC.listSize = parseInt(HC.listSize, 10);
        if (isNaN(HC.listSize) || HC.listSize < 5) {
            HC.listSize = 5;
        }
        HC.listSize = Math.min(HC.listSize, 30);
        if (HC.engine_names) {
            for (const key in HC.engine_names) {
                if (suggestionConfigs[key] && HC.engine_names[key]) {
                    suggestionConfigs[key].name = HC.engine_names[key];
                }
            }
        }
        is_rtl = hasClass(document.body, "rtl");
        if (!is_rtl) {
            if (document.defaultView && document.defaultView.getComputedStyle) {
                is_rtl = document.defaultView.getComputedStyle(document.body, null).getPropertyValue("direction");
            } else if (document.body.currentStyle) {
                is_rtl = document.body.currentStyle.direction;
            } else {
                is_rtl = document.body.style.direction;
            }
            is_rtl = is_rtl === "rtl";
        }
    }
    function can_edit() {
        let container = null;
        switch (mw.config.get("skin")) {
            case "cologneblue": {
                container = document.getElementById("quickbar");
                // falls through
            }
            case "standard":
            case "nostalgia": {
                if (!container) {
                    container = document.getElementById("topbar");
                }
                const lks = container.getElementsByTagName("a");
                for (let i = 0; i < lks.length; i++) {
                    if (param("title", lks[i].href) === conf.wgPageName && param("action", lks[i].href) === "edit") {
                        return true;
                    }
                }
                return false;
            }
            default:
                return document.getElementById("ca-edit") !== null;
        }
    }
    function closeForm() {
        for (let i = 0; i < editors.length; i++) {
            const edit = editors[i];
            if (edit.state === CategoryEditor.OPEN) {
                edit.cancel();
            } else if (edit.state === CategoryEditor.CHANGE_PENDING) {
                edit.sanitizeInput();
                const value = edit.text.value.split("|");
                let key = null;
                if (value.length > 1) {
                    key = value[1];
                }
                const v = value[0].replace(/_/g, " ").replace(/^\s+|\s+$/g, "");
                if (!v.length) {
                    edit.cancel();
                } else {
                    edit.currentCategory = v;
                    edit.currentKey = key;
                    edit.currentExists = this.inputExists;
                    edit.close();
                }
            }
        }
    }
    function setup_upload() {
        onUpload = true;
        let ip = document.getElementById("mw-htmlform-description") || document.getElementById("wpDestFile");
        if (!ip) {
            ip = document.getElementById("wpDestFile");
            while (ip && ip.nodeName.toLowerCase() !== "table") {
                ip = ip.parentNode;
            }
        }
        if (!ip) {
            return;
        }
        const reupload = document.getElementById("wpForReUpload");
        const destFile = document.getElementById("wpDestFile");
        if (reupload && !!reupload.value || destFile && (destFile.disabled || destFile.readOnly)) {
            return;
        }
        const labelCell = make("td");
        const lineCell = make("td");
        catLine = make("div");
        catLine.className = "catlinks";
        catLine.id = "catlinks";
        catLine.style.textAlign = is_rtl ? "right" : "left";
        catLine.style.margin = "0";
        catLine.style.border = "none";
        lineCell.appendChild(catLine);
        let label = null;
        if (window.UFUI && window.UIElements && window.UFUI.getLabel instanceof Function) {
            try {
                label = window.UFUI.getLabel("wpCategoriesUploadLbl");
            } catch (ex) {
                label = null;
            }
        }
        if (!label) {
            labelCell.id = "hotcatLabel";
            labelCell.appendChild(make(HC.categories, true));
        } else {
            labelCell.id = "hotcatLabelTranslated";
            labelCell.appendChild(label);
        }
        labelCell.className = "mw-label";
        labelCell.style.textAlign = "right";
        labelCell.style.verticalAlign = "middle";
        const form = document.getElementById("upload") || document.getElementById("mw-upload-form");
        if (form && ip && ip.insertRow) {
            const newRow = ip.insertRow(-1);
            newRow.appendChild(labelCell);
            newRow.appendChild(lineCell);
            form.onsubmit = (function (oldSubmit) {
                return function (...args) {
                    let do_submit = true;
                    if (oldSubmit) {
                        if (typeof oldSubmit === "string") {
                            do_submit = eval(oldSubmit);
                        } else if (oldSubmit instanceof Function) {
                            do_submit = oldSubmit.bind(form)(...args);
                        }
                    }
                    if (!do_submit) {
                        return false;
                    }
                    closeForm();
                    const eb = document.getElementById("wpUploadDescription") || document.getElementById("wpDesc");
                    let addedOne = false;
                    for (let i = 0; i < editors.length; i++) {
                        const t = editors[i].currentCategory;
                        if (!t) {
                            continue;
                        }
                        const key = editors[i].currentKey;
                        const new_cat = `[[${HC.category_canonical}:${t}${key ? `|${key}` : ""}]]`;
                        const cleanedText = eb.value.replace(/<!--(\s|\S)*?-->/g, "").replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, "");
                        if (!find_category(cleanedText, t, true)) {
                            eb.value += `\n${new_cat}`;
                            addedOne = true;
                        }
                    }
                    if (addedOne) {
                        eb.value = eb.value.replace(/\{\{subst:unc\}\}/g, "");
                    }
                    return true;
                };
            })(form.onsubmit);
        }
    }
    let cleanedText = null;
    function getTitle(span) {
        if (span.firstChild.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }
        let catTitle = title(span.firstChild.getAttribute("href"));
        if (!catTitle) {
            return null;
        }
        catTitle = catTitle.substr(catTitle.indexOf(":") + 1).replace(/_/g, " ");
        if (HC.blacklist && HC.blacklist.test(catTitle)) {
            return null;
        }
        return catTitle;
    }
    function isOnPage(span) {
        const catTitle = getTitle(span);
        const result = {
            title: catTitle,
            match: ["", "", ""],
        };
        if (pageText === null) {
            return result;
        }
        if (cleanedText === null) {
            cleanedText = pageText.replace(/<!--(\s|\S)*?-->/g, "").replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, "");
        }
        result.match = find_category(cleanedText, catTitle, true);
        return result;
    }
    let initialized = false;
    let setupTimeout = null;
    function findByClass(scope, tag, className) {
        const result = $(scope).find(`${tag}.${className}`);
        return result && result.length ? result[0] : null;
    }
    function list_categorys() {
        if (pageText === null) {
            return [];
        }
        if (cleanedText === null) {
            cleanedText = pageText.replace(/<!--(\s|\S)*?-->/g, "").replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, "");
        }
        const cat_regex = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(${HC.category_regexp})${wikiTextBlankOrBidi}:${wikiTextBlankOrBidi}([^\\[\\]]+?)${wikiTextBlankOrBidi}(\\|.*?)?\\]\\]`, "g");

        const result = [];
        let curr_match = null;
        while ((curr_match = cat_regex.exec(cleanedText)) !== null) {
            result.push({
                match: curr_match,
            });
        }
        result.re = cat_regex;
        return result; // An array containing all matches, with positions, in result[ i ].match
    }
    function setup(additionalWork) {
        if (initialized) {
            return;
        }
        initialized = true;
        if (setupTimeout) {
            window.clearTimeout(setupTimeout);
            setupTimeout = null;
        }
        catLine ||= document.getElementById("mw-normal-catlinks");
        const hiddenCats = document.getElementById("mw-hidden-catlinks");
        if (!catLine) {
            let footer = null;
            if (!hiddenCats) {
                footer = findByClass(document, "div", "printfooter");
                if (!footer) {
                    return;
                }
            }
            catLine = make("div");
            catLine.id = "mw-normal-catlinks";
            catLine.style.textAlign = is_rtl ? "right" : "left";
            const label = make("a");
            label.href = conf.wgArticlePath.replace("$1", "Special:Categories");
            label.title = HC.categories;
            label.appendChild(make(HC.categories, true));
            catLine.appendChild(label);
            catLine.appendChild(make(":", true));
            let container = hiddenCats ? hiddenCats.parentNode : document.getElementById("catlinks");
            if (!container) {
                container = make("div");
                container.id = "catlinks";
                footer.parentNode.insertBefore(container, footer.nextSibling);
            }
            container.className = "catlinks noprint";
            container.style.display = "";
            if (!hiddenCats) {
                container.appendChild(catLine);
            } else {
                container.insertBefore(catLine, hiddenCats);
            }
        }
        if (is_rtl) {
            catLine.dir = "rtl";
        }
        const chkCats = [], inpIndex = {};
        function createEditors(_line, is_hidden, has_hidden) {
            let line = _line;
            let i;
            let cats = line.getElementsByTagName("li");
            if (cats.length) {
                newDOM = true;
                line = cats[0].parentNode;
            } else {
                cats = line.getElementsByTagName("span");
            }
            const copyCats = Array.from({
                length: cats.length,
            });
            const idxCopys = {};
            let sTitle = null;
            for (i = 0; i < cats.length; i++) {
                copyCats[i] = cats[i];
                sTitle = getTitle(copyCats[i]);
                if (sTitle) {
                    idxCopys[sTitle] = i;
                }
            }
            const inpageCats = list_categorys();
            for (i = 0; i < inpageCats.length; i++) {
                let normalized = inpageCats[i].match[2].replace(wikiTextBlankRE, " ");
                if (HC.capitalizePageNames) {
                    normalized = normalized.substr(0, 1).toUpperCase() + normalized.substr(1);
                }
                if (Reflect.has(idxCopys, normalized) && line) {
                    new CategoryEditor(line, copyCats[idxCopys[normalized]], inpageCats[i].match[2], inpageCats[i].match[3], is_hidden);
                    if (is_hidden && Reflect.has(inpIndex, normalized)) {
                        chkCats.splice(chkCats.indexOf(`${HC.category_canonical}:${normalized}`), 1);
                        Reflect.deleteProperty(inpIndex, normalized);
                    }
                } else if (!is_hidden && line) {
                    chkCats.push(`${HC.category_canonical}:${normalized}`);
                    inpIndex[normalized] = i;
                }
            }
            if (chkCats.length && (!is_hidden && !has_hidden || is_hidden)) {
                const arg_titles = chkCats.join("|");
                $.getJSON(`${conf.wgServer}${conf.wgScriptPath}/api.php?action=query&format=json&titles=${encodeURIComponent(arg_titles)}&redirects=1&converttitles=1`, (json) => {
                    let converted = json.query.converted;
                    if (!converted || converted.length < chkCats.length) {
                        console.log(arg_titles);
                    }
                    if (!converted) {
                        converted = [];
                    }
                    for (i = 0; i < converted.length; i++) {
                        const sTitle = converted[i].to.replace(`${HC.category_canonical}:`, "");
                        const sOrginal = inpIndex[converted[i].from.replace(`${HC.category_canonical}:`, "")];
                        if (Reflect.has(idxCopys, sTitle) && line) {
                            new CategoryEditor(line, copyCats[idxCopys[sTitle]], [inpageCats[sOrginal].match[2], sTitle], inpageCats[sOrginal].match[3], is_hidden);
                        } else {
                            console.log(sTitle);
                        }
                    }
                });
            }
            return copyCats.length ? copyCats[copyCats.length - 1] : null;
        }
        const lastSpan = createEditors(catLine, false, !!hiddenCats);
        new CategoryEditor(newDOM ? catLine.getElementsByTagName("ul")[0] : catLine, null, null, lastSpan !== null, false);
        if (!onUpload) {
            if (pageText !== null && hiddenCats) {
                if (is_rtl) {
                    hiddenCats.dir = "rtl";
                }
                createEditors(hiddenCats, true, true);
            }
            const enableMulti = make("span");
            enableMulti.className = "noprint";
            if (is_rtl) {
                enableMulti.dir = "rtl";
            }
            catLine.insertBefore(enableMulti, catLine.firstChild.nextSibling);
            enableMulti.appendChild(make(" ", true));
            multiSpan = make("span");
            enableMulti.appendChild(multiSpan);
            multiSpan.innerHTML = `(<a>${HC.addmulti}</a>)`;
            const lk = multiSpan.getElementsByTagName("a")[0];
            lk.onclick = function (evt) {
                setMultiInput();
                checkMultiInput();
                return evtKill(evt);
            };
            lk.title = HC.multi_tooltip;
            lk.style.cursor = "pointer";
        }
        cleanedText = null;
        if (additionalWork instanceof Function) {
            additionalWork();
        }
        mw.hook("hotcat.ready").fire();
        $("body").trigger("hotcatSetupCompleted");
    }
    function createCommitForm() {
        if (commitForm) {
            return;
        }
        const formContainer = make("div");
        formContainer.style.display = "none";
        document.body.appendChild(formContainer);
        formContainer.innerHTML = `<form id="hotcatCommitForm" method="post" enctype="multipart/form-data" action="${conf.wgScript}?title=${encodeURIComponent(conf.wgPageName)}&action=submit"><input type="hidden" name="wpTextbox1"><input type="hidden" name="model" value="${conf.wgPageContentModel}"><input type="hidden" name="format" value="text/x-wiki"><input type="hidden" name="wpSummary" value=""><input type="checkbox" name="wpMinoredit" value="1"><input type="checkbox" name="wpWatchthis" value="1"><input type="hidden" name="wpAutoSummary" value="d41d8cd98f00b204e9800998ecf8427e"><input type="hidden" name="wpEdittime"><input type="hidden" name="wpStarttime"><input type="hidden" name="wpDiff" value="wpDiff"><input type="hidden" name="oldid" value="0"><input type="hidden" name="wpIgnoreBlankSummary" value="1"><input type="submit" name="hcCommit" value="hcCommit"><input type="hidden" name="wpEditToken"><input type="hidden" name="wpUltimateParam" value="1"><input type="hidden" name="wpChangeTags"><input type="hidden" value="ℳ𝒲♥𝓊𝓃𝒾𝒸ℴ𝒹ℯ" name="wpUnicodeCheck"></form>`;
        commitForm = document.getElementById("hotcatCommitForm");
    }
    function getPage() {
        if (!conf.wgArticleId) {
            if (conf.wgNamespaceNumber === 2) {
                return;
            }
            pageText = "";
            pageTime = null;
            setup(createCommitForm);
        } else {
            const url = `${conf.wgServer}${conf.wgScriptPath}/api.php?format=json&callback=HotCat.start&action=query&rawcontinue=&titles=${encodeURIComponent(conf.wgPageName)}&prop=info%7Crevisions&rvprop=content%7Ctimestamp%7Cids&meta=siteinfo&rvlimit=1&rvstartid=${conf.wgCurRevisionId}`;
            /* const s = make("script");
            s.src = url;
            HC.start = function (json) {
                setPage(json);
                setup(createCommitForm);
            };
            document.getElementsByTagName("head")[0].appendChild(s); */
            $.getJSON(url.replace("&callback=HotCat.start", ""), (json) => {
                setPage(json);
                setup(createCommitForm);
            });
            setupTimeout = window.setTimeout(() => {
                setup(createCommitForm);
            }, 4e3);
        }
    }
    function setState(state) {
        const cats = state.split("\n");
        if (!cats.length) {
            return null;
        }
        if (initialized && editors.length === 1 && editors[0].isAddCategory) {
            const newSpans = [];
            const before = editors.length === 1 ? editors[0].span : null;
            let i;
            for (i = 0; i < cats.length; i++) {
                if (!cats[i].length) {
                    continue;
                }
                let cat = cats[i].split("|");
                const key = cat.length > 1 ? cat[1] : null;
                cat = cat[0];
                const lk = make("a");
                lk.href = wikiPagePath(`${HC.category_canonical}:${cat}`);
                lk.appendChild(make(cat, true));
                lk.title = cat;
                const span = make("span");
                span.appendChild(lk);
                if (!i) {
                    catLine.insertBefore(make(" ", true), before);
                }
                catLine.insertBefore(span, before);
                if (before && i + 1 < cats.length) {
                    parent.insertBefore(make(" | ", true), before);
                }
                newSpans.push({
                    element: span,
                    title: cat,
                    key: key,
                });
            }
            if (before) {
                before.parentNode.insertBefore(make(" | ", true), before);
            }
            for (i = 0; i < newSpans.length; i++) {
                new CategoryEditor(catLine, newSpans[i].element, newSpans[i].title, newSpans[i].key);
            }
        }
        return null;
    }
    function getState() {
        let result = null;
        for (let i = 0; i < editors.length; i++) {
            let text = editors[i].currentCategory;
            const key = editors[i].currentKey;
            if (text && text.length) {
                if (key !== null) {
                    text += `|${key}`;
                }
                if (result === null) {
                    result = text;
                } else {
                    result += `\n${text}`;
                }
            }
        }
        return result;
    }
    function really_run() {
        initialize();
        if (!HC.upload_disabled && conf.wgNamespaceNumber === -1 && conf.wgCanonicalSpecialPageName === "Upload" && conf.wgUserName) {
            setup_upload();
            setup(() => {
                if (window.UploadForm && window.UploadForm.previous_hotcat_state) {
                    window.UploadForm.previous_hotcat_state = setState(window.UploadForm.previous_hotcat_state);
                }
            });
        } else {
            if (!conf.wgIsArticle || conf.wgAction !== "view" || param("diff") !== null || param("oldid") !== null || !can_edit() || HC.disable()) {
                return;
            }
            getPage();
        }
    }
    function run() {
        if (HC.started) {
            return;
        }
        HC.started = true;
        loadTrigger.register(really_run);
    }
    window.hotcat_get_state = function () {
        return getState();
    };
    window.hotcat_set_state = function (state) {
        return setState(state);
    };
    window.hotcat_close_form = function () {
        closeForm();
    };
    HC.runWhenReady = function (callback) {
        mw.hook("hotcat.ready").add(callback);
    };
    mw.config.set("disableAJAXCategories", true);
    if (conf.wgCanonicalSpecialPageName !== "Upload") {
        mw.hook("postEdit").add(() => {
            catLine = null;
            editors = [];
            initialized = false;
            HC.started = false;
            run();
        });
    }
    // await Promise.all([
    //     mw.loader.using(["user"]),
    //     $.ready,
    // ]);
    run();
})();
// </nowiki>
