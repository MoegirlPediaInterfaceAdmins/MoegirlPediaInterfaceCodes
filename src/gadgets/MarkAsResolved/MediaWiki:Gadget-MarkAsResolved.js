// <pre>
"use strict";
$(() => {
    const wgUserGroups = mw.config.get("wgUserGroups");
    if (!/^萌娘百科_talk:讨论版\/[^存]+$/.test(mw.config.get("wgPageName"))) { return; }
    if (!wgUserGroups.includes("sysop") && !wgUserGroups.includes("patroller")) { return; }
    if (mw.config.get("wgCurRevisionId") !== mw.config.get("wgRevisionId")) { return; }
    const $body = $("body");
    $("#mw-notification-area").appendTo($body);
    const api = new mw.Api();

    /**
     * @type { { [key: string]: { status: string | undefined, archiveOffset: number, precomment: string, comment: string } } }
     */
    const caches = {};

    class MARWindow extends OO.ui.ProcessDialog {
        static static = {
            ...super.static,
            tagName: "div",
            name: "AnnTools_MarkAsResolved",
            title: wgULS("公共讨论页段落状态标记工具", "公共討論頁段落狀態標記工具"),
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

        static statusList = mw.config.get("wgPageName") === "萌娘百科_talk:讨论版/操作申请/注销账号申请" ?
            [
                ["c", wgULS("注销进行中","註銷進行中")],
                ["a", wgULS("请求被接受","請求被接受")],
                ["s", wgULS("请求被搁置","請求被擱置")],
                ["w", wgULS("请求被撤回","請求被撤回")],
                ["d", wgULS("请求被拒绝","請求被拒絕")],
            ] : [
                ["r", wgULS("问题已解决","問題已解決")],
                ["p", wgULS("问题已答复","問題已答覆")],
                ["a", wgULS("请求被接受","請求被接受")],
                ["s", wgULS("请求被搁置","請求被擱置")],
                ["w", wgULS("请求被撤回","請求被撤回")],
                ["d", wgULS("请求被拒绝","請求被拒絕")],
                ["n", wgULS("无人回复","無人回覆")],
            ];
        static archiveOffsetsFromStatus = {
            ...Object.fromEntries(MARWindow.statusList.map(([status]) => [status, 3])),
            n: 10,
            s: 10,
            c: 10,
        };

        static bolbLabel = (text) => $("<span>").addClass("AnnTools_bolb").text(text);

        panelLayout = new OO.ui.PanelLayout({
            scrollable: false,
            expanded: false,
            padded: true,
        });

        sectionTitleWidget = new OO.ui.Widget({
            classes: ["AnnTools_paragraphs"],
        });
        /**
         * @type { string | undefined }
         */
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
        /**
         * @type { string | undefined }
         */
        get status() {
            return this.statusRadioSelect.findSelectedItem()?.getData?.();
        }
        /**
         * @type { string | undefined }
         */
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
            return Math.max(1, Math.min(30, Math.round(+this.archiveOffsetNumberInput.getValue())));
        }

        precommentMultilineTextInput = new OO.ui.MultilineTextInputWidget({
            placeholder: wgULS("（但是如果不写就啥也没有）", "（但是如果不寫就啥也沒有）"),
            autosize: true,
        });
        get precomment() {
            return this.precommentMultilineTextInput.getValue();
        }

        commentTextInput = new OO.ui.TextInputWidget({
            placeholder: wgULS("（但是如果不写就啥也没有）", "（但是如果不寫就啥也沒有）"),
        });
        get comment() {
            return this.commentTextInput.getValue();
        }

        constructor (config) {
            super(config);
        }
        initialize() {
            super.initialize();
            this.panelLayout.$element.append(...[
                [this.sectionTitleWidget, wgULS("段落标题：", "段落標題：")],
                [this.statusRadioSelect, wgULS("标记状态：", "標記狀態：")],
                [this.archiveOffsetNumberInput, wgULS("存档用时：", "存檔用時：")],
                [this.precommentMultilineTextInput, wgULS("前置留言：", "前置留言：")],
                [this.commentTextInput, wgULS("内置留言：", "內置留言：")],
            ].map(([fieldWidget, labelText]) => new OO.ui.FieldLayout(fieldWidget, {
                label: MARWindow.bolbLabel(labelText),
                align: "top",
            }).$element));

            this.statusRadioSelect.on("choose", (item) => {
                this.archiveOffsetNumberInput.setValue(MARWindow.archiveOffsetsFromStatus[item.getData()] || 3);
            });
            this.precommentMultilineTextInput.on("resize", () => {
                this.updateSize();
            });

            this.$body.append(this.panelLayout.$element);
        }
        getBodyHeight() {
            return this.panelLayout.$element.outerHeight(true);
        }
        getSetupProcess(data) {
            return super.getSetupProcess(data).next(() => {
                if (this.sectionTitle && Reflect.has(caches, this.sectionTitle)) {
                    const cache = caches[this.sectionTitle];
                    if (cache.status) {
                        this.statusRadioSelect.selectItemByData(cache.status);
                    }
                    this.archiveOffsetNumberInput.setValue(cache.archiveOffset);
                    this.precommentMultilineTextInput.setValue(cache.precomment);
                    this.commentTextInput.setValue(cache.comment);
                }
            }, this);
        }
        getActionProcess(action) {
            if (action === "cancel") {
                return new OO.ui.Process(() => this.close({ action }).closed.promise()).next(() => {
                    caches[this.sectionTitle] = {
                        status: this.status,
                        archiveOffset: this.archiveOffset,
                        precomment: this.precomment,
                        comment: this.comment,
                    };
                    this.statusRadioSelect.selectItem();
                    this.archiveOffsetNumberInput.setValue(3);
                    this.precommentMultilineTextInput.setValue("");
                    this.commentTextInput.setValue("");
                });
            }
            if (action === "submit") {
                return new OO.ui.Process($.when((async () => {
                    if (!this.status) {
                        throw new OO.ui.Error(wgULS("请选择一个状态", "請選擇一個狀態"));
                    }
                    const toclist = Object.fromEntries((await api.post({
                        action: "parse",
                        assertuser: mw.config.get("wgUserName"),
                        format: "json",
                        pageid: mw.config.get("wgArticleId"),
                        prop: "sections",
                    })).parse.sections.map(({ anchor, index }) => [anchor, index]));
                    if (!Reflect.has(toclist, this.sectionTitle)) {
                        throw new OO.ui.Error(wgULS("小工具无法根据段落标题找到该段落，请移除该段落标题内的模板后再行操作……", "小工具無法根據段落標題找到該段落，請移除該段落標題內的模板後再行操作……"), {
                            recoverable: false,
                        });
                    }
                    const section = toclist[this.sectionTitle];
                    try {
                        await this.markAsResolved({ section });
                        this.close({ action });
                        mw.notify(wgULS("即将刷新……", "即將刷新……"), {
                            title: wgULS("标记成功", "標記成功"),
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
                assertuser: mw.config.get("wgUserName"),
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
        setSectionTitle(sectionTitle) {
            this.sectionTitleWidget.setData(sectionTitle);
            this.sectionTitleWidget.$element.text(sectionTitle);
        }
    }

    const windowManager = new OO.ui.WindowManager();
    $body.append(windowManager.$element);
    const marDialog = new MARWindow({
        size: "large",
    });
    windowManager.addWindows([marDialog]);
    for (const ele of $("#mw-content-text > .mw-parser-output > h2, #mw-content-text > .mw-parser-output > .discussionContainer > h2")) {
        const self = $(ele);
        const content = self.nextUntil("h2").not("h2");
        if (content.hasClass("saveNotice") || content.hasClass("MarkAsResolved")) { continue; }
        const sectionTitle = self.find(".mw-headline").attr("id");
        const button = $("<a>");
        button.attr("href", "javascript:void(0);").prop("draggable", false).addClass("AnnTools_MarkAsResolved").text(wgULS("标记状态", "標記狀態"));
        self.find(".mw-editsection-bracket").first()
            .after('<span class="mw-editsection-divider"> | </span>')
            .after(button);
        button.on("click", () => {
            if (!marDialog.isVisible()) {
                marDialog.setSectionTitle(sectionTitle);
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
