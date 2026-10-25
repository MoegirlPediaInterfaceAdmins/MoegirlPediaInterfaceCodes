/**
 * 本文件由 packages/HotCat 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key != "symbol" ? key + "" : key, value);

// packages/HotCat/src/runtime.ts
var site = {
  conf: {},
  expandedScriptPrefix: "",
  expandedArticlePrefix: "",
  skin: "",
  isWebkit: !1
}, state = {
  cat_prefix: null,
  noSuggestions: !1,
  interlanguageRE: null,
  catLine: null,
  onUpload: !1,
  editors: [],
  commitButton: null,
  commitForm: null,
  multiSpan: null,
  pageText: null,
  pageTime: null,
  pageWatched: !1,
  watchCreate: !1,
  watchCreateExpiry: "",
  watchEdit: !1,
  watchDefaultExpiry: "",
  minorEdits: !1,
  editToken: null,
  is_rtl: !1,
  serverTime: null,
  lastRevId: null,
  pageTextRevId: null,
  conflictingUser: null,
  newDOM: !1,
  saveInProgress: !1,
  initialized: !1,
  setupTimeout: null,
  cleanedText: null
};

// packages/HotCat/src/config/hotcat.ts
var HC = {
  messages: {
    cat_removed: "移除[[分类:$1]]",
    template_removed: "移除{{[[分类:$1]]}}",
    cat_added: "添加[[分类:$1]]",
    cat_keychange: "为[[分类:$1]]设定新索引：“$2”",
    cat_notFound: "分类“$1”未找到",
    cat_exists: "分类“$1”已存在，不执行添加操作",
    cat_resolved: "（已处理[[分类:$1]]的重定向）",
    separator: "; ",
    prefix: "",
    using: "——[[Help:HotCat小工具|HotCat]]",
    multi_change: "$1个分类",
    commit: "保存",
    ok: "确定",
    cancel: "取消",
    multi_error: "无法连接到萌百服务器，因此您的分类更改无法保存，由此引发的不便我们深表歉意。",
    short_catchange: null
  },
  categories: "分类",
  disambig_category: "消歧义页",
  redir_category: "分类重定向",
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
    change: "修改",
    remove: "移除",
    add: "新增一个分类",
    restore: "回退更改",
    undo: "回退更改",
    down: "打开以便修改并显示子分类",
    up: "打开以便修改并显示父分类"
  },
  addmulti: "<span>+<sup>+</sup></span>",
  multi_tooltip: "修改多个分类",
  isSupportedContentModel: () => HC.wikitextContentModels.includes(site.conf.wgPageContentModel),
  disable: () => {
    let ns = site.conf.wgNamespaceNumber, nsIds = site.conf.wgNamespaceIds;
    return ns < 0 || ns === nsIds.template || ns === nsIds.module || ns === nsIds.mediawiki || ns === nsIds.file && !site.conf.wgArticleId || ns === nsIds.creator || ns === nsIds.timedtext || ns === nsIds.institution || ns === nsIds.user && /\.(js|css|json)$/.test(site.conf.wgTitle);
  },
  wikitextContentModels: ["wikitext"],
  existsYes: "https://storage.moegirl.org.cn/moegirl/commons/b/be/P_yes.svg",
  existsNo: "https://storage.moegirl.org.cn/moegirl/commons/4/42/P_no.svg",
  template_categories: {},
  engine_names: {
    searchindex: "搜索索引",
    pagelist: "页面列表",
    combined: "合并搜索",
    subcat: "子分类",
    parentcat: "父分类"
  },
  capitalizePageNames: null,
  upload_disabled: !1,
  blacklist: /(?:不可|已)索引页面|(?:调用重复模板参数|有(?:过多高开销解析器函数调用|忽略显示标题|模板循环|脚本错误|投票|参考文献错误)|含有(?:略过模板参数|受损文件链接)|展开模板后长度超过上限|扩展深度超出限制|使用无效自封闭HTML标签|受到保护无法编辑|即将删除)的页面|有错误的Scribunto模块|隐藏分类|页面的节点数超出限制|需要帮助/i,
  bg_changed: "#FCA",
  no_autocommit: !0,
  del_needs_diff: !0,
  suggest_delay: 100,
  editbox_width: 40,
  suggestions: "combined",
  fixed_search: !1,
  use_up_down: !0,
  listSize: 5,
  single_minor: !0,
  dont_add_to_watchlist: !1,
  shortcuts: null,
  addShortcuts: (map) => {
    if (!map)
      return;
    let hotCat = window.HotCat;
    hotCat.shortcuts || (hotCat.shortcuts = {});
    for (let rawKey in map) {
      if (!Object.prototype.hasOwnProperty.bind(map)(rawKey))
        continue;
      let rawValue = map[rawKey];
      if (typeof rawValue != "string")
        continue;
      let k = rawKey.replace(/^\s+|\s+$/g, ""), v = rawValue.replace(/^\s+|\s+$/g, "");
      !k.length || !v.length || (hotCat.shortcuts[k] = v);
    }
  },
  // 本地化阶段写入
  category_canonical: "",
  category_regexp: "",
  template_regexp: ""
};

// packages/HotCat/src/config/i18n.ts
var hant = {
  messages: {
    cat_removed: "移除[[分類:$1]]",
    template_removed: "移除{{[[分類:$1]]}}",
    cat_added: "添加[[分類:$1]]",
    cat_keychange: "為[[分類:$1]]設定新索引：“$2”",
    cat_notFound: "分類“$1”未找到",
    cat_exists: "分類“$1”已存在，不執行添加操作",
    cat_resolved: "（已處理[[分類:$1]]的重定向）",
    separator: "; ",
    prefix: "",
    using: "——[[Help:HotCat小工具|HotCat]]",
    multi_change: "$1個分類",
    commit: "儲存",
    ok: "確定",
    cancel: "取消",
    multi_error: "無法連接到萌百伺服器，因此您的分類變更無法保存，由此引發的不便我們深表歉意。",
    short_catchange: null
  },
  categories: "分類",
  disambig_category: "消歧義頁",
  redir_category: "分類重定向",
  tooltips: {
    change: "修改",
    remove: "移除",
    add: "新增一個分類",
    restore: "回退變更",
    undo: "回退變更",
    down: "打開以便修改並顯示子分類",
    up: "打開以便修改並顯示父分類"
  },
  engine_names: {
    searchindex: "搜尋索引",
    pagelist: "頁面列表",
    combined: "合併搜尋",
    subcat: "子分類",
    parentcat: "父分類"
  },
  multi_tooltip: "修改多個分類"
}, applyLocalization = () => {
  /^zh-(hant|hk|mo|tw)/i.test(site.conf.wgUserLanguage) && $.extend(HC, hant, !0);
};

// packages/HotCat/src/wikitext/patterns.ts
var wikiTextBlank = "[\\t _\\xA0\\u1680\\u180E\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]+", wikiTextBlankRE = new RegExp(wikiTextBlank, "g"), wikiTextBlankOrBidi = "[\\t _\\xA0\\u1680\\u180E\\u2000-\\u200B\\u200E\\u200F\\u2028-\\u202F\\u205F\\u3000]*", autoLocalize = (namespaceNumber, _fallback) => {
  let formattedNamespaces = site.conf.wgFormattedNamespaces, namespaceIds = site.conf.wgNamespaceIds, fallback = _fallback, createRegexpStr = (name) => {
    if (!name || !name.length)
      return "";
    let regex_name = "";
    for (let i = 0; i < name.length; i++) {
      let initial = name.charAt(i), ll = initial.toLowerCase(), ul = initial.toUpperCase();
      ll === ul ? regex_name += initial : regex_name += `[${ll}${ul}]`;
    }
    return regex_name.replace(/([\\^$.?*+()])/g, "\\$1").replace(wikiTextBlankRE, wikiTextBlank);
  };
  fallback = fallback.toLowerCase();
  let canonical = formattedNamespaces[`${namespaceNumber}`].toLowerCase(), regexp = createRegexpStr(canonical);
  fallback && canonical !== fallback && (regexp += `|${createRegexpStr(fallback)}`);
  for (let cat_name in namespaceIds)
    cat_name.toLowerCase() !== canonical && cat_name.toLowerCase() !== fallback && namespaceIds[cat_name] === namespaceNumber && (regexp += `|${createRegexpStr(cat_name)}`);
  return regexp;
}, findCatsRE, initLocalization = () => {
  let formattedNamespaces = site.conf.wgFormattedNamespaces;
  HC.category_canonical = formattedNamespaces[14], HC.category_regexp = autoLocalize(14, "category"), formattedNamespaces[10] && (HC.template_regexp = autoLocalize(10, "template")), findCatsRE = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(?:${HC.category_regexp})${wikiTextBlankOrBidi}:[^\\]]+\\]\\]`, "g");
}, replaceByBlanks = (match) => match.replace(/(\s|\S)/g, " ");

// packages/HotCat/src/util/dom.ts
function make(arg, literal = !1) {
  return arg ? literal ? document.createTextNode(arg) : document.createElement(arg) : null;
}
var hasClass = (elem, name) => ` ${elem.className} `.includes(` ${name} `), findByClass = (scope, tag, className) => {
  let result = $(scope).find(`${tag}.${className}`);
  return result.length ? result[0] : null;
}, dummyElement = null, forceRedraw = () => {
  dummyElement ?? (dummyElement = document.createTextNode(" ")), dummyElement.parentNode ? document.body.removeChild(dummyElement) : document.body.appendChild(dummyElement);
};

// packages/HotCat/src/util/events.ts
var evtKeys = (e) => {
  let code = 0;
  return e.ctrlKey && (code |= 1, e.shiftKey && (code |= 2)), code;
}, evtKill = (e) => (e.preventDefault(), e.stopPropagation(), !1);

// packages/HotCat/src/util/text.ts
var param = (name, uri) => {
  let target = uri || location.href, m = new RegExp(`[&?]${name}=([^&#]*)`).exec(target);
  return m ? decodeURIComponent(m[1]) : null;
}, title = (href) => href ? href.indexOf(site.expandedScriptPrefix) === 0 ? param("title", href) : href.indexOf(site.expandedArticlePrefix) === 0 ? decodeURIComponent(href.slice(site.expandedArticlePrefix.length)) : null : null, capitalize = (str) => str.slice(0, 1).toUpperCase() + str.slice(1), wikiPagePath = (pageName) => site.conf.wgArticlePath.replace("$1", encodeURIComponent(pageName).replace(/%3A/g, ":").replace(/%2F/g, "/")), escapeRE = (str) => str.replace(/([\\^$.?*+()[\]])/g, "\\$1"), substituteFactory = (_options) => {
  let options = _options || {}, lead = options.indicator || "$", indicator = escapeRE(lead), lbrace = escapeRE(options.lbrace || "{"), rbrace = escapeRE(options.rbrace || "}"), re = new RegExp(`(?:${indicator}(${indicator}))|(?:${indicator}(\\d+))|(?:${indicator}(?:${lbrace}([^${lbrace}${rbrace}]+)${rbrace}))|(?:${indicator}(?!(?:[${indicator}${lbrace}]|\\d))(\\S+?)\\b)`, "g");
  return (str, map) => map ? str.replace(re, (match, prefix, idx, key, alpha) => {
    if (prefix === lead)
      return lead;
    let k = alpha || key || idx || "", value = map[k], replacement = typeof value == "function" ? value(match, k) : value;
    return typeof replacement == "string" ? replacement : String(replacement || match);
  }) : str;
}, substitute = substituteFactory(), replaceHash = substituteFactory({
  indicator: "#",
  lbrace: "[",
  rbrace: "]"
}), replaceShortcuts = (str, map) => {
  let s = replaceHash(str, map);
  return HC.capitalizePageNames ? capitalize(s) : s;
};

// packages/HotCat/src/wikitext/strip.ts
var htmlCommentRE = /<!--[\s\S]*?(?:-->|$)/g, nowikiRE = /<nowiki>[\s\S]*?<\/nowiki>/g, stripCommentsAndNowiki = (text) => {
  let out = text, prev;
  do
    prev = out, out = out.replace(htmlCommentRE, "").replace(nowikiRE, "");
  while (out !== prev);
  return out;
}, blankCommentsAndNowiki = (text) => text.replace(htmlCommentRE, replaceByBlanks).replace(nowikiRE, replaceByBlanks);

// packages/HotCat/src/wikitext/find.ts
function findCategoryWikitext(wikitext, category, once) {
  let cat_regex;
  if (HC.template_categories[category])
    cat_regex = new RegExp(`\\{\\{${wikiTextBlankOrBidi}(${HC.template_regexp}(?=${wikiTextBlankOrBidi}:))?${wikiTextBlankOrBidi}(?:${HC.template_categories[category]})${wikiTextBlankOrBidi}(\\|.*?)?\\}\\}`, "g");
  else {
    let cat_name = escapeRE(category), initial = cat_name.charAt(0);
    cat_regex = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(${HC.category_regexp})${wikiTextBlankOrBidi}:${wikiTextBlankOrBidi}${initial === "\\" || !HC.capitalizePageNames ? initial : `[${initial.toUpperCase()}${initial.toLowerCase()}]`}${cat_name.substring(1).replace(wikiTextBlankRE, wikiTextBlank)}${wikiTextBlankOrBidi}(\\|.*?)?\\]\\]`, "g");
  }
  if (once)
    return cat_regex.exec(wikitext);
  let copiedtext = blankCommentsAndNowiki(wikitext), result = [], curr_match;
  for (; (curr_match = cat_regex.exec(copiedtext)) !== null; )
    result.push({
      match: curr_match
    });
  return Object.assign(result, { re: cat_regex });
}

// packages/HotCat/src/wikitext/list.ts
var listCategorys = () => {
  if (state.pageText === null)
    return [];
  state.cleanedText === null && (state.cleanedText = stripCommentsAndNowiki(state.pageText));
  let cat_regex = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(${HC.category_regexp})${wikiTextBlankOrBidi}:${wikiTextBlankOrBidi}([^\\[\\]]+?)${wikiTextBlankOrBidi}(\\|.*?)?\\]\\]`, "g"), result = [], curr_match;
  for (; (curr_match = cat_regex.exec(state.cleanedText)) !== null; )
    result.push({
      match: curr_match
    });
  return result.re = cat_regex, result;
};

// packages/HotCat/src/api/suggestions.ts
var suggestionEngines = {
  opensearch: {
    uri: "/api.php?format=json&action=opensearch&namespace=14&limit=30&search=Category:$1",
    handler: (json, queryKey) => {
      var _a;
      let queryResult = json, first = queryResult?.[0], second = queryResult?.[1];
      if (typeof first == "string" && Array.isArray(second)) {
        let key = first.substring(first.indexOf(":") + 1), titles = second, exists = !1;
        (_a = state).cat_prefix ?? (_a.cat_prefix = new RegExp(`^(${HC.category_regexp}):`));
        let catPrefix = state.cat_prefix;
        for (let i = 0; i < titles.length; i++) {
          catPrefix.lastIndex = 0;
          let m = catPrefix.exec(titles[i]);
          m && m.length > 1 ? (titles[i] = titles[i].substring(titles[i].indexOf(":") + 1), key === titles[i] && (exists = !0)) : (titles.splice(i, 1), i--);
        }
        return titles.exists = exists, queryKey !== key && (titles.normalized = key), titles;
      }
      return null;
    }
  },
  internalsearch: {
    uri: "/api.php?format=json&action=query&list=allpages&apnamespace=14&aplimit=30&apfrom=$1&apprefix=$1",
    handler: (json) => {
      let queryResult = json;
      if (queryResult && queryResult.query && queryResult.query.allpages) {
        let titles = queryResult.query.allpages.map((page) => page.title);
        for (let i = 0; i < titles.length; i++)
          titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
        return titles;
      }
      return null;
    }
  },
  exists: {
    uri: "/api.php?format=json&action=query&prop=info&titles=Category:$1",
    handler: (json, queryKey) => {
      let queryResult = json;
      if (queryResult && queryResult.query && queryResult.query.pages && !queryResult.query.pages[-1])
        for (let p in queryResult.query.pages) {
          let page = queryResult.query.pages[p], title2 = page.title.substring(page.title.indexOf(":") + 1), titles = [title2];
          return titles.exists = !0, queryKey !== title2 && (titles.normalized = title2), titles;
        }
      return null;
    }
  },
  subcategories: {
    uri: "/api.php?format=json&action=query&list=categorymembers&cmtype=subcat&cmlimit=max&cmtitle=Category:$1",
    handler: (json) => {
      let queryResult = json;
      if (queryResult && queryResult.query && queryResult.query.categorymembers) {
        let titles = queryResult.query.categorymembers.map((member) => member.title);
        for (let i = 0; i < titles.length; i++)
          titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
        return titles;
      }
      return null;
    }
  },
  parentcategories: {
    uri: "/api.php?format=json&action=query&prop=categories&titles=Category:$1&cllimit=max",
    handler: (json) => {
      let queryResult = json;
      if (queryResult && queryResult.query && queryResult.query.pages)
        for (let p in queryResult.query.pages) {
          let page = queryResult.query.pages[p];
          if (page.categories) {
            let titles = page.categories.map((category) => category.title);
            for (let i = 0; i < titles.length; i++)
              titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
            return titles;
          }
        }
      return null;
    }
  }
}, suggestionConfigs = {
  searchindex: {
    name: "Search index",
    engines: ["opensearch"],
    cache: {},
    show: !0,
    temp: !1,
    noCompletion: !1
  },
  pagelist: {
    name: "Page list",
    engines: ["internalsearch", "exists"],
    cache: {},
    show: !0,
    temp: !1,
    noCompletion: !1
  },
  combined: {
    name: "Combined search",
    engines: ["opensearch", "internalsearch"],
    cache: {},
    show: !0,
    temp: !1,
    noCompletion: !1
  },
  subcat: {
    name: "Subcategories",
    engines: ["subcategories"],
    cache: {},
    show: !0,
    temp: !0,
    noCompletion: !0
  },
  parentcat: {
    name: "Parent categories",
    engines: ["parentcategories"],
    cache: {},
    show: !0,
    temp: !0,
    noCompletion: !0
  }
}, filterAndSortTitles = (titles, vNormalized) => {
  let vLow = vNormalized.toLowerCase();
  if (HC.blacklist)
    for (let i = 0; i < titles.length; i++)
      HC.blacklist.test(titles[i]) && (titles.splice(i, 1), i--);
  titles.sort((a, b) => {
    if (a === b)
      return 0;
    if (a.indexOf(b) === 0)
      return 1;
    if (b.indexOf(a) === 0)
      return -1;
    let prefixMatchA = a.indexOf(vNormalized) === 0 ? 1 : 0, prefixMatchB = b.indexOf(vNormalized) === 0 ? 1 : 0;
    if (prefixMatchA !== prefixMatchB)
      return prefixMatchB - prefixMatchA;
    let aLow = a.toLowerCase(), bLow = b.toLowerCase();
    return prefixMatchA = aLow.indexOf(vLow) === 0 ? 1 : 0, prefixMatchB = bLow.indexOf(vLow) === 0 ? 1 : 0, prefixMatchA !== prefixMatchB ? prefixMatchB - prefixMatchA : a < b ? -1 : b < a ? 1 : 0;
  });
  for (let i = 0; i < titles.length; i++)
    (i + 1 < titles.length && titles[i] === titles[i + 1] || site.conf.wgNamespaceNumber === 14 && titles[i] === site.conf.wgTitle) && (titles.splice(i, 1), i--);
};

// packages/HotCat/src/api/http.ts
var getJson = async (url) => await $.getJSON(url), getJsonCallback = (url, callback) => {
  $.getJSON(url, callback);
}, ajaxGetJson = (url, callbacks) => {
  $.ajax({
    url,
    method: "GET",
    dataType: "json",
    success: callbacks.success,
    error: callbacks.error,
    complete: callbacks.complete
  });
};

// packages/HotCat/src/api/page.ts
var setPage = (json) => {
  let startTime = null;
  if (json && json.query) {
    if (json.query.pages) {
      let page = json.query.pages[site.conf.wgArticleId ? `${site.conf.wgArticleId}` : "-1"];
      if (page && (page.revisions && page.revisions.length && (state.pageText = page.revisions[0].slots.main["*"], page.revisions[0].timestamp && (state.pageTime = page.revisions[0].timestamp.replace(/\D/g, "")), page.revisions[0].revid && (state.pageTextRevId = page.revisions[0].revid), page.revisions.length > 1 && (state.conflictingUser = page.revisions[1].user || null)), page.lastrevid && (state.lastRevId = page.lastrevid), page.starttimestamp && (startTime = page.starttimestamp.replace(/\D/g, "")), state.pageWatched = typeof page.watched == "string", json.query.tokens && (state.editToken = json.query.tokens.csrftoken || null), page.langlinks && (!json["query-continue"] || !json["query-continue"].langlinks))) {
        let re = "";
        for (let i = 0; i < page.langlinks.length; i++)
          re += (i > 0 ? "|" : "") + page.langlinks[i].lang.replace(/([\\^$.?*+()])/g, "\\$1");
        re.length && (state.interlanguageRE = new RegExp(`((^|\\n\\r?)(\\[\\[\\s*(${re})\\s*:[^\\]]+\\]\\]\\s*))+$`));
      }
    }
    if (json.query.general && (json.query.general.time && !startTime && (startTime = json.query.general.time.replace(/\D/g, "")), HC.capitalizePageNames === null && (HC.capitalizePageNames = json.query.general.case === "first-letter")), state.serverTime = startTime, json.query.userinfo && json.query.userinfo.options) {
      let options = json.query.userinfo.options;
      state.watchCreate = !HC.dont_add_to_watchlist && options.watchcreations === "1", state.watchCreateExpiry = typeof options[" watchcreations-expiry"] == "string" ? options[" watchcreations-expiry"] : "", state.watchEdit = !HC.dont_add_to_watchlist && options.watchdefault === "1", state.watchDefaultExpiry = typeof options["watchdefault-expiry"] == "string" ? options["watchdefault-expiry"] : "", state.minorEdits = options.minordefault === 1, state.minorEdits && (HC.single_minor = !0);
    }
  }
}, initiateEdit = async (doEdit, failure) => {
  if (state.saveInProgress)
    return;
  state.saveInProgress = !0;
  let oldButtonState = !1;
  state.commitButton && (oldButtonState = state.commitButton.disabled, state.commitButton.disabled = !0);
  let fail = (message) => {
    state.saveInProgress = !1, state.commitButton && (state.commitButton.disabled = oldButtonState), failure(message);
  };
  try {
    let json = await getJson(`${site.conf.wgScriptPath}/api.php?format=json&action=query&rawcontinue=&titles=${encodeURIComponent(site.conf.wgPageName)}&prop=info%7Crevisions%7Clanglinks&inprop=watched&rvprop=content%7Ctimestamp%7Cids%7Cuser&lllimit=500&rvslots=main&rvlimit=2&rvdir=newer&rvstartid=${site.conf.wgCurRevisionId}&meta=siteinfo%7Cuserinfo%7Ctokens&type=csrf&uiprop=options`);
    setPage(json), doEdit(fail);
  } catch (req) {
    let request = req;
    fail(`${request.status} ${request.statusText}`);
  }
}, resolveOne = (page, toResolve) => {
  let cats = page.categories, lks = page.links, is_hidden = !!(page.categoryinfo && typeof page.categoryinfo.hidden == "string"), is_missing = typeof page.missing == "string", pageTitle = page.title, pageTitleWithoutNs = pageTitle.substring(pageTitle.indexOf(":") + 1), is_dab = !1, is_redir = typeof page.redirect == "string", i;
  for (i = 0; i < toResolve.length; i++)
    i && toResolve[i].dabInputCleaned !== pageTitleWithoutNs || (toResolve[i].currentHidden = is_hidden, toResolve[i].inputExists = !is_missing, toResolve[i].icon.src = is_missing ? HC.existsNo : HC.existsYes);
  if (is_missing)
    return;
  if (!is_redir && cats && (HC.disambig_category || HC.redir_category))
    for (let c = 0; c < cats.length; c++) {
      let cat = cats[c].title;
      if (cat) {
        if (cat = cat.substring(cat.indexOf(":") + 1).replace(/_/g, " "), cat === HC.disambig_category) {
          is_dab = !0;
          break;
        } else if (cat === HC.redir_category) {
          is_redir = !0;
          break;
        }
      }
    }
  if (!is_redir && !is_dab || !lks || !lks.length)
    return;
  let titles = [];
  for (i = 0; i < lks.length; i++) {
    let linkTitle = lks[i].title;
    if (lks[i].ns === 14 && linkTitle && linkTitle.length) {
      let match = linkTitle.substring(linkTitle.indexOf(":") + 1);
      (!HC.blacklist || !HC.blacklist.test(match)) && titles.push(match);
    }
  }
  if (titles.length) {
    for (i = 0; i < toResolve.length; i++)
      if (!(i && toResolve[i].dabInputCleaned !== pageTitleWithoutNs))
        if (toResolve[i].inputExists = !0, toResolve[i].icon.src = HC.existsYes, titles.length > 1)
          toResolve[i].dab = titles;
        else {
          let currentKey = toResolve[i].currentKey;
          toResolve[i].text.value = titles[0] + (currentKey !== null ? `|${currentKey}` : "");
        }
  }
}, resolveRedirects = (toResolve, params) => {
  if (!(!params || !params.query || !params.query.pages))
    for (let p in params.query.pages)
      resolveOne(params.query.pages[p], toResolve);
}, resolveMulti = async (toResolve, callback) => {
  let i;
  for (i = 0; i < toResolve.length; i++)
    toResolve[i].dab = null, toResolve[i].dabInput = toResolve[i].lastInput;
  if (state.noSuggestions) {
    callback(toResolve);
    return;
  }
  let args = `action=query&prop=info%7Clinks%7Ccategories%7Ccategoryinfo&plnamespace=14&pllimit=${toResolve.length * 10}&cllimit=${toResolve.length * 10}&format=json&titles=`;
  for (i = 0; i < toResolve.length; i++) {
    let v = toResolve[i].dabInput;
    v = replaceShortcuts(v, HC.shortcuts), toResolve[i].dabInputCleaned = v, args += encodeURIComponent(`Category:${v}`), i + 1 < toResolve.length && (args += "%7C");
  }
  try {
    let json = await getJson(`${site.conf.wgScriptPath}/api.php?${args}`);
    resolveRedirects(toResolve, json), callback(toResolve);
  } catch (req) {
    req || (state.noSuggestions = !0), callback(toResolve);
  }
};

// packages/HotCat/src/wikitext/change.ts
var changeCategory = (_wikitext, toRemove, toAdd, _key) => {
  let key = _key, wikitext = _wikitext, find_insertionpoint = (text) => {
    let copiedtext = blankCommentsAndNowiki(text), index = -1;
    for (findCatsRE.lastIndex = 0; findCatsRE.exec(copiedtext) !== null; )
      index = findCatsRE.lastIndex;
    if (index < 0) {
      let match;
      return state.interlanguageRE ? match = state.interlanguageRE.exec(copiedtext) : match = /((^|\n\r?)(\[\[\s*(([a-z]{2,3}(-[a-z]+)*)|simple|tokipona)\s*:[^\]]+\]\]\s*))+$/.exec(copiedtext), match && (index = match.index), {
        idx: index,
        onCat: !1
      };
    }
    return {
      idx: index,
      onCat: index >= 0
    };
  }, summary = [], nameSpace = HC.category_canonical, keyChange = !!(toRemove && toAdd && toRemove === toAdd && toAdd.length), cat_point = -1, matches;
  if (key && (key = `|${key}`), toRemove && toRemove.length) {
    if (matches = findCategoryWikitext(wikitext, toRemove), !matches.length)
      return {
        text: wikitext,
        summary,
        error: HC.messages.cat_notFound.replace(/\$1/g, toRemove)
      };
    let before = wikitext.substring(0, matches[0].match.index), after = wikitext.substring(matches[0].match.index + matches[0].match[0].length);
    matches.length > 1 && (matches.re.lastIndex = 0, after = after.replace(matches.re, "")), toAdd && key === null && (key = matches[0].match[2]);
    let i = before.length - 1;
    for (; i >= 0 && before.charAt(i) !== `
` && before.charAt(i).search(/\s/) >= 0; )
      i--;
    let j = 0;
    for (; j < after.length && after.charAt(j) !== `
` && after.charAt(j).search(/\s/) >= 0; )
      j++;
    i >= 0 && before.charAt(i) === `
` && (!after.length || j < after.length && after.charAt(j) === `
`) && i--, i >= 0 ? before = before.substring(0, i + 1) : before = "", j < after.length ? after = after.substring(j) : after = "", before.length && before.charAt(before.length - 1).search(/\S/) >= 0 && after.length && after.charAt(0).search(/\S/) >= 0 && (before += " "), cat_point = before.length, cat_point === 0 && after.length && after.charAt(0) === `
` && (after = after.substring(1)), wikitext = before + after, keyChange || (HC.template_categories[toRemove] ? summary.push(HC.messages.template_removed.replace(/\$1/g, toRemove)) : summary.push(HC.messages.cat_removed.replace(/\$1/g, toRemove)));
  }
  if (toAdd && toAdd.length) {
    if (matches = findCategoryWikitext(wikitext, toAdd), matches.length)
      return {
        text: wikitext,
        summary,
        error: HC.messages.cat_exists.replace(/\$1/g, toAdd)
      };
    let onCat;
    if (cat_point < 0) {
      let point = find_insertionpoint(wikitext);
      cat_point = point.idx, onCat = point.onCat;
    } else
      onCat = !0;
    let newcatstring = `[[${nameSpace}:${toAdd}${key || ""}]]`;
    if (cat_point >= 0) {
      let suffix = wikitext.substring(cat_point);
      wikitext = wikitext.substring(0, cat_point) + (cat_point > 0 ? `
` : "") + newcatstring + (onCat ? "" : `
`), suffix.length && suffix.charAt(0) !== `
` ? wikitext += `
${suffix}` : wikitext += suffix;
    } else
      wikitext.length && wikitext.charAt(wikitext.length - 1) !== `
` && (wikitext += `
`), wikitext += (wikitext.length ? `
` : "") + newcatstring;
    if (keyChange) {
      let k = key || "";
      k.length && (k = k.substring(1)), summary.push(substitute(HC.messages.cat_keychange, { 1: toAdd, 2: k }));
    } else
      summary.push(HC.messages.cat_added.replace(/\$1/g, toAdd));
  }
  return {
    text: wikitext,
    summary,
    error: null
  };
};

// packages/HotCat/src/api/summary.ts
var requireCommitForm = () => {
  let form = state.commitForm;
  if (!form)
    throw new Error("HotCat: commit form is not initialized");
  return form;
}, multiChangeMsg = (count) => {
  let raw = HC.messages.multi_change, msg = typeof raw == "string" ? raw : mw.language.convertPlural(count, raw);
  return substitute(msg, { 1: `${count}` });
}, currentTimestamp = () => {
  let now = /* @__PURE__ */ new Date(), ts = `${now.getUTCFullYear()}`, two = (s) => s.substring(s.length - 2);
  return ts += two(`0${now.getUTCMonth() + 1}`) + two(`0${now.getUTCDate()}`) + two(`00${now.getUTCHours()}`) + two(`00${now.getUTCMinutes()}`) + two(`00${now.getUTCSeconds()}`), ts;
}, performChanges = (failure, singleEditor) => {
  let pageText = state.pageText;
  if (pageText === null) {
    failure(HC.messages.multi_error);
    return;
  }
  HC.messages.cat_keychange.includes("$2") || (HC.messages.cat_keychange += '"$2"'), HC.messages.short_catchange || (HC.messages.short_catchange = `[[${HC.category_canonical}:$1]]`);
  let commitForm = requireCommitForm(), action, selfEditConflict = !!((state.lastRevId !== null && state.lastRevId !== site.conf.wgCurRevisionId || state.pageTextRevId !== null && state.pageTextRevId !== site.conf.wgCurRevisionId) && state.conflictingUser && state.conflictingUser === site.conf.wgUserName);
  singleEditor && !singleEditor.noCommit && !HC.no_autocommit && state.editToken && !selfEditConflict && (commitForm.wpEditToken.value = state.editToken, action = commitForm.wpDiff, action.name = action.value = "wpSave", commitForm.wpChangeTags.value += `,${HC.automationChangeTag}`);
  let result = {
    text: pageText,
    summary: [],
    error: null
  }, changed = [], added = [], deleted = [], toEdit = singleEditor ? [singleEditor] : state.editors, changes = 0, error = null, edit, i;
  for (i = 0; i < toEdit.length; i++)
    edit = toEdit[i], edit.state === CategoryEditor.CHANGED ? (result = changeCategory(result.text, edit.originalCategory, edit.currentCategory, edit.currentKey), result.error ? error === null && (error = result.error) : (changes++, !edit.originalCategory || !edit.originalCategory.length ? added.push(edit.currentCategory) : changed.push({
      from: edit.originalCategory,
      to: edit.currentCategory
    }))) : edit.state === CategoryEditor.DELETED && edit.originalCategory && edit.originalCategory.length && (result = changeCategory(result.text, edit.originalCategory, null, null), result.error ? error === null && (error = result.error) : (changes++, deleted.push(edit.originalCategory)));
  if (error !== null && (action = commitForm.wpSave, action && (action.name = action.value = "wpDiff")), commitForm.wpMinoredit.checked = state.minorEdits, commitForm.wpWatchthis.checked = !site.conf.wgArticleId && state.watchCreate || state.watchEdit || state.pageWatched, commitForm.wpWatchthis.checked && !state.pageWatched && (!site.conf.wgArticleId && state.watchCreate ? commitForm.wpWatchlistExpiry.value = state.watchCreateExpiry : commitForm.wpWatchlistExpiry.value = state.watchDefaultExpiry), site.conf.wgArticleId || singleEditor) {
    if (action && action.value === "wpSave" ? HC.changeTag && (commitForm.wpChangeTags.value = `${HC.changeTag},${HC.automationChangeTag}`, HC.messages.using = "", HC.messages.prefix = "") : commitForm.wpAutoSummary.value = HC.changeTag, changes === 1)
      result.summary.length && (commitForm.wpSummary.value = HC.messages.prefix + result.summary.join(HC.messages.separator) + HC.messages.using), commitForm.wpMinoredit.checked = HC.single_minor || state.minorEdits;
    else if (changes) {
      let summary = [], shortSummary = [];
      for (i = 0; i < deleted.length; i++)
        summary.push(`-${substitute(HC.messages.short_catchange, { 1: deleted[i] })}`);
      for (deleted.length === 1 ? shortSummary.push(`-${substitute(HC.messages.short_catchange, { 1: deleted[0] })}`) : deleted.length && shortSummary.push(`- ${multiChangeMsg(deleted.length)}`), i = 0; i < added.length; i++)
        summary.push(`+${substitute(HC.messages.short_catchange, { 1: added[i] })}`);
      added.length === 1 ? shortSummary.push(`+${substitute(HC.messages.short_catchange, { 1: added[0] })}`) : added.length && shortSummary.push(`+ ${multiChangeMsg(added.length)}`);
      let arrow = state.is_rtl ? "←" : "→";
      for (i = 0; i < changed.length; i++)
        changed[i].from !== changed[i].to ? summary.push(`±${substitute(HC.messages.short_catchange, { 1: changed[i].from })}${arrow}${substitute(HC.messages.short_catchange, { 1: changed[i].to })}`) : summary.push(`±${substitute(HC.messages.short_catchange, { 1: changed[i].from })}`);
      if (changed.length === 1 ? changed[0].from !== changed[0].to ? shortSummary.push(`±${substitute(HC.messages.short_catchange, { 1: changed[0].from })}${arrow}${substitute(HC.messages.short_catchange, { 1: changed[0].to })}`) : shortSummary.push(`±${substitute(HC.messages.short_catchange, { 1: changed[0].from })}`) : changed.length && shortSummary.push(`± ${multiChangeMsg(changed.length)}`), summary.length) {
        let summaryText = summary.join(HC.messages.separator);
        summaryText.length > 200 - HC.messages.prefix.length - HC.messages.using.length && (summaryText = shortSummary.join(HC.messages.separator)), commitForm.wpSummary.value = HC.messages.prefix + summaryText + HC.messages.using;
      }
    }
  }
  commitForm.wpTextbox1.value = result.text, commitForm.wpStarttime.value = state.serverTime || currentTimestamp(), commitForm.wpEdittime.value = state.pageTime || commitForm.wpStarttime.value, selfEditConflict && (commitForm.oldid.value = `${state.pageTextRevId || site.conf.wgCurRevisionId}`), commitForm.hcCommit.click();
};

