"use strict";
/*
 * 引自 https://zh.wikipedia.org/wiki/MediaWiki:Gadget-noteTA.js
 * User:AnnAngela做了整合与现代化
 */
const map = {
    zh: "（不转换）",
    "zh-hans": "（简体）",
    "zh-hant": "（繁体）",
};
const names = Object.keys(map);
const api = new mw.Api();
const { wgUserVariant, wgUserName, wgPageName, wgUserId, skin, wgAction } = mw.config.get();
const noteTAState = {
    trigger: null,
    viewer: null,
    windowManager: null,
};

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

const buildNoteTAWikitext = ($dom) => {
    let wikitext = "";
    const actualTitle = wgPageName.replace(/_/g, " ");
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
        wikitext += `<span style="float: right;">{{edit|${actualTitle}|section=0}}</span>\n`;
        wikitext += "; 本文使用[[Help:繁简转换|全文手工转换]]\n";
        const $noteTAlocals = $noteTAlocal.children("*[data-noteta-code]");
        for (const json of new Set($noteTAlocals.map((_, ele) => JSON.stringify([$(ele).data("noteta-code"), $(ele).data("noteta-desc")])))) {
            const [localConv, desc] = JSON.parse(json),
                localDesc = desc ? `<br>说明：${desc}` : "";
            wikitext += `* -{D|${localConv}}-当前显示为：-{${localConv}}-${localDesc}\n`;
        }
    }
    return `${wikitext}{{noteTA/footer}}\n`;
};

class NoteTAViewer extends OO.ui.ProcessDialog {
    static static = {
        ...super.static,
        tagName: "div",
        name: "AnnTools_noteTA",
        title: wgULS("字词转换", "字詞轉換"),
        actions: [
            {
                action: "close",
                label: wgULS("关闭", "關閉"),
                flags: ["safe", "close"],
            },
        ],
    };

    source = null;
    sourceKey = null;
    loadPromise = null;
    requestId = 0;
    loaded = false;
    sizeUpdateFrame = null;

    constructor(config) {
        super(config);
        this.$realContent = $("<div>", {
            "class": "noteTA-dialog-content",
        });
        this.panelLayout = new OO.ui.PanelLayout({
            expanded: false,
            padded: true,
            scrollable: false,
        });
    }

    initialize() {
        super.initialize();
        this.panelLayout.$element.append(this.$realContent);
        this.$body.append(this.panelLayout.$element);
        this.showLoading();
    }

    getActionProcess(action) {
        if (action === "close") {
            return new OO.ui.Process(() => {
                this.close({ action });
            }, this);
        }
        return super.getActionProcess(action);
    }

    getBodyHeight() {
        return Math.min(this.$body[0].scrollHeight, Math.round($(window).height() * 0.8));
    }

    updateSizeAfterContentChange() {
        if (this.sizeUpdateFrame !== null) {
            return;
        }
        this.sizeUpdateFrame = requestAnimationFrame(() => {
            this.sizeUpdateFrame = null;
            if (this.isVisible()) {
                this.updateSize();
            }
        });
    }

    setSource($source, sourceKey) {
        this.source = $source;
        if (this.sourceKey === sourceKey) {
            return;
        }
        this.sourceKey = sourceKey;
        this.requestId++;
        this.loadPromise = null;
        this.loaded = false;
        if (this.isVisible()) {
            this.close();
        }
        this.showLoading();
    }

    showLoading() {
        this.$realContent
            .empty()
            .append($("<div>", {
                "class": "mw-ajax-loader",
            }));
        this.updateSize();
    }

    showError() {
        this.$realContent
            .empty()
            .append($("<span>", {
                "class": "noteTAViewer-error",
                text: `${wgULS("网络错误", "網路錯誤", null, null, "網絡錯誤")}，${wgULS("请稍后再试", "請稍後再試")}`,
            }));
        this.updateSize();
    }

    load() {
        if (this.loaded) {
            return;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        const requestId = this.requestId;
        const $source = this.source;
        if (!$source?.length) {
            return;
        }
        this.showLoading();
        this.loadPromise = (async () => {
            try {
                const result = await parse(buildNoteTAWikitext($source));
                if (requestId !== this.requestId) {
                    return;
                }
                this.$realContent.html(result);
                const $collapsibles = this.$realContent.find(".mw-collapsible").makeCollapsible({
                    collapsed: true,
                });
                $collapsibles.on(
                    "afterExpand.mw-collapsible.noteTAViewer afterCollapse.mw-collapsible.noteTAViewer",
                    () => this.updateSizeAfterContentChange(),
                );
                this.loaded = true;
                this.updateSize();
            } catch {
                if (requestId === this.requestId) {
                    this.showError();
                }
            } finally {
                if (requestId === this.requestId) {
                    this.loadPromise = null;
                }
            }
        })();
        return this.loadPromise;
    }
}

const cleanupViewer = () => {
    if (noteTAState.trigger) {
        noteTAState.trigger.off(".noteTA");
        noteTAState.trigger = null;
    }
    if (noteTAState.viewer) {
        noteTAState.viewer.setSource(null);
    }
    $("#p-noteTA-moeskin > button").removeClass("noteTAViewer-button");
    $("#noteTA-vector-menu-tabs").remove();
};

const openViewer = (event) => {
    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") {
        return;
    }
    if (!noteTAState.viewer || !noteTAState.windowManager) {
        return;
    }
    event.preventDefault();
    if (noteTAState.windowManager.isClosing(noteTAState.viewer)) {
        return;
    }
    if (!noteTAState.viewer.isVisible() && !noteTAState.windowManager.isOpening(noteTAState.viewer)) {
        noteTAState.windowManager.openWindow(noteTAState.viewer);
    }
    noteTAState.viewer.load();
};

