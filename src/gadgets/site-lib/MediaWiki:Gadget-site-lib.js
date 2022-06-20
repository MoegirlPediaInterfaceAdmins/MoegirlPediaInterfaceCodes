"use strict";
window.wgUXS = function(wg, hans, hant, cn, tw, hk, sg, zh, mo, my) {
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

window.wgULS = function(hans, hant, cn, tw, hk, sg, zh, mo, my) {
    return wgUXS(mw.config.get("wgUserLanguage"), hans, hant, cn, tw, hk, sg, zh, mo, my);
};

window.wgUVS = function(hans, hant, cn, tw, hk, sg, zh, mo, my) {
    return wgUXS(mw.config.get("wgUserVariant"), hans, hant, cn, tw, hk, sg, zh, mo, my);
};

/**
 * Map addPortletLink to mw.util 
 *
 * @deprecated: Use mw.util.addPortletLink instead.
 */
mw.log.deprecate(window, "addPortletLink", function() {
    return mw.util.addPortletLink.apply(mw.util, arguments);
}, "Use mw.util.addPortletLink() instead");

/**
 * Extract a URL parameter from the current URL
 *
 * @deprecated: Use mw.util.getParamValue with proper escaping
 */
mw.log.deprecate(window, "getURLParamValue", function() {
    return mw.util.getParamValue.apply(mw.util, arguments);
}, "Use mw.util.getParamValue() instead");

/** 
 * Test if an element has a certain class
 *
 * @deprecated:  Use $(element).hasClass() instead.
 */
mw.log.deprecate(window, "hasClass", (element, className) => {
    return $(element).hasClass(className);
}, "Use jQuery#hasClass instead");

mw.log.deprecate(window, "importScriptCallback", (page, ready) => {
    $.ajax({
        url: `${mw.config.get("wgServer") + mw.config.get("wgScript") }?title=${ mw.util.wikiUrlencode(page) }&action=raw&ctype=text/javascript`,
        dataType: "script",
        crossDomain: !0,
        cache: !0,
        success: ready,
    });
}, "Use jQuery.ajax with dataType `script` instead");

mw.log.deprecate(window, "importScriptURICallback", (page, ready) => {
    $.ajax({
        url: page,
        dataType: "script",
        crossDomain: !0,
        cache: !0,
        success: ready,
    });
}, "Use jQuery.ajax with dataType `script` instead");