// packages/HotCat/src/ui/dialogs.ts
var alertError = (message) => {
  oouiDialog.alert(oouiDialog.sanitize(message), {
    title: "HotCat 小工具"
  });
};

// packages/HotCat/src/ui/multi.ts
var makeActive = (which) => {
  if (!which.is_active) {
    for (let i = 0; i < state.editors.length; i++)
      state.editors[i] !== which && state.editors[i].inactivate();
    if (which.is_active = !0, which.dab)
      showDab(which);
    else {
      let expectedInput = which.lastRealInput || which.lastInput || "", actualValue = which.text.value || "";
      if (!expectedInput.length && actualValue.length || expectedInput.length && actualValue.indexOf(expectedInput)) {
        which.showsList = !1;
        let v = actualValue.split("|");
        which.lastRealInput = which.lastInput = v[0], v.length > 1 && (which.currentKey = v[1]), which.lastSelection && (which.lastSelection = {
          start: v[0].length,
          end: v[0].length
        });
      }
      if (which.showsList && which.displayList(), which.lastSelection)
        if (site.isWebkit) {
          let selection = which.lastSelection;
          window.setTimeout(() => {
            which.setSelection(selection.start, selection.end);
          }, 1);
        } else
          which.setSelection(which.lastSelection.start, which.lastSelection.end);
    }
  }
}, showDab = (which) => {
  which.is_active ? (which.showSuggestions(which.dab ?? null, !1, null, null), which.dab = null) : makeActive(which);
}, multiSubmit = () => {
  let toResolve = [];
  for (let i = 0; i < state.editors.length; i++)
    (state.editors[i].state === CategoryEditor.CHANGE_PENDING || state.editors[i].state === CategoryEditor.OPEN) && toResolve.push(state.editors[i]);
  if (!toResolve.length) {
    initiateEdit((failure) => {
      performChanges(failure);
    }, (msg) => {
      alertError(msg);
    });
    return;
  }
  resolveMulti(toResolve, (resolved) => {
    let firstDab = null, dontChange = !1;
    for (let i = 0; i < resolved.length; i++)
      resolved[i].lastInput !== resolved[i].dabInput ? dontChange = !0 : resolved[i].dab ? firstDab || (firstDab = resolved[i]) : resolved[i].acceptCheck(!0) && resolved[i].commit();
    firstDab ? showDab(firstDab) : dontChange || initiateEdit((failure) => {
      performChanges(failure);
    }, (msg) => {
      alertError(msg);
    });
  });
}, setMultiInput = () => {
  if (state.commitButton || state.onUpload)
    return;
  let commitButton = make("input");
  commitButton.type = "button", commitButton.value = HC.messages.commit, commitButton.onclick = multiSubmit, state.commitButton = commitButton, state.multiSpan && state.multiSpan.parentNode ? state.multiSpan.parentNode.replaceChild(commitButton, state.multiSpan) : state.catLine?.appendChild(commitButton);
}, checkMultiInput = () => {
  if (!state.commitButton)
    return;
  let hasChanges = !1;
  for (let i = 0; i < state.editors.length; i++)
    if (state.editors[i].state !== CategoryEditor.UNCHANGED) {
      hasChanges = !0;
      break;
    }
  state.commitButton.disabled = !hasChanges;
};

