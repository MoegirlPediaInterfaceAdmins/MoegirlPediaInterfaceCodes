"use strict";
$(() => (async () => {
    if (mw.config.get("wgCanonicalSpecialPageName") !== "Whatlinkshere") {
        return;
    }
    const { wgRelevantPageName, wgUserName, libLocalizedNamespaces } = mw.config.get(["wgRelevantPageName", "wgUserName", "libLocalizedNamespaces"]);
    if (typeof wgRelevantPageName !== "string" || wgRelevantPageName.length === 0) {
        return;
    }
    const upperFirstCase = (s) => /^[a-z]/.test(s) ? s.substring(0, 1).toUpperCase() + s.substring(1) : s;
    const api = new mw.Api();
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
    const queryAll = async (contKey, params, pick, output) => {
        const result = [];
        let cont;
        do {
            const res = await api.post({ ...params, [contKey]: cont });
            cont = res.continue?.[contKey];
            result.push(...pick(res));
            if (cont !== undefined) {
                output.append("…");
            }
        } while (cont !== undefined);
        return result;
    };
    const makeNsList = (makeRedirect) => Object.fromEntries(Object.keys(libLocalizedNamespaces).filter((key) => Number(key) >= 0).map((key) => [key, { count: 0, redirect: makeRedirect() }]));
    const getNsName = (nsnumber) => Number(nsnumber) === 0 ? mw.msg("blanknamespace") : upperFirstCase(libLocalizedNamespaces[nsnumber]);
    const renderNsList = (nslist, buildLi) => {
        const ul = $("<ul/>");
        Object.entries(nslist).filter(([, { count }]) => count > 0).sort(([a], [b]) => a - b).forEach((entry) => ul.append(buildLi(entry)));
        return ul;
    };
    const loadingLabel = wgULS("加载中……", "加載中……");
    const makeCard = ({ id, title, searchLabel, buttonLabel, searchQuery }) => `<span class="cdx-card" style="background-color:transparent"><span class="cdx-card__text"><span class="cdx-card__text__title">${title}</span><span class="cdx-card__text__description"><a href="/Special:Search/${encodeURIComponent(searchQuery)}?profile=all&fulltext=1" target="_blank" class="external text">${searchLabel}</a></span><button id="queryWhat${id}" class="cdx-button cdx-button--action-progressive">${buttonLabel}</button><p id="what${id}" style="display: none;">${loadingLabel}</p></span></span>`;
    $("#mw-content-text > .mw-htmlform-ooui-wrapper").after([
        {
            id: "linkshere",
            title: wgULS("链入情况", "鏈入情況"),
            searchLabel: wgULS("通过搜索查找链入", "通過搜索查找鏈入"),
            buttonLabel: wgULS("点此查询链入情况", "點此查詢鏈入情況"),
            searchQuery: `linksto:"${target}" insource:"${target}"`,
        },
        {
            id: "embeddedin",
            title: wgULS("嵌入情况", "嵌入情況"),
            searchLabel: wgULS("通过搜索查找嵌入", "通過搜索查找嵌入"),
            buttonLabel: wgULS("点此查询嵌入情况", "點此查詢嵌入情況"),
            searchQuery: `hastemplate:"${target}" insource:"${title}"`,
        },
    ].map(makeCard).join(""));
    const queryWhatlinkshere = $("#queryWhatlinkshere");
    const queryWhatembeddedin = $("#queryWhatembeddedin");
    const whatlinkshere = $("#whatlinkshere");
    const whatembeddedin = $("#whatembeddedin");
    queryWhatlinkshere.on("click", async () => {
        queryWhatlinkshere.hide();
        whatlinkshere.show();
        const list = await queryAll("lhcontinue", {
            action: "query",
            assertuser: wgUserName,
            format: "json",
            prop: "linkshere",
            titles: target,
            lhprop: "redirect|title|pageid",
            lhlimit: "max",
        }, (res) => Object.values(res.query.pages)[0].linkshere || [], whatlinkshere);
        const nslist = makeNsList(() => 0);
        let redirectCount = 0;
        list.forEach((item) => {
            nslist[item.ns].count++;
            if (Reflect.has(item, "redirect")) {
                nslist[item.ns].redirect++;
                redirectCount++;
            }
        });
        whatlinkshere.text(wgULS(
            `共有${list.length}个页面含有到本页面的站内链接（不考虑嵌入）${redirectCount > 0 ? `，其中有${redirectCount}个重定向页面。` : "。"}`,
            `共有${list.length}個頁面含有到本頁面的站內連結（不考慮嵌入）${redirectCount > 0 ? `，其中有${redirectCount}個重新導向頁面。` : "。"}`,
        ));
        if (list.length > 0) {
            whatlinkshere.append(wgULS("按命名空间划分如下：", "按命名空間劃分如下："));
        }
        whatlinkshere.after(renderNsList(nslist, ([nsnumber, { count, redirect }]) => `<li>${getNsName(nsnumber)}：${wgULS(`${count}个页面`, `${count}個頁面`)}${redirect > 0 ? wgULS(`（其中有${redirect}个重定向页面）`, `（其中有${redirect}個重新導向頁面）`) : ""}`));
    });
    queryWhatembeddedin.on("click", async () => {
        queryWhatembeddedin.hide();
        whatembeddedin.show();
        const eiParams = {
            action: "query",
            assertuser: wgUserName,
            format: "json",
            list: "embeddedin",
            eititle: target,
            einamespace: "*",
            eilimit: "max",
        };
        const redirects = await queryAll("eicontinue", { ...eiParams, eifilterredir: "redirects" }, (res) => res.query.embeddedin, whatembeddedin);
        const nonredirects = await queryAll("eicontinue", { ...eiParams, eifilterredir: "nonredirects" }, (res) => res.query.embeddedin, whatembeddedin);
        const list = {
            redirects,
            all: [...redirects, ...nonredirects],
        };
        const nslist = makeNsList(() => []);
        list.all.forEach(({ ns }) => {
            nslist[ns].count++;
        });
        list.redirects.forEach(({ ns, title }) => {
            nslist[ns].redirect.push(title);
        });
        whatembeddedin.text(wgULS(
            `共有${list.all.length}个页面嵌入了本页面，其中有${list.redirects.length}个重定向页面。`,
            `共有${list.all.length}個頁面嵌入了本頁面，其中有${list.redirects.length}個重新導向頁面。`,
        ));
        if (list.all.length > 0) {
            whatembeddedin.append(wgULS("按命名空间划分如下：", "按命名空間劃分如下："));
        }
        whatembeddedin.after(renderNsList(nslist, ([nsnumber, { count, redirect }]) => `<li class="mw-parser-output">${getNsName(nsnumber)}：${wgULS(`${count}个页面`, `${count}個頁面`)}${redirect.length > 0 ? `${wgULS(`（其中有${redirect.length}个重定向页面：`, `（其中有${redirect.length}個重新導向頁面：`)}${redirect.map((title) => `<a target="_blank" rel="nofollow noreferrer noopener" class="external text" href="/index.php?title=${encodeURIComponent(title)}&amp;redirect=no">${title}</a>`).join("、")}）` : ""}`));
    });
})());