const getContentDom = ($content) => {
    if ($content?.jquery && typeof $content !== "function") {
        const $dom = $content.filter(".mw-parser-output").add($content.find(".mw-parser-output")).first();
        if ($dom.length) {
            return $dom;
        }
    }
    return $("#mw-content-text .mw-parser-output").first();
};

const setupViewer = ($dom) => {
    if (!$dom.length) {
        cleanupViewer();
        return;
    }
    if (noteTAState.trigger) {
        noteTAState.trigger.off(".noteTA");
        noteTAState.trigger = null;
    }
    $("#noteTA-vector-menu-tabs").remove();
    $("#p-variants").nextAll('.noteTA-menu, [class*="mw-indicator"], [id*="mw-indicator"]').remove();
    let $trigger;
    if (skin === "moeskin") {
        $trigger = $("#p-noteTA-moeskin");
        $("#p-noteTA-moeskin > button").addClass("noteTAViewer-button");
    } else {
        const noteTAIndicator = $("[id^=mw-indicator-noteTA-]").hide();
        const $noteTAIndicatorImg = noteTAIndicator.find("img").first().clone().css("height", "17.5px");
        const $vectorVariantsDropdown = $("#vector-variants-dropdown");
        if ($vectorVariantsDropdown.length) {
            $trigger = $("<div/>", {
                "class": "vector-menu vector-menu-tabs",
                id: "noteTA-vector-menu-tabs",
                style: "float: left",
            })
                .append(
                    $("<div>", { "class": "vector-menu-content" }).append(
                        $("<ul>", { "class": "vector-menu-content-list" }).append(
                            $("<li>", { "class": "mw-list-item vector-tab-noicon" }).append(
                                $("<a>", {
                                    href: "#",
                                    role: "button",
                                }).append($noteTAIndicatorImg),
                            ),
                        ),
                    ),
                )
                .insertAfter($vectorVariantsDropdown);
        } else {
            $trigger = $();
        }
    }
    if (!$trigger?.length) {
        cleanupViewer();
        return;
    }
    if (!noteTAState.windowManager) {
        noteTAState.windowManager = new OO.ui.WindowManager();
        noteTAState.windowManager.$element.appendTo("body");
    }
    if (!noteTAState.viewer) {
        noteTAState.viewer = new NoteTAViewer({
            size: "larger",
        });
        noteTAState.windowManager.addWindows([noteTAState.viewer]);
    }
    noteTAState.viewer.setSource($dom, buildNoteTAWikitext($dom));
    $trigger
        .off(".noteTA")
        .on("click.noteTA keydown.noteTA", openViewer);
    noteTAState.trigger = $trigger;
};

const setupVariantNotice = () => {
    $("#ca-varlang-1, #ca-varlang-2").remove();
    if (typeof wgUserId !== "number" || wgUserId <= 0 || wgAction !== "view" || localStorage.getItem("AnnTools-noteTA-alert") === "true" || document.getElementById("noteTA-lang") || /^\/zh-[a-z]+\//.test(location.pathname)) {
        return;
    }
    const url = new URL(location.href);
    if (url.searchParams.has("variant") || url.searchParams.has("uselang") || url.pathname.startsWith("/index.php") || !names.includes(wgUserVariant)) {
        return;
    }
    $("body").append(`<div id="noteTA-lang"><p>检测到您当前使用的<b>内容</b>语言变体 ${wgUserVariant}${map[wgUserVariant]}会导致繁简转换无法正常工作，我们建议您切换到以下三种<b>内容</b>语言变体之一：</p><p><span class="noteTA-lang-changer mw-ui-button" data-lang="zh-cn">zh-cn（简体-中国）</span> <span class="noteTA-lang-changer mw-ui-button" data-lang="zh-hk">zh-hk（繁体-中国香港）</span> <span class="noteTA-lang-changer mw-ui-button" data-lang="zh-tw">zh-tw（繁体-中国台湾）</span> | <span id="noteTA-lang-explainer" class="mw-ui-button">了解更多</span> <span id="noteTA-lang-disable" class="mw-ui-button mw-ui-destructive">不再提示</span></div>`);
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
                const replaceReg = RegExp(`^\\/(?:${names.join("|")})`);
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
};

const parser = ($content) => {
    $(() => {
        const $dom = getContentDom($content);
        if (!$dom.length || $dom.find(".noteTA").length === 0) {
            cleanupViewer();
        } else {
            setupViewer($dom);
        }
        setupVariantNotice();
    });
};
$(parser);
mw.hook("wikipage.content").add(parser);
