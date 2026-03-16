"use strict";
window.wgUXS = (wg, hans, hant, cn, tw, hk, sg, zh, mo, my) => {
    const ret = {
        zh: zh || hans || hant || cn || tw || hk || sg || mo || my,
        "zh-hans": hans || cn || sg || my,
        "zh-hant": hant || tw || hk || mo,
        "zh-cn": cn || hans || sg || my,
        "zh-sg": sg || hans || cn || my,
        "zh-tw": tw || hant || hk || mo,
        "zh-hk": hk || hant || mo || tw,
        "zh-mo": mo || hant || hk || tw,
    };
    return ret[wg] || zh || hans || hant || cn || tw || hk || sg || mo || my; // 保證每一語言有值
};

window.wgULS = (hans, hant, cn, tw, hk, sg, zh, mo, my) => window.wgUXS(mw.config.get("wgUserLanguage"), hans, hant, cn, tw, hk, sg, zh, mo, my);

window.wgUVS = (hans, hant, cn, tw, hk, sg, zh, mo, my) => window.wgUXS(mw.config.get("wgUserVariant"), hans, hant, cn, tw, hk, sg, zh, mo, my);

/**
 * Map addPortletLink to mw.util
 *
 * @deprecated: Use mw.util.addPortletLink instead.
 */
mw.log.deprecate(window, "addPortletLink", (...args) => mw.util.addPortletLink.bind(mw.util)(...args), "Use mw.util.addPortletLink() instead");

/**
 * Extract a URL parameter from the current URL
 *
 * @deprecated: Use mw.util.getParamValue with proper escaping
 */
mw.log.deprecate(window, "getURLParamValue", (...args) => mw.util.getParamValue.bind(mw.util)(...args), "Use mw.util.getParamValue() instead");

/**
 * Test if an element has a certain class
 *
 * @deprecated:  Use $(element).hasClass() instead.
 */
mw.log.deprecate(window, "hasClass", (element, className) => $(element).hasClass(className), "Use jQuery#hasClass instead");

// eslint-disable-next-line promise/prefer-await-to-then
mw.log.deprecate(window, "importScriptCallback", (page, ready) => libCachedCode.injectCachedCode(`${mw.config.get("wgServer")}${mw.config.get("wgScript")}?title=${mw.util.wikiUrlencode(page)}&action=raw&ctype=text/javascript`, "script").then(ready), "Use `await libCachedCode.injectCachedCode(page, \"script\")` instead");

// eslint-disable-next-line promise/prefer-await-to-then
mw.log.deprecate(window, "importScriptURICallback", (page, ready) => libCachedCode.injectCachedCode(page, "script").then(ready), "Use `await libCachedCode.injectCachedCode(page, \"script\")` instead");

window.libPrefixNumber = (num, length = 2) => `${num}`.padStart(length, "0");

const {
    wgNamespaceNumber,
    wgNamespaceIds,
} = mw.config.get([
    "wgNamespaceNumber",
    "wgNamespaceIds",
]);

window.libGetPageNames = () => {
    const result = {
        talkPage: false,
        basePageName: false,
    };
    const ns = [];
    const talkNamespaceNumber = wgNamespaceNumber < 0 || wgNamespaceNumber % 2 === 1 ? NaN : wgNamespaceNumber + 1;
    let talkns = "";
    for (const [k, v] of Object.entries(wgNamespaceIds)) {
        if (v === wgNamespaceNumber) {
            ns.push(k);
        }
        if (!talkns && v === talkNamespaceNumber) {
            talkns = k;
        }
    }
    if (ns.length === 0) {
        return result;
    }
    let page = mw.config.get("wgPageName");
    const pageToLowerCase = page.toLowerCase();
    for (const n of ns) {
        const nsPrefix = `${n.toLowerCase()}:`;
        if (pageToLowerCase.startsWith(nsPrefix)) {
            const escapedNs = mw.util.escapeRegExp(n);
            page = page.replace(new RegExp(`^${escapedNs}:`, "i"), "");
            break;
        }
    }
    result.basePageName = page;
    if (talkns) {
        result.talkPage = `${talkns}:${page}`;
    }
    return result;
};

window.wgGetEditRequestPreload = (pageName = mw.config.get("wgPageName"), basePageName = window.libGetPageNames().basePageName) => basePageName !== false && /^MediaWiki:Conversiontable\/zh-[a-z]+$/.test(pageName) ? `Template:编辑请求/${basePageName}` : "Template:编辑请求/comment";
