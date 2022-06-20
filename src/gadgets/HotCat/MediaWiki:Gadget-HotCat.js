"use strict";
/**
  * https://commons.wikimedia.org/wiki/MediaWiki:Gadget-HotCat.js
  * 同步到 https://commons.wikimedia.org/w/index.php?title=MediaWiki:Gadget-HotCat.js&oldid=578342698
  * 合并了 User:Func 对繁体分类的修正，本页面 diff：https://zh.moegirl.org.cn/_?diff=5710070&oldid=5611586 ，User:Func 的修正参见 https://zh.moegirl.org.cn/_?diff=4533156&oldid=5710033
  * 修改了alert为OOUI版本
  **/
// <nowiki>
/**
HotCat V2.43

Documentation: https://commons.wikimedia.org/wiki/Help:Gadget-HotCat
List of main authors: https://commons.wikimedia.org/wiki/Help:Gadget-HotCat/Version_history

License: Quadruple licensed GFDL, GPL, LGPL and Creative Commons Attribution 3.0 (CC-BY-3.0)
*/
/* eslint-disable */
/* jshint ignore:start */ //这么多warning我受不了了23333
window.hotcat_translations_from_commons = false; // 禁止从维基共享获取翻译
(function ($, mw) {
    var conf = new Proxy({}, {
        get: function (_, name) {
            if (name === "wgServer") {
                return "https://" + location.hostname;
            }
            return mw.config.get(name);
        }
    });
    if (window.HotCat && !window.HotCat.nodeName || conf.wgAction === "edit") return;
    var HC = window.HotCat = {
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
            multi_error: "Could not retrieve the page text from the server. Therefore, your category changes " + "cannot be saved. We apologize for the inconvenience.",
            short_catchange: null
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
            up: "(↑)"
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
            up: "Open for modifying and display parent categories"
        },
        addmulti: "<span>+<sup>+</sup></span>",
        multi_tooltip: "Modify several categories",
        disable: function () {
            var ns = conf.wgNamespaceNumber;
            var nsIds = conf.wgNamespaceIds;
            return ns < 0 || ns === 10 || ns === 828 || ns === 8 || ns === 6 && !conf.wgArticleId || ns === 2 && /\.(js|css)$/.test(conf.wgTitle) || nsIds && (ns === nsIds.creator || ns === nsIds.timedtext || ns === nsIds.institution);
        },
        uncat_regexp: /\{\{\s*[Uu]ncategorized\s*[^}]*\}\}\s*(<!--.*?-->\s*)?/g,
        existsYes: "//upload.wikimedia.org/wikipedia/commons/thumb/b/be/P_yes.svg/20px-P_yes.svg.png",
        existsNo: "//upload.wikimedia.org/wikipedia/commons/thumb/4/42/P_no.svg/20px-P_no.svg.png",
        template_categories: {},
        engine_names: {
            searchindex: "Search index",
            pagelist: "Page list",
            combined: "Combined search",
            subcat: "Subcategories",
            parentcat: "Parent categories"
        },
        capitalizePageNames: null,
        upload_disabled: false,
        blacklist: null,
        bg_changed: "#FCA",
        no_autocommit: false,
        del_needs_diff: false,
        suggest_delay: 100,
        editbox_width: 40,
        suggestions: "combined",
        fixed_search: false,
        use_up_down: true,
        listSize: 5,
        single_minor: true,
        dont_add_to_watchlist: false,
        shortcuts: null,
        addShortcuts: function (map) {
            if (!map) return;
            window.HotCat.shortcuts = window.HotCat.shortcuts || {};
            for (var k in map) {
                if (!map.hasOwnProperty(k) || typeof k !== "string") continue;
                var v = map[k];
                if (typeof v !== "string") continue;
                k = k.replace(/^\s+|\s+$/g, "");
                v = v.replace(/^\s+|\s+$/g, "");
                if (!k.length || !v.length) continue;
                window.HotCat.shortcuts[k] = v;
            }
        }
    };
    var ua = navigator.userAgent.toLowerCase();
    var is_webkit = /applewebkit\/\d+/.test(ua) && ua.indexOf("spoofer") < 0;
    var cat_prefix = null;
    var noSuggestions = false;
    function LoadTrigger(needed) {
        var self = this;
        self.queue = [];
        self.needed = needed;
        self.register = function (callback) {
            if (self.needed <= 0) callback();
            else self.queue.push(callback);
        };
        self.loaded = function () {
            self.needed--;
            if (self.needed === 0) {
                for (var i = 0; i < self.queue.length; i++) self.queue[i]();
                self.queue = [];
            }
        };
    }
    var loadTrigger = new LoadTrigger(2);
    function load(uri, callback) {
        var s = document.createElement("script");
        s.src = uri;
        var called = false;
        s.onload = s.onerror = function () {
            if (!called && callback) {
                called = true;
                callback();
            }
            if (s.parentNode) {
                s.parentNode.removeChild(s);
            }
        };
        document.head.appendChild(s);
    }
    function loadJS(page, callback) {
        load(conf.wgServer + conf.wgScript + "?title=" + encodeURIComponent(page) + "&action=raw&ctype=text/javascript", callback);
    }
    function loadURI(href, callback) {
        var url = href;
        if (url.substring(0, 2) === "//") url = window.location.protocol + url;
        else if (url.substring(0, 1) === "/") url = conf.wgServer + url;
        load(url, callback);
    }
    loadJS("MediaWiki:Gadget-HotCat.js/local_defaults", loadTrigger.loaded);
    if (conf.wgUserLanguage !== "en") {
        if (window.hotcat_translations_from_commons === undefined) window.hotcat_translations_from_commons = true;
        if (window.hotcat_translations_from_commons && conf.wgServer.indexOf("//commons") < 0) {
            loadURI("//commons.wikimedia.org/w/index.php?title=" + "MediaWiki:Gadget-HotCat.js/" + conf.wgUserLanguage + "&action=raw&ctype=text/javascript", loadTrigger.loaded);
        } else {
            loadJS("MediaWiki:Gadget-HotCat.js/" + conf.wgUserLanguage, loadTrigger.loaded);
        }
    } else {
        loadTrigger.loaded();
    }
    var wikiTextBlank = "[\\t _\\xA0\\u1680\\u180E\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]+";
    var wikiTextBlankRE = new RegExp(wikiTextBlank, "g");
    var wikiTextBlankOrBidi = "[\\t _\\xA0\\u1680\\u180E\\u2000-\\u200B\\u200E\\u200F\\u2028-\\u202F\\u205F\\u3000]*";
    var formattedNamespaces = conf.wgFormattedNamespaces;
    var namespaceIds = conf.wgNamespaceIds;
    function autoLocalize(namespaceNumber, fallback) {
        function createRegexpStr(name) {
            if (!name || !name.length) return "";
            var regex_name = "";
            for (var i = 0; i < name.length; i++) {
                var initial = name.charAt(i),
                    ll = initial.toLowerCase(),
                    ul = initial.toUpperCase();
                if (ll === ul) regex_name += initial;
                else regex_name += "[" + ll + ul + "]";
            }
            return regex_name.replace(/([\\^$.?*+()])/g, "\\$1").replace(wikiTextBlankRE, wikiTextBlank);
        }
        fallback = fallback.toLowerCase();
        var canonical = formattedNamespaces[String(namespaceNumber)].toLowerCase();
        var regexp = createRegexpStr(canonical);
        if (fallback && canonical !== fallback) regexp += "|" + createRegexpStr(fallback);
        if (namespaceIds) {
            for (var cat_name in namespaceIds) {
                if (typeof cat_name === "string" && cat_name.toLowerCase() !== canonical && cat_name.toLowerCase() !== fallback && namespaceIds[cat_name] === namespaceNumber) {
                    regexp += "|" + createRegexpStr(cat_name);
                }
            }
        }
        return regexp;
    }
    HC.category_canonical = formattedNamespaces["14"];
    HC.category_regexp = autoLocalize(14, "category");
    if (formattedNamespaces["10"]) HC.template_regexp = autoLocalize(10, "template");
    function make(arg, literal) {
        if (!arg) return null;
        return literal ? document.createTextNode(arg) : document.createElement(arg);
    }
    function param(name, uri) {
        uri = uri || document.location.href;
        var re = new RegExp("[&?]" + name + "=([^&#]*)");
        var m = re.exec(uri);
        if (m && m.length > 1) return decodeURIComponent(m[1]);
        return null;
    }
    function title(href) {
        if (!href) return null;
        var script = conf.wgScript + "?";
        if (href.indexOf(script) === 0 || href.indexOf(conf.wgServer + script) === 0 || conf.wgServer.substring(0, 2) === "//" && href.indexOf(document.location.protocol + conf.wgServer + script) === 0) {
            return param("title", href);
        } else {
            var prefix = conf.wgArticlePath.replace("$1", "");
            if (href.indexOf(prefix)) prefix = conf.wgServer + prefix;
            if (href.indexOf(prefix) && prefix.substring(0, 2) === "//") prefix = document.location.protocol + prefix;
            if (href.indexOf(prefix) === 0) return decodeURIComponent(href.substring(prefix.length));
        }
        return null;
    }
    function hasClass(elem, name) {
        return (" " + elem.className + " ").indexOf(" " + name + " ") >= 0;
    }
    function capitalize(str) {
        if (!str || !str.length) return str;
        return str.substr(0, 1).toUpperCase() + str.substr(1);
    }
    function wikiPagePath(pageName) {
        return conf.wgArticlePath.replace("$1", encodeURIComponent(pageName).replace(/%3A/g, ":").replace(/%2F/g, "/"));
    }
    function escapeRE(str) {
        return str.replace(/([\\^$.?*+()[\]])/g, "\\$1");
    }
    function substituteFactory(options) {
        options = options || {};
        var lead = options.indicator || "$";
        var indicator = escapeRE(lead);
        var lbrace = escapeRE(options.lbrace || "{");
        var rbrace = escapeRE(options.rbrace || "}");
        var re;
        re = new RegExp("(?:" + indicator + "(" + indicator + "))|" + "(?:" + indicator + "(\\d+))|" + "(?:" + indicator + "(?:" + lbrace + "([^" + lbrace + rbrace + "]+)" + rbrace + "))|" + "(?:" + indicator + "(?!(?:[" + indicator + lbrace + "]|\\d))(\\S+?)\\b)", "g");
        return function (str, map) {
            if (!map) return str;
            return str.replace(re, function (match, prefix, idx, key, alpha) {
                if (prefix === lead) return lead;
                var k = alpha || key || idx;
                var replacement = typeof map[k] === "function" ? map[k](match, k) : map[k];
                return typeof replacement === "string" ? replacement : replacement || match;
            });
        };
    }
    var substitute = substituteFactory();
    var replaceShortcuts = function () {
        var replaceHash = substituteFactory({
            indicator: "#",
            lbrace: "[",
            rbrace: "]"
        });
        return function (str, map) {
            var s = replaceHash(str, map);
            return HC.capitalizePageNames ? capitalize(s) : s;
        };
    }();
    var findCatsRE = new RegExp("\\[\\[" + wikiTextBlankOrBidi + "(?:" + HC.category_regexp + ")" + wikiTextBlankOrBidi + ":[^\\]]+\\]\\]", "g");
    function replaceByBlanks(match) {
        return match.replace(/(\s|\S)/g, " ");
    }
    function find_category(wikitext, category, once) {
        var cat_regex = null;
        if (HC.template_categories[category]) {
            cat_regex = new RegExp("\\{\\{" + wikiTextBlankOrBidi + "(" + HC.template_regexp + "(?=" + wikiTextBlankOrBidi + ":))?" + wikiTextBlankOrBidi + "(?:" + HC.template_categories[category] + ")" + wikiTextBlankOrBidi + "(\\|.*?)?\\}\\}", "g");
        } else {
            var cat_name = escapeRE(category);
            var initial = cat_name.substr(0, 1);
            cat_regex = new RegExp("\\[\\[" + wikiTextBlankOrBidi + "(" + HC.category_regexp + ")" + wikiTextBlankOrBidi + ":" + wikiTextBlankOrBidi + (initial === "\\" || !HC.capitalizePageNames ? initial : "[" + initial.toUpperCase() + initial.toLowerCase() + "]") + cat_name.substring(1).replace(wikiTextBlankRE, wikiTextBlank) + wikiTextBlankOrBidi + "(\\|.*?)?\\]\\]", "g");
        }
        if (once) return cat_regex.exec(wikitext);
        var copiedtext = wikitext.replace(/<!--(\s|\S)*?-->/g, replaceByBlanks).replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, replaceByBlanks);
        var result = [];
        var curr_match = null;
        while ((curr_match = cat_regex.exec(copiedtext)) !== null) {
            result.push({
                match: curr_match
            });
        }
        result.re = cat_regex;
        return result;
    }
    var interlanguageRE = null;
    function change_category(wikitext, toRemove, toAdd, key, is_hidden) {
        function find_insertionpoint(wikitext) {
            var copiedtext = wikitext.replace(/<!--(\s|\S)*?-->/g, replaceByBlanks).replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, replaceByBlanks);
            var index = -1;
            findCatsRE.lastIndex = 0;
            while (findCatsRE.exec(copiedtext) !== null) index = findCatsRE.lastIndex;
            if (index < 0) {
                var match = null;
                if (!interlanguageRE) {
                    match = /((^|\n\r?)(\[\[\s*(([a-z]{2,3}(-[a-z]+)*)|simple|tokipona)\s*:[^\]]+\]\]\s*))+$/.exec(copiedtext);
                } else {
                    match = interlanguageRE.exec(copiedtext);
                }
                if (match) index = match.index;
                return {
                    idx: index,
                    onCat: false
                };
            }
            return {
                idx: index,
                onCat: index >= 0
            };
        }
        var summary = [],
            nameSpace = HC.category_canonical,
            cat_point = -1,
            keyChange = toRemove && toAdd && toRemove === toAdd && toAdd.length,
            matches;
        if (key) key = "|" + key;
        if (toRemove && toRemove.length) {
            matches = find_category(wikitext, toRemove);
            if (!matches || !matches.length) {
                return {
                    text: wikitext,
                    summary: summary,
                    error: HC.messages.cat_notFound.replace(/\$1/g, toRemove)
                };
            } else {
                var before = wikitext.substring(0, matches[0].match.index),
                    after = wikitext.substring(matches[0].match.index + matches[0].match[0].length);
                if (matches.length > 1) {
                    matches.re.lastIndex = 0;
                    after = after.replace(matches.re, "");
                }
                if (toAdd) {
                    if (key === null) key = matches[0].match[2];
                }
                var i = before.length - 1;
                while (i >= 0 && before.charAt(i) !== "\n" && before.substr(i, 1).search(/\s/) >= 0) i--;
                var j = 0;
                while (j < after.length && after.charAt(j) !== "\n" && after.substr(j, 1).search(/\s/) >= 0) j++;
                if (i >= 0 && before.charAt(i) === "\n" && (!after.length || j < after.length && after.charAt(j) === "\n")) i--;
                if (i >= 0) before = before.substring(0, i + 1);
                else before = "";
                if (j < after.length) after = after.substring(j);
                else after = "";
                if (before.length && before.substring(before.length - 1).search(/\S/) >= 0 && after.length && after.substr(0, 1).search(/\S/) >= 0) {
                    before += " ";
                }
                cat_point = before.length;
                if (cat_point === 0 && after.length && after.substr(0, 1) === "\n") after = after.substr(1);
                wikitext = before + after;
                if (!keyChange) {
                    if (HC.template_categories[toRemove]) {
                        summary.push(HC.messages.template_removed.replace(/\$1/g, toRemove));
                    } else {
                        summary.push(HC.messages.cat_removed.replace(/\$1/g, toRemove));
                    }
                }
            }
        }
        if (toAdd && toAdd.length) {
            matches = find_category(wikitext, toAdd);
            if (matches && matches.length) {
                return {
                    text: wikitext,
                    summary: summary,
                    error: HC.messages.cat_exists.replace(/\$1/g, toAdd)
                };
            } else {
                var onCat = false;
                if (cat_point < 0) {
                    var point = find_insertionpoint(wikitext);
                    cat_point = point.idx;
                    onCat = point.onCat;
                } else {
                    onCat = true;
                }
                var newcatstring = "[[" + nameSpace + ":" + toAdd + (key || "") + "]]";
                if (cat_point >= 0) {
                    var suffix = wikitext.substring(cat_point);
                    wikitext = wikitext.substring(0, cat_point) + (cat_point > 0 ? "\n" : "") + newcatstring + (!onCat ? "\n" : "");
                    if (suffix.length && suffix.substr(0, 1) !== "\n") wikitext += "\n" + suffix;
                    else wikitext += suffix;
                } else {
                    if (wikitext.length && wikitext.substr(wikitext.length - 1, 1) !== "\n") wikitext += "\n";
                    wikitext += (wikitext.length ? "\n" : "") + newcatstring;
                }
                if (keyChange) {
                    var k = key || "";
                    if (k.length) k = k.substr(1);
                    summary.push(substitute(HC.messages.cat_keychange, [null, toAdd, k]));
                } else {
                    summary.push(HC.messages.cat_added.replace(/\$1/g, toAdd));
                }
                if (HC.uncat_regexp && !is_hidden) {
                    var txt = wikitext.replace(HC.uncat_regexp, "");
                    if (txt.length !== wikitext.length) {
                        wikitext = txt;
                        summary.push(HC.messages.uncat_removed);
                    }
                }
            }
        }
        return {
            text: wikitext,
            summary: summary,
            error: null
        };
    }
    function evtKeys(e) {
        var code = 0;
        if (e.ctrlKey) {
            if (e.ctrlKey || e.metaKey) code |= 1;
            if (e.shiftKey) code |= 2;
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
    var catLine = null,
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
    function CategoryEditor() {
        this.initialize.apply(this, arguments);
    }
    function setPage(json) {
        var startTime = null;
        if (json && json.query) {
            if (json.query.pages) {
                var page = json.query.pages[!conf.wgArticleId ? "-1" : String(conf.wgArticleId)];
                if (page) {
                    if (page.revisions && page.revisions.length) {
                        pageText = page.revisions[0]["*"];
                        if (page.revisions[0].timestamp) pageTime = page.revisions[0].timestamp.replace(/\D/g, "");
                        if (page.revisions[0].revid) pageTextRevId = page.revisions[0].revid;
                        if (page.revisions.length > 1) conflictingUser = page.revisions[1].user;
                    }
                    if (page.lastrevid) lastRevId = page.lastrevid;
                    if (page.starttimestamp) startTime = page.starttimestamp.replace(/\D/g, "");
                    pageWatched = typeof page.watched === "string";
                    if (json.query.tokens) editToken = json.query.tokens.csrftoken;
                    if (page.langlinks && (!json["query-continue"] || !json["query-continue"].langlinks)) {
                        var re = "";
                        for (var i = 0; i < page.langlinks.length; i++) re += (i > 0 ? "|" : "") + page.langlinks[i].lang.replace(/([\\^$.?*+()])/g, "\\$1");
                        if (re.length) interlanguageRE = new RegExp("((^|\\n\\r?)(\\[\\[\\s*(" + re + ")\\s*:[^\\]]+\\]\\]\\s*))+$");
                    }
                }
            }
            if (json.query.general) {
                if (json.query.general.time && !startTime) startTime = json.query.general.time.replace(/\D/g, "");
                if (HC.capitalizePageNames === null) {
                    HC.capitalizePageNames = json.query.general["case"] === "first-letter";
                }
            }
            serverTime = startTime;
            if (json.query.userinfo && json.query.userinfo.options) {
                watchCreate = !HC.dont_add_to_watchlist && json.query.userinfo.options.watchcreations === "1";
                watchEdit = !HC.dont_add_to_watchlist && json.query.userinfo.options.watchdefault === "1";
                minorEdits = json.query.userinfo.options.minordefault === 1;
                if (minorEdits) HC.single_minor = true;
            }
        }
    }
    var saveInProgress = false;
    function initiateEdit(doEdit, failure) {
        if (saveInProgress) return;
        saveInProgress = true;
        var oldButtonState;
        if (commitButton) {
            oldButtonState = commitButton.disabled;
            commitButton.disabled = true;
        }
        function fail() {
            saveInProgress = false;
            if (commitButton) commitButton.disabled = oldButtonState;
            failure.apply(this, arguments);
        }
        $.getJSON(conf.wgServer + conf.wgScriptPath + "/api.php?" + "format=json&action=query&rawcontinue=&titles=" + encodeURIComponent(conf.wgPageName) + "&prop=info%7Crevisions%7Clanglinks&inprop=watched&rvprop=content%7Ctimestamp%7Cids%7Cuser&lllimit=500" + "&rvlimit=2&rvdir=newer&rvstartid=" + conf.wgCurRevisionId + "&meta=siteinfo%7Cuserinfo%7Ctokens&type=csrf&uiprop=options", function (json) {
            setPage(json);
            doEdit(fail);
        }).fail(function (req) {
            fail(req.status + " " + req.statusText);
        });
    }
    function multiChangeMsg(count) {
        var msg = HC.messages.multi_change;
        if (typeof msg !== "string" && msg.length)
            if (mw.language && mw.language.convertPlural) {
                msg = mw.language.convertPlural(count, msg);
            } else {
                msg = msg[msg.length - 1];
            }
        return substitute(msg, [null, String(count)]);
    }
    function currentTimestamp() {
        var now = new Date();
        var ts = String(now.getUTCFullYear());
        function two(s) {
            return s.substr(s.length - 2);
        }
        ts += two("0" + (now.getUTCMonth() + 1)) + two("0" + now.getUTCDate()) + two("00" + now.getUTCHours()) + two("00" + now.getUTCMinutes()) + two("00" + now.getUTCSeconds());
        return ts;
    }
    function performChanges(failure, singleEditor) {
        if (pageText === null) {
            failure(HC.messages.multi_error);
            return;
        }
        if (HC.messages.cat_keychange.indexOf("$2") < 0) HC.messages.cat_keychange += '"$2"';
        if (!HC.messages.short_catchange) HC.messages.short_catchange = "[[" + HC.category_canonical + ":$1]]";
        var action;
        var selfEditConflict = (lastRevId !== null && lastRevId !== conf.wgCurRevisionId || pageTextRevId !== null && pageTextRevId !== conf.wgCurRevisionId) && conflictingUser && conflictingUser === conf.wgUserName;
        if (singleEditor && !singleEditor.noCommit && !HC.no_autocommit && editToken && !selfEditConflict) {
            commitForm.wpEditToken.value = editToken;
            action = commitForm.wpDiff;
            if (action) {
                action.name = action.value = "wpSave";
                commitForm.wpChangeTags += "," + HC.automationChangeTag;
            }
        } else {
            action = commitForm.wpSave;
            if (action) action.name = action.value = "wpDiff";
        }
        var result = {
            text: pageText
        },
            changed = [],
            added = [],
            deleted = [],
            changes = 0,
            toEdit = singleEditor ? [singleEditor] : editors,
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
                            to: edit.currentCategory
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
            if (action) action.name = action.value = "wpDiff";
        }
        commitForm.wpMinoredit.checked = minorEdits;
        commitForm.wpWatchthis.checked = !conf.wgArticleId && watchCreate || watchEdit || pageWatched;
        if (conf.wgArticleId || !!singleEditor) {
            if (action && action.value === "wpSave") {
                if (HC.changeTag) {
                    commitForm.wpChangeTags.value = HC.changeTag + "," + HC.automationChangeTag;
                    HC.messages.using = "";
                    HC.messages.prefix = "";
                }
            } else {
                commitForm.wpAutoSummary.value = HC.changeTag;
            }
            if (changes === 1) {
                if (result.summary && result.summary.length) commitForm.wpSummary.value = HC.messages.prefix + result.summary.join(HC.messages.separator) + HC.messages.using;
                commitForm.wpMinoredit.checked = HC.single_minor || minorEdits;
            } else if (changes) {
                var summary = [];
                var shortSummary = [];
                for (i = 0; i < deleted.length; i++) summary.push("-" + substitute(HC.messages.short_catchange, [null, deleted[i]]));
                if (deleted.length === 1) shortSummary.push("-" + substitute(HC.messages.short_catchange, [null, deleted[0]]));
                else if (deleted.length) shortSummary.push("- " + multiChangeMsg(deleted.length));
                for (i = 0; i < added.length; i++) summary.push("+" + substitute(HC.messages.short_catchange, [null, added[i]]));
                if (added.length === 1) shortSummary.push("+" + substitute(HC.messages.short_catchange, [null, added[0]]));
                else if (added.length) shortSummary.push("+ " + multiChangeMsg(added.length));
                var arrow = is_rtl ? "←" : "→";
                for (i = 0; i < changed.length; i++) {
                    if (changed[i].from !== changed[i].to) {
                        summary.push("±" + substitute(HC.messages.short_catchange, [null, changed[i].from]) + arrow + substitute(HC.messages.short_catchange, [null, changed[i].to]));
                    } else {
                        summary.push("±" + substitute(HC.messages.short_catchange, [null, changed[i].from]));
                    }
                }
                if (changed.length === 1) {
                    if (changed[0].from !== changed[0].to) {
                        shortSummary.push("±" + substitute(HC.messages.short_catchange, [null, changed[0].from]) + arrow + substitute(HC.messages.short_catchange, [null, changed[0].to]));
                    } else {
                        shortSummary.push("±" + substitute(HC.messages.short_catchange, [null, changed[0].from]));
                    }
                } else if (changed.length) {
                    shortSummary.push("± " + multiChangeMsg(changed.length));
                }
                if (summary.length) {
                    summary = summary.join(HC.messages.separator);
                    if (summary.length > 200 - HC.messages.prefix.length - HC.messages.using.length) summary = shortSummary.join(HC.messages.separator);
                    commitForm.wpSummary.value = HC.messages.prefix + summary + HC.messages.using;
                }
            }
        }
        commitForm.wpTextbox1.value = result.text;
        commitForm.wpStarttime.value = serverTime || currentTimestamp();
        commitForm.wpEdittime.value = pageTime || commitForm.wpStarttime.value;
        if (selfEditConflict) commitForm.oldid.value = String(pageTextRevId || conf.wgCurRevisionId);
        commitForm.hcCommit.click();
    }
    function resolveOne(page, toResolve) {
        var cats = page.categories,
            lks = page.links,
            is_dab = false,
            is_redir = typeof page.redirect === "string",
            is_hidden = page.categoryinfo && typeof page.categoryinfo.hidden === "string",
            is_missing = typeof page.missing === "string",
            i;
        for (i = 0; i < toResolve.length; i++) {
            if (i && toResolve[i].dabInputCleaned !== page.title.substring(page.title.indexOf(":") + 1)) continue;
            toResolve[i].currentHidden = is_hidden;
            toResolve[i].inputExists = !is_missing;
            toResolve[i].icon.src = is_missing ? HC.existsNo : HC.existsYes;
        }
        if (is_missing) return;
        if (!is_redir && cats && (HC.disambig_category || HC.redir_category)) {
            for (var c = 0; c < cats.length; c++) {
                var cat = cats[c].title;
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
        if (!is_redir && !is_dab) return;
        if (!lks || !lks.length) return;
        var titles = [];
        for (i = 0; i < lks.length; i++) {
            if (lks[i].ns === 14 && lks[i].title && lks[i].title.length) {
                var match = lks[i].title;
                match = match.substring(match.indexOf(":") + 1);
                if (!HC.blacklist || !HC.blacklist.test(match)) titles.push(match);
            }
        }
        if (!titles.length) return;
        for (i = 0; i < toResolve.length; i++) {
            if (i && toResolve[i].dabInputCleaned !== page.title.substring(page.title.indexOf(":") + 1)) continue;
            toResolve[i].inputExists = true;
            toResolve[i].icon.src = HC.existsYes;
            if (titles.length > 1) {
                toResolve[i].dab = titles;
            } else {
                toResolve[i].text.value = titles[0] + (toResolve[i].currentKey !== null ? "|" + toResolve[i].currentKey : "");
            }
        }
    }
    function resolveRedirects(toResolve, params) {
        if (!params || !params.query || !params.query.pages) return;
        for (var p in params.query.pages) resolveOne(params.query.pages[p], toResolve);
    }
    function resolveMulti(toResolve, callback) {
        var i;
        for (i = 0; i < toResolve.length; i++) {
            toResolve[i].dab = null;
            toResolve[i].dabInput = toResolve[i].lastInput;
        }
        if (noSuggestions) {
            callback(toResolve);
            return;
        }
        var args = "action=query&prop=info%7Clinks%7Ccategories%7Ccategoryinfo&plnamespace=14" + "&pllimit=" + toResolve.length * 10 + "&cllimit=" + toResolve.length * 10 + "&format=json&titles=";
        for (i = 0; i < toResolve.length; i++) {
            var v = toResolve[i].dabInput;
            v = replaceShortcuts(v, HC.shortcuts);
            toResolve[i].dabInputCleaned = v;
            args += encodeURIComponent("Category:" + v);
            if (i + 1 < toResolve.length) args += "%7C";
        }
        $.getJSON(conf.wgServer + conf.wgScriptPath + "/api.php?" + args, function (json) {
            resolveRedirects(toResolve, json);
            callback(toResolve);
        }).fail(function (req) {
            if (!req) noSuggestions = true;
            callback(toResolve);
        });
    }
    function makeActive(which) {
        if (which.is_active) return;
        for (var i = 0; i < editors.length; i++)
            if (editors[i] !== which) editors[i].inactivate();
        which.is_active = true;
        if (which.dab) {
            showDab(which);
        } else {
            var expectedInput = which.lastRealInput || which.lastInput || "";
            var actualValue = which.text.value || "";
            if (!expectedInput.length && actualValue.length || expectedInput.length && actualValue.indexOf(expectedInput)) {
                which.showsList = false;
                var v = actualValue.split("|");
                which.lastRealInput = which.lastInput = v[0];
                if (v.length > 1) which.currentKey = v[1];
                if (which.lastSelection) {
                    which.lastSelection = {
                        start: v[0].length,
                        end: v[0].length
                    };
                }
            }
            if (which.showsList) which.displayList();
            if (which.lastSelection) {
                if (is_webkit) {
                    window.setTimeout(function () {
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
        var toResolve = [];
        for (var i = 0; i < editors.length; i++)
            if (editors[i].state === CategoryEditor.CHANGE_PENDING || editors[i].state === CategoryEditor.OPEN) toResolve.push(editors[i]);
        if (!toResolve.length) {
            initiateEdit(function (failure) {
                performChanges(failure);
            }, function (msg) {
                oouiDialog.alert(oouiDialog.sanitize(msg), {
                    title: "HotCat 小工具"
                });
            });
            return;
        }
        resolveMulti(toResolve, function (resolved) {
            var firstDab = null;
            var dontChange = false;
            for (var i = 0; i < resolved.length; i++) {
                if (resolved[i].lastInput !== resolved[i].dabInput) {
                    dontChange = true;
                } else {
                    if (resolved[i].dab) {
                        if (!firstDab) firstDab = resolved[i];
                    } else {
                        if (resolved[i].acceptCheck(true)) resolved[i].commit();
                    }
                }
            }
            if (firstDab) {
                showDab(firstDab);
            } else if (!dontChange) {
                initiateEdit(function (failure) {
                    performChanges(failure);
                }, function (msg) {
                    oouiDialog.alert(oouiDialog.sanitize(msg), {
                        title: "HotCat 小工具"
                    });
                });
            }
        });
    }
    function setMultiInput() {
        if (commitButton || onUpload) return;
        commitButton = make("input");
        commitButton.type = "button";
        commitButton.value = HC.messages.commit;
        commitButton.onclick = multiSubmit;
        if (multiSpan) multiSpan.parentNode.replaceChild(commitButton, multiSpan);
        else catLine.appendChild(commitButton);
    }
    function checkMultiInput() {
        if (!commitButton) return;
        var hasChanges = false;
        for (var i = 0; i < editors.length; i++) {
            if (editors[i].state !== CategoryEditor.UNCHANGED) {
                hasChanges = true;
                break;
            }
        }
        commitButton.disabled = !hasChanges;
    }
    var suggestionEngines = {
        opensearch: {
            uri: "/api.php?format=json&action=opensearch&namespace=14&limit=30&search=Category:$1",
            handler: function (queryResult, queryKey) {
                if (queryResult && queryResult.length >= 2) {
                    var key = queryResult[0].substring(queryResult[0].indexOf(":") + 1);
                    var titles = queryResult[1];
                    var exists = false;
                    if (!cat_prefix) cat_prefix = new RegExp("^(" + HC.category_regexp + "):");
                    for (var i = 0; i < titles.length; i++) {
                        cat_prefix.lastIndex = 0;
                        var m = cat_prefix.exec(titles[i]);
                        if (m && m.length > 1) {
                            titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
                            if (key === titles[i]) exists = true;
                        } else {
                            titles.splice(i, 1);
                            i--;
                        }
                    }
                    titles.exists = exists;
                    if (queryKey !== key) titles.normalized = key;
                    return titles;
                }
                return null;
            }
        },
        internalsearch: {
            uri: "/api.php?format=json&action=query&list=allpages&apnamespace=14&aplimit=30&apfrom=$1&apprefix=$1",
            handler: function (queryResult) {
                if (queryResult && queryResult.query && queryResult.query.allpages) {
                    var titles = queryResult.query.allpages;
                    for (var i = 0; i < titles.length; i++) titles[i] = titles[i].title.substring(titles[i].title.indexOf(":") + 1);
                    return titles;
                }
                return null;
            }
        },
        exists: {
            uri: "/api.php?format=json&action=query&prop=info&titles=Category:$1",
            handler: function (queryResult, queryKey) {
                if (queryResult && queryResult.query && queryResult.query.pages && !queryResult.query.pages[-1]) {
                    for (var p in queryResult.query.pages) {
                        var title = queryResult.query.pages[p].title;
                        title = title.substring(title.indexOf(":") + 1);
                        var titles = [title];
                        titles.exists = true;
                        if (queryKey !== title) titles.normalized = title;
                        return titles;
                    }
                }
                return null;
            }
        },
        subcategories: {
            uri: "/api.php?format=json&action=query&list=categorymembers&cmtype=subcat&cmlimit=max&cmtitle=Category:$1",
            handler: function (queryResult) {
                if (queryResult && queryResult.query && queryResult.query.categorymembers) {
                    var titles = queryResult.query.categorymembers;
                    for (var i = 0; i < titles.length; i++) titles[i] = titles[i].title.substring(titles[i].title.indexOf(":") + 1);
                    return titles;
                }
                return null;
            }
        },
        parentcategories: {
            uri: "/api.php?format=json&action=query&prop=categories&titles=Category:$1&cllimit=max",
            handler: function (queryResult) {
                if (queryResult && queryResult.query && queryResult.query.pages) {
                    for (var p in queryResult.query.pages) {
                        if (queryResult.query.pages[p].categories) {
                            var titles = queryResult.query.pages[p].categories;
                            for (var i = 0; i < titles.length; i++) titles[i] = titles[i].title.substring(titles[i].title.indexOf(":") + 1);
                            return titles;
                        }
                    }
                }
                return null;
            }
        }
    };
    var suggestionConfigs = {
        searchindex: {
            name: "Search index",
            engines: ["opensearch"],
            cache: {},
            show: true,
            temp: false,
            noCompletion: false
        },
        pagelist: {
            name: "Page list",
            engines: ["internalsearch", "exists"],
            cache: {},
            show: true,
            temp: false,
            noCompletion: false
        },
        combined: {
            name: "Combined search",
            engines: ["opensearch", "internalsearch"],
            cache: {},
            show: true,
            temp: false,
            noCompletion: false
        },
        subcat: {
            name: "Subcategories",
            engines: ["subcategories"],
            cache: {},
            show: true,
            temp: true,
            noCompletion: true
        },
        parentcat: {
            name: "Parent categories",
            engines: ["parentcategories"],
            cache: {},
            show: true,
            temp: true,
            noCompletion: true
        }
    };
    CategoryEditor.UNCHANGED = 0;
    CategoryEditor.OPEN = 1;
    CategoryEditor.CHANGE_PENDING = 2;
    CategoryEditor.CHANGED = 3;
    CategoryEditor.DELETED = 4;
    var dummyElement = make(" ", true);
    function forceRedraw() {
        if (dummyElement.parentNode) document.body.removeChild(dummyElement);
        else document.body.appendChild(dummyElement);
    }
    var BS = 8,
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
    CategoryEditor.prototype = {
        initialize: function (line, span, after, key, is_hidden) {
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
                var lk = make("a");
                lk.href = "#catlinks";
                lk.onclick = this.open.bind(this);
                lk.appendChild(make(HC.links.add, true));
                lk.title = HC.tooltips.add;
                this.linkSpan.appendChild(lk);
                span = make(newDOM ? "li" : "span");
                span.className = "noprint";
                if (is_rtl) span.dir = "rtl";
                span.appendChild(this.linkSpan);
                if (after) after.parentNode.insertBefore(span, after.nextSibling);
                else line.appendChild(span);
                this.normalLinks = null;
                this.undelLink = null;
                this.catLink = null;
            } else {
                if (is_rtl) span.dir = "rtl";
                this.isAddCategory = false;
                this.catLink = span.firstChild;
                this.originalCategory = Array.isArray(after) ? after[0] : after;
                this.originalKey = key && key.length > 1 ? key.substr(1) : null;
                this.originalExists = !hasClass(this.catLink, "new");
                this.makeLinkSpan();
                if (!this.originalExists && this.upDownLinks) this.upDownLinks.style.display = "none";
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
            if (this.catLink && this.currentKey) this.catLink.title = this.currentKey;
            editors[editors.length] = this;
        },
        makeLinkSpan: function () {
            this.normalLinks = make("span");
            var lk = null;
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
        },
        invokeSuggestions: function (dont_autocomplete) {
            if (this.engine && suggestionConfigs[this.engine] && suggestionConfigs[this.engine].temp && !dont_autocomplete) this.engine = HC.suggestions;
            this.state = CategoryEditor.CHANGE_PENDING;
            var self = this;
            window.setTimeout(function () {
                self.textchange(dont_autocomplete);
            }, HC.suggest_delay);
        },
        makeForm: function () {
            var form = make("form");
            form.method = "POST";
            form.onsubmit = this.accept.bind(this);
            this.form = form;
            var self = this;
            var text = make("input");
            text.type = "text";
            text.size = HC.editbox_width;
            if (!noSuggestions) {
                text.onkeyup = function (evt) {
                    var key = evt.keyCode || 0;
                    if (self.ime && self.lastKey === IME && !self.usesComposition && (key === TAB || key === RET || key === ESC || key === SPACE)) self.ime = false;
                    if (self.ime) return true;
                    if (key === UP || key === DOWN || key === PGUP || key === PGDOWN) {
                        if (self.keyCount === 0) return self.processKey(evt);
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
                    var key = evt.keyCode || 0;
                    self.lastKey = key;
                    self.keyCount = 0;
                    if (!self.ime && key === IME && !self.usesComposition) {
                        self.ime = true;
                    } else if (self.ime && key !== IME && !(key >= 16 && key <= 20 || key >= 91 && key <= 93 || key === 144)) {
                        self.ime = false;
                    }
                    if (self.ime) return true;
                    if (key === RET) return self.accept(evt);
                    return key === ESC ? evtKill(evt) : true;
                };
                text.onkeypress = function (evt) {
                    self.keyCount++;
                    return self.processKey(evt);
                };
                $(text).on("focus", function () {
                    makeActive(self);
                });
                $(text).on(text.onbeforedeactivate !== undefined && text.createTextRange ? "beforedeactivate" : "blur", this.saveView.bind(this));
                try {
                    $(text).on("compositionstart", function () {
                        self.lastKey = IME;
                        self.usesComposition = true;
                        self.ime = true;
                    });
                    $(text).on("compositionend", function () {
                        self.lastKey = IME;
                        self.usesComposition = true;
                        self.ime = false;
                    });
                    $(text).on("textInput", function () {
                        self.ime = false;
                        self.invokeSuggestions(false);
                    });
                } catch (any) { }
                $(text).on("blur", function () {
                    self.usesComposition = false;
                    self.ime = false;
                });
            }
            this.text = text;
            this.icon = make("img");
            var list = null;
            if (!noSuggestions) {
                list = make("select");
                list.onclick = function () {
                    if (self.highlightSuggestion(0)) self.textchange(false, true);
                };
                list.ondblclick = function (e) {
                    if (self.highlightSuggestion(0)) self.accept(e);
                };
                list.onchange = function () {
                    self.highlightSuggestion(0);
                    self.text.focus();
                };
                list.onkeyup = function (evt) {
                    if (evt.keyCode === ESC) {
                        self.resetKeySelection();
                        self.text.focus();
                        window.setTimeout(function () {
                            self.textchange(true);
                        }, HC.suggest_delay);
                    } else if (evt.keyCode === RET) {
                        self.accept(evt);
                    }
                };
                if (!HC.fixed_search) {
                    var engineSelector = make("select");
                    for (var key in suggestionConfigs) {
                        if (suggestionConfigs[key].show) {
                            var opt = make("option");
                            opt.value = key;
                            if (key === this.engine) opt.selected = true;
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
                var label = null;
                if (onUpload && window.UFUI !== undefined && window.UIElements !== undefined && UFUI.getLabel instanceof Function) {
                    try {
                        label = UFUI.getLabel(id, true);
                        while (label && label.nodeType !== 3) label = label.firstChild;
                    } catch (ex) {
                        label = null;
                    }
                }
                if (!label || !label.data) return defaultText;
                return label.data;
            }
            var OK = make("input");
            OK.type = "button";
            OK.value = button_label("wpOkUploadLbl", HC.messages.ok);
            OK.onclick = this.accept.bind(this);
            this.ok = OK;
            var cancel = make("input");
            cancel.type = "button";
            cancel.value = button_label("wpCancelUploadLbl", HC.messages.cancel);
            cancel.onclick = this.cancel.bind(this);
            this.cancelButton = cancel;
            var span = make("span");
            span.className = "hotcatinput";
            span.style.position = "relative";
            span.appendChild(text);
            span.appendChild(make(" ", true));
            span.style.whiteSpace = "nowrap";
            if (list) span.appendChild(list);
            if (this.engineSelector) span.appendChild(this.engineSelector);
            if (!noSuggestions) span.appendChild(this.icon);
            span.appendChild(OK);
            span.appendChild(cancel);
            form.appendChild(span);
            form.style.display = "none";
            this.span.appendChild(form);
        },
        display: function (evt) {
            if (this.isAddCategory && !onUpload) {
                new CategoryEditor(this.line, null, this.span, true);
            }
            if (!commitButton && !onUpload) {
                for (var i = 0; i < editors.length; i++) {
                    if (editors[i].state !== CategoryEditor.UNCHANGED) {
                        setMultiInput();
                        break;
                    }
                }
            }
            if (!this.form) this.makeForm();
            if (this.list) this.list.style.display = "none";
            if (this.engineSelector) this.engineSelector.style.display = "none";
            this.currentCategory = this.lastSavedCategory;
            this.currentExists = this.lastSavedExists;
            this.currentHidden = this.lastSavedHidden;
            this.currentKey = this.lastSavedKey;
            this.icon.src = this.currentExists ? HC.existsYes : HC.existsNo;
            this.text.value = this.currentCategory + (this.currentKey !== null ? "|" + this.currentKey : "");
            this.originalState = this.state;
            this.lastInput = this.currentCategory;
            this.inputExists = this.currentExists;
            this.state = this.state === CategoryEditor.UNCHANGED ? CategoryEditor.OPEN : CategoryEditor.CHANGE_PENDING;
            this.lastSelection = {
                start: this.currentCategory.length,
                end: this.currentCategory.length
            };
            this.showsList = false;
            if (this.catLink) this.catLink.style.display = "none";
            this.linkSpan.style.display = "none";
            this.form.style.display = "inline";
            this.ok.disabled = false;
            var result = evtKill(evt);
            this.text.focus();
            this.text.readOnly = false;
            checkMultiInput();
            return result;
        },
        show: function (evt, engine, readOnly) {
            var result = this.display(evt);
            var v = this.lastSavedCategory;
            if (!v.length) return result;
            this.text.readOnly = !!readOnly;
            this.engine = engine;
            this.textchange(false, true);
            forceRedraw();
            return result;
        },
        open: function (evt) {
            return this.show(evt, this.engine && suggestionConfigs[this.engine].temp ? HC.suggestions : this.engine);
        },
        down: function (evt) {
            return this.show(evt, "subcat", true);
        },
        up: function (evt) {
            return this.show(evt, "parentcat");
        },
        cancel: function () {
            if (this.isAddCategory && !onUpload) {
                this.removeEditor();
                return;
            }
            this.inactivate();
            this.form.style.display = "none";
            if (this.catLink) this.catLink.style.display = "";
            this.linkSpan.style.display = "";
            this.state = this.originalState;
            this.currentCategory = this.lastSavedCategory;
            this.currentKey = this.lastSavedKey;
            this.currentExists = this.lastSavedExists;
            this.currentHidden = this.lastSavedHidden;
            if (this.catLink)
                if (this.currentKey && this.currentKey.length) {
                    this.catLink.title = this.currentKey;
                } else {
                    this.catLink.title = "";
                }
            if (this.state === CategoryEditor.UNCHANGED) {
                if (this.catLink) this.catLink.style.backgroundColor = "transparent";
            } else {
                if (!onUpload) {
                    try {
                        this.catLink.style.backgroundColor = HC.bg_changed;
                    } catch (ex) { }
                }
            }
            checkMultiInput();
            forceRedraw();
        },
        removeEditor: function () {
            if (!newDOM) {
                var next = this.span.nextSibling;
                if (next) next.parentNode.removeChild(next);
            }
            if (this.span && this.span.parentNode) {
                this.span.parentNode.removeChild(this.span);
            }
            for (var i = 0; i < editors.length; i++) {
                if (editors[i] === this) {
                    editors.splice(i, 1);
                    break;
                }
            }
            checkMultiInput();
        },
        rollback: function (evt) {
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
                this.catLink.href = wikiPagePath(HC.category_canonical + ":" + this.currentCategory);
                this.catLink.title = this.currentKey || "";
                this.catLink.className = this.currentExists ? "" : "new";
                this.catLink.style.backgroundColor = "transparent";
                if (this.upDownLinks) this.upDownLinks.style.display = this.currentExists ? "" : "none";
                checkMultiInput();
            }
            return evtKill(evt);
        },
        inactivate: function () {
            if (this.list) this.list.style.display = "none";
            if (this.engineSelector) this.engineSelector.style.display = "none";
            this.is_active = false;
        },
        acceptCheck: function (dontCheck) {
            this.sanitizeInput();
            var value = this.text.value.split("|");
            var key = null;
            if (value.length > 1) key = value[1];
            var v = value[0].replace(/_/g, " ").replace(/^\s+|\s+$/g, "");
            if (HC.capitalizePageNames) v = capitalize(v);
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
        },
        accept: function (evt) {
            this.noCommit = (evtKeys(evt) & 1) !== 0;
            var result = evtKill(evt);
            if (this.acceptCheck()) {
                var toResolve = [this];
                var original = this.currentCategory;
                resolveMulti(toResolve, function (resolved) {
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
        },
        close: function () {
            if (!this.catLink) {
                this.catLink = make("a");
                this.catLink.appendChild(make("foo", true));
                this.catLink.style.display = "none";
                this.span.insertBefore(this.catLink, this.span.firstChild.nextSibling);
            }
            this.catLink.removeChild(this.catLink.firstChild);
            this.catLink.appendChild(make(this.currentCategory, true));
            this.catLink.href = wikiPagePath(HC.category_canonical + ":" + this.currentCategory);
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
                var span = make("span");
                var lk = make("a");
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
                    } catch (ex) { }
                }
            }
            if (this.upDownLinks) this.upDownLinks.style.display = this.lastSavedExists ? "" : "none";
            this.linkSpan.style.display = "";
            this.state = CategoryEditor.CHANGED;
            checkMultiInput();
            forceRedraw();
        },
        commit: function () {
            if (this.currentCategory === this.originalCategory && (this.currentKey === this.originalKey || this.currentKey === null && !this.originalKey.length) || conf.wgNamespaceNumber === 14 && this.currentCategory === conf.wgTitle || HC.blacklist && HC.blacklist.test(this.currentCategory)) {
                this.cancel();
                return;
            }
            this.close();
            if (!commitButton && !onUpload) {
                var self = this;
                initiateEdit(function (failure) {
                    performChanges(failure, self);
                }, function (msg) {
                    oouiDialog.alert(oouiDialog.sanitize(msg), {
                        title: "HotCat 小工具"
                    });
                });
            }
        },
        remove: function (evt) {
            this.doRemove(evtKeys(evt) & 1);
            return evtKill(evt);
        },
        doRemove: function (noCommit) {
            if (this.isAddCategory) {
                this.cancel();
                return;
            }
            if (!commitButton && !onUpload) {
                for (var i = 0; i < editors.length; i++) {
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
                } catch (ex) { }
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
                    var self = this;
                    initiateEdit(function (failure) {
                        performChanges(failure, self);
                    }, function (msg) {
                        self.state = self.originalState;
                        oouiDialog.alert(oouiDialog.sanitize(msg), {
                            title: "HotCat 小工具"
                        });
                    });
                }
            }
        },
        restore: function (evt) {
            this.catLink.title = this.currentKey || "";
            this.catLink.style.textDecoration = "";
            this.state = this.originalState;
            if (this.state === CategoryEditor.UNCHANGED) {
                this.catLink.style.backgroundColor = "transparent";
            } else {
                try {
                    this.catLink.style.backgroundColor = HC.bg_changed;
                } catch (ex) { }
            }
            this.normalLinks.style.display = "";
            this.undelLink.style.display = "none";
            checkMultiInput();
            return evtKill(evt);
        },
        selectEngine: function (engineName) {
            if (!this.engineSelector) return;
            for (var i = 0; i < this.engineSelector.options.length; i++) this.engineSelector.options[i].selected = this.engineSelector.options[i].value === engineName;
        },
        sanitizeInput: function () {
            var v = this.text.value || "";
            v = v.replace(/^(\s|_)+/, "");
            var re = new RegExp("^(" + HC.category_regexp + "):");
            if (re.test(v)) v = v.substring(v.indexOf(":") + 1).replace(/^(\s|_)+/, "");
            v = v.replace(/\u200E$/, "");
            if (HC.capitalizePageNames) v = capitalize(v);
            if (this.text.value !== null && this.text.value !== v) this.text.value = v;
        },
        makeCall: function (url, callbackObj, engine, queryKey, cleanKey) {
            var cb = callbackObj,
                e = engine,
                v = queryKey,
                z = cleanKey,
                thisObj = this;
            function done() {
                cb.callsMade++;
                if (cb.callsMade === cb.nofCalls) {
                    if (cb.exists) cb.allTitles.exists = true;
                    if (cb.normalized) cb.allTitles.normalized = cb.normalized;
                    if (!cb.dontCache && !suggestionConfigs[cb.engineName].cache[z]) suggestionConfigs[cb.engineName].cache[z] = cb.allTitles;
                    thisObj.text.readOnly = false;
                    if (!cb.cancelled) thisObj.showSuggestions(cb.allTitles, cb.noCompletion, v, cb.engineName);
                    if (cb === thisObj.callbackObj) thisObj.callbackObj = null;
                    cb = undefined;
                }
            }
            $.getJSON(url, function (json) {
                var titles = e.handler(json, z);
                if (titles && titles.length) {
                    if (cb.allTitles === null) cb.allTitles = titles;
                    else cb.allTitles = cb.allTitles.concat(titles);
                    if (titles.exists) cb.exists = true;
                    if (titles.normalized) cb.normalized = titles.normalized;
                }
                done();
            }).fail(function (req) {
                if (!req) noSuggestions = true;
                cb.dontCache = true;
                done();
            });
        },
        callbackObj: null,
        textchange: function (dont_autocomplete, force) {
            makeActive(this);
            this.sanitizeInput();
            var v = this.text.value;
            var pipe = v.indexOf("|");
            if (pipe >= 0) {
                this.currentKey = v.substring(pipe + 1);
                v = v.substring(0, pipe);
            } else {
                this.currentKey = null;
            }
            if (this.lastInput === v && !force) return;
            if (this.lastInput !== v) checkMultiInput();
            this.lastInput = v;
            this.lastRealInput = v;
            this.ok.disabled = v.length && HC.blacklist && HC.blacklist.test(v);
            if (noSuggestions) {
                if (this.list) this.list.style.display = "none";
                if (this.engineSelector) this.engineSelector.style.display = "none";
                if (this.icon) this.icon.style.display = "none";
                return;
            }
            if (!v.length) {
                this.showSuggestions([]);
                return;
            }
            var cleanKey = v.replace(/[\u200E\u200F\u202A-\u202E]/g, "").replace(wikiTextBlankRE, " ");
            cleanKey = replaceShortcuts(cleanKey, HC.shortcuts);
            cleanKey = cleanKey.replace(/^\s+|\s+$/g, "");
            if (!cleanKey.length) {
                this.showSuggestions([]);
                return;
            }
            if (this.callbackObj) this.callbackObj.cancelled = true;
            var engineName = suggestionConfigs[this.engine] ? this.engine : "combined";
            dont_autocomplete = dont_autocomplete || suggestionConfigs[engineName].noCompletion;
            if (suggestionConfigs[engineName].cache[cleanKey]) {
                this.showSuggestions(suggestionConfigs[engineName].cache[cleanKey], dont_autocomplete, v, engineName);
                return;
            }
            var engines = suggestionConfigs[engineName].engines;
            this.callbackObj = {
                allTitles: null,
                callsMade: 0,
                nofCalls: engines.length,
                noCompletion: dont_autocomplete,
                engineName: engineName
            };
            this.makeCalls(engines, this.callbackObj, v, cleanKey);
        },
        makeCalls: function (engines, cb, v, cleanKey) {
            for (var j = 0; j < engines.length; j++) {
                var engine = suggestionEngines[engines[j]];
                var url = conf.wgServer + conf.wgScriptPath + engine.uri.replace(/\$1/g, encodeURIComponent(cleanKey));
                this.makeCall(url, cb, engine, v, cleanKey);
            }
        },
        showSuggestions: function (titles, dontAutocomplete, queryKey, engineName) {
            this.text.readOnly = false;
            this.dab = null;
            this.showsList = false;
            if (!this.list) return;
            if (noSuggestions) {
                if (this.list) this.list.style.display = "none";
                if (this.engineSelector) this.engineSelector.style.display = "none";
                if (this.icon) this.icon.style.display = "none";
                this.inputExists = true;
                return;
            }
            this.engineName = engineName;
            if (engineName) {
                if (!this.engineSelector) this.engineName = null;
            } else {
                if (this.engineSelector) this.engineSelector.style.display = "none";
            }
            if (queryKey) {
                if (this.lastInput.indexOf(queryKey)) return;
                if (this.lastQuery && this.lastInput.indexOf(this.lastQuery) === 0 && this.lastQuery.length > queryKey.length) return;
            }
            this.lastQuery = queryKey;
            var v = this.text.value.split("|");
            var key = v.length > 1 ? "|" + v[1] : "";
            v = HC.capitalizePageNames ? capitalize(v[0]) : v[0];
            var vNormalized = v;
            var knownToExist = titles && titles.exists;
            var i;
            if (titles) {
                if (titles.normalized && v.indexOf(queryKey) === 0) {
                    vNormalized = titles.normalized + v.substring(queryKey.length);
                }
                var vLow = vNormalized.toLowerCase();
                if (HC.blacklist) {
                    for (i = 0; i < titles.length; i++) {
                        if (HC.blacklist.test(titles[i])) {
                            titles.splice(i, 1);
                            i--;
                        }
                    }
                }
                titles.sort(function (a, b) {
                    if (a === b) return 0;
                    if (a.indexOf(b) === 0) return 1;
                    if (b.indexOf(a) === 0) return -1;
                    var prefixMatchA = a.indexOf(vNormalized) === 0 ? 1 : 0;
                    var prefixMatchB = b.indexOf(vNormalized) === 0 ? 1 : 0;
                    if (prefixMatchA !== prefixMatchB) return prefixMatchB - prefixMatchA;
                    var aLow = a.toLowerCase(),
                        bLow = b.toLowerCase();
                    prefixMatchA = aLow.indexOf(vLow) === 0 ? 1 : 0;
                    prefixMatchB = bLow.indexOf(vLow) === 0 ? 1 : 0;
                    if (prefixMatchA !== prefixMatchB) return prefixMatchB - prefixMatchA;
                    if (a < b) return -1;
                    if (b < a) return 1;
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
                if (this.list) this.list.style.display = "none";
                if (this.engineSelector) this.engineSelector.style.display = "none";
                if (engineName && suggestionConfigs[engineName] && !suggestionConfigs[engineName].temp) {
                    if (this.icon) this.icon.src = HC.existsNo;
                    this.inputExists = false;
                }
                return;
            }
            var firstTitle = titles[0];
            var completed = this.autoComplete(firstTitle, v, vNormalized, key, dontAutocomplete);
            var existing = completed || knownToExist || firstTitle === replaceShortcuts(v, HC.shortcuts);
            if (engineName && suggestionConfigs[engineName] && !suggestionConfigs[engineName].temp) {
                this.icon.src = existing ? HC.existsYes : HC.existsNo;
                this.inputExists = existing;
            }
            if (completed) {
                this.lastInput = firstTitle;
                if (titles.length === 1) {
                    this.list.style.display = "none";
                    if (this.engineSelector) this.engineSelector.style.display = "none";
                    return;
                }
            }
            while (this.list.firstChild) this.list.removeChild(this.list.firstChild);
            for (i = 0; i < titles.length; i++) {
                var opt = make("option");
                opt.appendChild(make(titles[i], true));
                opt.selected = completed && i === 0;
                this.list.appendChild(opt);
            }
            this.displayList();
        },
        displayList: function () {
            this.showsList = true;
            if (!this.is_active) {
                this.list.style.display = "none";
                if (this.engineSelector) this.engineSelector.style.display = "none";
                return;
            }
            var nofItems = this.list.options.length > HC.listSize ? HC.listSize : this.list.options.length;
            if (nofItems <= 1) nofItems = 2;
            this.list.size = nofItems;
            this.list.style.align = is_rtl ? "right" : "left";
            this.list.style.zIndex = 5;
            this.list.style.position = "absolute";
            var anchor = is_rtl ? "right" : "left";
            var listh = 0;
            if (this.list.style.display === "none") {
                this.list.style.top = this.text.offsetTop + "px";
                this.list.style[anchor] = "-10000px";
                this.list.style.display = "";
                listh = this.list.offsetHeight;
                this.list.style.display = "none";
            } else {
                listh = this.list.offsetHeight;
            }
            var maxListHeight = listh;
            if (nofItems < HC.listSize) maxListHeight = listh / nofItems * HC.listSize;
            function viewport(what) {
                if (is_webkit && !document.evaluate) {
                    return window["inner" + what];
                }
                var s = "client" + what;
                if (window.opera) return document.body[s];
                return (document.documentElement ? document.documentElement[s] : 0) || document.body[s] || 0;
            }
            function scroll_offset(what) {
                var s = "scroll" + what;
                var result = (document.documentElement ? document.documentElement[s] : 0) || document.body[s] || 0;
                if (is_rtl && what === "Left") {
                    if (result < 0) result = -result;
                    if (!is_webkit) result = scroll_offset("Width") - viewport("Width") - result;
                }
                return result;
            }
            function position(node) {
                if (node.getBoundingClientRect) {
                    var box = node.getBoundingClientRect();
                    return {
                        x: Math.round(box.left + scroll_offset("Left")),
                        y: Math.round(box.top + scroll_offset("Top"))
                    };
                }
                var t = 0,
                    l = 0;
                do {
                    t += node.offsetTop || 0;
                    l += node.offsetLeft || 0;
                    node = node.offsetParent;
                } while (node);
                return {
                    x: l,
                    y: t
                };
            }
            var textPos = position(this.text),
                nl = 0,
                nt = 0,
                offset = 0,
                textBoxWidth = this.text.offsetWidth || this.text.clientWidth;
            if (this.engineName) {
                this.engineSelector.style.zIndex = 5;
                this.engineSelector.style.position = "absolute";
                this.engineSelector.style.width = textBoxWidth + "px";
                if (this.engineSelector.style.display === "none") {
                    this.engineSelector.style[anchor] = "-10000px";
                    this.engineSelector.style.top = "0";
                    this.engineSelector.style.display = "";
                    offset = this.engineSelector.offsetHeight;
                    this.engineSelector.style.display = "none";
                } else {
                    offset = this.engineSelector.offsetHeight;
                }
                this.engineSelector.style[anchor] = nl + "px";
            }
            if (textPos.y < maxListHeight + offset + 1) {
                nt = this.text.offsetHeight + offset + 1;
                if (this.engineName) this.engineSelector.style.top = this.text.offsetHeight + "px";
            } else {
                nt = -listh - offset - 1;
                if (this.engineName) this.engineSelector.style.top = -(offset + 1) + "px";
            }
            this.list.style.top = nt + "px";
            this.list.style.width = "";
            this.list.style[anchor] = nl + "px";
            if (this.engineName) {
                this.selectEngine(this.engineName);
                this.engineSelector.style.display = "";
            }
            this.list.style.display = "block";
            if (this.list.offsetWidth < textBoxWidth) {
                this.list.style.width = textBoxWidth + "px";
                return;
            }
            var scroll = scroll_offset("Left");
            var view_w = viewport("Width");
            var w = this.list.offsetWidth;
            var l_pos = position(this.list);
            var left = l_pos.x;
            var right = left + w;
            if (left < scroll || right > scroll + view_w) {
                if (w > view_w) {
                    w = view_w;
                    this.list.style.width = w + "px";
                    if (is_rtl) left = right - w;
                    else right = left + w;
                }
                var relative_offset = 0;
                if (left < scroll) relative_offset = scroll - left;
                else if (right > scroll + view_w) relative_offset = -(right - scroll - view_w);
                if (is_rtl) relative_offset = -relative_offset;
                if (relative_offset) this.list.style[anchor] = nl + relative_offset + "px";
            }
        },
        autoComplete: function (newVal, actVal, normalizedActVal, key, dontModify) {
            if (newVal === actVal) return true;
            if (dontModify || this.ime || !this.canSelect()) return false;
            if (newVal.indexOf(actVal)) {
                if (normalizedActVal && newVal.indexOf(normalizedActVal) === 0) {
                    if (this.lastRealInput === actVal) this.lastRealInput = normalizedActVal;
                    actVal = normalizedActVal;
                } else {
                    return false;
                }
            }
            this.text.focus();
            this.text.value = newVal + key;
            this.setSelection(actVal.length, newVal.length);
            return true;
        },
        canSelect: function () {
            return this.text.setSelectionRange || this.text.createTextRange || this.text.selectionStart !== undefined && this.text.selectionEnd !== undefined;
        },
        setSelection: function (from, to) {
            if (!this.text.value) return;
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
                var new_selection = this.text.createTextRange();
                new_selection.move("character", from);
                new_selection.moveEnd("character", to - from);
                new_selection.select();
            }
        },
        getSelection: function () {
            var from = 0,
                to = 0;
            if (!this.text.value) { } else if (this.text.selectionStart !== undefined) {
                from = this.text.selectionStart;
                to = this.text.selectionEnd;
            } else if (document.selection && document.selection.createRange) {
                var rng = document.selection.createRange().duplicate();
                if (rng.parentElement() === this.text) {
                    try {
                        var textRng = this.text.createTextRange();
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
                end: to
            };
        },
        saveView: function () {
            this.lastSelection = this.getSelection();
        },
        processKey: function (evt) {
            var dir = 0;
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
        },
        highlightSuggestion: function (dir) {
            if (noSuggestions || !this.list || this.list.style.display === "none") return false;
            var curr = this.list.selectedIndex;
            var tgt = -1;
            if (dir === 0) {
                if (curr < 0 || curr >= this.list.options.length) return false;
                tgt = curr;
            } else {
                tgt = curr < 0 ? 0 : curr + dir;
                tgt = tgt < 0 ? 0 : tgt;
                if (tgt >= this.list.options.length) tgt = this.list.options.length - 1;
            }
            if (tgt !== curr || dir === 0) {
                if (curr >= 0 && curr < this.list.options.length && dir !== 0) this.list.options[curr].selected = false;
                this.list.options[tgt].selected = true;
                var v = this.text.value.split("|");
                var key = v.length > 1 ? "|" + v[1] : "";
                var completed = this.autoComplete(this.list.options[tgt].text, this.lastRealInput, null, key, false);
                if (!completed || this.list.options[tgt].text === this.lastRealInput) {
                    this.text.value = this.list.options[tgt].text + key;
                    if (this.canSelect()) this.setSelection(this.list.options[tgt].text.length, this.list.options[tgt].text.length);
                }
                this.lastInput = this.list.options[tgt].text;
                this.inputExists = true;
                if (this.icon) this.icon.src = HC.existsYes;
                this.state = CategoryEditor.CHANGE_PENDING;
            }
            return true;
        },
        resetKeySelection: function () {
            if (noSuggestions || !this.list || this.list.style.display === "none") return false;
            var curr = this.list.selectedIndex;
            if (curr >= 0 && curr < this.list.options.length) {
                this.list.options[curr].selected = false;
                var v = this.text.value.split("|");
                var key = v.length > 1 ? "|" + v[1] : "";
                var result = v[0] !== this.lastInput;
                if (v[0] !== this.lastRealInput) {
                    this.text.value = this.lastRealInput + key;
                    result = true;
                }
                this.lastInput = this.lastRealInput;
                return result;
            }
            return false;
        }
    };
    function initialize() {
        var config = window.JSconfig !== undefined && JSconfig.keys ? JSconfig.keys : {};
        HC.dont_add_to_watchlist = window.hotcat_dont_add_to_watchlist !== undefined ? !!window.hotcat_dont_add_to_watchlist : config.HotCatDontAddToWatchlist !== undefined ? config.HotCatDontAddToWatchlist : HC.dont_add_to_watchlist;
        HC.no_autocommit = window.hotcat_no_autocommit !== undefined ? !!window.hotcat_no_autocommit : config.HotCatNoAutoCommit !== undefined ? config.HotCatNoAutoCommit : conf.wgNamespaceNumber % 2 ? true : HC.no_autocommit;
        HC.del_needs_diff = window.hotcat_del_needs_diff !== undefined ? !!window.hotcat_del_needs_diff : config.HotCatDelNeedsDiff !== undefined ? config.HotCatDelNeedsDiff : HC.del_needs_diff;
        HC.suggest_delay = window.hotcat_suggestion_delay || config.HotCatSuggestionDelay || HC.suggest_delay;
        HC.editbox_width = window.hotcat_editbox_width || config.HotCatEditBoxWidth || HC.editbox_width;
        HC.suggestions = window.hotcat_suggestions || config.HotCatSuggestions || HC.suggestions;
        if (typeof HC.suggestions !== "string" || !suggestionConfigs[HC.suggestions]) HC.suggestions = "combined";
        HC.fixed_search = window.hotcat_suggestions_fixed !== undefined ? !!window.hotcat_suggestions_fixed : config.HotCatFixedSuggestions !== undefined ? config.HotCatFixedSuggestions : HC.fixed_search;
        HC.single_minor = window.hotcat_single_changes_are_minor !== undefined ? !!window.hotcat_single_changes_are_minor : config.HotCatMinorSingleChanges !== undefined ? config.HotCatMinorSingleChanges : HC.single_minor;
        HC.bg_changed = window.hotcat_changed_background || config.HotCatChangedBackground || HC.bg_changed;
        HC.use_up_down = window.hotcat_use_category_links !== undefined ? !!window.hotcat_use_category_links : config.HotCatUseCategoryLinks !== undefined ? config.HotCatUseCategoryLinks : HC.use_up_down;
        HC.listSize = window.hotcat_list_size || config.HotCatListSize || HC.listSize;
        if (conf.wgDBname !== "commonswiki") HC.changeTag = config.HotCatChangeTag || "";
        if (HC.changeTag) {
            var eForm = document.editform,
                catRegExp = new RegExp("^\\[\\[(" + HC.category_regexp + "):"),
                oldTxt;
            var isMinorChange = function () {
                var newTxt = eForm.wpTextbox1;
                if (!newTxt) return;
                newTxt = newTxt.value;
                var oldLines = oldTxt.match(/^.*$/gm),
                    newLines = newTxt.match(/^.*$/gm),
                    cArr;
                var except = function (aArr, bArr) {
                    var result = [],
                        lArr, sArr;
                    if (aArr.length < bArr.length) {
                        lArr = bArr;
                        sArr = aArr;
                    } else {
                        lArr = aArr;
                        sArr = bArr;
                    }
                    for (var i = 0; i < lArr.length; i++) {
                        var item = lArr[i];
                        var ind = $.inArray(item, sArr);
                        if (ind === -1) result.push(item);
                        else sArr.splice(ind, 1);
                    }
                    return result.concat(sArr);
                };
                cArr = except(oldLines, newLines);
                if (cArr.length) {
                    cArr = $.grep(cArr, function (c) {
                        c = $.trim(c);
                        return c && !catRegExp.test(c);
                    });
                }
                if (!cArr.length) {
                    oldTxt = newTxt;
                    return true;
                }
            };
            if (conf.wgAction === "submit" && conf.wgArticleId && eForm && eForm.wpSummary && document.getElementById("wikiDiff")) {
                var sum = eForm.wpSummary,
                    sumA = eForm.wpAutoSummary;
                if (sum.value && sumA.value === HC.changeTag) {
                    sumA.value = sumA.value.replace(HC.changeTag, "d41d8cd98f00b204e9800998ecf8427e");
                    var $ct = $('<input type="hidden" name="wpChangeTags">').val(HC.changeTag);
                    $(eForm).append($ct);
                    oldTxt = eForm.wpTextbox1.value;
                    $("#wpSave").one("click", function () {
                        if ($ct.val()) sum.value = sum.value.replace(HC.messages.using || HC.messages.prefix, "");
                    });
                    var removeChangeTag = function () {
                        $(eForm.wpTextbox1).add(sum).one("input", function () {
                            window.setTimeout(function () {
                                if (!isMinorChange()) $ct.val("");
                                else removeChangeTag();
                            }, 500);
                        });
                    };
                    removeChangeTag();
                }
            }
        }
        HC.listSize = parseInt(HC.listSize, 10);
        if (isNaN(HC.listSize) || HC.listSize < 5) HC.listSize = 5;
        HC.listSize = Math.min(HC.listSize, 30);
        if (HC.engine_names) {
            for (var key in HC.engine_names)
                if (suggestionConfigs[key] && HC.engine_names[key]) suggestionConfigs[key].name = HC.engine_names[key];
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
        var container = null;
        switch (mw.config.get("skin")) {
            case "cologneblue":
                container = document.getElementById("quickbar");
            case "standard":
            case "nostalgia":
                if (!container) container = document.getElementById("topbar");
                var lks = container.getElementsByTagName("a");
                for (var i = 0; i < lks.length; i++) {
                    if (param("title", lks[i].href) === conf.wgPageName && param("action", lks[i].href) === "edit") {
                        return true;
                    }
                }
                return false;
            default:
                return document.getElementById("ca-edit") !== null;
        }
    }
    function closeForm() {
        for (var i = 0; i < editors.length; i++) {
            var edit = editors[i];
            if (edit.state === CategoryEditor.OPEN) {
                edit.cancel();
            } else if (edit.state === CategoryEditor.CHANGE_PENDING) {
                edit.sanitizeInput();
                var value = edit.text.value.split("|");
                var key = null;
                if (value.length > 1) key = value[1];
                var v = value[0].replace(/_/g, " ").replace(/^\s+|\s+$/g, "");
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
        var ip = document.getElementById("mw-htmlform-description") || document.getElementById("wpDestFile");
        if (!ip) {
            ip = document.getElementById("wpDestFile");
            while (ip && ip.nodeName.toLowerCase() !== "table") ip = ip.parentNode;
        }
        if (!ip) return;
        var reupload = document.getElementById("wpForReUpload");
        var destFile = document.getElementById("wpDestFile");
        if (reupload && !!reupload.value || destFile && (destFile.disabled || destFile.readOnly)) {
            return;
        }
        var labelCell = make("td");
        var lineCell = make("td");
        catLine = make("div");
        catLine.className = "catlinks";
        catLine.id = "catlinks";
        catLine.style.textAlign = is_rtl ? "right" : "left";
        catLine.style.margin = "0";
        catLine.style.border = "none";
        lineCell.appendChild(catLine);
        var label = null;
        if (window.UFUI && window.UIElements && UFUI.getLabel instanceof Function) {
            try {
                label = UFUI.getLabel("wpCategoriesUploadLbl");
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
        var form = document.getElementById("upload") || document.getElementById("mw-upload-form");
        if (form) {
            var newRow = ip.insertRow(-1);
            newRow.appendChild(labelCell);
            newRow.appendChild(lineCell);
            form.onsubmit = function (oldSubmit) {
                return function () {
                    var do_submit = true;
                    if (oldSubmit) {
                        if (typeof oldSubmit === "string") {
                            do_submit = eval(oldSubmit);
                        } else if (oldSubmit instanceof Function) {
                            do_submit = oldSubmit.apply(form, arguments);
                        }
                    }
                    if (!do_submit) return false;
                    closeForm();
                    var eb = document.getElementById("wpUploadDescription") || document.getElementById("wpDesc");
                    var addedOne = false;
                    for (var i = 0; i < editors.length; i++) {
                        var t = editors[i].currentCategory;
                        if (!t) continue;
                        var key = editors[i].currentKey;
                        var new_cat = "[[" + HC.category_canonical + ":" + t + (key ? "|" + key : "") + "]]";
                        var cleanedText = eb.value.replace(/<!--(\s|\S)*?-->/g, "").replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, "");
                        if (!find_category(cleanedText, t, true)) {
                            eb.value += "\n" + new_cat;
                            addedOne = true;
                        }
                    }
                    if (addedOne) {
                        eb.value = eb.value.replace(/\{\{subst:unc\}\}/g, "");
                    }
                    return true;
                };
            }(form.onsubmit);
        }
    }
    var cleanedText = null;
    function getTitle(span) {
        if (span.firstChild.nodeType !== Node.ELEMENT_NODE) return null;
        var catTitle = title(span.firstChild.getAttribute("href"));
        if (!catTitle) return null;
        catTitle = catTitle.substr(catTitle.indexOf(":") + 1).replace(/_/g, " ");
        if (HC.blacklist && HC.blacklist.test(catTitle)) return null;
        return catTitle;
    }
    function isOnPage(span) {
        var catTitle = getTitle(span);
        var result = {
            title: catTitle,
            match: ["", "", ""]
        };
        if (pageText === null) return result;
        if (cleanedText === null) {
            cleanedText = pageText.replace(/<!--(\s|\S)*?-->/g, "").replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, "");
        }
        result.match = find_category(cleanedText, catTitle, true);
        return result;
    }
    var initialized = false;
    var setupTimeout = null;
    function findByClass(scope, tag, className) {
        var result = $(scope).find(tag + "." + className);
        return result && result.length ? result[0] : null;
    }
    function list_categorys() {
        if (pageText === null) return [];
         if (cleanedText === null) {
            cleanedText = pageText.replace( /<!--(\s|\S)*?-->/g, '' ).replace( /<nowiki>(\s|\S)*?<\/nowiki>/g, '' );
        }        
        var cat_regex = new RegExp("\\[\\[" + wikiTextBlankOrBidi + "(" + HC.category_regexp + ")" + wikiTextBlankOrBidi + ":" + wikiTextBlankOrBidi + "([^\\[\\]]+?)" + wikiTextBlankOrBidi + "(\\|.*?)?\\]\\]", "g");
 
        var result = [];
        var curr_match = null;
        while ( ( curr_match = cat_regex.exec( cleanedText ) ) !== null ) {
            result.push( {
                match: curr_match
            } );
        }
        result.re = cat_regex;
        return result; // An array containing all matches, with positions, in result[ i ].match
    }
    function setup(additionalWork) {
        if (initialized) return;
        initialized = true;
        if (setupTimeout) {
            window.clearTimeout(setupTimeout);
            setupTimeout = null;
        }
        catLine = catLine || document.getElementById("mw-normal-catlinks");
        var hiddenCats = document.getElementById("mw-hidden-catlinks");
        if (!catLine) {
            var footer = null;
            if (!hiddenCats) {
                footer = findByClass(document, "div", "printfooter");
                if (!footer) return;
            }
            catLine = make("div");
            catLine.id = "mw-normal-catlinks";
            catLine.style.textAlign = is_rtl ? "right" : "left";
            var label = make("a");
            label.href = conf.wgArticlePath.replace("$1", "Special:Categories");
            label.title = HC.categories;
            label.appendChild(make(HC.categories, true));
            catLine.appendChild(label);
            catLine.appendChild(make(":", true));
            var container = hiddenCats ? hiddenCats.parentNode : document.getElementById("catlinks");
            if (!container) {
                container = make("div");
                container.id = "catlinks";
                footer.parentNode.insertBefore(container, footer.nextSibling);
            }
            container.className = "catlinks noprint";
            container.style.display = "";
            if (!hiddenCats) container.appendChild(catLine);
            else container.insertBefore(catLine, hiddenCats);
        }
        if (is_rtl) catLine.dir = "rtl";
        var chkCats = [], inpIndex = {};
        function createEditors(line, is_hidden, has_hidden) {
            var i;
            var cats = line.getElementsByTagName("li");
            if (cats.length) {
                newDOM = true;
                line = cats[0].parentNode;
            } else {
                cats = line.getElementsByTagName("span");
            }
            var copyCats = Array.from({ length: cats.length });
            var idxCopys = {};
            var sTitle = null;
            for (i = 0; i < cats.length; i++) {
                copyCats[i] = cats[i];
                sTitle = getTitle(copyCats[i]);
                if (sTitle) idxCopys[sTitle] = i;
            }
            var inpageCats = list_categorys();
            for (i = 0; i < inpageCats.length; i++) {
                var normalized = inpageCats[i].match[2].replace(wikiTextBlankRE, " ");
                if (HC.capitalizePageNames) {
                    normalized = normalized.substr(0, 1).toUpperCase() + normalized.substr(1);
                }
                if (normalized in idxCopys && line) {
                    new CategoryEditor(line, copyCats[idxCopys[normalized]], inpageCats[i].match[2], inpageCats[i].match[3], is_hidden);
                    if (is_hidden && normalized in inpIndex) {
                        chkCats.splice(chkCats.indexOf(HC.category_canonical + ":" + normalized), 1);
                        delete inpIndex[normalized];
                    }
                } else if (!is_hidden && line) {
                    chkCats.push(HC.category_canonical + ":" + normalized);
                    inpIndex[normalized] = i;
                }
            }
            if (chkCats.length && (!is_hidden && !has_hidden || is_hidden)) {
                var arg_titles = chkCats.join("|");
                $.getJSON(conf.wgServer + conf.wgScriptPath + "/api.php?action=query&format=json&titles=" + encodeURIComponent(arg_titles) + "&redirects=1&converttitles=1", function(json) {
                    var converted = json.query.converted;
                    if (!converted || converted.length < chkCats.length) console.log(arg_titles);
                    if (!converted) converted = [];
                    for (i = 0; i < converted.length; i++) {
                        var sTitle = converted[i].to.replace(HC.category_canonical + ":", "");
                        var sOrginal = inpIndex[converted[i].from.replace(HC.category_canonical + ":", "")];
                        if (sTitle in idxCopys && line) {
                            // eslint-disable-next-line no-new
                            new CategoryEditor(line, copyCats[idxCopys[sTitle]], [ inpageCats[sOrginal].match[2], sTitle ], inpageCats[sOrginal].match[3], is_hidden);
                        } else {
                            console.log(sTitle);
                        }
                    }
                });
            }
            return copyCats.length ? copyCats[copyCats.length - 1] : null;
        }
        var lastSpan = createEditors(catLine, false, !!hiddenCats);
        new CategoryEditor(newDOM ? catLine.getElementsByTagName("ul")[0] : catLine, null, null, lastSpan !== null, false);
        if (!onUpload) {
            if (pageText !== null && hiddenCats) {
                if (is_rtl) hiddenCats.dir = "rtl";
                createEditors(hiddenCats, true, true);
            }
            var enableMulti = make("span");
            enableMulti.className = "noprint";
            if (is_rtl) enableMulti.dir = "rtl";
            catLine.insertBefore(enableMulti, catLine.firstChild.nextSibling);
            enableMulti.appendChild(make(" ", true));
            multiSpan = make("span");
            enableMulti.appendChild(multiSpan);
            multiSpan.innerHTML = "(<a>" + HC.addmulti + "</a>)";
            var lk = multiSpan.getElementsByTagName("a")[0];
            lk.onclick = function (evt) {
                setMultiInput();
                checkMultiInput();
                return evtKill(evt);
            };
            lk.title = HC.multi_tooltip;
            lk.style.cursor = "pointer";
        }
        cleanedText = null;
        if (additionalWork instanceof Function) additionalWork();
        mw.hook("hotcat.ready").fire();
        $("body").trigger("hotcatSetupCompleted");
    }
    function createCommitForm() {
        if (commitForm) return;
        var formContainer = make("div");
        formContainer.style.display = "none";
        document.body.appendChild(formContainer);
        formContainer.innerHTML = '<form id="hotcatCommitForm" method="post" enctype="multipart/form-data" action="' + conf.wgScript + "?title=" + encodeURIComponent(conf.wgPageName) + '&action=submit">' + '<input type="hidden" name="wpTextbox1">' + '<input type="hidden" name="model" value="' + conf.wgPageContentModel + '">' + '<input type="hidden" name="format" value="text/x-wiki">' + '<input type="hidden" name="wpSummary" value="">' + '<input type="checkbox" name="wpMinoredit" value="1">' + '<input type="checkbox" name="wpWatchthis" value="1">' + '<input type="hidden" name="wpAutoSummary" value="d41d8cd98f00b204e9800998ecf8427e">' + '<input type="hidden" name="wpEdittime">' + '<input type="hidden" name="wpStarttime">' + '<input type="hidden" name="wpDiff" value="wpDiff">' + '<input type="hidden" name="oldid" value="0">' + '<input type="submit" name="hcCommit" value="hcCommit">' + '<input type="hidden" name="wpEditToken">' + '<input type="hidden" name="wpUltimateParam" value="1">' + '<input type="hidden" name="wpChangeTags">' + '<input type="hidden" value="ℳ𝒲♥𝓊𝓃𝒾𝒸ℴ𝒹ℯ" name="wpUnicodeCheck">' + "</form>";
        commitForm = document.getElementById("hotcatCommitForm");
    }
    function getPage() {
        if (!conf.wgArticleId) {
            if (conf.wgNamespaceNumber === 2) return;
            pageText = "";
            pageTime = null;
            setup(createCommitForm);
        } else {
            var url = conf.wgServer + conf.wgScriptPath + "/api.php?format=json&callback=HotCat.start&action=query&rawcontinue=&titles=" + encodeURIComponent(conf.wgPageName) + "&prop=info%7Crevisions&rvprop=content%7Ctimestamp%7Cids&meta=siteinfo&rvlimit=1&rvstartid=" + conf.wgCurRevisionId;
            var s = make("script");
            s.src = url;
            HC.start = function (json) {
                setPage(json);
                setup(createCommitForm);
            };
            document.getElementsByTagName("head")[0].appendChild(s);
            setupTimeout = window.setTimeout(function () {
                setup(createCommitForm);
            }, 4e3);
        }
    }
    function setState(state) {
        var cats = state.split("\n");
        if (!cats.length) return null;
        if (initialized && editors.length === 1 && editors[0].isAddCategory) {
            var newSpans = [];
            var before = editors.length === 1 ? editors[0].span : null;
            var i;
            for (i = 0; i < cats.length; i++) {
                if (!cats[i].length) continue;
                var cat = cats[i].split("|");
                var key = cat.length > 1 ? cat[1] : null;
                cat = cat[0];
                var lk = make("a");
                lk.href = wikiPagePath(HC.category_canonical + ":" + cat);
                lk.appendChild(make(cat, true));
                lk.title = cat;
                var span = make("span");
                span.appendChild(lk);
                if (!i) catLine.insertBefore(make(" ", true), before);
                catLine.insertBefore(span, before);
                if (before && i + 1 < cats.length) parent.insertBefore(make(" | ", true), before);
                newSpans.push({
                    element: span,
                    title: cat,
                    key: key
                });
            }
            if (before) before.parentNode.insertBefore(make(" | ", true), before);
            for (i = 0; i < newSpans.length; i++) {
                new CategoryEditor(catLine, newSpans[i].element, newSpans[i].title, newSpans[i].key);
            }
        }
        return null;
    }
    function getState() {
        var result = null;
        for (var i = 0; i < editors.length; i++) {
            var text = editors[i].currentCategory;
            var key = editors[i].currentKey;
            if (text && text.length) {
                if (key !== null) text += "|" + key;
                if (result === null) result = text;
                else result += "\n" + text;
            }
        }
        return result;
    }
    function really_run() {
        initialize();
        if (!HC.upload_disabled && conf.wgNamespaceNumber === -1 && conf.wgCanonicalSpecialPageName === "Upload" && conf.wgUserName) {
            setup_upload();
            setup(function () {
                if (window.UploadForm && UploadForm.previous_hotcat_state) UploadForm.previous_hotcat_state = setState(UploadForm.previous_hotcat_state);
            });
        } else {
            if (!conf.wgIsArticle || conf.wgAction !== "view" || param("diff") !== null || param("oldid") !== null || !can_edit() || HC.disable()) return;
            getPage();
        }
    }
    function run() {
        if (HC.started) return;
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
        mw.hook("postEdit").add(function () {
            catLine = null;
            editors = [];
            initialized = false;
            HC.started = false;
            run();
        });
    }
    $.when(mw.loader.using("user"), $.ready).always(run);
})(jQuery, mediaWiki);
//</nowiki>