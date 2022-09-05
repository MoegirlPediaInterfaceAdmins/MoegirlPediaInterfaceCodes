"use strict";
// <pre>
$(() => {
    const wgArticleId = mw.config.get("wgArticleId") || -1;
    const wgCurRevisionId = mw.config.get("wgCurRevisionId") || -1;
    const wgRevisionId = mw.config.get("wgRevisionId") || -1;
    const wgDiffOldId = mw.config.get("wgDiffOldId") || -1;
    const wgDiffNewId = mw.config.get("wgDiffNewId") || -1;
    if (wgArticleId <= 0 && wgRevisionId <= 0 && wgCurRevisionId <= 0 && wgDiffOldId <= 0 && wgDiffNewId <= 0) {
        return;
    }
    const $body = $("body");
    const $mwPanel = $("#mw-panel");
    $body.css("height", "auto");
    const links = [{
        id: "page",
        href: `curid=${wgArticleId}`,
        title: wgULS("本页面的短链接（页面ID）", "本頁面的短網址（頁面ID）"),
        text: wgULS("本页短链", "本頁短網址"),
        wikitext: `[[Special:重定向/page/${wgArticleId}]]`,
    }, {
        id: "newrev",
        href: `oldid=${wgCurRevisionId}`,
        title: wgULS("本页面最新版本的短链接（版本ID）", "本頁面最新修訂的短網址（版本ID）"),
        text: wgULS("最新版本", "最新修訂"),
        wikitext: `[[Special:固定链接/${wgCurRevisionId}]]`,
    }];
    if (wgRevisionId > 0) {
        if (wgCurRevisionId !== wgRevisionId) {
            links.push({
                id: "rev",
                href: `oldid=${wgRevisionId}`,
                title: wgULS("本页面当前版本的短链接（版本ID）", "本頁面當前修訂的短網址（版本ID）"),
                text: wgULS("当前版本", "當前修訂"),
                wikitext: `[[Special:固定链接/${wgRevisionId}]]`,
            }, {
                id: "currev",
                href: `diff=${wgRevisionId}`,
                title: wgULS("本页面当前版本与前一版本的差异的链接（版本ID）", "本頁面當前修訂與前一修訂的短網址（版本ID）"),
                text: wgULS("当前版本差异", "當前修訂差異"),
                wikitext: `[[Special:差异/${wgRevisionId}]]`,
            }, {
                id: "curdiff",
                href: `diff=${wgCurRevisionId}&oldid=${wgRevisionId}`,
                title: wgULS("与本页面最新版本的差异的短链接（版本ID）", "與本頁面最新修訂差異的短網址（版本ID）"),
                text: wgULS("与最新版本差异", "與最新修訂差異"),
                wikitext: `[[Special:差异/${wgRevisionId}/${wgCurRevisionId}]]`,
            });
        } else if (wgDiffNewId !== wgCurRevisionId) {
            links.push({
                id: "currev",
                href: `diff=${wgCurRevisionId}`,
                title: wgULS("本页面最新版本与前一版本的差异的链接（版本ID）", "本頁面最新修訂與前一修訂差異的短網址（版本ID）"),
                text: wgULS("最新版本差异", "與最新修訂差異"),
                wikitext: `[[Special:差异/${wgCurRevisionId}]]`,
            });
        }
    }
    if (wgDiffNewId > 0 && wgDiffOldId > 0) {
        links.push({
            id: "diff",
            href: `diff=${wgDiffNewId}&oldid=${wgDiffOldId}`,
            title: wgULS("当前比较的差异的短链接（版本ID）", "當前比較的差異的短網址（版本ID）"),
            text: wgULS("当前比较的差异", "當前比較的差異"),
            wikitext: `[[Special:差异/${wgDiffOldId}/${wgDiffNewId}]]`,
        });
    }
    $mwPanel.append(`<div class="portal" role="navigation" id="p-sl" aria-labelledby="p-sl-label" style="position: sticky; top: 0;"><h3 lang="zh-CN" dir="ltr" id="p-sl-label">${wgULS("短链接", "短網址")}</h3><div class="body"><ul>${links.map((l) => `<li id="sl-${l.id}"><a href="${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/_?${l.href}" title="${l.title}">${l.text}</a><br><span>（<a data-copy-content="${l.wikitext}" data-type="wikitext" href="javascript:void(0);"></a>）</span><br><span>（<a data-copy-content="${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/_?${l.href}" data-type="${wgULS("短链接", "短網址")}" href="javascript:void(0);"></a>）</span></li>`).join("\n")}</ul></div></div>`);
    const markStatus = (ele, status) => ele.innerText = status ? `${ele.dataset.type}${wgULS("复制成功", "複製成功")}` : `${wgULS("复制", "複製")}${ele.dataset.type}`;
    $("#mw-panel a[data-type]").each((_, ele) => {
        markStatus(ele, false);
    });
    const valueNode = $("<pre/>", {
        css: {
            position: "absolute",
            left: "-99999px",
            "z-index": "-99999",
        },
    }).appendTo("body");
    $("#mw-panel a[data-copy-content]").on("click", async function () {
        const self = $(this);
        if (typeof navigator.clipboard?.writeText === "function") {
            await navigator.clipboard.writeText(this.dataset.copyContent);
        } else {
            const selection = window.getSelection();
            const rangeCount = selection.rangeCount;
            let range;
            if (rangeCount > 0) {
                range = selection.getRangeAt(0);
            }
            valueNode.text(this.dataset.copyContent);
            selection.selectAllChildren(valueNode[0]);
            document.execCommand("copy");
            window.setTimeout(() => {
                selection.removeAllRanges();
                if (rangeCount > 0) {
                    selection.addRange(range);
                }
                valueNode.empty();
            }, 7);
        }
        markStatus(this, true);
        self.data("last-time", new Date().getTime()).addClass("text-modified");
        return false;
    });
    setInterval(() => {
        $("#mw-panel a[data-copy-content].text-modified").each(function () {
            const self = $(this);
            if (self.data("last-time") < new Date().getTime() - 3000) {
                markStatus(this, false);
                self.removeClass("text-modified");
            }
        });
    }, 1000);
    $(window).on("resize", () => {
        $mwPanel.height($body.height());
    });
});
// </pre>
