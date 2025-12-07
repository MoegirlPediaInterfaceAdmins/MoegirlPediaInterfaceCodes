// <pre>
/**
 * @author 小鸣@AOKI
 * @author [[User:Leranjun]] refactor
 * @author [[User:萌娘百科·娜娜奇]] moeskin support
 */
"use strict";
$(() => {
    const wgNamespaceNumber = mw.config.get("wgNamespaceNumber");
    const wgPageName = mw.config.get("wgPageName");
    const wgIsArticle = mw.config.get("wgIsArticle");
    const wgArticleId = mw.config.get("wgArticleId");
    const wgCurRevisionId = mw.config.get("wgCurRevisionId") || -1;
    const wgRevisionId = mw.config.get("wgRevisionId") || -1;
    const MOEPAD_JS_BRIDGE_KEY = "callFlutterUserFeedback";
    if (!wgIsArticle || wgArticleId === 0 || mw.config.get("wgAction") !== "view") {
        return;
    }
    const userIsAutoconfirmed = mw.config.get("wgUserGroups").includes("autoconfirmed");
    const oouiDialogConfig = {
        title: wgULS("萌娘百科页面反馈功能", "萌娘百科頁面反饋功能"),
    };
    const api = new mw.Api();

    class MGPReportDialog extends OO.ui.ProcessDialog {
        static static = {
            ...super.static,
            tagName: "div",
            name: "mgpReportDialog",
            title: wgULS("违规举报 & 页面反馈", "違規舉報 & 頁面反饋"),
            actions: [
                {
                    action: "cancel",
                    label: "取消",
                    flags: ["safe", "close", "destructive"],
                    modes: "feedback",
                },
                {
                    action: "continue",
                    label: wgULS("继续", "繼續"),
                    flags: ["primary", "progressive"],
                    modes: "feedback",
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
        static types = {
            placeholder: {
                option: { data: "placeholder", label: wgULS("请选择一项主要问题", "請選擇一項主要問題") },
                subTypes: [],
            },

            // eslint-disable-next-line @stylistic/quote-props
            "违法违禁": {
                option: { data: "违法违禁", label: wgULS("违法违禁", "違法違禁") },
                subTypes: [],
            },

            // eslint-disable-next-line @stylistic/quote-props
            "网络暴力": {
                option: { data: "网络暴力", label: wgULS("网络暴力", "網路暴力") },
                subTypes: [
                    { data: "侮辱谩骂", label: wgULS("侮辱谩骂", "侮辱謾罵") },
                    { data: "造谣诽谤", label: wgULS("造谣诽谤", "造謠誹謗") },
                    { data: "人身攻击", label: wgULS("人身攻击", "人身攻擊") },
                    { data: "地域歧视", label: wgULS("地域歧视", "地域歧視") },
                ],
            },

            // eslint-disable-next-line @stylistic/quote-props
            "色情低俗": {
                option: { data: "色情低俗", label: "色情低俗" },
                subTypes: [
                    { data: "低俗信息", label: wgULS("低俗信息", "低俗資訊") },
                    { data: "色情图文", label: wgULS("色情图文", "色情圖文") },
                    { data: "侵害未成年", label: "侵害未成年" },
                    { data: "色情视频", label: wgULS("色情视频", "色情影片", null, null, "色情視像") },
                ],
            },

            // eslint-disable-next-line @stylistic/quote-props
            "血腥暴力": {
                option: { data: "血腥暴力", label: "血腥暴力" },
                subTypes: [
                    { data: "暴恐血腥", label: "暴恐血腥" },
                    { data: "虐杀动物", label: wgULS("虐杀动物", "虐殺動物") },
                ],
            },

            // eslint-disable-next-line @stylistic/quote-props
            "赌博诈骗": {
                option: { data: "赌博诈骗", label: wgULS("赌博诈骗", "賭博詐騙") },
                subTypes: [],
            },

            // eslint-disable-next-line @stylistic/quote-props
            "不实信息": {
                option: { data: "不实信息", label: wgULS("不实信息", "不實資訊") },
                subTypes: [
                    { data: "不符合事实", label: wgULS("不符合事实", "不符合事實") },
                    { data: "有争议事实", label: wgULS("有争议事实", "有爭議事實") },
                ],
                suggestToTalkBoard: true,
            },

            "抄袭/侵权": {
                option: { data: "抄袭/侵权", label: wgULS("抄袭/侵权", "抄襲/侵權") },
                subTypes: [],
                suggestToTalkBoard: true,
            },

            // eslint-disable-next-line @stylistic/quote-props
            "其他反馈": {
                option: { data: "其他反馈", label: wgULS("其他反馈", "其他反饋") },
                subTypes: [],
                suggestConfirmation: true,
            },
        };
        wgNamespaceNumber = wgNamespaceNumber;
        wgPageName = wgPageName;
        wgIsArticle = wgIsArticle;
        wgArticleId = wgArticleId;
        wgCurRevisionId = wgCurRevisionId;
        wgRevisionId = wgRevisionId;
        constructor(config) {
            // Parent constructor
            super(config);

            // Initialize
            this.$element.addClass("MGPReport-root");
        }
        initialize() {
            // Parent method
            super.initialize();

            this.feedbackPanel = new OO.ui.PanelLayout({
                scrollable: false,
                expanded: false,
                padded: true,
            });
            this.confirmPanel = new OO.ui.PanelLayout({
                scrollable: false,
                expanded: false,
                padded: true,
            });

            this.primaryTypeSelector = new OO.ui.DropdownInputWidget({
                options: Object.values(MGPReportDialog.types).map(({ option }) => option),
            });
            const primaryTypeField = new OO.ui.FieldLayout(this.primaryTypeSelector, {
                label: wgULS("您认为本页面存在哪项问题？（如有多项请选择最突出的一项，其他项请在理由一栏说明）", "您認為本頁面存在哪項問題？（如有多項請選擇最突出的一項，其他項請在理由一欄說明）"),
                align: "top",
            });

            this.secondaryTypeSelector = new OO.ui.DropdownInputWidget({
                options: [],
            });
            this.secondaryTypeSelectorField = new OO.ui.FieldLayout(this.secondaryTypeSelector, {
                align: "top",
            });

            this.reasonTextarea = new OO.ui.MultilineTextInputWidget({
                autosize: true,
                indicator: "required",
                label: $(`<span>${wgULS("若问题相对简单请在页面右上", "若問題相對簡單請在頁面右上")}<br>${wgULS("点击编辑链接，自行解决", "點選編輯連結，自行解決", null, null, "點擊編輯連結，自行解決")}</span>`),
                required: true,
                validate: /[\s\S\n]{5,}/,
                autocomplete: false,
                placeholder: wgULS("至少5个字节", "至少5個位元組"),
            });
            const reasonTextareaField = new OO.ui.FieldLayout(this.reasonTextarea, {
                label: "您的理由",
                align: "top",
            });

            this.emailInput = new OO.ui.TextInputWidget({
                required: true,
                indicator: "required",
                type: "email",
                autocomplete: false,
            });
            const emailInputField = new OO.ui.FieldLayout(this.emailInput, {
                label: wgULS("您的电子邮箱地址", "您的電子郵箱地址"),
                align: "top",
            });

            this.suggestToTalkBoardInput = new OO.ui.CheckboxInputWidget({
                selected: true,
            });
            this.suggestToTalkBoardInputField = new OO.ui.FieldLayout(this.suggestToTalkBoardInput, {
                label: wgULS("提交到讨论版提问求助区", "提交到討論版提問求助區"),
                align: "inline",
            });

            this.reasonTextarea.$element.find(".oo-ui-labelElement-label").css("pointer-events", "none");
            this.secondaryTypeSelectorField.$element.hide();
            this.suggestToTalkBoardInputField.$element.hide();

            this.feedbackPanel.$element.append(
                primaryTypeField.$element,
                this.secondaryTypeSelectorField.$element,
                reasonTextareaField.$element,
                emailInputField.$element,
                this.suggestToTalkBoardInputField.$element,
            );

            const confirmMsg = $("<p>").html(`${wgULS("请您确认您将要提交的信息", "請您確認您將要提交的資訊")}：<ul></ul>`);
            this.confirmPanel.$element.append(confirmMsg);

            this.stackLayout = new OO.ui.StackLayout({
                items: [this.feedbackPanel, this.confirmPanel],
            });

            // Events
            this.primaryTypeSelector.connect(this, { change: "openSecondary" });
            this.primaryTypeSelector.connect(this, { change: "continueOK" });
            this.secondaryTypeSelector.connect(this, { change: "continueOK" });
            this.reasonTextarea.connect(this, { change: "continueOK" });
            this.emailInput.connect(this, { change: "continueOK" });

            this.$body.append(this.stackLayout.$element);
        }
        openSecondary(value) {
            const config = MGPReportDialog.types[value];
            const { subTypes } = config;
            if (subTypes.length > 0) {
                this.secondaryTypeSelectorField.$element.slideDown("fast", () => this.updateSize());
                this.secondaryTypeSelector.setOptions([
                    { data: "placeholder", label: wgULS("请选择一项细节问题", "請選擇一項細節問題") },
                    ...subTypes,
                    { data: "其他", label: "其他" },
                ]);
            } else {
                this.secondaryTypeSelectorField.$element.slideUp("fast", () => this.updateSize());
                this.secondaryTypeSelector.setOptions([{ data: "none", label: "" }]);
                this.secondaryTypeSelector.setValue("none");
            }
            if (config.suggestConfirmation) {
                oouiDialog.alert(`${wgULS("请您注意：<br>请在您的反馈意见不符合所有列出的主要问题时才可选择“其他”类别，请再检查您的反馈意见是否符合以下列出的主要问题：", "請您注意：<br>請在您的反饋意見不符合所有列出的主要問題時才可選擇“其他”類別，請再檢查您的反饋意見是否符合以下列出的主要問題：")}<ul><li>${Object.values(MGPReportDialog.types).filter(({ option: { data }, suggestConfirmation }) => data !== "placeholder" && !suggestConfirmation).map(({ option: { label } }) => label).join("</li><li>")}</li></ul>`, {
                    ...oouiDialogConfig,
                    size: "medium",
                });
            }
            if (userIsAutoconfirmed && config.suggestToTalkBoard) {
                this.suggestToTalkBoardInputField.$element.slideDown("fast", () => this.updateSize());
                this.suggestToTalkBoardInput.setSelected(true);
            } else {
                this.suggestToTalkBoardInputField.$element.slideUp("fast", () => this.updateSize());
            }
        }
        continueOK() {
            this.actions.setAbilities({ "continue": true });
        }
        async validateFeedback() {
            this.primaryType = this.primaryTypeSelector.getValue();
            const reasons = [];
            if (this.primaryType === "placeholder") {
                reasons.push(wgULS("您尚未选择主要问题，请重新选择！", "您尚未選擇主要問題，請重新選擇！"));
            }

            this.secondaryType = this.secondaryTypeSelector.getValue();
            if (this.secondaryType === "placeholder") {
                reasons.push(wgULS("您尚未选择细节问题，请重新选择！", "您尚未選擇細節問題，請重新選擇！"));
            }

            this.reason = $("<span>").text(this.reasonTextarea.getValue()).html();
            try {
                await this.reasonTextarea.getValidity();
            } catch (e) {
                console.error("Report [reasonValidation]", e);
                reasons.push(wgULS("您输入的理由不足5字节，请检查！", "您輸入的理由不足5位元組，請檢查！"));
            }

            this.email = this.emailInput.getValue();
            try {
                await this.emailInput.getValidity();
            } catch (e) {
                console.error("Report [emailValidation]", e);
                reasons.push(wgULS("您输入的电子邮件地址有误，请检查！", "您輸入的電子郵件地址有誤，請檢查！"));
            }

            if (reasons.length > 0) {
                const $reasons = $("<ul>");
                for (const reason of reasons) {
                    $reasons.append(`<li>${reason}</li>`);
                }
                throw $reasons;
            }
        }
        getBodyHeight() {
            return this.stackLayout.getCurrentItem().$element.outerHeight(true);
        }
        getSetupProcess(data) {
            return super.getSetupProcess(data).next(() => {
                this.reasonTextarea.clearFlags();
                this.emailInput.clearFlags();
                this.actions.setMode("feedback");
                this.stackLayout.setItem(this.feedbackPanel);
            }, this);
        }
        getReadyProcess(data) {
            return super.getReadyProcess(data).next(() => {
                this.primaryTypeSelector.focus();
            }, this);
        }
        getActionProcess(action) {
            if (action === "cancel") {
                return new OO.ui.Process(() => {
                    this.close({ action: action });
                }, this);
            } else if (action === "continue") {
                return new OO.ui.Process($.when((async () => {
                    try {
                        await this.validateFeedback();
                        const details = [
                            `${wgULS("反馈页面", "反饋頁面")}：${this.wgPageName}`,
                            `主要${wgULS("问题", "問題")}：${this.primaryType}`,
                        ];
                        if (this.secondaryType !== "none") {
                            details.push(`次要${wgULS("问题", "問題")}：${this.secondaryType}`);
                        }
                        details.push(
                            `${wgULS("电子邮件", "電子郵件")}：${this.email}`,
                            `您的理由：${this.reason}`,
                        );
                        if (userIsAutoconfirmed && MGPReportDialog.types[this.primaryType].suggestToTalkBoard) {
                            details.push(`${wgULS("是否提交到提问求助区", "是否提交到提問求助區")}：${this.suggestToTalkBoardInput.isSelected() ? "是" : "否"}`);
                        }
                        this.confirmPanel.$element.find("ul").html(`<li>${details.join("</li><li>")}</li>`);
                        this.actions.setMode("confirm");
                        this.stackLayout.setItem(this.confirmPanel);
                        this.updateSize();
                    } catch (e) {
                        throw new OO.ui.Error(e, { recoverable: false });
                    }
                })()).promise(), this);
            } else if (action === "back") {
                this.actions.setMode("feedback");
                this.stackLayout.setItem(this.feedbackPanel);
                this.updateSize();
            } else if (action === "submit") {
                return new OO.ui.Process($.when((async () => {
                    try {
                        await this.postMessageToBackend();
                        this.close({ action: action });
                        mw.notify(wgULS("感谢您的反馈！", "感謝您的反饋！"), {
                            title: wgULS("反馈提交成功", "反饋提交成功"),
                            type: "success",
                        });
                        this.primaryTypeSelector.setValue("placeholder");
                        this.reasonTextarea.setValue("");
                    } catch (e) {
                        throw new OO.ui.Error(e);
                    }
                })()).promise(), this);
            }
            // Fallback to parent handler
            return super.getActionProcess(action);
        }
        async postMessageToBackend() {
            if (userIsAutoconfirmed && MGPReportDialog.types[this.primaryType].suggestToTalkBoard && this.suggestToTalkBoardInput.isSelected()) {
                const sectiontitle = `【页面反馈】${this.primaryType}${this.secondaryType !== "none" ? ` - ${this.secondaryType}` : ""} @ ${this.wgPageName}`;
                await api.postWithToken("csrf", {
                    action: "edit",
                    assertuser: mw.config.get("wgUserName"),
                    title: "萌娘百科_talk:讨论版/提问求助",
                    section: "new",
                    sectiontitle,
                    text: `<dl>\n<dt>页面信息：</dt>\n<dd><table class="wikitable" style="word-break: break-all;">\n<tr><td>primaryType</td><td>${this.primaryType}${this.secondaryType !== "none" ? `</td></tr>\n<tr><td>secondaryType</td><td>${this.secondaryType}` : ""}</td></tr>\n<tr><td>reportURL</td><td>${window.location.href}</td></tr>\n<tr><td>wgPageName</td><td>${this.wgPageName}<hr>[[${this.wgPageName}]]</td></tr>\n<tr><td>wgArticleId</td><td>${this.wgArticleId}</td></tr>\n<tr><td>wgCurRevisionId</td><td>${this.wgCurRevisionId}</td></tr>\n<tr><td>wgRevisionId</td><td>${this.wgRevisionId}</td></tr>\n</table></dd>\n<dt>用户反馈内容：</dt>\n<dd>${this.reason}——~~~~</dd>\n</dl>`,
                    tags: "Automation tool",
                    watchlist: "watch",
                });
                const goToTalkBoardInput = new OO.ui.CheckboxInputWidget({
                    selected: true,
                });
                const goToTalkBoardInputField = new OO.ui.FieldLayout(goToTalkBoardInput, {
                    label: wgULS("到提问求助区查看该反馈", "到提問求助區檢視該反饋"),
                    align: "inline",
                });
                const confirmBody = $("<div>").text(wgULS("您的反馈已提交到提问求助区，是否前往查看？", "您的反饋已提交到提問求助區，是否前往檢視？"));
                confirmBody.append("<br>").append(goToTalkBoardInputField.$element);
                if (await oouiDialog.confirm(confirmBody, oouiDialogConfig)) {
                    window.open("/%E8%90%8C%E5%A8%98%E7%99%BE%E7%A7%91_talk:%E8%AE%A8%E8%AE%BA%E7%89%88/%E6%8F%90%E9%97%AE%E6%B1%82%E5%8A%A9#footer", "_blank");
                }
                return;
            }
            const body = new URLSearchParams({
                ReportTitle: this.primaryType,
                ReportSubTitle: this.secondaryType === "none" ? "" : this.secondaryType,
                ReportURL: window.location.href,
                ReportOrigin: "moegirlWebZh",
                ReportUserName: mw.config.get("wgUserName") || "visitor",
                ReportUserID: mw.config.get("wgUserId") || "visitor",
                ReportComment: `用户反馈内容：${this.reason}\n-------------\n页面信息：\n* wgNamespaceNumber: ${this.wgNamespaceNumber}\n* wgPageName: ${this.wgPageName}\n* wgArticleId: ${this.wgArticleId}\n* wgCurRevisionId: ${this.wgCurRevisionId}\n* wgRevisionId: ${this.wgRevisionId}`,
                ReportContact: this.email,
            });
            try {
                console.info("Report [upload]", await (await fetch("https://api.moegirl.org.cn/report", {
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                    },
                    body: body.toString(),
                    method: "POST",
                    mode: "no-cors",
                    credentials: "include",
                })).text());
            } catch (e) {
                console.error("Report [upload]", e);
                throw wgULS("上传失败，请重试！", "上傳失敗，請重試！");
            }
        }
    }

    const $body = $(document.body);
    const windowManager = new OO.ui.WindowManager();
    $body.append(windowManager.$element);
    const reportDialog = new MGPReportDialog({
        size: "large",
    });
    windowManager.addWindows([reportDialog]);
    const initReport = async () => {
        if (wgNamespaceNumber > 0 && !await oouiDialog.confirm(`${wgULS("本页面<b>并非条目页面</b>，并不直接介绍事物，而仅为萌娘百科", "本頁面<b>並非條目頁面</b>，並不直接介紹事物，而僅為萌娘百科")}${wgULS("用户", "使用者", null, null, "用戶")}${wgULS("为方便编辑、交流沟通等使用。<br>您确定您仍要反馈本页面吗？", "為方便編輯、交流溝通等使用。<br>您確定您仍要反饋本頁面嗎？")}`, oouiDialogConfig)) {
            return;
        }
        if (wgCurRevisionId !== wgRevisionId && !await oouiDialog.confirm(`${wgULS("本页面<b>并非最新版本</b>，其内容可能已被修改，您可以点击", "本頁面<b>並非最新版本</b>，其內容可能已被修改，您可以點選")}<a href="/${wgPageName}">${wgULS("此链接查看最新版本</a>以免误反馈。<br>您确定您仍要反馈此版本吗？", "此連結檢視最新版本</a>以免誤反饋。<br>您確定您仍要反饋此版本嗎？")}`, oouiDialogConfig)) {
            return;
        }
        const moepadFn = window[MOEPAD_JS_BRIDGE_KEY];
        if (moepadFn && typeof moepadFn === "function") {
            moepadFn();
        } else {
            $("#mw-notification-area").appendTo($body);
            windowManager.openWindow(reportDialog);
        }
    };

    const WarningIcon = (props = {}) => $("<svg  xmlns=\"http://www.w3.org/2000/svg\"  width=\"24\"  height=\"24\"  viewBox=\"0 0 24 24\"  fill=\"currentColor\"  class=\"icon icon-tabler icons-tabler-filled icon-tabler-alert-triangle\"><path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403zm.01 13.33l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007zm-.01 -7a1 1 0 0 0 -.993 .883l-.007 .117v4l.007 .117a1 1 0 0 0 1.986 0l.007 -.117v-4l-.007 -.117a1 1 0 0 0 -.993 -.883z\" /></svg>", props);

    const $extraReportArea = $("<div>", {
        "class": "report-article-footer",
        style: "text-align: center; margin-top: 1em;",
    });
    const $extraReportButton = $("<a>", {
        "class": "report-article-button",
        style: "display: inline-block; padding: 0.5em 1em; background-color: var(--theme-danger-color, #ff4848); color: var(--theme-accent-link-color, #fff); border-radius: 100vmax; cursor: pointer;",
        text: wgULS("违规举报 & 页面反馈", "違規舉報 & 頁面反饋"),
        click: initReport,
    });
    $extraReportArea.append($extraReportButton);

    switch (mw.config.get("skin")) {
        case "moeskin":
            mw.hook("moeskin.pagetools").add(({ addPageToolsButton }) => {
                const $btn = addPageToolsButton(WarningIcon(), wgULS("页面举报&反馈", "頁面舉報&反饋"), "extra");
                $btn.on("click", initReport);
                $btn.css("--theme-button-color", "var(--theme-danger-color)");
            });
            $("#moe-after-content").prepend($extraReportArea);
            break;
        case "vector-2022":
        default:
            insertToBottomRightCorner(wgULS("页面举报&反馈", "頁面舉報&反饋")).css({
                order: 0,
            }).on("click", initReport);
            $("#bodyContent").append($extraReportArea);
            break;
    }
});
// </pre>
