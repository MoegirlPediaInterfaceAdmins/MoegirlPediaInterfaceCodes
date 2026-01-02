// <pre>
"use strict";
$(() => (async () => {
    if (mw.config.get("wgCanonicalSpecialPageName") !== "Whatlinkshere") {
        return;
    }
    const wgRelevantPageName = mw.config.get("wgRelevantPageName");
    if (typeof wgRelevantPageName !== "string" || wgRelevantPageName.length === 0) {
        return;
    }
    const wgUserName = mw.config.get("wgUserName");
    const upperFirstCase = (s) => /^[a-z]/.test(s) ? s.substring(0, 1).toUpperCase() + s.substring(1) : s;
    const api = new mw.Api();
    const nsids = {
        0: "（主）",
        1: "讨论",
        2: "用户",
        3: "用户讨论",
        4: "萌娘百科",
        5: "萌娘百科讨论",
        6: "文件",
        7: "文件讨论",
        8: "MediaWiki",
        9: "MediaWiki讨论",
        10: "模板",
        11: "模板讨论",
        12: "帮助",
        13: "帮助讨论",
        14: "分类",
        15: "分类讨论",
        274: "Widget",
        275: "Widget_talk",
        710: "Timedtext",
        711: "Timedtext_talk",
        828: "模块",
        829: "模块讨论",
        2300: "Gadget",
        2301: "Gadget_talk",
        2302: "Gadget_definition",
        2303: "Gadget_definition_talk",
    };
    const wgNamespaceIds = {};
    for (const [ns, nsid] of Object.entries(mw.config.get("wgNamespaceIds"))) {
        if (!Array.isArray(wgNamespaceIds[nsid])) {
            wgNamespaceIds[nsid] = [ns];
        } else {
            wgNamespaceIds[nsid].push(ns);
        }
    }
    const pageinfo = Object.values((await api.post({
        action: "query",
        assertuser: wgUserName,
        format: "json",
        prop: "info",
        titles: wgRelevantPageName,
    })).query.pages)[0];
    const target = pageinfo.title;
    const ns = pageinfo.ns;
    const title = target.replace(ns === 0 ? "" : RegExp(`^(?:${wgNamespaceIds[ns].join("|")}):`, "i"), "");
    $("#mw-content-text > .mw-htmlform-ooui-wrapper").after(`<span class="cdx-card" style="background-color:transparent"><span class="cdx-card__text"><span class="cdx-card__text__title">链入情况</span><span class="cdx-card__text__description"><a href="/Special:Search/${encodeURIComponent(`linksto:"${target}" insource:"${target}"`)}" target="_blank" class="external text">通过搜索查找链入</a></span><button id="queryWhatlinkshere" class="cdx-button cdx-button--action-progressive">点此查询链入情况</button><p id="whatlinkshere" style="display: none;">加载中……</p></span></span><span class="cdx-card" style="background-color:transparent"><span class="cdx-card__text"><span class="cdx-card__text__title">嵌入情况</span><span class="cdx-card__text__description"><a href="/Special:Search/${encodeURIComponent(`hastemplate:"${target}" insource:"${title}"`)}" target="_blank" class="external text">通过搜索查找嵌入</a></span><button id="queryWhatembeddedin" class="cdx-button cdx-button--action-progressive">点此查询嵌入情况</button><p id="whatembeddedin" style="display: none;">加载中……</p></span></span>`);
    const queryWhatlinkshere = $("#queryWhatlinkshere");
    const queryWhatembeddedin = $("#queryWhatembeddedin");
    const whatlinkshere = $("#whatlinkshere");
    const whatembeddedin = $("#whatembeddedin");
    queryWhatlinkshere.on("click", async () => {
        queryWhatlinkshere.hide();
        whatlinkshere.show();
        const list = await (async () => {
            const result = [];
            const eol = Symbol();
            let lhcontinue = undefined;
            while (lhcontinue !== eol) {
                const _result = await api.post({
                    action: "query",
                    assertuser: wgUserName,
                    format: "json",
                    prop: "linkshere",
                    titles: target,
                    lhprop: "redirect|title|pageid",
                    lhcontinue,
                    lhlimit: "max",
                });
                if (_result.continue) {
                    lhcontinue = _result.continue.lhcontinue;
                    whatlinkshere.append("…");
                } else {
                    lhcontinue = eol;
                }
                result.push(...Object.values(_result.query.pages)[0].linkshere || []);
            }
            return result;
        })();
        const nslist = {
            0: { count: 0, redirect: 0 },
            1: { count: 0, redirect: 0 },
            2: { count: 0, redirect: 0 },
            3: { count: 0, redirect: 0 },
            4: { count: 0, redirect: 0 },
            5: { count: 0, redirect: 0 },
            6: { count: 0, redirect: 0 },
            7: { count: 0, redirect: 0 },
            8: { count: 0, redirect: 0 },
            9: { count: 0, redirect: 0 },
            10: { count: 0, redirect: 0 },
            11: { count: 0, redirect: 0 },
            12: { count: 0, redirect: 0 },
            13: { count: 0, redirect: 0 },
            14: { count: 0, redirect: 0 },
            15: { count: 0, redirect: 0 },
            274: { count: 0, redirect: 0 },
            275: { count: 0, redirect: 0 },
            710: { count: 0, redirect: 0 },
            711: { count: 0, redirect: 0 },
            828: { count: 0, redirect: 0 },
            829: { count: 0, redirect: 0 },
            2300: { count: 0, redirect: 0 },
            2301: { count: 0, redirect: 0 },
            2302: { count: 0, redirect: 0 },
            2303: { count: 0, redirect: 0 },
        };
        const global = { redirect: 0 };
        const redirectCount = list.filter((item) => Reflect.has(item, "redirect")).length;
        whatlinkshere.text(`共有${list.length}个页面含有到本页面的站内链接（不考虑嵌入）${redirectCount > 0 ? `，其中有${redirectCount}个重定向页面。` : "。"}`);
        if (list.length > 0) {
            whatlinkshere.append("按命名空间划分如下：");
        }
        const ul = $("<ul/>");
        list.forEach((item) => {
            nslist[item.ns].count++;
            if (Reflect.has(item, "redirect")) {
                nslist[item.ns].redirect++;
                global.redirect++;
            }
        });
        Object.entries(nslist).filter(([, { count }]) => count > 0).sort(([a], [b]) => a - b).forEach(([nsnumber, { count, redirect }]) => ul.append(`<li>${upperFirstCase(nsids[nsnumber])}：${count}个页面${redirect > 0 ? `（其中有${redirect}个重定向页面）` : ""}`));
        whatlinkshere.after(ul);
    });
    queryWhatembeddedin.on("click", async () => {
        queryWhatembeddedin.hide();
        whatembeddedin.show();
        const list = await (async () => {
            const result = {
                redirects: [],
                all: [],
            };
            const eol = Symbol();
            let eicontinue = undefined;
            while (eicontinue !== eol) {
                const _result = await api.post({
                    action: "query",
                    assertuser: wgUserName,
                    format: "json",
                    list: "embeddedin",
                    eititle: target,
                    einamespace: "*",
                    eifilterredir: "redirects",
                    eicontinue,
                    eilimit: "max",
                });
                if (_result.continue) {
                    eicontinue = _result.continue.eicontinue;
                    whatembeddedin.append("…");
                } else {
                    eicontinue = eol;
                }
                result.redirects.push(..._result.query.embeddedin);
                result.all.push(..._result.query.embeddedin);
            }
            eicontinue = undefined;
            while (eicontinue !== eol) {
                const _result = await api.post({
                    action: "query",
                    assertuser: wgUserName,
                    format: "json",
                    list: "embeddedin",
                    eititle: target,
                    einamespace: "*",
                    eifilterredir: "nonredirects",
                    eicontinue,
                    eilimit: "max",
                });
                if (_result.continue) {
                    eicontinue = _result.continue.eicontinue;
                    whatembeddedin.append("…");
                } else {
                    eicontinue = eol;
                }
                result.all.push(..._result.query.embeddedin);
            }
            return result;
        })();
        const nslist = {
            0: { count: 0, redirect: [] },
            1: { count: 0, redirect: [] },
            2: { count: 0, redirect: [] },
            3: { count: 0, redirect: [] },
            4: { count: 0, redirect: [] },
            5: { count: 0, redirect: [] },
            6: { count: 0, redirect: [] },
            7: { count: 0, redirect: [] },
            8: { count: 0, redirect: [] },
            9: { count: 0, redirect: [] },
            10: { count: 0, redirect: [] },
            11: { count: 0, redirect: [] },
            12: { count: 0, redirect: [] },
            13: { count: 0, redirect: [] },
            14: { count: 0, redirect: [] },
            15: { count: 0, redirect: [] },
            274: { count: 0, redirect: [] },
            275: { count: 0, redirect: [] },
            710: { count: 0, redirect: [] },
            711: { count: 0, redirect: [] },
            828: { count: 0, redirect: [] },
            829: { count: 0, redirect: [] },
            2300: { count: 0, redirect: [] },
            2301: { count: 0, redirect: [] },
            2302: { count: 0, redirect: [] },
            2303: { count: 0, redirect: [] },
        };
        const global = { redirect: 0 };
        whatembeddedin.text(`共有${list.all.length}个页面嵌入了本页面，其中有${list.redirects.length}个重定向页面。`);
        if (list.all.length > 0) {
            whatembeddedin.append("按命名空间划分如下：");
        }
        const ul = $("<ul/>");
        list.all.forEach(({ ns }) => {
            nslist[ns].count++;
        });
        list.redirects.forEach(({ ns, title }) => {
            nslist[ns].redirect.push(title);
            global.redirect++;
        });
        Object.entries(nslist).filter(([, { count }]) => count > 0).sort(([a], [b]) => a - b).forEach(([nsnumber, { count, redirect }]) => ul.append(`<li class="mw-parser-output">${upperFirstCase(nsids[nsnumber])}：${count}个页面${redirect.length > 0 ? `（其中有${redirect.length}个重定向页面：${redirect.map((title) => `<a target="_blank" rel="nofollow noreferrer noopener" class="external text" href="/index.php?title=${encodeURIComponent(title)}&amp;redirect=no">${title}</a>`).join("、")}）` : ""}`));
        whatembeddedin.after(ul);
    });
})());
// </pre>
