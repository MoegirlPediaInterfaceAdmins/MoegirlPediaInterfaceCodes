// <pre>
"use strict";
$(() => (async () => {
    if (!mw.config.get("wgUserGroups").includes("sysop") && !mw.config.get("wgUserGroups").includes("staff")) {
        return;
    }
    if (mw.config.get("wgCanonicalSpecialPageName") !== "AbuseLog") {
        return;
    }
    const getLogVar = (varName) => $(`.mw-abuselog-details-${varName} .mw-abuselog-var-value .mw-abuselog-var-value`).text();
    const timestampVar = getLogVar("timestamp");
    const userName = getLogVar("user_name");
    const articlePrefixedtext = getLogVar("article_prefixedtext");
    const filter = +[...document.querySelectorAll('a[href*="/Special:%E6%BB%A5%E7%94%A8%E8%BF%87%E6%BB%A4%E5%99%A8/"]')].filter(({ href }) => /%E6%BB%A5%E7%94%A8%E8%BF%87%E6%BB%A4%E5%99%A8\/[1-9]\d*$/.test(href))?.[0]?.href?.match?.(/[1-9]\d*$/)?.[0];
    if (timestampVar.length === 0 || userName.length === 0 || articlePrefixedtext.length === 0 || !filter) {
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
            assertuser: mw.config.get("wgUserName"),
            list: "abuselog",
            afluser: userName,
            afltitle: articlePrefixedtext,
            aflprop: "details",
            aflfilter: filter,
        })).query.abuselog;
        if (__details.length === 0) {
            throw "无法找到对应用户名和页面标题的滥用过滤器日志";
        }
        progress.text(1);
        const _details = Array.from(new Map(__details.filter(({ details: { timestamp } }) => timestampVar === timestamp).map((n) => [n.new_wikitext, n])).values());
        if (_details.length === 0) {
            console.info(__details);
            throw "无法找到对应时间戳的滥用过滤器日志";
        }
        progress.text(2);
        const _rules = (await api.post({
            action: "query",
            assertuser: mw.config.get("wgUserName"),
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
            const addedLines = details.added_lines || details.new_wikitext;
            const result = [];
            const table = $("<table/>").css("width", "100%").addClass("wikitable abusefiltertest").hide();
            pTable.after(table);
            for (const sr of stringRules.values()) {
                if (addedLines.includes(sr)) {
                    const splits = addedLines.split(sr);
                    splits.forEach((str, i) => {
                        if (i === splits.length - 1) {
                            return;
                        }
                        const next = splits[i + 1];
                        const start = Math.max(0, str.length - 20);
                        const end = Math.min(next.length, 20);
                        result.push({
                            isRegexp: false,
                            rule: sr,
                            before: str.substring(start, start + 20),
                            string: sr,
                            after: next.substring(0, end),
                            start,
                        });
                    });
                }
            }
            for (const rr of regexRules.values()) {
                const regex = RegExp(`.{0,20}${rr}.{0,20}`, "ig");
                const findstring = RegExp(rr, "ig");
                if (regex.test(addedLines)) {
                    const splits = addedLines.match(regex);
                    let lastFromIndex = 0;
                    splits.forEach((str) => {
                        const string = str.match(findstring)[0];
                        const split = str.split(string);
                        const before = split[0];
                        const after = split.slice(1).join(string);
                        const start = addedLines.indexOf(string, lastFromIndex);
                        lastFromIndex = start + string.length;
                        result.push({
                            isRegex: true,
                            rule: rr,
                            before,
                            string,
                            after,
                            start,
                        });
                    });
                }
            }
            table.empty();
            if (result.length > 0) {
                table.append(`<caption style="font-weight: 700;">命中防滥用过滤器${filter}的内容</caption><tr><th style="text-align: right;">规则（请勿泄漏！！！）</th><th style="text-align: left;">命中字符串上下文</th></tr>`);
                result.sort(({ start: a }, { start: b }) => a - b);
                const results = [];
                result.forEach((r) => {
                    if (results.filter(({ isRegex, start }) => isRegex === r.isRegex && start === r.start).length === 0) {
                        results.push(r);
                    }
                });
                console.info(results);
                results.forEach(({ isRegex, rule, before, string, after, start }) => {
                    const tr = $("<tr/>");
                    const label = $("<td/>");
                    const ruleCode = $("<code/>");
                    ruleCode.text(rule);
                    label.addClass("mw-label");
                    label.text(isRegex ? "正则表达式" : "字符串");
                    label.append(symbolEnter(ruleCode)).append("：");
                    tr.append(label);
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
// </pre>
