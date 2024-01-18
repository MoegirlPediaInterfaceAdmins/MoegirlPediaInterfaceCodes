"use strict";
// <pre>
/*
 * 引自 https://zh.wikipedia.org/wiki/MediaWiki:Gadget-noteTA.js https://zh.wikipedia.org/wiki/MediaWiki:Gadget-noteTAvector.js
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
    $(() => {
        if ($("#noteTA-vector-menu-tabs")[0]) {
            return;
        }
        $("#p-variants").nextAll('.noteTA-menu, [class*="mw-indicator"], [id*="mw-indicator"]').remove();
        const noteTAIndicator = $("[id^=mw-indicator-noteTA-], [id^=mobile-noteTA-]").hide();
        if (noteTAIndicator.length === 0) {
            return;
        }
        const $noteTAIndicatorImg = noteTAIndicator.find("img");
        let $dialog = null;
        const $this = $("#p-variants").length === 0
            ? $("[id^=mobile-noteTA-].mobileonly").show()
            : $("<div/>", {
                "class": "vector-menu vector-menu-tabs vectorTabs",
                id: "noteTA-vector-menu-tabs",
                style: "float: left",
            }).append(
                $("<ul>").append(
                    $("<li>", { "class": "selected" }).append(
                        $("<span>").append(
                            $("<a>", { href: "javascript:;" }).append($noteTAIndicatorImg[0]),
                        ),
                    ),
                ),
            ).insertAfter("#p-variants");
        $this.on("click", () => {
            if ($dialog === null) {
                $dialog = $('<div class="noteTA-dialog" />');
                $dialog.html('<div class="mw-ajax-loader" style="margin-top: 48px;" />');
                $dialog.dialog({
                    title: wgULS("字词转换", "字詞轉換"),
                });
                let wikitext = "";
                const $dom = $("#mw-content-text .mw-parser-output");
                let collapse = true;
                const actualTitle = mw.config.get("wgPageName").replace(/_/g, " ");

                const parse = async () => {
                    try {
                        const results = await api.post({
                            action: "parse",
                            assertuser: mw.config.get("wgUserName"),
                            title: "Template:CGroup/____SAND_BOX____",
                            text: wikitext,
                            prop: "text",
                            variant: mw.config.get("wgUserVariant"),
                        });
                        $dialog.html(results.parse.text["*"]);
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
                        return parse();
                    }
                };
                let maybeTitle = parse;
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
                } else {
                    maybeTitle = async () => {
                        try {
                            const results = await api.post({
                                action: "parse",
                                assertuser: mw.config.get("wgUserName"),
                                title: actualTitle,
                                text: `{{noteTA/multititle|${actualTitle}}}`,
                                prop: "text",
                                variant: "zh",
                            });
                            const $multititle = $(results.parse.text["*"]).find(".noteTA-multititle");
                            if ($multititle.length) {
                                const textVariant = {};
                                const variantText = {};
                                let multititleText = "";
                                $multititle.children().each((_, ele) => {
                                    const $li = $(ele);
                                    const variant = $li.data("noteta-multititle-variant");
                                    const text = $li.text();
                                    variantText[variant] = text;
                                    if (textVariant[text]) {
                                        textVariant[text].push(variant);
                                    } else {
                                        textVariant[text] = [variant];
                                    }
                                });
                                multititleText += "; 本文[[Help:繁简转换|标题可能经过转换]]\n";
                                multititleText += "* 转换标题为：";
                                const multititle = [],
                                    titleConverted = variantText[mw.config.get("wgUserVariant")];
                                for (const variant in variantText) {
                                    const text = variantText[variant];
                                    if (text === null) {
                                        continue;
                                    }
                                    const variants = textVariant[text];
                                    for (let i = 0, l = variants.length; i < l; i++) {
                                        variantText[variants[i]] = null;
                                    }
                                    const variantsName = variants.map((variant) => `-{R|{{MediaWiki:Variantname-${variant}}}}-`).join("、");
                                    multititle.push(`${variantsName}：-{R|${text}}-`);
                                }
                                multititleText += multititle.join("；");
                                multititleText += `\n* 实际标题为：-{R|${actualTitle}}-；当前显示为：-{R|${titleConverted}}-\n`;
                                wikitext = multititleText + wikitext;
                            }
                            parse();
                        } catch {
                            return maybeTitle();
                        }
                    };
                }
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
                maybeTitle();
            } else {
                $dialog.dialog("open");
            }
        });
    });
    $(() => {
        $("#ca-varlang-1, #ca-varlang-2").remove();
        const wgUserId = mw.config.get("wgUserId");

        if (typeof wgUserId === "number" && wgUserId > 0 && mw.config.get("wgAction") === "view" && localStorage.getItem("AnnTools-noteTA-alert") !== "true" && !document.querySelector("#noteTA-lang") && !/^\/zh-[a-z]+\//.test(location.pathname)) {
            const url = new mw.Uri();
            const wgUserVariant = mw.config.get("wgUserVariant");
            if (!(Reflect.has(url.query, "variant") || Reflect.has(url.query, "uselang")) && !url.path.startsWith("/index.php") && name.includes(wgUserVariant)) {
                $("body").append(`<div id="noteTA-lang" style="background: #3366CC; color: white; text-align: center; padding: .5rem; position: fixed; top: 0; left: 0; right: 0; z-index: 9999;"><p>检测到您当前使用的<b>内容</b>语言变体 ${wgUserVariant}${map[wgUserVariant]}会导致繁简转换无法正常工作，我们建议您切换到以下三种<b>内容</b>语言变体之一：</p><p><span class="noteTA-lang-changer mw-ui-button" data-lang="zh-cn">zh-cn（中国大陆）</span> <span class="noteTA-lang-changer mw-ui-button" data-lang="zh-hk">zh-hk（中国香港）</span> <span class="noteTA-lang-changer mw-ui-button" data-lang="zh-tw">zh-tw（台湾地区）</span> | <span id="noteTA-lang-explainer" class="mw-ui-button">了解更多</span> <span id="noteTA-lang-disable" class="mw-ui-button mw-ui-destructive">不再提示</span></div>`);
                const container = $("#noteTA-lang");
                $(".noteTA-lang-changer").on("click", async (e) => {
                    const target = e.target;
                    const text = target.innerText;
                    const lang = target.dataset.lang;
                    container.html(`<p>正在切换至 ${text} ……</p>`);
                    try {
                        const result = await api.postWithToken("csrf", {
                            action: "options",
                            assertuser: mw.config.get("wgUserName"),
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
