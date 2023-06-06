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
    return ret[wg] || zh || hans || hant || cn || tw || hk || sg || mo || my; //保證每一語言有值
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

mw.log.deprecate(window, "importScriptCallback", (page, ready) => libCachedCode.injectCachedCode(`${mw.config.get("wgServer")}${mw.config.get("wgScript")}?title=${mw.util.wikiUrlencode(page)}&action=raw&ctype=text/javascript`, "script").then(ready), "Use `await libCachedCode.injectCachedCode(page, \"script\")` instead");

mw.log.deprecate(window, "importScriptURICallback", (page, ready) => libCachedCode.injectCachedCode(page, "script").then(ready), "Use `await libCachedCode.injectCachedCode(page, \"script\")` instead");
