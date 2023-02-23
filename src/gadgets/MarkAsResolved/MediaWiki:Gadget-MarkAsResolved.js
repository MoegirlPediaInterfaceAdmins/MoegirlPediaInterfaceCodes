// <pre>
"use strict";
$(() => {
    const wgUserGroups = mw.config.get("wgUserGroups");
    if (!/^萌娘百科_talk:讨论版\/[^/]+$/.test(mw.config.get("wgPageName"))) { return; }
    if (!wgUserGroups.includes("sysop") && !wgUserGroups.includes("patroller")) { return; }
    // mw.loader.load(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/User:AnnAngela/js/quick-save.js/style.css?action=raw&ctype=text/css`, "text/css");
    // await mw.loader.using(["mediawiki.api", "mediawiki.Uri"]);
    const $body = $("body");
    $("#mw-notification-area").appendTo($body);
    const api = new mw.Api();

    class MARWindow extends OO.ui.ProcessDialog {
        static static = {
            ...super.static,
            tagName: "div",
            name: "AnnTools_MarkAsResolved",
            title: wgULS("公共讨论页段落状态标记工具"), // @TODO
            actions: [
                {
                    action: "cancel",
                    label: "取消",
                    flags: ["safe", "close", "destructive"],
                },
                {
                    action: "submit",
                    label: wgULS("确认", "確認"),
                    flags: ["primary", "progressive"],
                },
            ],
        };
        static statusList = [
            ["r", "问题已解决"],
            ["p", "问题已答复"],
            ["a", "请求已接受"],
            ["s", "请求被暂缓"],
            ["w", "请求被撤回"],
            ["d", "请求被拒绝"],
            ["n", "无人回复（点名批评）"],
        ];
        static archiveOffsetsFromStatus = {
            ...Object.fromEntries(MARWindow.statusList.map(([status]) => [status, 3])),
            n: 10,
            s: 10,
        };
        static bolbLabel(text) {
            return $("<span>").addClass("AnnTools_bolb").text(text);
        }
        panelLayout = new OO.ui.PanelLayout({
            scrollable: false,
            expanded: false,
            padded: true,
        });
        sectionTitleWidget = new OO.ui.Widget({
            classes: ["AnnTools_paragraphs"],
        });
        get sectionTitle() {
            return this.sectionTitleWidget.getData();
        }
        statusRadioSelect = new OO.ui.RadioSelectWidget({
            items: MARWindow.statusList.map(([data, label]) => new OO.ui.RadioOptionWidget({
                data,
                label,
            })),
            classes: ["AnnTools_RadioSelectWidget_column_2"],
        });
        get status() {
            return this.statusRadioSelect.findSelectedItem()?.getData?.();
        }
        get statusLabel() {
            return this.statusRadioSelect.findSelectedItem()?.getLabel?.();
        }
        archiveOffsetNumberInput = new OO.ui.NumberInputWidget({
            min: 1,
            max: 30,
            step: 1,
            value: 3,
        });
        get archiveOffset() {
            return Math.max(1, Math.min(30, Math.round(this.archiveOffsetNumberInput.getValue())));
        }
        precommentTextInput = new OO.ui.TextInputWidget({
            placeholder: "（但是如果不写就啥也没有）",
        });
        get precomment() {
            return this.precommentTextInput.getValue();
        }
        commentTextInput = new OO.ui.TextInputWidget({
            placeholder: "（但是如果不写就啥也没有）",
        });
        get comment() {
            return this.commentTextInput.getValue();
        }
        constructor(config) {
            super(config);
        }
        initialize() {
            super.initialize();
            const sectionTitleField = new OO.ui.FieldLayout(this.sectionTitleWidget, {
                label: MARWindow.bolbLabel(wgULS("段落标题：")), // @TODO
                align: "top",
            });
            const statusRadioSelectField = new OO.ui.FieldLayout(this.statusRadioSelect, {
                label: MARWindow.bolbLabel(wgULS("标记状态：")), // @TODO
                align: "top",
            });
            const archiveOffsetNumberInputField = new OO.ui.FieldLayout(this.archiveOffsetNumberInput, {
                label: MARWindow.bolbLabel(wgULS("存档用时：")), // @TODO
                align: "top",
            });
            const precommentTextInputField = new OO.ui.FieldLayout(this.precommentTextInput, {
                label: MARWindow.bolbLabel(wgULS("前置留言：")), // @TODO
                align: "top",
            });
            const commentTextInputField = new OO.ui.FieldLayout(this.commentTextInput, {
                label: MARWindow.bolbLabel(wgULS("内置留言：")), // @TODO
                align: "top",
            });

            this.panelLayout.$element.append(
                sectionTitleField.$element,
                statusRadioSelectField.$element,
                archiveOffsetNumberInputField.$element,
                precommentTextInputField.$element,
                commentTextInputField.$element,
            );

            this.statusRadioSelect.connect(this, { choose: "setDefaultArchiveOffset" });
            this.$body.append(this.panelLayout.$element);
        }
        /**
         * @type {(this: this, item: OO.ui.OptionWidget, selected: boolean) => void}
         */
        setDefaultArchiveOffset(item) {
            this.archiveOffsetNumberInput.setValue(MARWindow.archiveOffsetsFromStatus[item.getData()] || 3);
        }
        getBodyHeight() {
            return this.panelLayout.$element.outerHeight(true);
        }
        getActionProcess(action) {
            if (action === "cancel") {
                return new OO.ui.Process(() => {
                    this.close({ action });
                }, this);
            } else if (action === "submit") {
                return new OO.ui.Process($.when((async () => {
                    if (!this.status) {
                        throw new OO.ui.Error("请选择一个状态", {
                            recoverable: false,
                        });
                    }
                    const toclist = Object.fromEntries((await api.post({
                        action: "parse",
                        format: "json",
                        pageid: mw.config.get("wgArticleId"),
                        prop: "sections",
                    })).parse.sections.map(({ anchor, index }) => [anchor, index]));
                    if (!Reflect.has(toclist, this.sectionTitle)) {
                        throw new OO.ui.Error("请移除该标题内的模板后再行操作……", {
                            recoverable: false,
                        });
                    }
                    const section = toclist[this.sectionTitle];
                    try {
                        await this.markAsResolved({ section });
                        this.close({ action });
                        mw.notify(wgULS("即将刷新……", "即將刷新……"), {
                            title: wgULS("标记成功"), // @TODO
                            type: "success",
                            tag: "AnnTools_MarkAsResolved",
                        });
                        setTimeout(() => location.reload(), 730);
                    } catch (e) {
                        console.error("[MarkAsResolved] Error:", e);
                        throw new OO.ui.Error(e);
                    }
                })()).promise(), this);
            }
            return super.getActionProcess(action);
        }
        async markAsResolved({ section }) {
            const d = await api.postWithToken("csrf", {
                action: "edit",
                pageid: mw.config.get("wgArticleId"),
                section,
                summary: `标记讨论串「/* ${this.sectionTitle} */」状态为【${this.statusLabel}】`,
                tags: "Automation tool",
                nocreate: true,
                appendtext: `${this.precomment.length > 0 ? `\n:${this.precomment}——~~~~` : ""}\n\n{{MarkAsResolved|time={{subst:#timel:Ymd}}|status=${this.status}|archive-offset=${this.archiveOffset}|comment=${this.comment}|sign=~~~~}}`,
            });
            if (d.error) {
                throw d.error.code;
            }
        }
    }

    const windowManager = new OO.ui.WindowManager();
    $body.append(windowManager.$element);
    const marDialog = new MARWindow({
        size: "medium",
    });
    windowManager.addWindows([marDialog]);
    for (const ele of $("#mw-content-text > .mw-parser-output > h2, #mw-content-text > .mw-parser-output > .discussionContainer > h2")) {
        const self = $(ele);
        const content = self.nextUntil("h2").not("h2");
        if (content.hasClass("saveNotice") || content.hasClass("MarkAsResolved")) { return; }
        const sectionTitle = self.find(".mw-headline").attr("id");
        const href = self.find('.mw-editsection a[href*="action=edit"]').attr("href");
        const a = $("<a>");
        a.attr({ href }).prop("draggable", false).addClass("AnnTools_MarkAsResolved").text("标记状态");
        self.find(".mw-editsection-bracket").first()
            .after('<span class="mw-editsection-divider"> | </span>')
            .after(a);
        a.on("click", () => {
            if (!marDialog.isVisible()) {
                marDialog.sectionTitleWidget.setData(sectionTitle);
                marDialog.sectionTitleWidget.$element.text(sectionTitle);
                windowManager.openWindow(marDialog);
            }
            return false;
        });
        const quicksave = self.find(".AnnTools_QuickSave");
        if (quicksave[0]) {
            const divider = quicksave.next(".mw-editsection-divider");
            if (divider.length > 0) {
                self.find(".mw-editsection .mw-editsection-bracket").first().after(divider).after(quicksave);
            }
        }
    }
});
// </pre>
