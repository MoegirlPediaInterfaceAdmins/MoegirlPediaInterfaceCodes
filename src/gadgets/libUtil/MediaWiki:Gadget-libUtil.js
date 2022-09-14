/**
 * @source https://commons.wikimedia.org/wiki/_?oldid=574282150
 * 更新后请同步更新上面链接到最新版本
 */
"use strict";
(() => {
    if (!mw.libs.commons) {
        mw.libs.commons = {};
    }
    const lc = mw.libs.commons;
    $.extend(mw.libs.commons, {
        guessUser: () => {
            const user = mw.config.get("wgRelevantUserName");
            let title, target;
            if (user) {
                return user;
            }
            switch (mw.config.get("wgNamespaceNumber")) {
                case 3: // User_talk
                case 2: { // User
                    return mw.config.get("wgPageName").match(/.*?:(.*?)(\/.*)*$/)[1];
                }
                case -1: {// Special pages
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
                    } catch { }
                    break;
                }
            }
        },
        monthNamesInSiteLang: ["", "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
        formatDate: (fmt, _date, fallbackDate) => {
            const pad0 = (n) => `${n}`.padStart(2, "0"); // zero-pad to two digits
            let date = _date || fallbackDate || new Date();
            const month = date.getUTCMonth() + 1;
            let str = fmt.replace(/YYYY/g, date.getUTCFullYear());
            str = str.replace(/MM/g, pad0(month));
            date = date.getUTCDate();
            str = str.replace(/DD/g, pad0(date));
            str = str.replace(/MON/g, lc.monthNamesInSiteLang[month]);
            str = str.replace(/DAY/g, date);
            return str;
        },
        getTalkPageFromTitle: (_title) => {
            const rens = /^(.+):/;
            let pref = _title.match(rens), nsid = -1;
            let title = _title;
            if (pref) {
                pref = pref[1].toLowerCase().replace(/ /g, "_");
            } else {
                pref = "";
            }
            nsid = mw.config.get("wgNamespaceIds")[pref];
            // If it was not a talk page, increment namespace id
            if (0 === nsid % 2) {
                nsid++;
            }
            const newPref = `${mw.config.get("wgFormattedNamespaces")[nsid]}:`;
            if (pref) {
                title = title.replace(/^.+:/, newPref);
            } else {
                title = newPref + title;
            }
            return title;
        },
        titleFromImgSrc: (src) => {
            mw.log.warn(".titleFromImgSrc() is deprecated. Use mw.Title.newFromImg() instead.");
            try {
                return decodeURIComponent(src).match(/\/[a-f0-9]\/[a-f0-9]{2}\/(\S+\.\S{2,5})\//)[1].replace(/_/g, " ");
            } catch {
                try {
                    return decodeURIComponent(src).match(/thumb\.php.*(?:\?|&)f=(\S+\.\S{2,5})(?:&.+)?$/)[1].replace(/_/g, " ");
                } catch {
                    try {
                        return decodeURIComponent(src).match(/\/[a-f0-9]\/[a-f0-9]{2}\/(\S+\.\S{2,5})$/)[1].replace(/_/g, " ");
                    } catch { }
                }
            }
        },
    });
})();
