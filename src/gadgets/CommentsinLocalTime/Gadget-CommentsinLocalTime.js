/**
 * @file 引自 [[enwp:Special:Permalink/1029979061]]，[[User:AnnAngela]] 作了较大幅度修改，参见[[Help:以本地时区显示签名时间]]
 */
// <pre>
/**
 * Comments in local time
 * [[User:Mxn/CommentsInLocalTime]]
 *
 * Adjust timestamps in comment signatures to use easy-to-understand, relative
 * local time instead of absolute UTC time.
 *
 * Inspired by [[Wikipedia:Comments in Local Time]].
 *
 * @author [[User:Mxn]]
 */
"use strict";
$(() => {
    const format = (then, type) => {
        switch (type) {
            case "fromToNow": {
                const now = moment().startOf("minute");
                const isBefore = then.isBefore(now);
                let diff = now.diff(then);
                let result = "";
                const units = [
                    { label: "年", duration: 365 * 24 * 60 * 60 * 1000 },
                    { label: "个月", duration: 30 * 24 * 60 * 60 * 1000 },
                    { label: "天", duration: 24 * 60 * 60 * 1000 },
                ];
                for (const unit of units) {
                    if (diff >= unit.duration) {
                        const value = Math.floor(diff / unit.duration);
                        diff -= value * unit.duration;
                        if (value > 0) {
                            result += `${value}${unit.label}`;
                        }
                    }
                }
                if (result === "") {
                    result = "0个月0天";
                }
                return result + (isBefore ? "前" : "后");
            }
            case "HourMinuteTimezone":
                return `${then.format(window.LocalComments.twentyFourHours || mw.config.get("LocalComments", {}).twentyFourHours ? "a hh:mm" : " LT")} (UTC+${then.utcOffset() / 60})`.replace("(UTC+-", "(UTC-");
            case "YearMonthDayDayofweek":
                return then.format("YYYY[年]M[月]D[日] dddd");
        }
    };
    const display = (then) => then.calendar(null, {
        sameDay: () => `[今天${format(then, "HourMinuteTimezone")}]`,
        nextDay: () => `[明天${format(then, "HourMinuteTimezone")}]`,
        nextWeek: () => `[${format(then, "YearMonthDayDayofweek")} (${format(then, "fromToNow")}) ${format(then, "HourMinuteTimezone")}]`,
        lastDay: () => `[昨天${format(then, "HourMinuteTimezone")}]`,
        lastWeek: () => `[${format(then, "YearMonthDayDayofweek")} (${format(then, "fromToNow")}) ${format(then, "HourMinuteTimezone")}]`,
        sameElse: () => `[${format(then, "YearMonthDayDayofweek")} (${format(then, "fromToNow")}) ${format(then, "HourMinuteTimezone")}]`,
    });
    window.LocalComments = {
        enabled: true,
        formats: {
            day: display,
            week: display,
            other: display,
        },
        tooltipFormats: [
            (_, originalText) => `原始时间戳：${originalText}`,
            "[年月日星时：]LLLL",
            "[ISO 8601式：]YYYY-MM-DDTHH:mmZ",
        ],
        dynamic: true,
        excludeNamespaces: Object.keys(mw.config.get("wgFormattedNamespaces")).map((ns) => +ns).filter((ns) => ns < 0 || ns % 2 === 0),
        proseTags: ["dd", "li", "p", "td"],
        codeTags: ["code", "input", "pre", "textarea", "#mw-content-text > .diff"],
        parseFormat: ["YYYY-MM-DD HH:mm"],
        parseRegExp: /[1-9]\d{3}年(?:0?[1-9]|1[012])月(?:0?[1-9]|[12]\d|3[01])日 *(?:[(（](?:[金木水火土日月]|(?:星期)?[一二三四五六日])[)）])? *(?:[01]\d|2[0-3]):(?:[0-5]\d)(?::[0-5]\d)? *[(（]([CJ]ST|UTC(?:[+-](?:[1-9]|1[012]))?)[)）]/,
        utcOffset: 0,
        ...window.LocalComments,
    };
    if (!window.LocalComments.enabled
        || window.LocalComments.excludeNamespaces.includes(mw.config.get("wgNamespaceNumber")) || !["view", "submit"].includes(mw.config.get("wgAction"))) {
        return;
    }
    const timezoneAbbrs = {
        CST: 8,
        JST: 9,
        UTC: 0,
    };
    for (let i = 1; i <= 12; i++) {
        timezoneAbbrs[`UTC+${i}`] = i;
        timezoneAbbrs[`UTC-${i}`] = -i;
    }
    const proseTags = window.LocalComments.proseTags.join("\n").toUpperCase().split("\n");
    const codeTags = [...window.LocalComments.codeTags, "time"].join(", ");
    const formatMoment = (then, fmt, originalText) => fmt instanceof Function ? fmt(then, originalText) : then.format(fmt);
    const formatTimestamp = () => {
        document.querySelectorAll(".LocalComments").forEach((elt) => {
            const iso = elt.getAttribute("datetime");
            const then = moment(iso, moment.ISO_8601);
            const now = moment();
            const withinHours = Math.abs(then.diff(now, "hours", true)) <= moment.relativeTimeThreshold("h");
            const { formats } = window.LocalComments;
            let text;
            if (withinHours) {
                text = formatMoment(then, formats.day || formats.other, elt.dataset.originalText);
            } else {
                const dayDiff = then.diff(moment().startOf("day"), "days", true);
                if (dayDiff > -6 && dayDiff < 7) {
                    text = formatMoment(then, formats.week || formats.other, elt.dataset.originalText);
                } else {
                    text = formatMoment(then, formats.other, elt.dataset.originalText);
                }
            }
            elt.innerText = text;
            elt.title = window.LocalComments.tooltipFormats.map((fmt) => formatMoment(then, fmt, elt.dataset.originalText)).join("\n");
        });
    };
    /**
     * @param {number} _
     * @param {HTMLElement} root
     */
    const parser = (_, root) => {
        if (!root || !Reflect.has(document, "createNodeIterator")) {
            return;
        }
        const iter = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                const isInProse = proseTags.includes(node.parentElement.nodeName) || !$(node).closest(codeTags).length;
                const isDateNode = isInProse && window.LocalComments.parseRegExp.test(node.data);
                return isDateNode ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
        });
        /**
         * @type {Text}
         */
        let prefixNode = iter.nextNode();
        while (prefixNode) {
            /**
             * @type {RegExpExecArray}
             */
            const result = window.LocalComments.parseRegExp.exec(prefixNode.nodeValue);
            if (!result) {
                continue;
            }
            const dateNode = prefixNode.splitText(result.index);
            dateNode.splitText(result[0].length);
            const timezoneAbbr = Array.from(result).slice(1).filter((abbr) => !!abbr)[0];
            const then = moment.utc(result[0], window.LocalComments.parseFormat);
            if (then.isValid()) {
                if (Reflect.has(timezoneAbbrs, timezoneAbbr)) {
                    then.utcOffset(timezoneAbbrs[timezoneAbbr], true);
                }
                const timeElt = document.createElement("time");
                timeElt.classList.add("LocalComments");
                timeElt.setAttribute("datetime", then.toISOString());
                timeElt.dataset.originalText = result[0];
                dateNode.before(timeElt);
                dateNode.remove();
            } else {
                const errorEle = document.createElement("time");
                errorEle.classList.add("error", "explain");
                errorEle.title = "该日期有误，请检查";
                errorEle.innerText = `该日期有误，请检查：${result[0]}`;
                dateNode.nodeValue = "";
                dateNode.before(errorEle);
                errorEle.append(dateNode);
            }
            prefixNode = iter.nextNode();
        }
    };
    // await Promise.all([
    //     mw.loader.using(["moment"]),
    //     $.ready,
    // ]);
    $(".mw-parser-output").each(parser);
    mw.hook("wikipage.content").add(($content) => {
        $content.each(parser);
    });
    formatTimestamp();
    if (!window.LocalComments.dynamic) {
        return;
    }
    setTimeout(() => {
        formatTimestamp();
        setInterval(formatTimestamp, 60 * 1000);
    }, 60000 - Date.now() % 60000);
});
// </pre>
