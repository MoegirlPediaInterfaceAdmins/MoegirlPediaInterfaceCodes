"use strict";
$(() => (async () => {
    /**
     * 等待正文就位。
     * MoeSkin 会把正文预置在 `<template id="MOE_SKIN_TEMPLATE_BODYCONTENT">` 里，
     * 等皮肤脚本启动后才克隆进 `#app`；因此在 jQuery ready 时 `#mw-content-text`
     * 可能尚不存在，此时依赖正文的选择器会全部落空，小工具表现为静默不加载。
     * 正文就位后皮肤会触发 `wikipage.content` 钩子，已在文档中时直接返回。
     * @returns {Promise<void>}
     */
    const waitForContent = async () => {
        /**
         * @returns {Element | null}
         */
        const isContentReady = () => document.querySelector("#mw-content-text > fieldset > p");
        if (isContentReady()) {
            return;
        }
        await new Promise((resolve) => {
            const handler = () => {
                if (!isContentReady()) {
                    return;
                }
                mw.hook("wikipage.content").remove(handler);
                resolve();
            };
            mw.hook("wikipage.content").add(handler);
            // 注册后立刻补查一次：若钩子恰在“检查”与“注册”之间触发，不至于永远等待
            handler();
        });
    };
    const {
        wgUserGroups,
        wgCanonicalSpecialPageName,
        wgUserName,
        wgAbuseFilterVariables,
    } = mw.config.get([
        "wgUserGroups",
        "wgCanonicalSpecialPageName",
        "wgUserName",
        "wgAbuseFilterVariables",
    ]);
    if (!wgUserGroups.includes("sysop") && !wgUserGroups.includes("staff")) {
        return;
    }
    if (wgCanonicalSpecialPageName !== "AbuseLog") {
        return;
    }
    // 日志列表页同样是 AbuseLog，但没有具体条目，也就没有该变量
    if (!wgAbuseFilterVariables) {
        return;
    }
    await waitForContent();
    const timestampVar = wgAbuseFilterVariables.timestamp;
    const userName = wgAbuseFilterVariables.user_name;
    const pagePrefixedtitle = wgAbuseFilterVariables.page_prefixedtitle;
    const filter = +[...document.querySelectorAll('a[href*="/Special:%E6%BB%A5%E7%94%A8%E8%BF%87%E6%BB%A4%E5%99%A8/"]')].filter(({ href }) => /%E6%BB%A5%E7%94%A8%E8%BF%87%E6%BB%A4%E5%99%A8\/[1-9]\d*$/.test(href))?.[0]?.href?.match?.(/[1-9]\d*$/)?.[0];
    if (timestampVar.length === 0 || userName.length === 0 || pagePrefixedtitle.length === 0 || !filter) {
        return;
    }
    const symbolEnter = (str) => typeof str === "string" ? str.replace(/\n/g, "↵") : str;
    const api = new mw.Api();
    const pTable = $("<table/>");
    $("#mw-content-text > fieldset > p:first").after(pTable.css("width", "100%").addClass("wikitable"));
    pTable.empty().append("<tbody><tr><td style=\"text-align: center;\">加载中(<span id=\"abusefiltertest-progress\">0</span>/2)……</td></tr></tbody>");
    const progress = $("#abusefiltertest-progress");
    try {
        const __details = (await api.post({
            action: "query",
            assertuser: wgUserName,
            list: "abuselog",
            afluser: userName,
            afltitle: pagePrefixedtitle,
            aflprop: "details",
            aflfilter: filter,
        })).query.abuselog;
        if (__details.length === 0) {
            throw "无法找到对应用户名和页面标题的滥用过滤器日志";
        }
        progress.text(1);
        const _details = Array.from(new Map(__details.filter(({ details: { timestamp } }) => timestampVar === timestamp).map((n) => [JSON.stringify(n.details), n])).values());
        if (_details.length === 0) {
            console.info(__details);
            throw "无法找到对应时间戳的滥用过滤器日志";
        }
        progress.text(2);
        const _rules = (await api.post({
            action: "query",
            assertuser: wgUserName,
            list: "abusefilters",
            abfstartid: filter,
            abfendid: filter,
            abfprop: "pattern",
        })).query.abusefilters[0].pattern.replace(/\r/g, "");
        const _stringRules = Array.from(_rules.match(/\/\* string rule start \*\/[\s\S]+?(?=\/\* string rule end \*\/)/g) || []).map((r) => r.replace(/\/\* regex rule start \*\//g, "").split("\n")).flat().map((r) => r.replace(/^ *"?/, "").replace(/"?,? *$/, "")).filter((r) => r !== "");
        const stringRules = new Set(_stringRules);
        const _regexRules = Array.from(_rules.match(/\/\* regex rule start \*\/[\s\S]+?(?=\/\* regex rule end \*\/)/g) || []).map((r) => r.replace(/\/\* regex rule start \*\//g, "").split("\n") || []).flat().map((r) => r.replace(/^ *"?/, "").replace(/"?,? *$/, "")).filter((r) => r !== "");
        const regexRules = new Set(_regexRules);
        if (stringRules.size + regexRules.size === 0) {
            throw "无法找到符合格式的规则";
        }
        for (const { details } of _details) {
            const sources = [];
            // added_lines 为空数组代表本次编辑没有新增内容，此时不应回落到整篇 new_wikitext，
            // 否则未改动的正文里命中规则也会被当成新增内容命中。
            let body;
            if (Array.isArray(details.added_lines)) {
                body = details.added_lines.join("\n");
            } else if (typeof details.added_lines === "string") {
                body = details.added_lines;
            } else {
                body = details.new_wikitext;
            }
            if (typeof body === "string" && body !== "") {
                sources.push({ label: "正文", text: body });
            }
            if (typeof details.summary === "string" && details.summary !== "") {
                sources.push({ label: "编辑摘要", text: details.summary });
            }
            const result = [];
            const table = $("<table/>").css("width", "100%").addClass("wikitable abusefiltertest").hide();
            pTable.after(table);
            for (const { label: source, text } of sources) {
                for (const sr of stringRules.values()) {
                    if (!text.includes(sr)) {
                        continue;
                    }
                    const splits = text.split(sr);
                    let splitStart = 0;
                    splits.forEach((str, i) => {
                        if (i === splits.length - 1) {
                            return;
                        }
                        const matchStart = splitStart + str.length;
                        const next = splits[i + 1];
                        const start = Math.max(0, str.length - 20);
                        const end = Math.min(next.length, 20);
                        result.push({
                            isRegex: false,
                            source,
                            rule: sr,
                            matchStart,
                            before: str.substring(start, start + 20),
                            string: sr,
                            after: next.substring(0, end),
                            start,
                        });
                        splitStart = matchStart + sr.length;
                    });
                }
                for (const rr of regexRules.values()) {
                    const regex = RegExp(`.{0,20}${rr}.{0,20}`, "ig");
                    const findstring = RegExp(rr, "ig");
                    if (regex.test(text)) {
                        const splits = text.match(regex);
                        let lastFromIndex = 0;
                        splits.forEach((str) => {
                            const string = str.match(findstring)[0];
                            const split = str.split(string);
                            const before = split[0];
                            const after = split.slice(1).join(string);
                            const start = text.indexOf(string, lastFromIndex);
                            lastFromIndex = start + string.length;
                            result.push({
                                isRegex: true,
                                source,
                                rule: rr,
                                matchStart: start,
                                before,
                                string,
                                after,
                                start,
                            });
                        });
                    }
                }
            }
            table.empty();
            if (result.length > 0) {
                table.append(`<caption style="font-weight: 700;">命中滥用过滤器${filter}的内容</caption><tr><th style="text-align: right;">规则（请勿泄漏！！！）</th><th style="text-align: center;">命中位置</th><th style="text-align: left;">命中字符串上下文</th></tr>`);
                const sourceOrder = new Map(sources.map(({ label }, i) => [label, i]));
                result.sort((a, b) => sourceOrder.get(a.source) - sourceOrder.get(b.source) || a.matchStart - b.matchStart);
                const results = [];
                result.forEach((r) => {
                    if (results.filter(({ source: s, isRegex, rule, matchStart }) => s === r.source && isRegex === r.isRegex && rule === r.rule && matchStart === r.matchStart).length === 0) {
                        results.push(r);
                    }
                });
                console.info(results);
                results.forEach(({ isRegex, source, rule, before, string, after, start }) => {
                    const tr = $("<tr/>");
                    const ruleCell = $("<td/>");
                    const ruleCode = $("<code/>");
                    ruleCode.text(rule);
                    ruleCell.addClass("mw-label");
                    ruleCell.text(isRegex ? "正则表达式" : "字符串");
                    ruleCell.append(symbolEnter(ruleCode)).append("：");
                    tr.append(ruleCell);
                    const sourceCell = $("<td/>");
                    sourceCell.addClass("mw-label").text(source);
                    tr.append(sourceCell);
                    const input = $("<td/>");
                    input.addClass("mw-input");
                    const beforeSpan = $("<span/>");
                    beforeSpan.text(symbolEnter(before)).css({
                        padding: "0 .25em",
                    });
                    const strSpan = $("<span/>");
                    strSpan.text(symbolEnter(string)).css({
                        "font-weight": "700",
                        "text-decoration": "underline",
                        // "border-left": "1px solid #a2a9b1",
                        padding: "0 .25em",
                    });
                    const afterSpan = $("<span/>");
                    afterSpan.text(symbolEnter(after)).css({
                        // "border-left": "1px solid #a2a9b1",
                        padding: "0 .25em",
                    });
                    if (before.length >= 20) {
                        const beforeDot = $("<span/>");
                        beforeDot.text(`[${start}] ……`).css({
                            // "border-right": "1px solid #a2a9b1",
                            "padding-right": ".25em",
                        });
                        input.append(beforeDot);
                    }
                    input.append(beforeSpan).append(strSpan).append(afterSpan);
                    if (after.length >= 20) {
                        const afterDot = $("<span/>");
                        afterDot.text("……").css({
                            // "border-left": "1px solid #a2a9b1",
                            "padding-left": ".25em",
                        });
                        input.append(afterDot);
                    }
                    tr.append(input);
                    table.append(tr);
                });
            } else {
                table.empty().append("<tbody><tr><td style=\"text-align: center;\">现有规则没有匹配项……</td></tr></tbody>");
            }
        }
        pTable.hide();
        $(".abusefiltertest").show();
    } catch (e) {
        console.info("abusefiltertest", e);
        $(".abusefiltertest").remove();
        pTable.empty();
        if (filter === 33) {
            pTable.append(`<tbody><tr><td style="text-align: ${typeof e === "string" ? "center" : "left"};">发生错误：${typeof e === "string" ? e : `${e} ${e.stack.split("\n")[1].trim()}`}</td></tr></tbody>`);
        }
    }
})());
