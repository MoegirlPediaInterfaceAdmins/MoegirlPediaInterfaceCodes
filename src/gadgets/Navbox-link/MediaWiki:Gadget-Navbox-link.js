// <pre>
"use strict";
$(() => {
    if (mw.config.get("wgNamespaceNumber") !== 10 || $("#mw-content-text .navbox:not(.template-documentation .navbox)").length === 0) {
        return;
    }
    const pageNonExist = wgULS("（页面不存在）", "（頁面不存在）");
    const wgPageName = mw.config.get("wgPageName");
    const wgUserName = mw.config.get("wgUserName");
    const api = new mw.Api();
    const targetLoc = $("<div>", {
        id: "not-listed-articles",
    }).hide();
    const refresh = $("<a>", {
        href: "javascript:void(0)",
        title: wgULS("强制刷新", "強制重新整理"),
        id: "not-listed-articles-refresh",
        text: wgULS("未添加本模板的条目（点击刷新）", "未新增本模板的條目（點選重新整理）", null, null, "未新增本模板的條目（點擊重新整理）"),
    });
    targetLoc.append("<hr>");
    $("#catlinks").append(targetLoc);
    const targetUl = $("<ul>", {
        id: "not-listed-articles-list",
    });
    targetLoc.append(refresh).append("：").append(targetUl);
    const generateSelector = (_title, redirects) => {
        const title = _title.replace(/"/g, '\\"');
        let selector = `a[title="${title}"], a[title="${title}${pageNonExist}"], a[data-title="${title}"], a[data-title="${title}${pageNonExist}"]`;
        if (typeof redirects[title] === "string") {
            selector += `, a[title="${redirects[title]}"], a[title="${redirects[title]}${pageNonExist}"], a[data-title="${redirects[title]}"], a[data-title="${redirects[title]}${pageNonExist}"]`;
        }
        return selector;
    };
    refresh.on("click", async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        const result = await api.post({
            action: "query",
            assertuser: wgUserName,
            redirects: "true",
            generator: "links",
            gplnamespace: "0",
            gpllimit: "max",
            prop: "templates",
            tllimit: "max",
            tlnamespace: "10",
            tltemplates: wgPageName,
            titles: wgPageName,
        });
        targetUl.empty();
        if (!result.query) {
            targetUl.text(wgULS("本模板未被任何条目嵌入", "本模板未被任何條目引用"));
        } else {
            const redirects = Object.fromEntries((result.query.redirects || []).map(({ from, to }) => [from, to]));
            for (const { templates, missing, title } of Object.values(result.query.pages)) {
                if (!Array.isArray(templates) && typeof missing === "undefined") {
                    const link = $("<a>", {
                        title,
                        text: title,
                        href: `/${encodeURIComponent(title)}`,
                    });
                    $("<li>").append(link).appendTo(targetUl);
                    $(generateSelector(title, redirects)).each((_, ele) => {
                        if (ele.title.length > 0) {
                            ele.dataset.title = ele.title;
                        }
                    });
                    link.on("mouseenter", () => {
                        $(generateSelector(title, redirects)).css("background-color", "yellow");
                    });
                    link.on("mouseleave", () => {
                        $(generateSelector(title, redirects)).css("background-color", "");
                    });
                }
            }
            if (targetUl.children().length === 0) {
                targetUl.text(wgULS("本模板所有条目均添加了本模板", "本模板所有條目均添加了本模板"));
            }
        }
        targetLoc.show();
    }).trigger("click");
});
// </pre>
