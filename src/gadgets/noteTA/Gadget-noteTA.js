"use strict";
// <pre>
/*
 * 引自 https://zh.wikipedia.org/wiki/MediaWiki:Gadget-noteTA.js jQuery UI对话框版本
 * User:AnnAngela做了整合与现代化
 */
mw.hook("wikipage.content").add(() => {
    const map = {
        zh: "（不转换）",
        "zh-hans": "（简体）",
        "zh-hant": "（繁体）",
    };
    const replaceReg = RegExp(`^\\/(?:${Object.keys(map).join("|")})`);
    const name = Object.keys(map);
    const api = new mw.Api();
    const { wgUserVariant, wgUserName } = mw.config.get();
    $(() => {
        if ($(".noteTA").length === 0 || $("#noteTA-vector-menu-tabs")[0]) {
            return;
        }
        $("#p-variants").nextAll('.noteTA-menu, [class*="mw-indicator"], [id*="mw-indicator"]').remove();
        let $dialog = null, $this = null;
        if (mw.config.get("skin") === "moeskin") {
            $this = $("#p-noteTA-moeskin");
            $("#p-noteTA-moeskin > button").addClass("noteTAViewer-button");
        } else {
            const noteTAIndicator = $("[id^=mw-indicator-noteTA-]").hide();
            const $noteTAIndicatorImg = noteTAIndicator.find("img").css("height", "17.5px");
            $this = $("<div/>", {
                "class": "vector-menu vector-menu-tabs",
                id: "noteTA-vector-menu-tabs",
                style: "float: left",
            }).append(
                $("<div>", { "class": "vector-menu-content" }).append(
                    $("<ul>", { "class": "vector-menu-content-list" }).append(
                        $("<li>", { "class": "mw-list-item vector-tab-noicon" }).append(
                            $("<a>", { href: "javascript:;" }).append($noteTAIndicatorImg[0]),
                        ),
                    ),
                ),
            ).insertAfter("#vector-variants-dropdown");
        }

        const parse = async (wikitext, retryCount = 0) => {
            try {
                const data = await api.post({
                    action: "parse",
                    title: "Template:CGroup/____SAND_BOX____",
                    text: wikitext,
                    prop: "text",
                    variant: wgUserVariant,
                });
                return data.parse.text["*"];
            } catch (e) {
                if (retryCount < 3) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    return parse(wikitext, retryCount + 1);
                }
                throw e;
            }
        };

        $this.on("click", async () => {
            if ($dialog === null) {
                $dialog = $('<div class="noteTA-dialog" />');
                $dialog.html('<div class="mw-ajax-loader" style="margin-top: 48px;" />');
                $dialog.dialog({
                    title: wgULS("字词转换", "字詞轉換"),
                });
            } else {
                $dialog.dialog("open");
            }
            if ($dialog.find(".mw-ajax-loader, .noteTAViewer-error").length > 0) {
                let wikitext = "", collapse = false;
                const $dom = $("#mw-content-text .mw-parser-output");
                const actualTitle = mw.config.get("wgPageName").replace(/_/g, " ");
                // title
                const $noteTAtitle = $dom.find(".noteTA-title");
                if ($noteTAtitle.length) {
                    const titleConv = $noteTAtitle.last().data("noteta-code");
                    let titleDesc = $noteTAtitle.last().data("noteta-desc");
                    if (titleDesc) {
                        titleDesc = `（${titleDesc}）`;
                    } else {
                        titleDesc = "";
                    }
                    wikitext += `<span style="float: right;">{{edit|${actualTitle}|section=0}}</span>\n`;
                    wikitext += "; 本文使用[[Help:繁简转换|标题手工转换]]\n";
                    wikitext += `* 转换标题为：-{D|${titleConv}}-${titleDesc}\n`;
                    wikitext += `* 实际标题为：-{R|${actualTitle}}-；当前显示为：-{|${titleConv}}-\n`;
                }
                // conversation group
                const $noteTAgroups = $dom.find(".noteTA-group > *[data-noteta-group]");
                if ($noteTAgroups.length > 1) {
                    collapse = true;
                }
                for (const json of new Set($noteTAgroups.map((_, ele) => JSON.stringify([$(ele).data("noteta-group-source"), $(ele).data("noteta-group")])))) {
                    const [source, group] = JSON.parse(json);
                    switch (source) {
                        case "template":
                            wikitext += `{{CGroup/${group}}}\n`;
                            break;
                        case "module":
                            wikitext += `{{#invoke:CGroupViewer|dialog|${group}}}\n`;
                            break;
                        case "none":
                            wikitext += `; 本文使用的公共转换组“${group}”尚未创建\n`;
                            wikitext += `* {{edit|Module:CGroup/${group}|创建公共转换组“${group}”}}\n`;
                            break;
                        default:
                            wikitext += `; 未知公共转换组“${group}”来源“${source}”\n`;
                    }
                }
                const $noteTAlocal = $dom.find(".noteTA-local");
                // hidden rule in article
                if ($noteTAlocal.length) {
                    collapse = true;
                    wikitext += `<span style="float: right;">{{edit|${actualTitle}|section=0}}</span>\n`;
                    wikitext += "; 本文使用[[Help:繁简转换|全文手工转换]]\n";
                    const $noteTAlocals = $noteTAlocal.children("*[data-noteta-code]");
                    for (const json of new Set($noteTAlocals.map((_, ele) => JSON.stringify([$(ele).data("noteta-code"), $(ele).data("noteta-desc")])))) {
                        const [localConv, desc] = JSON.parse(json),
                            localDesc = desc ? `<br>说明：${desc}` : "";
                        wikitext += `* -{D|${localConv}}-当前显示为：-{${localConv}}-${localDesc}\n`;
                    }
                }
                wikitext += "{{noteTA/footer}}\n";
                // API request
                try {
                    const result = await parse(wikitext);
                    $dialog.html(result);
                    if (collapse) {
                        $dialog.find(".mw-collapsible").makeCollapsible();
                        $dialog.find(".mw-collapsible-toggle").on("click.mw-collapse", async (_, ele) => {
                            const $collapsibleContent = $(ele).parent(".mw-collapsible").find(".mw-collapsible-content");
                            await $collapsibleContent.promise();
                            $dialog.dialog("option", "position", "center");
                        });
                    }
                    $dialog.dialog("option", "width", Math.round($(window).width() * 0.8));
                    $dialog.css("max-height", `${Math.round($(window).height() * 0.8)}px`);
                    $dialog.dialog("option", "position", "center");
                } catch {
                    $dialog.html(`<span class="noteTAViewer-error">${wgULS("网络错误", "網路錯誤", null, null, "網絡錯誤")}，${wgULS("请稍后再试", "請稍後再試")}</span>`);
                }
            }
        });
    });
    $(() => {
        $("#ca-varlang-1, #ca-varlang-2").remove();
        const wgUserId = mw.config.get("wgUserId");

        if (typeof wgUserId === "number" && wgUserId > 0 && mw.config.get("wgAction") === "view" && localStorage.getItem("AnnTools-noteTA-alert") !== "true" && !document.getElementById("noteTA-lang") && !/^\/zh-[a-z]+\//.test(location.pathname)) {
            const url = new mw.Uri();
            if (!(Reflect.has(url.query, "variant") || Reflect.has(url.query, "uselang")) && !url.path.startsWith("/index.php") && name.includes(wgUserVariant)) {
                $("body").append(`<div id="noteTA-lang"><p>检测到您当前使用的<b>内容</b>语言变体 ${wgUserVariant}${map[wgUserVariant]}会导致繁简转换无法正常工作，我们建议您切换到以下三种<b>内容</b>语言变体之一：</p><p><span class="noteTA-lang-changer mw-ui-button" data-lang="zh-cn">zh-cn（中国大陆）</span> <span class="noteTA-lang-changer mw-ui-button" data-lang="zh-hk">zh-hk（中国香港）</span> <span class="noteTA-lang-changer mw-ui-button" data-lang="zh-tw">zh-tw（台湾地区）</span> | <span id="noteTA-lang-explainer" class="mw-ui-button">了解更多</span> <span id="noteTA-lang-disable" class="mw-ui-button mw-ui-destructive">不再提示</span></div>`);
                const container = $("#noteTA-lang");
                $(".noteTA-lang-changer").on("click", async (e) => {
                    const target = e.target;
                    const text = target.innerText;
                    const lang = target.dataset.lang;
                    container.html(`<p>正在切换至 ${text} ……</p>`);
                    try {
                        const result = await api.postWithToken("csrf", {
                            action: "options",
                            assertuser: wgUserName,
                            optionname: "variant",
                            optionvalue: lang,
                        });
                        if (result.options === "success") {
                            container.html("<p>切换成功，正在刷新页面！</p>");
                            location.pathname = location.pathname.replace(replaceReg, "");
                        } else {
                            throw result;
                        }
                    } catch (reason) {
                        console.info("noteTA-lang-changer:", reason);
                        container.html(`<p class="mw-parser-output">发生错误，无法切换，请手动访问<b>【<a href="/Special:Preferences#mw-prefsection-personal-i18n" target="_blank" class="external text">设置页面 - 语言</a> - 内容语言变种】处</b>修改您的内容语言变种为 ${text}</p>`);
                    }
                }).filter(`[data-lang="${wgUserVariant}"]`).addClass("mw-ui-progressive");
                $("#noteTA-lang-explainer").on("click", () => {
                    // open(mw.config.get("wgServer") + mw.config.get("wgScriptPath") +,"_blank");
                }).hide();
                $("#noteTA-lang-disable").on("click", () => {
                    $("#noteTA-lang").remove();
                    localStorage.setItem("AnnTools-noteTA-alert", "true");
                });
            }
        }
    }, 0);
});
// </pre>
