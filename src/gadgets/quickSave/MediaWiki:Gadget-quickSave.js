// <pre>
"use strict";
$(() => {
    const wgUserGroups = mw.config.get("wgUserGroups");
    if (!/^萌娘百科_talk:讨论版\/[^存]+$/.test(mw.config.get("wgPageName"))) { return; }
    if (!wgUserGroups.includes("sysop") && !wgUserGroups.includes("patroller")) { return; }
    const $body = $("body");
    $("#mw-notification-area").appendTo($body);
    const api = new mw.Api();

    class Log {
        static statusTexts = {
            SUCCESS: "成功",
            FAILED: wgULS("失败", "失敗"),
        };

        $element = $("<li>");
        $content = $("<div>").addClass("AnnTools_log").appendTo(this.$element);
        $message = $("<div>").addClass("AnnTools_log_message").appendTo(this.$content);
        $status = $("<div>").addClass("AnnTools_log_status").appendTo(this.$content);

        appendMessage(str) {
            this.$message.append($("<span>").text(str));
        }
        /**
         * @param {false | "success" | "failed"} status 
         */
        setStatus(status) {
            if (!status) {
                this.$content.removeClass("AnnTools_log-success AnnTools_log-failed");
                this.$status.empty();
            } else if (status === "success") {
                this.$content.removeClass("AnnTools_log-failed");
                this.$content.addClass("AnnTools_log-success");
                this.$status.text(Log.statusTexts.SUCCESS);
            } else if (status === "failed") {
                this.$content.removeClass("AnnTools_log-success");
                this.$content.addClass("AnnTools_log-failed");
                this.$status.text(Log.statusTexts.FAILED);
            }
        }
    }

    class Progress {
        progressBarWidget = new OO.ui.ProgressBarWidget({
            progress: 0,
        });

        progressLogWidget = new OO.ui.Widget();
        $progressLogList = $("<ol>");

        currentStep = 0;

        /**
         * @param {number} steps 
         * @param {QSWindow} dialog
         */
        constructor(steps, dialog) {
            this.steps = steps;
            this.dialog = dialog;
            this.progressLogWidget.$element.append(this.$progressLogList);
            this.generateNewLogLine();
        }
        cleanUp() {
            this.currentStep = 0;
            this.progressBarWidget.setProgress(0);
            this.$progressLogList.empty();
            this.generateNewLogLine();
        }
        generateNewLogLine() {
            this.logLine = new Log();
            this.$progressLogList.append(this.logLine.$element);
        }
        log(message) {
            this.logLine.appendMessage(message);
        }
        error(message) {
            this.logLine.appendMessage(message);
            this.logLine.setStatus("failed");
        }
        nextStep(newLogLine = true) {
            this.logLine.setStatus("success");
            this.currentStep++;
            this.progressBarWidget.setProgress(100 * this.currentStep / this.steps);
            if (newLogLine) {
                this.generateNewLogLine();
                this.dialog.delayUpdateSize();
            }
        }
        finish() {
            this.currentStep = this.steps - 1;
            this.nextStep(false);
        }
    }

    class QSWindow extends OO.ui.ProcessDialog {
        static static = {
            ...super.static,
            tagName: "div",
            name: "AnnTools_QuickSave",
            title: wgULS("公共讨论页段落存档工具", "公共討論頁段落存檔工具"),
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

        static bolbLabel = (text) => $("<span>").addClass("AnnTools_bolb").text(text);

        template = "Template:讨论版页顶/档案馆";
        date = new Date();
        savePageTitle = `${mw.config.get("wgPageName")}/存档/${this.date.getFullYear()}年${this.date.getMonth() < 9 ? `0${this.date.getMonth() + 1}` : this.date.getMonth() + 1}月`;

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

        progress = new Progress(6, this);
        progressBarFieldLayout = new OO.ui.FieldLayout(this.progress.progressBarWidget, {
            label: QSWindow.bolbLabel("执行进度"),
            align: "top",
        });
        progressLogFieldLayout = new OO.ui.FieldLayout(this.progress.progressLogWidget, {
            align: "top",
        });

        constructor(config) {
            super(config);
            this.hideProgress();
        }
        initialize() {
            super.initialize();
            this.panelLayout.$element.append(...[
                [this.sectionTitleWidget, wgULS("段落标题：", "段落標題：")],
            ].map(([fieldWidget, labelText]) => new OO.ui.FieldLayout(fieldWidget, {
                label: QSWindow.bolbLabel(labelText),
                align: "top",
            }).$element));
            this.panelLayout.$element.append(this.progressBarFieldLayout.$element, this.progressLogFieldLayout.$element);

            this.$body.append(this.panelLayout.$element);
        }
        getBodyHeight() {
            return this.panelLayout.$element.outerHeight(true);
        }
        getActionProcess(action) {
            if (action === "cancel") {
                return new OO.ui.Process(() => this.close({ action }).closed.promise()).next(() => {
                    this.hideProgress();
                });
            }
            if (action === "submit") {
                return new OO.ui.Process($.when((async () => {
                    this.showProgress();
                    this.progress.log("开始检测段落标题……");
                    const toclist = Object.fromEntries((await api.post({
                        action: "parse",
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
                        await this.quickSave({ section });
                        mw.notify(wgULS("即将刷新……", "即將刷新……"), {
                            title: wgULS("存档成功", "存檔成功"),
                            type: "success",
                            tag: "AnnTools_QuickSave",
                        });
                        setTimeout(() => location.reload(), 730);
                    } catch (e) {
                        console.error("[QuickSave] Error:", e);
                        throw new OO.ui.Error(e);
                    }
                })()).promise(), this);
            }
            return super.getActionProcess(action);
        }
        async quickSave({ section }) {
            this.progress.log("标题存在！");
            this.progress.nextStep();
            this.progress.log("正在获取段落内容……");
            const sectionContent = await $.ajax({
                url: `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php`,
                data: {
                    title: mw.config.get("wgPageName"),
                    action: "raw",
                    section,
                },
            });
            let sectionTitleRaw = sectionContent.match(/==(.*)==/);
            if (sectionTitleRaw && sectionTitleRaw[1]) {
                sectionTitleRaw = sectionTitleRaw[1];
            } else {
                sectionTitleRaw = this.sectionTitle;
            }
            this.progress.nextStep();
            this.progress.log("正在存档该段落内容……");
            await api.postWithToken("csrf", {
                action: "edit",
                format: "json",
                title: this.savePageTitle,
                text: sectionContent.replace(`==${sectionTitleRaw}==`, "").trim(),
                section: "new",
                tags: "快速存档讨论串|Automation tool",
                sectiontitle: sectionTitleRaw,
                summary: `快速存档讨论串：/* ${this.sectionTitle} */`,
            });
            this.progress.nextStep();
            this.progress.log("正在标记该段落为已存档……");
            let sectionTitleSafe = this.sectionTitle;
            if (/_\d+$/.test(this.sectionTitle) && document.getElementById(this.sectionTitle.replace(/_\d+$/, ""))) {
                sectionTitleSafe = sectionTitleSafe.replace(/_\d+$/, "");
            }
            await api.postWithToken("csrf", {
                action: "edit",
                format: "json",
                title: mw.config.get("wgPageName"),
                summary: `快速存档讨论串：/* ${this.sectionTitle} */`,
                text: `==${sectionTitleRaw}==\n{{Saved|link=${this.savePageTitle}|title=${sectionTitleSafe.replace(/\|/g, "{{!}}")}}}`,
                section,
                tags: "快速存档讨论串|Automation tool",
            });
            this.progress.nextStep();
            this.progress.log("正在检查存档页面是否带有档案馆模板……");
            const listResult = await api.post({
                action: "query",
                format: "json",
                prop: "templates",
                titles: this.savePageTitle,
                tltemplates: "Template:讨论版页顶/档案馆",
            });
            if (Array.isArray(Object.values(listResult.query.pages)[0].templates) && Object.values(listResult.query.pages)[0].templates.length > 0) {
                this.progress.log("模板存在！");
                this.progress.finish();
                return;
            }
            this.progress.nextStep();
            this.progress.log("正在向存档页添加档案馆模板……");
            await api.postWithToken("csrf", {
                action: "edit",
                format: "json",
                title: this.savePageTitle,
                prependtext: `{{${this.template}}}\n`,
                tags: "快速存档讨论串|Automation tool",
                summary: "添加档案馆模板",
            });
            this.progress.finish();
            return;
        }
        setSectionTitle(sectionTitle) {
            this.sectionTitleWidget.setData(sectionTitle);
            this.sectionTitleWidget.$element.text(sectionTitle);
        }
        hideProgress() {
            this.progressBarFieldLayout.$element.hide();
            this.progressLogFieldLayout.$element.hide();
            this.progress.cleanUp();
        }
        showProgress() {
            this.progressBarFieldLayout.$element.show();
            this.progressLogFieldLayout.$element.show();
            this.delayUpdateSize();
        }
        delayUpdateSize() {
            this.updateSize();
            setTimeout(() => {
                this.updateSize();
            }, 500);
        }
    }

    const windowManager = new OO.ui.WindowManager();
    $body.append(windowManager.$element);
    const qsDialog = new QSWindow();
    windowManager.addWindows([qsDialog]);
    for (const ele of $("#mw-content-text > .mw-parser-output > h2, #mw-content-text > .mw-parser-output > .discussionContainer > h2")) {
        const self = $(ele);
        const content = self.nextUntil("h2").not("h2");
        if (content.hasClass("saveNotice")) { continue; }
        const sectionTitle = self.find(".mw-headline").attr("id");
        const button = $("<a>");
        button.attr("href", "javascript:void(0);").prop("draggable", false).addClass("AnnTools_QuickSave").text(wgULS("快速存档", "快速存檔"));
        self.find(".mw-editsection-bracket").first()
            .after('<span class="mw-editsection-divider"> | </span>')
            .after(button);
        button.on("click", () => {
            if (!qsDialog.isVisible()) {
                qsDialog.setSectionTitle(sectionTitle);
                windowManager.openWindow(qsDialog);
            }
            return false;
        });
        const quicksave = self.find(".AnnTools_QuickSave");
        if (self.find(".AnnTools_MarkAsResolved")[0]) {
            const divider = quicksave.next(".mw-editsection-divider");
            if (divider.length > 0) {
                self.find(".mw-editsection .mw-editsection-bracket").first().after(divider).after(quicksave);
            }
        }
    }
});
// </pre>
