"use strict";
// <pre>
$(() => {
    const {
        wgArticleId = -1,
        wgCurRevisionId = -1,
        wgRevisionId = -1,
        wgDiffOldId = -1,
        wgDiffNewId = -1,
        wgScriptPath,
        skin,
    } = mw.config.get([
        "wgArticleId",
        "wgCurRevisionId",
        "wgRevisionId",
        "wgDiffOldId",
        "wgDiffNewId",
        "wgScriptPath",
        "skin",
    ]);
    if (wgArticleId <= 0) {
        return;
    }

    const baseUrl = new URL(wgScriptPath ? `${wgScriptPath}/` : "/", location.origin);
    const getCurrentHash = () => location.hash;
    const getCurrentDecodedHash = () => {
        const hash = getCurrentHash();
        return hash ? decodeURIComponent(hash) : "";
    };
    const buildShortlinkUrl = (search) => {
        const url = new URL(baseUrl);
        url.search = search;
        url.hash = getCurrentHash();
        return url.href;
    };
    const buildCopyWikitext = (wikitext) => `[[${wikitext}${getCurrentDecodedHash()}]]`;

    // 链接信息
    const links = [{
        id: "page",
        href: `curid=${wgArticleId}`,
        title: wgULS("本页面的短链接（页面ID）", "本頁面的短網址（頁面ID）"),
        text: wgULS("本页短链", "本頁短網址"),
        wikitext: `Special:重定向/page/${wgArticleId}`,
    }, {
        id: "newrev",
        href: `oldid=${wgCurRevisionId}`,
        title: wgULS("本页面最新版本的短链接（版本ID）", "本頁面最新修訂的短網址（版本ID）"),
        text: wgULS("最新版本", "最新修訂"),
        wikitext: `Special:固定链接/${wgCurRevisionId}`,
    }];
    if (wgRevisionId > 0) {
        if (wgCurRevisionId !== wgRevisionId) {
            links.push({
                id: "rev",
                href: `oldid=${wgRevisionId}`,
                title: wgULS("本页面当前版本的短链接（版本ID）", "本頁面當前修訂的短網址（版本ID）"),
                text: wgULS("当前版本", "當前修訂"),
                wikitext: `Special:固定链接/${wgRevisionId}`,
            }, {
                id: "currev",
                href: `diff=${wgRevisionId}`,
                title: wgULS("本页面当前版本与前一版本的差异的链接（版本ID）", "本頁面當前修訂與前一修訂的短網址（版本ID）"),
                text: wgULS("当前版本差异", "當前修訂差異"),
                wikitext: `Special:差异/${wgRevisionId}`,
            }, {
                id: "curdiff",
                href: `diff=${wgCurRevisionId}&oldid=${wgRevisionId}`,
                title: wgULS("与本页面最新版本的差异的短链接（版本ID）", "與本頁面最新修訂差異的短網址（版本ID）"),
                text: wgULS("与最新版本差异", "與最新修訂差異"),
                wikitext: `Special:差异/${wgRevisionId}/${wgCurRevisionId}`,
            });
        } else if (wgDiffNewId !== wgCurRevisionId) {
            links.push({
                id: "currev",
                href: `diff=${wgCurRevisionId}`,
                title: wgULS("本页面最新版本与前一版本的差异的链接（版本ID）", "本頁面最新修訂與前一修訂差異的短網址（版本ID）"),
                text: wgULS("最新版本差异", "與最新修訂差異"),
                wikitext: `Special:差异/${wgCurRevisionId}`,
            });
        }
    }
    if (wgDiffNewId > 0 && wgDiffOldId > 0) {
        links.push({
            id: "diff",
            href: `diff=${wgDiffNewId}&oldid=${wgDiffOldId}`,
            title: wgULS("当前比较的差异的短链接（版本ID）", "當前比較的差異的短網址（版本ID）"),
            text: wgULS("当前比较的差异", "當前比較的差異"),
            wikitext: `Special:差异/${wgDiffOldId}/${wgDiffNewId}`,
        });
    }
    const shortlinks = links.map((link) => ({
        ...link,
        get url() {
            return buildShortlinkUrl(link.href);
        },
        get copyWikitext() {
            return buildCopyWikitext(link.wikitext);
        },
    }));
    const createCopyPanel = () => {
        const $element = $("<div>");
        for (const shortlink of shortlinks) {
            $element.append(
                $("<div>")
                    .css({ "font-weight": "bold", margin: ".6em 0 .2em" })
                    .text(shortlink.title),
            );
            [shortlink.copyWikitext, shortlink.url].forEach((value) => {
                $element.append(
                    new mw.widgets.CopyTextLayout({ align: "top", copyText: value }).$element,
                );
            });
        }
        return $element;
    };
    const openShortlinkDialog = () => OO.ui.alert(createCopyPanel(), { size: "medium" });

    switch (skin) {
        case "moeskin": {
            mw.hook("moeskin.pagetools").add(({ addPageToolsButton }) => {
                const $btn = addPageToolsButton("<span style=\"align-self:center;\">短</span>", wgULS("短链接", "短網址"), "extra");
                $btn.attr({
                    id: "ca-shortlink",
                    href: "#",
                });
                $btn.on("click", (e) => {
                    e.preventDefault();
                    openShortlinkDialog();
                });
            });
            break;
        }

        default:
        case "vector-2022": {
            const portletLink = mw.util.addPortletLink("p-cactions", "#", wgULS("短链接", "短網址"), "ca-shortlink", wgULS("复制本页面的短链接", "複製本頁面的短網址"));
            if (portletLink) {
                portletLink.querySelector("a").addEventListener("click", (e) => {
                    e.preventDefault();
                    openShortlinkDialog();
                });
            }
            break;
        }
    }
});
// </pre>