// packages/HotCat/src/ui/editor/selection.ts
var setSelectionRange = (editor, from, to) => {
  editor.text.value && editor.text.setSelectionRange(from, to);
}, getSelectionRange = (editor) => {
  if (!editor.text.value)
    return {
      start: 0,
      end: 0
    };
  let from = editor.text.selectionStart ?? 0;
  return {
    start: from,
    end: editor.text.selectionEnd ?? from
  };
};

// packages/HotCat/src/util/layout.ts
var readMetric = (element, name) => element[name] || 0, viewport = (what) => {
  let s = `client${what}`;
  return readMetric(document.documentElement, s) || readMetric(document.body, s);
}, scrollOffset = (what) => {
  let s = `scroll${what}`, result = readMetric(document.documentElement, s) || readMetric(document.body, s);
  return state.is_rtl && what === "Left" && (result < 0 && (result = -result), site.isWebkit || (result = scrollOffset("Width") - viewport("Width") - result)), result;
}, position = (node) => {
  let box = node.getBoundingClientRect();
  return {
    x: Math.round(box.left + scrollOffset("Left")),
    y: Math.round(box.top + scrollOffset("Top"))
  };
};

// packages/HotCat/src/ui/editor/form.ts
var buildForm = (editor) => {
  let form = make("form");
  form.method = "POST", form.onsubmit = editor.accept.bind(editor), editor.form = form;
  let text = make("input");
  text.type = "text", text.size = HC.editbox_width, state.noSuggestions || (text.onkeyup = (evt) => {
    let key = evt.keyCode || 0;
    if (editor.ime && editor.lastKey === 229 && !editor.usesComposition && (key === 9 || key === 13 || key === 27 || key === 32) && (editor.ime = !1), editor.ime)
      return !0;
    if (key === 38 || key === 40 || key === 33 || key === 34) {
      if (editor.keyCount === 0)
        return editor.processKey(evt);
    } else {
      if (key === 27 && editor.lastKey !== 229 && !editor.resetKeySelection()) {
        editor.cancel();
        return;
      }
      editor.invokeSuggestions(key === 8 || key === 46 || key === 27);
    }
    return !0;
  }, text.onkeydown = (evt) => {
    let key = evt.keyCode || 0;
    return editor.lastKey = key, editor.keyCount = 0, !editor.ime && key === 229 && !editor.usesComposition ? editor.ime = !0 : editor.ime && key !== 229 && !(key >= 16 && key <= 20 || key >= 91 && key <= 93 || key === 144) && (editor.ime = !1), editor.ime ? !0 : key === 13 ? editor.accept(evt) : key === 27 ? evtKill(evt) : !0;
  }, text.onkeypress = (evt) => (editor.keyCount = (editor.keyCount || 0) + 1, editor.processKey(evt)), $(text).on("focus", () => {
    makeActive(editor);
  }), $(text).on("blur", editor.saveView.bind(editor)), $(text).on("compositionstart", () => {
    editor.lastKey = 229, editor.usesComposition = !0, editor.ime = !0;
  }), $(text).on("compositionend", () => {
    editor.lastKey = 229, editor.usesComposition = !0, editor.ime = !1;
  }), $(text).on("textInput", () => {
    editor.ime = !1, editor.invokeSuggestions(!1);
  }), $(text).on("blur", () => {
    editor.usesComposition = !1, editor.ime = !1;
  })), editor.text = text, editor.icon = make("img"), editor.icon.width = 20;
  let list = null;
  if (!state.noSuggestions && (list = make("select"), list.onclick = () => {
    editor.highlightSuggestion(0) && editor.textchange(!1, !0);
  }, list.ondblclick = (e) => {
    editor.highlightSuggestion(0) && editor.accept(e);
  }, list.onchange = () => {
    editor.highlightSuggestion(0), editor.text.focus();
  }, list.onkeyup = (evt) => {
    evt.keyCode === 27 ? (editor.resetKeySelection(), editor.text.focus(), window.setTimeout(() => {
      editor.textchange(!0);
    }, HC.suggest_delay)) : evt.keyCode === 13 && editor.accept(evt);
  }, !HC.fixed_search)) {
    let engineSelector = make("select");
    for (let key in suggestionConfigs)
      if (suggestionConfigs[key].show) {
        let opt = make("option");
        opt.value = key, key === editor.engine && (opt.selected = !0), opt.appendChild(make(suggestionConfigs[key].name, !0)), engineSelector.appendChild(opt);
      }
    engineSelector.onchange = () => {
      editor.engine = editor.engineSelector?.options[editor.engineSelector.selectedIndex].value ?? editor.engine, editor.text.focus(), editor.textchange(!0, !0);
    }, editor.engineSelector = engineSelector;
  }
  editor.list = list;
  let button_label = (id, defaultText) => {
    let label = null;
    if (state.onUpload && window.UFUI !== void 0 && window.UIElements !== void 0 && window.UFUI.getLabel instanceof Function)
      try {
        for (label = window.UFUI.getLabel(id, !0); label && label.nodeType !== 3; )
          label = label.firstChild;
      } catch {
        label = null;
      }
    return !label || !label.data ? defaultText : label.data;
  }, OK = make("input");
  OK.type = "button", OK.value = button_label("wpOkUploadLbl", HC.messages.ok), OK.onclick = editor.accept.bind(editor), editor.ok = OK;
  let cancel = make("input");
  cancel.type = "button", cancel.value = button_label("wpCancelUploadLbl", HC.messages.cancel), cancel.onclick = editor.cancel.bind(editor), editor.cancelButton = cancel;
  let span = make("span");
  return span.className = "hotcatinput", span.style.position = "relative", span.appendChild(text), span.appendChild(make(" ", !0)), span.style.whiteSpace = "nowrap", list && span.appendChild(list), editor.engineSelector && span.appendChild(editor.engineSelector), state.noSuggestions || span.appendChild(editor.icon), span.appendChild(OK), span.appendChild(cancel), form.appendChild(span), form.style.display = "none", editor.span.appendChild(form), form;
};

