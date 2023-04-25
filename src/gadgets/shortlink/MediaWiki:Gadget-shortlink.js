"use strict";
// <pre>
$(() => {
    const {
        wgArticleId = -1,
        wgCurRevisionId = -1,
        wgRevisionId = -1,
        wgDiffOldId = -1,
        wgDiffNewId = -1,
        wgServer,
        wgScriptPath,
        skin,
    } = mw.config.get([
        "wgArticleId",
        "wgCurRevisionId",
        "wgRevisionId",
        "wgDiffOldId",
        "wgDiffNewId",
        "wgServer",
        "wgScriptPath",
        "skin",
    ]);
    if (wgArticleId <= 0) {
        return;
    }
    // 初始化工具栏
    $("body").css("height", "auto");
    let $slCard;
    switch (skin) {
        case "moeskin":
        default:
            $slCard = $(`<div class="moe-card" id="p-sl"><div class="mw-parser-output"><h3 style="margin-top: 0px;">${wgULS("短链接", "短網址")}</h3></div></div>`);
            $(".moe-siderail-sticky").append($slCard);
            $("#p-sl h3").after('<div style="display:flex"><div style="width:0.25rem;border-radius:99em;background:rgba(0,0,0,0.102);margin-right:1rem"></div><ul id="p-sl-list" style="list-style:none"></ul></div>');
            break;
        case "vector":
            $("#mw-panel").append(`<div class="portal" id="p-sl" aria-labelledby="p-sl-label" style="position:sticky;top:0;"><h3 lang="zh-CN" dir="ltr" id="p-sl-label">${wgULS("短链接", "短網址")}</h3></div>`);
            $("#p-sl h3").after('<div class="body"><ul id="p-sl-list"></ul></div>');
            break;
    }
    const $list = $("#p-sl-list");

    // 链接信息
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

    // 在短链栏添加复制项
    const addItem = (link) => {
        const $item = $(`<li id="sl-${link.id}"></li>`);
        $item.append(`<a href="${wgServer}${wgScriptPath}/_?${link.href}">${link.text}</a>`);
        switch (skin) {
            case "moeskin":
            default:
                $item.append(`<div>（<a data-copy-content="${link.wikitext}" data-type="wikitext"></a><wbr>丨<a data-copy-content="${wgServer}${wgScriptPath}/_?${link.href}" data-type="${wgULS("短链接", "短網址")}"></a>）</div>`);
                break;
            case "vector":
                $item.append(`<div>（<a data-copy-content="${link.wikitext}" data-type="wikitext"></a>）</div>`);
                $item.append(`<div>（<a data-copy-content="${wgServer}${wgScriptPath}/_?${link.href}" data-type="${wgULS("短链接", "短網址")}"></a>）</div>`);
                break;
        }
        $list.append($item);
    };

    // 标记复制状态
    const markStatus = (ele, status) => {
        ele.innerText = status ?
            `${ele.dataset.type}${wgULS("复制成功", "複製成功")}`
            :
            `${wgULS("复制", "複製")}${ele.dataset.type}`;
    };

    // 初始化复制栏
    for (const item of links) {
        addItem(item);
    }
    $("#p-sl-list a[data-type]").each((_, ele) => {
        markStatus(ele, false);
    });

    // 点击复制操作
    $("#p-sl-list a[data-type]").on("click", async function () {
        if (typeof navigator.clipboard?.writeText === "function") {
            await navigator.clipboard.writeText(this.dataset.copyContent);
        } else {
            // 除了IE以外的浏览器基本都支持navigator.clipboard.writeText() - https://caniuse.com/mdn-api_clipboard_writetext
            // 没有就改为添加一个不可见pre，加入内容后选中并复制。
            const valueNode = $("<pre/>", {
                css: {
                    position: "absolute",
                    left: "-99999px",
                    "z-index": "-99999",
                    opacity: 0,
                },
            }).appendTo("body");

            // 保存当前用户所选中的内容以便在复制后恢复
            const selection = window.getSelection();
            const { rangeCount } = selection;
            let range;
            if (rangeCount > 0) {
                range = selection.getRangeAt(0);
            }
            valueNode.text(this.dataset.copyContent);
            selection.selectAllChildren(valueNode[0]);
            document.execCommand("copy");
            // 延时恢复用户选中
            window.setTimeout(() => {
                selection.removeAllRanges();
                if (rangeCount > 0) {
                    selection.addRange(range);
                }
                valueNode.empty();
            }, 7);
        }
        markStatus(this, true);
        setTimeout(() => {
            markStatus(this, false);
        }, 3000);
    });
    if (skin === "vector") {
        $(window).on("resize", () => {
            $("#mw-panel").height($("body").height());
        });
    }
});
// </pre>
