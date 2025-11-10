// WARNING: This script would break if source wikitext contains <pre> tags, won't fix.
// <pre>
"use strict";
// TODO: Fix MultilineTextInput initial height
// Test: https://zh.moegirl.org.cn/index.php?oldid=5572397
// declare var lrAivc: {
//     [key: string]: any;
// };
// declare var OpenCC: any;
// declare var InPageEdit: {
//     [key: string]: any;
// };
$(() => (async () => {
    const pagename = mw.config.get("wgPageName");
    const username = mw.config.get("wgUserName");
    // await mw.loader.using(["mediawiki.api", "oojs-ui"]);

    const pageid = mw.config.get("wgArticleId");
    const basepage = pagename.replace(/\/.*?$/, "");
    const api = new mw.Api(), zhAPI = /^m?zh\.moegirl\.org\.cn$/.test(location.hostname) ? api : new mw.ForeignApi("https://mzh.moegirl.org.cn/api.php", { anonymous: true });

    const lrAivc = $.extend({
        main: ["zh-cn", "zh-tw", "zh-hk"],
        dependent: {
            "(main)": "zh-cn",
            "zh-hans": "zh-cn",
            "zh-hant": "zh-tw",
        },
        noteTA: {
            G1: "MediaWiki",
        },
        autoPopulate: true,
        useOpenCC: true,
        manualAction: {
            "zh-hk": (t) => t.replaceAll("户", "戶"),
            "zh-tw": (t) => t.replaceAll("名稱空間", "命名空間").replaceAll("記憶體", "內存"),
        },
        watchlist: "nochange",
    }, window.lr_aivc);

    let prepopContent = "";
    try {
        prepopContent = lrAivc.autoPopulate
            ? (await api.get({
                action: "parse",
                assertuser: username,
                pageid,
                prop: "wikitext",
            })).parse.wikitext["*"]
            : "";
    } catch { }
    const toParams = (obj) => Object.entries(obj).map(([k, v]) => `${k}=${v}`).join("|");
    const variantPage = (variant) => variant === "(main)" ? `${basepage}` : `${basepage}/${variant}`;

    const REGEXP = {
        // [\s\S] works with new lines (avoids using dotall flag)
        lcMarker: /-{([\s\S]*?)}-/g,
        lcMarkerEsc: /-\\{([\s\S]*?)}\\-/g,
        nowiki: /<nowiki>([\s\S]*?)<\/nowiki>/g,
        link: /\[\[([\s\S]*?)(?:#([\s\S]*?))?(\|[\s\S]*?)?\]\]/g,
        extLink: /([^[])\[([^[]+?)( [\s\S]+?)?\]([^\]])/g,
        // extLink: /(?<!\[)\[([^[]+?)( [\s\S]+?)?\](?!\])/g,
        template: /\{\{([\s\S]*?)\}\}/g,
        htmlEntity: /&([a-zA-Z0-9#]+);/g,
        noOCC: /<!--noOCC-->([\s\S]*?)<!--\/noOCC-->/gi,
    };
    const escapeWikitext = (original) => {
        const nowikis = [], mappings = [];
        let replaced = original;
        // Preserve all LC markers (including those within nowiki)
        replaced = replaced.replace(REGEXP.lcMarker, (_, content) => `-\\{${content}}\\-`);
        // Temporarily strip nowiki
        replaced = replaced.replace(REGEXP.nowiki, (_, content) => `<nowiki>${nowikis.push(content) - 1}</nowiki>`);
        // Replace link targets and anchors with IDs
        replaced = replaced.replace(REGEXP.link, (match, target, anchor, text) => anchor || text ? `[[${text ? mappings.push(target) - 1 : target}${anchor ? `#${mappings.push(anchor) - 1}` : ""}${text || ""}]]` : match);
        // Replace external link targets with IDs
        replaced = replaced.replace(REGEXP.extLink, (_, before, target, text, after) => `${before}[${mappings.push(target) - 1}${text || ""}]${after}`);
        // replaced = replaced.replace(REGEXP.extLink, (_, target, text) => `[${mappings.push(target) - 1}${text || ""}]`);
        // Replace template names and parameters with IDs
        replaced = replaced.replace(REGEXP.template, (_, params) => {
            const paramList = params.split("|");
            mappings.push(paramList[0]);
            paramList.shift();
            return `${paramList.reduce((acc, param) => {
                const [first, ...rest] = param.split("=");
                // If rest is not empty, it's a named parameter; otherwise, it's a positional parameter
                return rest.length ? `${acc}|${mappings.push(first) - 1}=${rest.join("=")}` : `${acc}|${param}`;
            }, `{{${mappings.length - 1}`)}}}`;
        });
        // Replace LC markers with IDs
        replaced = replaced.replace(REGEXP.lcMarkerEsc, (_, content) => `-\\{${mappings.push(content || "") - 1}}\\-`);
        // Replace HTML entities with IDs
        replaced = replaced.replace(REGEXP.htmlEntity, (_, entity) => `&${mappings.push(entity) - 1};`);
        // Restore nowiki
        replaced = replaced.replace(REGEXP.nowiki, (_, index) => `<nowiki><nowiki>${nowikis[index]}</nowiki></nowiki>`);
        return { replaced, mappings };
    };
    const restoreWikitext = (original, mappings) => {
        const nowikis = [];
        let replaced = original;
        // Temporarily strip nowiki
        replaced = replaced.replace(REGEXP.nowiki, (_, content) => `<nowiki>${nowikis.push(content) - 1}</nowiki>`);
        // Restore HTML entities
        replaced = replaced.replace(REGEXP.htmlEntity, (_, index) => `&${mappings[index]};`);
        // Restore template names and parameters
        replaced = replaced.replace(REGEXP.template, (_, params) => {
            const paramList = params.split("|");
            const name = mappings[paramList[0]];
            paramList.shift();
            return `${paramList.reduce((acc, param) => {
                const [first, ...rest] = param.split("=");
                // If rest is not empty, it's a named parameter; otherwise, it's a positional parameter
                return rest.length ? `${acc}|${mappings[first]}=${rest.join("=")}` : `${acc}|${param}`;
            }, `{{${name}`)}}}`;
        });
        // Restore external link targets
        replaced = replaced.replace(REGEXP.extLink, (_, before, target, text, after) => `${before}[${mappings[target]}${text || ""}]${after}`);
        // replaced = replaced.replace(REGEXP.extLink, (_, target, text) => `[${mappings[target]}${text || ""}]`);
        // Restore link targets
        replaced = replaced.replace(REGEXP.link, (match, target, anchor, text) => anchor || text ? `[[${text ? mappings[target] : target}${mappings[anchor] ? `#${mappings[anchor]}` : ""}${text || ""}]]` : match);
        // Restore nowiki
        replaced = replaced.replace(REGEXP.nowiki, (_, index) => `<nowiki>${nowikis[index]}</nowiki>`);
        // Restore all LC markers (including those within nowiki)
        replaced = replaced.replace(REGEXP.lcMarkerEsc, (_, index) => `-{${mappings[index] ?? index}}-`);
        return replaced;
    };

    class AIVCWindow extends OO.ui.ProcessDialog {
        static static = {
            ...super.static,
            tagName: "div",
            name: "lr-aivc",
            title: wgULS("自动繁简转换工具", "自動繁簡轉換工具"),
            actions: [
                {
                    action: "cancel",
                    label: "取消",
                    flags: ["safe", "close", "destructive"],
                    modes: "config",
                },
                {
                    action: "continue",
                    label: wgULS("继续", "繼續"),
                    flags: ["primary", "progressive"],
                    modes: "config",
                },
                {
                    action: "back",
                    label: "返回",
                    flags: ["safe", "back"],
                    modes: "confirm",
                },
                {
                    action: "submit",
                    label: wgULS("确认", "確認"),
                    flags: ["primary", "progressive"],
                    modes: "confirm",
                },
            ],
        };
        constructor(config) {
            // Parent constructor
            super(config);

            this.config = config.data.config;
            this.prepopContent = config.data.prepopContent;
        }
        initialize() {
            // Parent method
            super.initialize();

            this.configPanel = new OO.ui.PanelLayout({
                scrollable: false,
                expanded: false,
                padded: true,
            });
            this.confirmPanel = new OO.ui.PanelLayout({
                scrollable: false,
                expanded: false,
                padded: true,
            });

            this.ogText = new OO.ui.MultilineTextInputWidget({
                value: this.prepopContent,
                autosize: true,
            });
            const textField = new OO.ui.FieldLayout(this.ogText, {
                label: wgULS("原始内容", "原始內容"),
                align: "top",
            });

            this.mainVariants = new OO.ui.TextInputWidget({
                value: this.config.main.join(";"),
            });
            const mainField = new OO.ui.FieldLayout(this.mainVariants, {
                label: wgULS("主要变体", "主要變体"),
                align: "top",
            });

            this.depVariants = new OO.ui.TextInputWidget({
                value: Object.entries(this.config.dependent).map(([k, v]) => `${k}:${v}`).join(";"),
            });
            const depField = new OO.ui.FieldLayout(this.depVariants, {
                label: wgULS("依赖变体", "依賴變体"),
                align: "top",
            });

            this.noteTAParams = new OO.ui.TextInputWidget({
                value: toParams(this.config.noteTA),
            });
            const noteTAField = new OO.ui.FieldLayout(this.noteTAParams, {
                label: wgULS("NoteTA参数", "NoteTA參數"),
                align: "top",
            });

            this.occCheckbox = new OO.ui.CheckboxInputWidget({
                selected: this.config.useOpenCC,
            });
            const occField = new OO.ui.FieldLayout(this.occCheckbox, {
                label: "使用OpenCC",
                align: "inline",
            });

            this.configPanel.$element.append(
                textField.$element,
                mainField.$element,
                depField.$element,
                noteTAField.$element,
                occField.$element,
            );

            this.stackLayout = new OO.ui.StackLayout({
                items: [this.configPanel, this.confirmPanel],
            });

            this.ogText.connect(this, { resize: "updateSize" });

            this.$body.append(this.stackLayout.$element);
        }
        getBodyHeight() {
            return this.stackLayout.getCurrentItem().$element.outerHeight(true);
        }
        getSetupProcess(data) {
            return super.getSetupProcess(data).next(() => {
                this.actions.setMode("config");
                this.stackLayout.setItem(this.configPanel);
            }, this);
        }
        getReadyProcess(data) {
            return super.getReadyProcess(data)
                .next(() => {
                    this.ogText.focus();
                }, this);
        }
        getActionProcess(action) {
            if (action === "cancel") {
                return new OO.ui.Process(() => {
                    this.close({ action: action });
                }, this);
            } else if (action === "continue") {
                return new OO.ui.Process($.when((async () => {
                    this.config = $.extend(this.config, {
                        main: this.mainVariants.getValue().split(";"),
                        dependent: Object.fromEntries(this.depVariants.getValue().split(";").map((v) => v.split(":"))),
                        noteTAStr: this.noteTAParams.getValue(),
                        useOpenCC: this.occCheckbox.isSelected(),
                        dependentInv: {},
                    });
                    if (this.config.main.includes("(main)")) {
                        throw new OO.ui.Error(wgULS("主页面不得作为主要变体", "主頁面不得作為主要變体"));
                    }
                    this.config.main.forEach((v) => this.config.dependentInv[v] = [v]);
                    try {
                        Object.entries(this.config.dependent).forEach(([k, v]) => this.config.dependentInv[v/* as string */].push(k));
                    } catch {
                        console.error("[VariantConverter] Error: Key not found in dependentInv. Config dump:", this.config);
                        throw new OO.ui.Error(wgULS("依赖变体格式错误，请检查控制台", "依賴變体格式錯誤，請檢查控制臺"));
                    }
                    this.textInputs = {};
                    this.confirmPanel.$element.empty();
                    try {
                        await this.getVariants(this.ogText.getValue());
                        this.actions.setMode("confirm");
                        this.stackLayout.setItem(this.confirmPanel);
                        this.updateSize();
                    } catch (e) {
                        console.error("[VariantConverter] Error:", e);
                        throw new OO.ui.Error(e);
                    }
                })()).promise(), this);
            } else if (action === "back") {
                this.actions.setMode("config");
                this.stackLayout.setItem(this.configPanel);
                this.updateSize();
            } else if (action === "submit") {
                return new OO.ui.Process($.when((async () => {
                    try {
                        await this.saveChanges();
                        this.close({ action: action });
                        mw.notify("保存成功！", {
                            title: wgULS("自动繁简转换工具", "自動繁簡轉換工具"),
                            type: "success",
                            tag: "lr-aivc",
                        });
                        setTimeout(() => location.reload(), 730);
                    } catch (e) {
                        console.error("[VariantConverter] Error:", e);
                        throw new OO.ui.Error(e);
                    }
                })()).promise(), this);
            }
            // Fallback to parent handler
            return super.getActionProcess(action);
        }
        addVariant(variant, text) {
            this.textInputs[variant] = new OO.ui.MultilineTextInputWidget({
                value: text,
                autosize: true,
            });
            const field = new OO.ui.FieldLayout(this.textInputs[variant], {
                label: variant,
                align: "top",
            });
            this.textInputs[variant].connect(this, { resize: "updateSize" });
            this.confirmPanel.$element.append(field.$element);
            if (window?.InPageEdit?.quickDiff) {
                this.confirmPanel.$element.append(new OO.ui.FieldLayout(new OO.ui.Widget({
                    content: [
                        new OO.ui.HorizontalLayout({
                            items: this.config.dependentInv[variant].map((v) => new OO.ui.ButtonWidget({
                                label: `${wgULS("对比", "對比")}${v === "(main)" ? wgULS("主页面", "主頁面") : v}`,
                            }).on("click", () => window.InPageEdit.quickDiff({
                                fromtitle: variantPage(v),
                                totext: this.textInputs[variant].getValue(),
                                pageName: variantPage(v),
                                isPreview: true,
                            }))),
                        }),
                    ],
                })).$element);
            }
        }
        async getVariants(original) {
            this.confirmPanel.$element.append(`<p>${wgULS("请确认以下转换是否正确", "請確認以下轉換是否正確")}：</p>`);

            if (!window.OpenCC && this.config.useOpenCC) {
                // Load in order to prevent reference error
                await libCachedCode.injectCachedCode("https://npm.elemecdn.com/opencc-js@latest", "script");
                /* global OpenCC */
            }

            const { replaced, mappings } = escapeWikitext(original);

            for (const variant of this.config.main) {
                if (variant === "(main)") {
                    continue;
                }
                const text = `{{NoteTA|${this.config.noteTAStr}}}<pre id="converted">-{}-${replaced}</pre>`;
                const parsed = $($.parseHTML((await zhAPI.post({
                    action: "parse",
                    assertuser: username,
                    text,
                    contentmodel: "wikitext",
                    prop: "text",
                    uselang: variant,
                    disablelimitreport: true,
                    pst: true,
                })).parse.text["*"]));
                let converted = parsed.find("#converted").text();
                if (this.config.useOpenCC) {
                    const occMappings = [];
                    converted = converted.replace(REGEXP.noOCC, (_, content) => `<!--noOCC-->${occMappings.push(content) - 1}<!--/noOCC-->`);

                    const occVariant = variant.replace("hans", "cn").replace(/zh-(?:han)?/, "").replace("tw", "twp");
                    const converter = OpenCC.Converter({ from: occVariant, to: occVariant });
                    converted = converter(converted);

                    converted = converted.replace(REGEXP.noOCC, (_, index) => `<!--noOCC-->${occMappings[index]}<!--/noOCC-->`);
                }
                const final = this.config.manualAction[variant]?.(converted) || converted;
                const restored = restoreWikitext(final, mappings);
                this.addVariant(variant, restored);
            }
        }
        async saveChanges() {
            // Occasionally edits are not saved - keep this log until the bug is identified
            console.log("[VariantConverter] Saved changes", await Promise.allSettled(this.config.main.map((variant) => {
                const text = this.textInputs[variant].getValue();
                return api.postWithToken("csrf", {
                    action: "edit",
                    assertuser: username,
                    title: variantPage(variant),
                    text,
                    summary: `自动转换自[[${pagename}]]`,
                    tags: "VariantConverter|Automation tool",
                    watchlist: this.config.watchlist,
                });
            }).concat(Object.entries(this.config.dependent).map(([variant, parent]) => {
                const text = this.textInputs[parent/* as string */].getValue();
                return api.postWithToken("csrf", {
                    action: "edit",
                    assertuser: username,
                    title: variantPage(variant),
                    text,
                    summary: `自动转换自[[${pagename}]]（同步${parent}）`,
                    tags: "VariantConverter|Automation tool",
                    watchlist: this.config.watchlist,
                });
            }))));
        }
    }

    const $body = $(document.body);
    const windowManager = new OO.ui.WindowManager();
    $body.append(windowManager.$element);
    const aivcDialog = new AIVCWindow({
        size: "large",
        data: {
            config: lrAivc,
            prepopContent,
        },
    });
    windowManager.addWindows([aivcDialog]);

    $(mw.util.addPortletLink("p-cactions", "#", wgULS("自动繁简转换", "自動繁簡轉換"), "ca-VariantConverter", wgULS("自动同步界面消息的繁简版本", "自動同步介面消息的繁簡版本"))).on("click", (e) => {
        e.preventDefault();
        $("#mw-notification-area").appendTo($body);
        windowManager.openWindow(aivcDialog);
    });
})());
// </pre>