// packages/HotCat/src/ui/editor/suggest.ts
var fireSuggestionRequests = (editor, engines, cb, v, cleanKey) => {
  let makeCall = (url, engine) => {
    ajaxGetJson(url, {
      success: (json) => {
        let titles = engine.handler(json, cleanKey);
        titles && titles.length && (cb.allTitles === null ? cb.allTitles = titles : cb.allTitles = cb.allTitles.concat(titles), titles.exists && (cb.exists = !0), titles.normalized && (cb.normalized = titles.normalized));
      },
      error: (req) => {
        req || (state.noSuggestions = !0), cb.dontCache = !0;
      },
      complete: () => {
        if (cb.callsMade++, cb.callsMade === cb.nofCalls) {
          let allTitles = cb.allTitles ?? [];
          cb.exists && (allTitles.exists = !0), cb.normalized && (allTitles.normalized = cb.normalized), !cb.dontCache && !suggestionConfigs[cb.engineName].cache[cleanKey] && (suggestionConfigs[cb.engineName].cache[cleanKey] = allTitles), editor.text.readOnly = !1, cb.cancelled || editor.showSuggestions(allTitles, cb.noCompletion, v, cb.engineName), cb === editor.callbackObj && (editor.callbackObj = null);
        }
      }
    });
  };
  for (let j = 0; j < engines.length; j++) {
    let engine = suggestionEngines[engines[j]], url = `${site.conf.wgScriptPath}${engine.uri.replace(/\$1/g, encodeURIComponent(cleanKey))}`;
    makeCall(url, engine);
  }
};

