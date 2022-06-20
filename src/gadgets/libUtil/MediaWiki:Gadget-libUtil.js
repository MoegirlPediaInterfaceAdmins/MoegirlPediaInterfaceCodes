/**
 * https://commons.wikimedia.org/w/index.php?oldid=574282150
 */
"use strict";
(function () {
    if (!mw.libs.commons) {
        mw.libs.commons = {};
    }
    var lc = mw.libs.commons;
    $.extend(mw.libs.commons, {
        guessUser: function () {
            var user = mw.config.get("wgRelevantUserName");
            var title, target;
            if (user) {
                return user;
            }
            switch (mw.config.get("wgNamespaceNumber")) {
                case 3: // User_talk
                case 2: // User
                    return mw.config.get("wgPageName")
                        .match(/.*?:(.*?)(\/.*)*$/)[1];
                case -1: // Special pages
                    try {
                        switch (mw.config.get("wgCanonicalSpecialPageName")) {
                            case "CentralAuth": // T131740
                                target = mw.util.getParamValue("target");
                                if (target) {
                                    return target;
                                }
                                title = mw.util.getParamValue("title");
                                if (title) {
                                    title = title.match(/Special:(?:CentralAuth)\/(.*)$/);
                                    if (title) {
                                        return title[1];
                                    }
                                }
                                if (/Special:(?:CentralAuth)\//.test(location.href)) {
                                    return decodeURIComponent(location.href.match(/Special:(?:CentralAuth)\/(.*?)(?:[?&].*)?$/)[1]);
                                }
                                break;
                            case "Log":
                                if (mw.util.getParamValue("page") && /User:+./.test(mw.util.getParamValue("page"))) {
                                    return mw.util.getParamValue("page")
                                        .replace("User:", "");
                                }
                                break;
                        }
                    }
                    catch (ex) { }
                    break;
            }
        },
        monthNamesInSiteLang: ["", "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
        formatDate: function (fmt, _date, fallbackDate) {
            var pad0 = function (s) {
                return s > 9 ? s : "0" + s;
            }; // zero-pad to two digits
            var date = _date || fallbackDate || new Date();
            var month = date.getUTCMonth() + 1;
            var str = fmt.replace(/YYYY/g, date.getUTCFullYear());
            str = str.replace(/MM/g, pad0(month));
            date = date.getUTCDate();
            str = str.replace(/DD/g, pad0(date));
            str = str.replace(/MON/g, lc.monthNamesInSiteLang[month]);
            str = str.replace(/DAY/g, date);
            return str;
        },
        getTalkPageFromTitle: function (_title) {
            var rens = /^(.+):/;
            var pref = _title.match(rens), nsid = -1;
            var title = _title;
            if (pref) {
                pref = pref[1].toLowerCase().replace(/ /g, "_");
            }
            else {
                pref = "";
            }
            nsid = mw.config.get("wgNamespaceIds")[pref];
            // If it was not a talk page, increment namespace id
            if (0 === nsid % 2) {
                nsid++;
            }
            var newPref = mw.config.get("wgFormattedNamespaces")[nsid] + ":";
            if (pref) {
                title = title.replace(/^.+:/, newPref);
            }
            else {
                title = newPref + title;
            }
            return title;
        },
        titleFromImgSrc: function (src) {
            mw.log.warn(".titleFromImgSrc() is deprecated. Use mw.Title.newFromImg() instead.");
            try {
                return decodeURIComponent(src).match(/\/[a-f0-9]\/[a-f0-9]{2}\/(\S+\.\S{2,5})\//)[1].replace(/_/g, " ");
            }
            catch (ex) {
                try {
                    return decodeURIComponent(src).match(/thumb\.php.*(?:\?|&)f=(\S+\.\S{2,5})(?:&.+)?$/)[1].replace(/_/g, " ");
                }
                catch (ex2) {
                    try {
                        return decodeURIComponent(src).match(/\/[a-f0-9]\/[a-f0-9]{2}\/(\S+\.\S{2,5})$/)[1].replace(/_/g, " ");
                    }
                    catch (ex3) { }
                }
            }
        },
    });
}());