// packages/HotCat/src/ui/editor.ts
var _CategoryEditor = class _CategoryEditor {
  /**
   * @param line 分类栏容器
   * @param _span 已有分类的 span；为空表示创建「+」入口
   * @param _after 分类名或 [原名, 转换后名]；新建入口时为插入锚点
   * @param key 已有分类时为 `|index`；新建入口时为 true 表示带分隔符插入
   */
  constructor(line, _span, _after, key, is_hidden = !1) {
    __publicField(this, "callbackObj", null);
    __publicField(this, "isAddCategory");
    __publicField(this, "originalCategory");
    __publicField(this, "originalKey");
    __publicField(this, "originalExists");
    __publicField(this, "originalHidden");
    __publicField(this, "line");
    __publicField(this, "engine");
    __publicField(this, "span");
    __publicField(this, "currentCategory");
    __publicField(this, "currentExists");
    __publicField(this, "currentHidden");
    __publicField(this, "currentKey");
    __publicField(this, "state");
    __publicField(this, "lastSavedState");
    __publicField(this, "lastSavedCategory");
    __publicField(this, "lastSavedKey");
    __publicField(this, "lastSavedExists");
    __publicField(this, "lastSavedHidden");
    __publicField(this, "linkSpan");
    __publicField(this, "normalLinks");
    __publicField(this, "undelLink", null);
    __publicField(this, "catLink", null);
    __publicField(this, "undoLink", null);
    __publicField(this, "upDownLinks");
    __publicField(this, "form", null);
    __publicField(this, "text");
    __publicField(this, "icon");
    __publicField(this, "list", null);
    __publicField(this, "engineSelector");
    __publicField(this, "ok");
    __publicField(this, "cancelButton");
    __publicField(this, "ime");
    __publicField(this, "lastKey");
    __publicField(this, "usesComposition");
    __publicField(this, "keyCount");
    __publicField(this, "is_active");
    __publicField(this, "lastInput");
    __publicField(this, "lastRealInput");
    __publicField(this, "inputExists");
    __publicField(this, "lastSelection");
    __publicField(this, "showsList", !1);
    __publicField(this, "noCommit");
    __publicField(this, "originalState");
    __publicField(this, "dab");
    __publicField(this, "dabInput");
    __publicField(this, "dabInputCleaned");
    __publicField(this, "engineName", null);
    __publicField(this, "lastQuery", null);
    let span = _span, after = _after;
    if (span)
      state.is_rtl && (span.dir = "rtl"), this.isAddCategory = !1, this.catLink = span.firstChild, this.originalCategory = Array.isArray(after) ? after[0] : typeof after == "string" ? after : "", this.originalKey = typeof key == "string" && key.length > 1 ? key.substring(1) : null, this.originalExists = !hasClass(this.catLink, "new"), this.makeLinkSpan(), !this.originalExists && this.upDownLinks && (this.upDownLinks.style.display = "none"), span.appendChild(this.linkSpan);
    else {
      let afterNode = after;
      this.isAddCategory = !0, this.originalCategory = "", this.originalKey = null, this.originalExists = !1, state.newDOM || (span = make("span"), span.className = "noprint", key ? (span.appendChild(make(" | ", !0)), afterNode ? (afterNode.parentNode?.insertBefore(span, afterNode.nextSibling), afterNode = afterNode.nextSibling) : line.appendChild(span)) : line.firstChild && (span.appendChild(make(" ", !0)), line.appendChild(span))), this.linkSpan = make("span"), this.linkSpan.className = "noprint nopopups hotcatlink";
      let lk = make("a");
      lk.href = "#catlinks", lk.onclick = this.open.bind(this), lk.appendChild(make(HC.links.add, !0)), lk.title = HC.tooltips.add, this.linkSpan.appendChild(lk), span = make(state.newDOM ? "li" : "span"), span.className = "noprint", state.is_rtl && (span.dir = "rtl"), span.appendChild(this.linkSpan), afterNode ? afterNode.parentNode?.insertBefore(span, afterNode.nextSibling) : line.appendChild(span), this.undelLink = null, this.catLink = null;
    }
    this.originalHidden = is_hidden, this.line = line, this.engine = HC.suggestions, this.span = span, this.currentCategory = !this.isAddCategory && Array.isArray(after) ? after[1] : this.originalCategory, this.currentExists = this.originalExists, this.currentHidden = this.originalHidden, this.currentKey = this.originalKey, this.state = _CategoryEditor.UNCHANGED, this.lastSavedState = _CategoryEditor.UNCHANGED, this.lastSavedCategory = this.currentCategory, this.lastSavedKey = this.originalKey, this.lastSavedExists = this.originalExists, this.lastSavedHidden = this.originalHidden, this.catLink && this.currentKey && (this.catLink.title = this.currentKey), state.editors[state.editors.length] = this;
  }
  /** 创建操作链接，返回 normalLinks 容器。 */
  makeLinkSpan() {
    let normalLinks = make("span");
    this.normalLinks = normalLinks;
    let lk;
    return this.originalCategory && this.originalCategory.length && (lk = make("a"), lk.href = "#catlinks", lk.onclick = this.remove.bind(this), lk.appendChild(make(HC.links.remove, !0)), lk.title = HC.tooltips.remove, this.normalLinks.appendChild(make(" ", !0)), this.normalLinks.appendChild(lk)), HC.template_categories[this.originalCategory] || (lk = make("a"), lk.href = "#catlinks", lk.onclick = this.open.bind(this), lk.appendChild(make(HC.links.change, !0)), lk.title = HC.tooltips.change, this.normalLinks.appendChild(make(" ", !0)), this.normalLinks.appendChild(lk), !state.noSuggestions && HC.use_up_down && (this.upDownLinks = make("span"), lk = make("a"), lk.href = "#catlinks", lk.onclick = this.down.bind(this), lk.appendChild(make(HC.links.down, !0)), lk.title = HC.tooltips.down, this.upDownLinks.appendChild(make(" ", !0)), this.upDownLinks.appendChild(lk), lk = make("a"), lk.href = "#catlinks", lk.onclick = this.up.bind(this), lk.appendChild(make(HC.links.up, !0)), lk.title = HC.tooltips.up, this.upDownLinks.appendChild(make(" ", !0)), this.upDownLinks.appendChild(lk), this.normalLinks.appendChild(this.upDownLinks))), this.linkSpan = make("span"), this.linkSpan.className = "noprint nopopups hotcatlink", this.linkSpan.appendChild(this.normalLinks), this.undelLink = make("span"), this.undelLink.className = "nopopups hotcatlink", this.undelLink.style.display = "none", lk = make("a"), lk.href = "#catlinks", lk.onclick = this.restore.bind(this), lk.appendChild(make(HC.links.restore, !0)), lk.title = HC.tooltips.restore, this.undelLink.appendChild(make(" ", !0)), this.undelLink.appendChild(lk), this.linkSpan.appendChild(this.undelLink), normalLinks;
  }
  invokeSuggestions(dont_autocomplete) {
    Reflect.has(suggestionConfigs, this.engine) && suggestionConfigs[this.engine].temp && !dont_autocomplete && (this.engine = HC.suggestions), this.state = _CategoryEditor.CHANGE_PENDING;
    let self = this;
    window.setTimeout(() => {
      self.textchange(dont_autocomplete);
    }, HC.suggest_delay);
  }
  /** 构造内联表单。 */
  makeForm() {
    return buildForm(this);
  }
  display(evt) {
    if (this.isAddCategory && !state.onUpload && new _CategoryEditor(this.line, null, this.span, !0), !state.commitButton && !state.onUpload) {
      for (let i = 0; i < state.editors.length; i++)
        if (state.editors[i].state !== _CategoryEditor.UNCHANGED) {
          setMultiInput();
          break;
        }
    }
    let form = this.form ?? this.makeForm();
    this.list && (this.list.style.display = "none"), this.engineSelector && (this.engineSelector.style.display = "none"), this.currentCategory = this.lastSavedCategory, this.currentExists = this.lastSavedExists, this.currentHidden = this.lastSavedHidden, this.currentKey = this.lastSavedKey, this.icon.src = this.currentExists ? HC.existsYes : HC.existsNo, this.text.value = this.currentCategory + (this.currentKey !== null ? `|${this.currentKey}` : ""), this.originalState = this.state, this.lastInput = this.currentCategory, this.inputExists = this.currentExists, this.state = this.state === _CategoryEditor.UNCHANGED ? _CategoryEditor.OPEN : _CategoryEditor.CHANGE_PENDING, this.lastSelection = {
      start: this.currentCategory.length,
      end: this.currentCategory.length
    }, this.showsList = !1, this.catLink && (this.catLink.style.display = "none"), this.linkSpan.style.display = "none", form.style.display = "inline", this.ok.disabled = !1;
    let result = evtKill(evt);
    return this.text.focus(), this.text.readOnly = !1, checkMultiInput(), result;
  }
  show(evt, engine, readOnly) {
    let result = this.display(evt);
    return this.lastSavedCategory.length && (this.text.readOnly = !!readOnly, this.engine = engine, this.textchange(!1, !0), forceRedraw()), result;
  }
  open(evt) {
    return this.show(evt, this.engine && suggestionConfigs[this.engine].temp ? HC.suggestions : this.engine);
  }
  down(evt) {
    return this.show(evt, "subcat", !0);
  }
  up(evt) {
    return this.show(evt, "parentcat");
  }
  cancel() {
    if (this.isAddCategory && !state.onUpload) {
      this.removeEditor();
      return;
    }
    this.inactivate(), this.form.style.display = "none", this.catLink && (this.catLink.style.display = ""), this.linkSpan.style.display = "", this.state = this.originalState ?? this.state, this.currentCategory = this.lastSavedCategory, this.currentKey = this.lastSavedKey, this.currentExists = this.lastSavedExists, this.currentHidden = this.lastSavedHidden, this.catLink && (this.currentKey && this.currentKey.length ? this.catLink.title = this.currentKey : this.catLink.title = ""), this.state === _CategoryEditor.UNCHANGED ? this.catLink && (this.catLink.style.backgroundColor = "transparent") : state.onUpload || this.catLink && (this.catLink.style.backgroundColor = HC.bg_changed), checkMultiInput(), forceRedraw();
  }
  removeEditor() {
    if (!state.newDOM) {
      let next = this.span.nextSibling;
      next && next.parentNode?.removeChild(next);
    }
    this.span.parentNode && this.span.parentNode.removeChild(this.span);
    for (let i = 0; i < state.editors.length; i++)
      if (state.editors[i] === this) {
        state.editors.splice(i, 1);
        break;
      }
    checkMultiInput();
  }
  rollback(evt) {
    let undoLink = this.undoLink;
    if (undoLink?.parentNode?.removeChild(undoLink), this.undoLink = null, this.currentCategory = this.originalCategory, this.currentKey = this.originalKey, this.currentExists = this.originalExists, this.currentHidden = this.originalHidden, this.lastSavedCategory = this.originalCategory, this.lastSavedKey = this.originalKey, this.lastSavedExists = this.originalExists, this.lastSavedHidden = this.originalHidden, this.state = _CategoryEditor.UNCHANGED, !this.currentCategory || !this.currentCategory.length)
      this.removeEditor();
    else {
      let catLink = this.catLink;
      catLink && (catLink.removeChild(catLink.firstChild), catLink.appendChild(make(this.currentCategory, !0)), catLink.href = wikiPagePath(`${HC.category_canonical}:${this.currentCategory}`), catLink.title = this.currentKey || "", catLink.className = this.currentExists ? "" : "new", catLink.style.backgroundColor = "transparent"), this.upDownLinks && (this.upDownLinks.style.display = this.currentExists ? "" : "none"), checkMultiInput();
    }
    return evtKill(evt);
  }
  inactivate() {
    this.list && (this.list.style.display = "none"), this.engineSelector && (this.engineSelector.style.display = "none"), this.is_active = !1;
  }
  acceptCheck(dontCheck) {
    this.sanitizeInput();
    let value = this.text.value.split("|"), key = null;
    value.length > 1 && (key = value[1]);
    let v = value[0].replace(/_/g, " ").replace(/^\s+|\s+$/g, "");
    return HC.capitalizePageNames && (v = capitalize(v)), this.lastInput = v, v = replaceShortcuts(v, HC.shortcuts), v.length ? !dontCheck && (site.conf.wgNamespaceNumber === 14 && v === site.conf.wgTitle || HC.blacklist && HC.blacklist.test(v)) ? (this.cancel(), !1) : (this.currentCategory = v, this.currentKey = key, this.currentExists = this.inputExists, !0) : (this.cancel(), !1);
  }
  accept(evt) {
    this.noCommit = (evtKeys(evt) & 1) !== 0;
    let result = evtKill(evt);
    if (this.acceptCheck()) {
      let toResolve = [this], original = this.currentCategory;
      resolveMulti(toResolve, (resolved) => {
        resolved[0].dab ? showDab(resolved[0]) : resolved[0].acceptCheck(!0) && resolved[0].commit(resolved[0].currentCategory !== original ? HC.messages.cat_resolved.replace(/\$1/g, original) : null);
      });
    }
    return result;
  }
  /** 收起表单并保存当前值。 */
  close() {
    let catLink = this.catLink ?? this.createHiddenCatLink();
    if (catLink.removeChild(catLink.firstChild), catLink.appendChild(make(this.currentCategory, !0)), catLink.href = wikiPagePath(`${HC.category_canonical}:${this.currentCategory}`), catLink.className = this.currentExists ? "" : "new", this.lastSavedCategory = this.currentCategory, this.lastSavedKey = this.currentKey, this.lastSavedExists = this.currentExists, this.lastSavedHidden = this.currentHidden, this.inactivate(), this.form.style.display = "none", catLink.title = this.currentKey || "", catLink.style.display = "", this.isAddCategory && (state.onUpload && new _CategoryEditor(this.line, null, this.span, !0), this.isAddCategory = !1, this.linkSpan.parentNode?.removeChild(this.linkSpan), this.makeLinkSpan(), this.span.appendChild(this.linkSpan)), !this.undoLink) {
      let span = make("span"), lk = make("a");
      lk.href = "#catlinks", lk.onclick = this.rollback.bind(this), lk.appendChild(make(HC.links.undo, !0)), lk.title = HC.tooltips.undo, span.appendChild(make(" ", !0)), span.appendChild(lk), this.normalLinks.appendChild(span), this.undoLink = span, state.onUpload || (catLink.style.backgroundColor = HC.bg_changed);
    }
    this.upDownLinks && (this.upDownLinks.style.display = this.lastSavedExists ? "" : "none"), this.linkSpan.style.display = "", this.state = _CategoryEditor.CHANGED, checkMultiInput(), forceRedraw();
  }
  /** 补一个隐藏的 catLink 占位。 */
  createHiddenCatLink() {
    let catLink = make("a");
    return catLink.appendChild(make("foo", !0)), catLink.style.display = "none", this.span.insertBefore(catLink, this.span.firstChild?.nextSibling ?? null), this.catLink = catLink, catLink;
  }
  commit(_msg) {
    if (this.currentCategory === this.originalCategory && (this.currentKey === this.originalKey || this.currentKey === null && !this.originalKey?.length) || site.conf.wgNamespaceNumber === 14 && this.currentCategory === site.conf.wgTitle || HC.blacklist && HC.blacklist.test(this.currentCategory)) {
      this.cancel();
      return;
    }
    if (this.close(), !state.commitButton && !state.onUpload) {
      let self = this;
      initiateEdit((failure) => {
        performChanges(failure, self);
      }, (msg) => {
        alertError(msg);
      });
    }
  }
  remove(evt) {
    return this.doRemove((evtKeys(evt) & 1) !== 0), evtKill(evt);
  }
  doRemove(noCommit) {
    if (this.isAddCategory) {
      this.cancel();
      return;
    }
    if (!state.commitButton && !state.onUpload) {
      for (let i = 0; i < state.editors.length; i++)
        if (state.editors[i].state !== _CategoryEditor.UNCHANGED) {
          setMultiInput();
          break;
        }
    }
    if (state.commitButton) {
      let catLink = this.catLink;
      catLink && (catLink.title = "", catLink.style.cssText += "; text-decoration : line-through !important;", catLink.style.backgroundColor = HC.bg_changed), this.originalState = this.state, this.state = _CategoryEditor.DELETED, this.normalLinks.style.display = "none";
      let undelLink = this.undelLink;
      undelLink && (undelLink.style.display = ""), checkMultiInput();
    } else if (state.onUpload)
      this.removeEditor();
    else {
      this.originalState = this.state, this.state = _CategoryEditor.DELETED, this.noCommit = noCommit || HC.del_needs_diff;
      let self = this;
      initiateEdit((failure) => {
        performChanges(failure, self);
      }, (msg) => {
        self.state = self.originalState ?? self.state, alertError(msg);
      });
    }
  }
  restore(evt) {
    this.catLink && (this.catLink.title = this.currentKey || "", this.catLink.style.textDecoration = ""), this.state = this.originalState ?? this.state, this.state === _CategoryEditor.UNCHANGED ? this.catLink && (this.catLink.style.backgroundColor = "transparent") : this.catLink && (this.catLink.style.backgroundColor = HC.bg_changed), this.normalLinks.style.display = "";
    let undelLink = this.undelLink;
    return undelLink && (undelLink.style.display = "none"), checkMultiInput(), evtKill(evt);
  }
  selectEngine(engineName) {
    if (this.engineSelector)
      for (let i = 0; i < this.engineSelector.options.length; i++)
        this.engineSelector.options[i].selected = this.engineSelector.options[i].value === engineName;
  }
  sanitizeInput() {
    let v = this.text.value;
    if (v = v.replace(/^(\s|_)+/, ""), new RegExp(`^(${HC.category_regexp}):`).test(v) && (v = v.substring(v.indexOf(":") + 1).replace(/^(\s|_)+/, "")), v = v.replace(/\u200E$/, ""), HC.capitalizePageNames && (v = capitalize(v)), this.text.value !== v) {
      let cursorPos = this.text.selectionStart ?? 0;
      this.text.value = v, this.text.setSelectionRange(cursorPos, cursorPos);
    }
  }
  textchange(_dont_autocomplete, force) {
    makeActive(this), this.sanitizeInput();
    let v = this.text.value, pipe = v.indexOf("|");
    if (pipe >= 0 ? (this.currentKey = v.substring(pipe + 1), v = v.substring(0, pipe)) : this.currentKey = null, this.lastInput === v && !force)
      return;
    if (this.lastInput !== v && checkMultiInput(), this.lastInput = v, this.lastRealInput = v, this.ok.disabled = !!(v.length && HC.blacklist && HC.blacklist.test(v)), state.noSuggestions) {
      this.list && (this.list.style.display = "none"), this.engineSelector && (this.engineSelector.style.display = "none"), this.icon.style.display = "none";
      return;
    }
    if (!v.length) {
      this.showSuggestions([]);
      return;
    }
    let cleanKey = v.replace(/[\u200E\u200F\u202A-\u202E]/g, "").replace(wikiTextBlankRE, " ");
    if (cleanKey = replaceShortcuts(cleanKey, HC.shortcuts), cleanKey = cleanKey.replace(/^\s+|\s+$/g, ""), !cleanKey.length) {
      this.showSuggestions([]);
      return;
    }
    this.callbackObj && (this.callbackObj.cancelled = !0);
    let engineName = Reflect.has(suggestionConfigs, this.engine) ? this.engine : "combined", dont_autocomplete = _dont_autocomplete || suggestionConfigs[engineName].noCompletion, cached = suggestionConfigs[engineName].cache[cleanKey];
    if (cached) {
      this.showSuggestions(cached, dont_autocomplete, v, engineName);
      return;
    }
    let engines = suggestionConfigs[engineName].engines;
    this.callbackObj = {
      allTitles: null,
      callsMade: 0,
      nofCalls: engines.length,
      noCompletion: dont_autocomplete,
      engineName
    }, this.makeCalls(engines, this.callbackObj, v, cleanKey);
  }
  makeCalls(engines, cb, v, cleanKey) {
    fireSuggestionRequests(this, engines, cb, v, cleanKey);
  }
  showSuggestions(titles, dontAutocomplete, queryKey, engineName) {
    this.text.readOnly = !1, this.dab = null, this.showsList = !1;
    let list = this.list;
    if (!list)
      return;
    if (state.noSuggestions) {
      list.style.display = "none", this.engineSelector && (this.engineSelector.style.display = "none"), this.icon.style.display = "none", this.inputExists = !0;
      return;
    }
    if (this.engineName = engineName, engineName ? this.engineSelector || (this.engineName = null) : this.engineSelector && (this.engineSelector.style.display = "none"), queryKey && (this.lastInput.indexOf(queryKey) || this.lastQuery && this.lastInput.indexOf(this.lastQuery) === 0 && this.lastQuery.length > queryKey.length))
      return;
    this.lastQuery = queryKey;
    let parts = this.text.value.split("|"), key = parts.length > 1 ? `|${parts[1]}` : "", v = HC.capitalizePageNames ? capitalize(parts[0]) : parts[0], vNormalized = v, knownToExist = titles && titles.exists, i;
    if (titles && (titles.normalized && queryKey && v.indexOf(queryKey) === 0 && (vNormalized = titles.normalized + v.substring(queryKey.length)), filterAndSortTitles(titles, vNormalized)), !titles || !titles.length) {
      list.style.display = "none", this.engineSelector && (this.engineSelector.style.display = "none"), engineName && !suggestionConfigs[engineName].temp && (this.icon.src = HC.existsNo, this.inputExists = !1);
      return;
    }
    let firstTitle = titles[0], completed = this.autoComplete(firstTitle, v, vNormalized, key, dontAutocomplete), existing = completed || !!knownToExist || firstTitle === replaceShortcuts(v, HC.shortcuts);
    if (engineName && !suggestionConfigs[engineName].temp && (this.icon.src = existing ? HC.existsYes : HC.existsNo, this.inputExists = existing), completed && (this.lastInput = firstTitle, titles.length === 1)) {
      list.style.display = "none", this.engineSelector && (this.engineSelector.style.display = "none");
      return;
    }
    for (; list.firstChild; )
      list.removeChild(list.firstChild);
    for (i = 0; i < titles.length; i++) {
      let opt = make("option");
      opt.appendChild(make(titles[i], !0)), opt.selected = completed && i === 0, list.appendChild(opt);
    }
    this.displayList();
  }
  displayList() {
    this.showsList = !0;
    let list = this.list;
    if (!list)
      return;
    if (!this.is_active) {
      list.style.display = "none", this.engineSelector && (this.engineSelector.style.display = "none");
      return;
    }
    let nofItems = list.options.length > HC.listSize ? HC.listSize : list.options.length;
    nofItems <= 1 && (nofItems = 2), list.size = nofItems, list.style.setProperty("align", state.is_rtl ? "right" : "left"), list.style.zIndex = "5", list.style.position = "absolute";
    let anchor = state.is_rtl ? "right" : "left", listh;
    list.style.display === "none" ? (list.style.top = `${this.text.offsetTop}px`, list.style.setProperty(anchor, "-10000px"), list.style.display = "", listh = list.offsetHeight, list.style.display = "none") : listh = list.offsetHeight;
    let maxListHeight = listh;
    nofItems < HC.listSize && (maxListHeight = listh / nofItems * HC.listSize);
    let textPos = position(this.text), nl = 0, textBoxWidth = this.text.offsetWidth || this.text.clientWidth, engineSelector = this.engineName ? this.engineSelector : void 0, nt, offset = 0;
    if (engineSelector && (engineSelector.style.zIndex = "5", engineSelector.style.position = "absolute", engineSelector.style.width = `${textBoxWidth}px`, engineSelector.style.display === "none" ? (engineSelector.style.setProperty(anchor, "-10000px"), engineSelector.style.top = "0", engineSelector.style.display = "", offset = engineSelector.offsetHeight, engineSelector.style.display = "none") : offset = engineSelector.offsetHeight, engineSelector.style.setProperty(anchor, `${nl}px`)), textPos.y < maxListHeight + offset + 1 ? (nt = this.text.offsetHeight + offset + 1, engineSelector && (engineSelector.style.top = `${this.text.offsetHeight}px`)) : (nt = -listh - offset - 1, engineSelector && (engineSelector.style.top = `${-(offset + 1)}px`)), list.style.top = `${nt}px`, list.style.width = "", list.style.setProperty(anchor, `${nl}px`), this.engineName && (this.selectEngine(this.engineName), engineSelector && (engineSelector.style.display = "")), list.style.display = "block", list.offsetWidth < textBoxWidth) {
      list.style.width = `${textBoxWidth}px`;
      return;
    }
    let scroll = scrollOffset("Left"), view_w = viewport("Width"), w = list.offsetWidth, left = position(list).x, right = left + w;
    if (left < scroll || right > scroll + view_w) {
      w > view_w && (w = view_w, list.style.width = `${w}px`, state.is_rtl ? left = right - w : right = left + w);
      let relative_offset = 0;
      left < scroll ? relative_offset = scroll - left : right > scroll + view_w && (relative_offset = -(right - scroll - view_w)), state.is_rtl && (relative_offset = -relative_offset), relative_offset && list.style.setProperty(anchor, `${nl + relative_offset}px`);
    }
  }
  autoComplete(newVal, _actVal, normalizedActVal, key, dontModify) {
    let actVal = _actVal;
    if (newVal === actVal)
      return !0;
    if (dontModify || this.ime)
      return !1;
    if (newVal.indexOf(actVal))
      if (normalizedActVal && newVal.indexOf(normalizedActVal) === 0)
        this.lastRealInput === actVal && (this.lastRealInput = normalizedActVal), actVal = normalizedActVal;
      else
        return !1;
    return this.text.focus(), this.text.value = newVal + key, this.setSelection(actVal.length, newVal.length), !0;
  }
  setSelection(from, to) {
    setSelectionRange(this, from, to);
  }
  getSelection() {
    return getSelectionRange(this);
  }
  saveView() {
    this.lastSelection = this.getSelection();
  }
  processKey(evt) {
    let dir = 0;
    switch (this.lastKey) {
      case 38:
        dir = -1;
        break;
      case 40:
        dir = 1;
        break;
      case 33:
        dir = -HC.listSize;
        break;
      case 34:
        dir = HC.listSize;
        break;
      case 27:
        return evtKill(evt);
    }
    if (dir) {
      if (this.list && this.list.style.display !== "none")
        return this.highlightSuggestion(dir), evtKill(evt);
      (this.keyCount ?? 0) <= 1 && (!this.callbackObj || this.callbackObj.callsMade === this.callbackObj.nofCalls) && this.textchange();
    }
    return !0;
  }
  highlightSuggestion(dir) {
    let list = this.list;
    if (state.noSuggestions || !list || list.style.display === "none")
      return !1;
    let curr = list.selectedIndex, tgt;
    if (dir === 0) {
      if (curr < 0 || curr >= list.options.length)
        return !1;
      tgt = curr;
    } else
      tgt = curr < 0 ? 0 : curr + dir, tgt = tgt < 0 ? 0 : tgt, tgt >= list.options.length && (tgt = list.options.length - 1);
    if (tgt !== curr || dir === 0) {
      curr >= 0 && curr < list.options.length && dir !== 0 && (list.options[curr].selected = !1), list.options[tgt].selected = !0;
      let v = this.text.value.split("|"), key = v.length > 1 ? `|${v[1]}` : "";
      (!this.autoComplete(list.options[tgt].text, this.lastRealInput, "", key, !1) || list.options[tgt].text === this.lastRealInput) && (this.text.value = list.options[tgt].text + key, this.setSelection(list.options[tgt].text.length, list.options[tgt].text.length)), this.lastInput = list.options[tgt].text, this.inputExists = !0, this.icon.src = HC.existsYes, this.state = _CategoryEditor.CHANGE_PENDING;
    }
    return !0;
  }
  resetKeySelection() {
    let list = this.list;
    if (state.noSuggestions || !list || list.style.display === "none")
      return !1;
    let curr = list.selectedIndex;
    if (curr >= 0 && curr < list.options.length) {
      list.options[curr].selected = !1;
      let v = this.text.value.split("|"), key = v.length > 1 ? `|${v[1]}` : "", result = v[0] !== this.lastInput;
      return v[0] !== this.lastRealInput && (this.text.value = this.lastRealInput + key, result = !0), this.lastInput = this.lastRealInput, result;
    }
    return !1;
  }
};
__publicField(_CategoryEditor, "UNCHANGED", 0), __publicField(_CategoryEditor, "OPEN", 1), __publicField(_CategoryEditor, "CHANGE_PENDING", 2), __publicField(_CategoryEditor, "CHANGED", 3), __publicField(_CategoryEditor, "DELETED", 4);
var CategoryEditor = _CategoryEditor;

// packages/HotCat/src/ui/setup.ts
var getCatLine = () => site.skin === "moeskin" ? document.getElementById("catlinks") : document.getElementById("mw-normal-catlinks"), getTitle = (span) => {
  if (span.firstChild?.nodeType !== Node.ELEMENT_NODE)
    return null;
  let catTitle = title(span.firstChild.href);
  return !catTitle || (catTitle = catTitle.substring(catTitle.indexOf(":") + 1).replace(/_/g, " "), HC.blacklist && HC.blacklist.test(catTitle)) ? null : catTitle;
}, closeForm = () => {
  for (let i = 0; i < state.editors.length; i++) {
    let edit = state.editors[i];
    if (edit.state === CategoryEditor.OPEN)
      edit.cancel();
    else if (edit.state === CategoryEditor.CHANGE_PENDING) {
      edit.sanitizeInput();
      let value = edit.text.value.split("|"), key = null;
      value.length > 1 && (key = value[1]);
      let v = value[0].replace(/_/g, " ").replace(/^\s+|\s+$/g, "");
      v.length ? (edit.currentCategory = v, edit.currentKey = key, edit.currentExists = edit.inputExists, edit.close()) : edit.cancel();
    }
  }
}, createEditors = (_line, is_hidden, has_hidden, chkCats, inpIndex) => {
  let line = _line, i, cats = line.getElementsByTagName("li");
  cats.length ? (state.newDOM = !0, line = cats[0].parentNode) : cats = line.getElementsByTagName("span");
  let copyCats = [], idxCopys = /* @__PURE__ */ new Map(), sTitle;
  for (i = 0; i < cats.length; i++)
    copyCats[i] = cats[i], sTitle = getTitle(copyCats[i]), sTitle && idxCopys.set(sTitle, i);
  let inpageCats = listCategorys();
  for (i = 0; i < inpageCats.length; i++) {
    let normalized = inpageCats[i].match[2].replace(wikiTextBlankRE, " ");
    HC.capitalizePageNames && (normalized = normalized.charAt(0).toUpperCase() + normalized.substring(1)), idxCopys.has(normalized) ? (new CategoryEditor(line, copyCats[idxCopys.get(normalized)], inpageCats[i].match[2], inpageCats[i].match[3], is_hidden), is_hidden && Reflect.has(inpIndex, normalized) && (chkCats.splice(chkCats.indexOf(`${HC.category_canonical}:${normalized}`), 1), Reflect.deleteProperty(inpIndex, normalized))) : is_hidden || (chkCats.push(`${HC.category_canonical}:${normalized}`), inpIndex[normalized] = i);
  }
  if (chkCats.length && (!is_hidden && !has_hidden || is_hidden)) {
    let arg_titles = chkCats.join("|");
    getJsonCallback(`${site.conf.wgServer}${site.conf.wgScriptPath}/api.php?action=query&format=json&titles=${encodeURIComponent(arg_titles)}&redirects=1&converttitles=1`, (json) => {
      let converted = json.query && json.query.converted;
      for ((!converted || converted.length < chkCats.length) && console.log(arg_titles), converted || (converted = []), i = 0; i < converted.length; i++) {
        let sTitle2 = converted[i].to.replace(`${HC.category_canonical}:`, ""), sOrginal = inpIndex[converted[i].from.replace(`${HC.category_canonical}:`, "")];
        idxCopys.has(sTitle2) ? new CategoryEditor(line, copyCats[idxCopys.get(sTitle2)], [inpageCats[sOrginal].match[2], sTitle2], inpageCats[sOrginal].match[3], is_hidden) : console.log(sTitle2);
      }
    });
  }
  return copyCats.length ? copyCats[copyCats.length - 1] : null;
}, setup = (additionalWork) => {
  var _a;
  if (state.initialized)
    return;
  state.initialized = !0, state.setupTimeout && (window.clearTimeout(state.setupTimeout), state.setupTimeout = null), (_a = state).catLine || (_a.catLine = getCatLine());
  let hiddenCats = site.skin === "moeskin" ? document.querySelector(".mw-catlinks-hidden")?.parentElement ?? null : document.getElementById("mw-hidden-catlinks");
  if (!state.catLine) {
    let footer = null;
    if (!hiddenCats && (footer = findByClass(document, "div", "printfooter"), !footer))
      return;
    state.catLine = make("div"), state.catLine.id = "mw-normal-catlinks", state.catLine.style.textAlign = state.is_rtl ? "right" : "left";
    let label = make("a");
    label.href = site.conf.wgArticlePath.replace("$1", "Special:Categories"), label.title = HC.categories, label.appendChild(make(HC.categories, !0)), state.catLine.appendChild(label), state.catLine.appendChild(make(":", !0));
    let container = hiddenCats ? hiddenCats.parentNode : getCatLine();
    container || (container = make("div"), container.id = "catlinks", footer?.parentNode?.insertBefore(container, footer.nextSibling)), container.className = "catlinks noprint", container.style.display = "", hiddenCats ? container.insertBefore(state.catLine, hiddenCats) : container.appendChild(state.catLine);
  }
  state.is_rtl && (state.catLine.dir = "rtl");
  let catLine = state.catLine, chkCats = [], inpIndex = {}, lastSpan = createEditors(catLine, !1, !!hiddenCats, chkCats, inpIndex), catList = catLine.getElementsByTagName("ul")[0];
  if (new CategoryEditor(state.newDOM && catList ? catList : catLine, null, null, lastSpan !== null, !1), !state.onUpload) {
    state.pageText !== null && hiddenCats && (state.is_rtl && (hiddenCats.dir = "rtl"), createEditors(hiddenCats, !0, !0, chkCats, inpIndex));
    let enableMulti = make("span");
    enableMulti.className = "noprint", state.is_rtl && (enableMulti.dir = "rtl"), catLine.insertBefore(enableMulti, catLine.firstChild?.nextSibling ?? null), enableMulti.appendChild(make(" ", !0)), state.multiSpan = make("span"), enableMulti.appendChild(state.multiSpan), state.multiSpan.innerHTML = `(<a>${HC.addmulti}</a>)`;
    let lk = state.multiSpan.getElementsByTagName("a")[0];
    lk.onclick = (evt) => (setMultiInput(), checkMultiInput(), evtKill(evt)), lk.title = HC.multi_tooltip, lk.style.cursor = "pointer";
  }
  state.cleanedText = null, additionalWork?.(), mw.hook("hotcat.ready").fire(), $("body").trigger("hotcatSetupCompleted");
}, setupUpload = () => {
  state.onUpload = !0;
  let ip = document.getElementById("mw-htmlform-description") || document.getElementById("wpDestFile");
  if (!ip)
    return;
  let reupload = document.getElementById("wpForReUpload"), destFile = document.getElementById("wpDestFile");
  if (reupload && reupload.value || destFile && (destFile.disabled || destFile.readOnly))
    return;
  let labelCell = make("td"), lineCell = make("td"), catLine = make("div");
  catLine.className = "catlinks", catLine.id = "catlinks", catLine.style.textAlign = state.is_rtl ? "right" : "left", catLine.style.margin = "0", catLine.style.border = "none", lineCell.appendChild(catLine), state.catLine = catLine;
  let label = null;
  if (window.UFUI && window.UIElements && window.UFUI.getLabel instanceof Function)
    try {
      label = window.UFUI.getLabel("wpCategoriesUploadLbl");
    } catch {
      label = null;
    }
  label ? (labelCell.id = "hotcatLabelTranslated", labelCell.appendChild(label)) : (labelCell.id = "hotcatLabel", labelCell.appendChild(make(HC.categories, !0))), labelCell.className = "mw-label", labelCell.style.textAlign = "right", labelCell.style.verticalAlign = "middle";
  let form = document.getElementById("upload") || document.getElementById("mw-upload-form"), table = ip;
  if (form && typeof table.insertRow == "function") {
    let newRow = table.insertRow(-1);
    newRow.appendChild(labelCell), newRow.appendChild(lineCell), form.onsubmit = /* @__PURE__ */ ((oldSubmit) => (...args) => {
      let do_submit = !0;
      if (oldSubmit && (do_submit = oldSubmit.bind(form)(...args)), !do_submit)
        return !1;
      closeForm();
      let eb = document.getElementById("wpUploadDescription") || document.getElementById("wpDesc"), addedOne = !1;
      for (let i = 0; i < state.editors.length; i++) {
        let t = state.editors[i].currentCategory;
        if (!t)
          continue;
        let key = state.editors[i].currentKey, new_cat = `[[${HC.category_canonical}:${t}${key ? `|${key}` : ""}]]`, cleanedText = stripCommentsAndNowiki(eb.value);
        findCategoryWikitext(cleanedText, t, !0) || (eb.value += `
${new_cat}`, addedOne = !0);
      }
      return addedOne && (eb.value = eb.value.replace(/\{\{subst:unc\}\}/g, "")), !0;
    })(form.onsubmit);
  }
}, createCommitForm = () => {
  if (state.commitForm)
    return;
  let format = "text/x-wiki", formContainer = make("div");
  formContainer.style.display = "none", document.body.appendChild(formContainer), formContainer.innerHTML = `<form id="hotcatCommitForm" method="post" enctype="multipart/form-data" action="${site.conf.wgScript}?title=${encodeURIComponent(site.conf.wgPageName)}&action=submit"><input type="hidden" name="wpTextbox1"><input type="hidden" name="model" value="${site.conf.wgPageContentModel}"><input type="hidden" name="format" value="${format}"><input type="hidden" name="wpSummary" value=""><input type="checkbox" name="wpMinoredit" value="1"><input type="checkbox" name="wpWatchthis" value="1"><input type="hidden" name="wpWatchlistExpiry" value=""><input type="hidden" name="wpAutoSummary" value="d41d8cd98f00b204e9800998ecf8427e"><input type="hidden" name="wpEdittime"><input type="hidden" name="wpStarttime"><input type="hidden" name="wpDiff" value="wpDiff"><input type="hidden" name="oldid" value="0"><input type="hidden" name="wpIgnoreBlankSummary" value="1"><input type="submit" name="hcCommit" value="hcCommit"><input type="hidden" name="wpEditToken"><input type="hidden" name="wpUltimateParam" value="1"><input type="hidden" name="wpChangeTags"><input type="hidden" value="ℳ𝒲♥𝓊𝓃𝒾𝒸ℴ𝒹ℯ" name="wpUnicodeCheck"></form>`, state.commitForm = document.getElementById("hotcatCommitForm");
}, getPage = () => {
  if (site.conf.wgArticleId) {
    let url = `${site.conf.wgScriptPath}/api.php?format=json&callback=HotCat.start&action=query&rawcontinue=&titles=${encodeURIComponent(site.conf.wgPageName)}&prop=info%7Crevisions&rvprop=content%7Ctimestamp%7Cids&meta=siteinfo&rvslots=main&rvlimit=1&rvstartid=${site.conf.wgCurRevisionId}`;
    getJsonCallback(url.replace("&callback=HotCat.start", ""), (json) => {
      setPage(json), setup(createCommitForm);
    }), state.setupTimeout = window.setTimeout(() => {
      setup(createCommitForm);
    }, 4e3);
  } else {
    if (site.conf.wgNamespaceNumber === 2)
      return;
    state.pageText = "", state.pageTime = null, setup(createCommitForm);
  }
}, setState = (value) => {
  let cats = value.split(`
`), catLine = state.catLine;
  if (state.initialized && state.editors.length === 1 && state.editors[0].isAddCategory && catLine) {
    let newSpans = [], before = state.editors[0].span, i;
    for (i = 0; i < cats.length; i++) {
      if (!cats[i].length)
        continue;
      let parts = cats[i].split("|"), key = parts.length > 1 ? parts[1] : null, cat = parts[0], lk = make("a");
      lk.href = wikiPagePath(`${HC.category_canonical}:${cat}`), lk.appendChild(make(cat, !0)), lk.title = cat;
      let span = make("span");
      span.appendChild(lk), i || catLine.insertBefore(make(" ", !0), before), catLine.insertBefore(span, before), i + 1 < cats.length && catLine.insertBefore(make(" | ", !0), before), newSpans.push({
        element: span,
        title: cat,
        key
      });
    }
    for (before.parentNode?.insertBefore(make(" | ", !0), before), i = 0; i < newSpans.length; i++)
      new CategoryEditor(catLine, newSpans[i].element, newSpans[i].title, newSpans[i].key);
  }
  return null;
}, getState = () => getStateWikitext(), getStateWikitext = () => {
  let result = null;
  for (let i = 0; i < state.editors.length; i++) {
    let text = state.editors[i].currentCategory, key = state.editors[i].currentKey;
    text.length && (key !== null && (text += `|${key}`), result === null ? result = text : result += `
${text}`);
  }
  return result;
};

// packages/HotCat/src/core/initialize.ts
var toBool = (value) => !!value, toText = (value, fallback) => typeof value == "string" ? value : fallback, toNumberSource = (value) => typeof value == "string" ? value : typeof value == "number" ? `${value}` : "", getEditForm = () => document.editform, configValue = (key) => window.JSconfig?.keys?.[key], initialize = () => {
  HC.dont_add_to_watchlist = window.hotcat_dont_add_to_watchlist !== void 0 ? toBool(window.hotcat_dont_add_to_watchlist) : configValue("HotCatDontAddToWatchlist") !== void 0 ? toBool(configValue("HotCatDontAddToWatchlist")) : HC.dont_add_to_watchlist, HC.no_autocommit = window.hotcat_no_autocommit !== void 0 ? toBool(window.hotcat_no_autocommit) : configValue("HotCatNoAutoCommit") !== void 0 ? toBool(configValue("HotCatNoAutoCommit")) : site.conf.wgNamespaceNumber % 2 ? !0 : HC.no_autocommit, HC.del_needs_diff = window.hotcat_del_needs_diff !== void 0 ? toBool(window.hotcat_del_needs_diff) : configValue("HotCatDelNeedsDiff") !== void 0 ? toBool(configValue("HotCatDelNeedsDiff")) : HC.del_needs_diff, HC.suggest_delay = Number(window.hotcat_suggestion_delay || configValue("HotCatSuggestionDelay") || HC.suggest_delay), HC.editbox_width = Number(window.hotcat_editbox_width || configValue("HotCatEditBoxWidth") || HC.editbox_width);
  let suggestions = window.hotcat_suggestions || configValue("HotCatSuggestions") || HC.suggestions;
  if (HC.suggestions = typeof suggestions == "string" ? suggestions : "combined", Reflect.has(suggestionConfigs, HC.suggestions) || (HC.suggestions = "combined"), HC.fixed_search = window.hotcat_suggestions_fixed !== void 0 ? toBool(window.hotcat_suggestions_fixed) : configValue("HotCatFixedSuggestions") !== void 0 ? toBool(configValue("HotCatFixedSuggestions")) : HC.fixed_search, HC.single_minor = window.hotcat_single_changes_are_minor !== void 0 ? toBool(window.hotcat_single_changes_are_minor) : configValue("HotCatMinorSingleChanges") !== void 0 ? toBool(configValue("HotCatMinorSingleChanges")) : HC.single_minor, HC.bg_changed = toText(window.hotcat_changed_background || configValue("HotCatChangedBackground"), HC.bg_changed), HC.use_up_down = window.hotcat_use_category_links !== void 0 ? toBool(window.hotcat_use_category_links) : configValue("HotCatUseCategoryLinks") !== void 0 ? toBool(configValue("HotCatUseCategoryLinks")) : HC.use_up_down, HC.listSize = parseInt(toNumberSource(window.hotcat_list_size || configValue("HotCatListSize") || HC.listSize), 10), site.conf.wgDBname !== "commonswiki" && (HC.changeTag = toText(configValue("HotCatChangeTag"), "")), HC.changeTag) {
    let eForm = getEditForm(), catRegExp = new RegExp(`^\\[\\[(${HC.category_regexp}):`), oldTxt, isMinorChange = () => {
      let newTxt = eForm?.wpTextbox1;
      if (!newTxt)
        return !1;
      let newText = newTxt.value, oldLines = oldTxt?.match(/^.*$/gm) ?? [], newLines = newText.match(/^.*$/gm) ?? [], cArr = ((aArr, bArr) => {
        let result = [], lArr, sArr;
        aArr.length < bArr.length ? (lArr = bArr, sArr = aArr) : (lArr = aArr, sArr = bArr);
        for (let i = 0; i < lArr.length; i++) {
          let item = lArr[i], ind = sArr.indexOf(item);
          ind === -1 ? result.push(item) : sArr.splice(ind, 1);
        }
        return result.concat(sArr);
      })(oldLines, newLines);
      return cArr.length && (cArr = cArr.filter((_c) => {
        let c = _c.trim();
        return !!c && !catRegExp.test(c);
      })), cArr.length ? !1 : (oldTxt = newText, !0);
    }, wpSummary = eForm?.wpSummary, wpAutoSummary = eForm?.wpAutoSummary, wpTextbox1 = eForm?.wpTextbox1;
    if (site.conf.wgAction === "submit" && site.conf.wgArticleId && wpSummary && wpAutoSummary && wpTextbox1 && document.getElementById("wikiDiff")) {
      let sum = wpSummary, sumA = wpAutoSummary;
      if (sum.value && sumA.value === HC.changeTag) {
        sumA.value = sumA.value.replace(HC.changeTag, "d41d8cd98f00b204e9800998ecf8427e");
        let $ct = $('<input type="hidden" name="wpChangeTags">').val(HC.changeTag);
        $(eForm).append($ct), oldTxt = wpTextbox1.value, $("#wpSave").one("click", () => {
          $ct.val() && (sum.value = sum.value.replace(HC.messages.using || HC.messages.prefix, ""));
        });
        let removeChangeTag = () => {
          $(wpTextbox1).add(sum).one("input", () => {
            window.setTimeout(() => {
              isMinorChange() ? removeChangeTag() : $ct.val("");
            }, 500);
          });
        };
        removeChangeTag();
      }
    }
  }
  (isNaN(HC.listSize) || HC.listSize < 5) && (HC.listSize = 5), HC.listSize = Math.min(HC.listSize, 30);
  for (let key in HC.engine_names)
    Reflect.has(suggestionConfigs, key) && HC.engine_names[key] && (suggestionConfigs[key].name = HC.engine_names[key]);
  let isRtl = hasClass(document.body, "rtl");
  isRtl || (isRtl = document.defaultView.getComputedStyle(document.body, null).getPropertyValue("direction") === "rtl"), state.is_rtl = isRtl;
};

// packages/HotCat/src/core/run.ts
var reallyRun = () => {
  if (initialize(), !HC.upload_disabled && site.conf.wgNamespaceNumber === -1 && site.conf.wgCanonicalSpecialPageName === "Upload" && site.conf.wgUserName)
    setupUpload(), setup(() => {
      window.UploadForm && window.UploadForm.previous_hotcat_state && (window.UploadForm.previous_hotcat_state = setState(window.UploadForm.previous_hotcat_state));
    });
  else {
    if (!site.conf.wgIsArticle || site.conf.wgAction !== "view" || param("diff") !== null || param("oldid") !== null || !mw.config.get("wgIsProbablyEditable") || HC.disable())
      return;
    if (!HC.isSupportedContentModel()) {
      let issueURL = new URL("https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/issues/new?template=BLANK_ISSUE");
      issueURL.searchParams.set("title", "[HOTCAT] 未知的 contentModel"), issueURL.searchParams.set("body", `页面 <${new URL(`/${site.conf.wgPageName}`, location.href)}> 使用了未知的 contentModel \`${site.conf.wgPageContentModel}\`，导致 HotCat 无法正常工作。请调查这个问题。`), console.warn(`[HOTCAT] 本页面 <${site.conf.wgPageName}> 使用了未知的 contentModel "${site.conf.wgPageContentModel}"。如果你看到此信息，请报告此问题至 ${issueURL.toString()}`);
    }
    getPage();
  }
}, run = () => {
  HC.started || (HC.started = !0, reallyRun());
};

// packages/HotCat/src/index.ts
window.hotcat_translations_from_commons = !1;
var bootstrap = async () => {
  await $.ready;
  let conf = mw.config.values;
  if (site.conf = conf, window.HotCat && !window.HotCat.nodeName || conf.wgAction === "edit")
    return;
  site.expandedScriptPrefix = new URL(conf.wgScript, location.href).href, site.expandedArticlePrefix = new URL(conf.wgArticlePath.replace("$1", ""), location.href).href;
  let autopatrol = (await mw.user.getRights()).includes("autopatrol");
  site.skin = conf.skin;
  let ua = navigator.userAgent.toLowerCase();
  site.isWebkit = /applewebkit\/\d+/.test(ua) && !ua.includes("spoofer"), window.hotcat_no_autocommit = !autopatrol, window.hotcat_del_needs_diff = !autopatrol, HC.no_autocommit = !autopatrol, HC.del_needs_diff = !autopatrol, window.HotCat = HC, applyLocalization(), initLocalization(), window.hotcat_get_state = () => getState(), window.hotcat_set_state = (value) => setState(value), window.hotcat_close_form = () => {
    closeForm();
  }, HC.runWhenReady = (callback) => {
    mw.hook("hotcat.ready").add(callback);
  }, mw.config.set("disableAJAXCategories", !0), conf.wgCanonicalSpecialPageName !== "Upload" && mw.hook("postEdit").add(() => {
    state.catLine = null, state.editors = [], state.initialized = !1, HC.started = !1, run();
  }), run();
};
bootstrap();
