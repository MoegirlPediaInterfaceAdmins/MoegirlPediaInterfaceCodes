// <pre>
"use strict";
$(() => {
    try {
        const { wgNamespaceNumber, wgArticleId, wgUserName, wgUserGroups, wgRestrictionMove, wgIsProbablyEditable, wgPageName, wgTitle } = mw.config.get([
            "wgNamespaceNumber",
            "wgArticleId",
            "wgUserName",
            "wgUserGroups",
            "wgRestrictionMove",
            "wgIsProbablyEditable",
            "wgPageName",
            "wgTitle",
        ]);
        const isModule = wgNamespaceNumber === 828;
        const requiredGroups = {
            sysop: ["sysop"],
            techedit: ["techeditor", "sysop"],
        };
        if (wgArticleId === 0
            || $(".will2Be2Deleted")[0]
            || !wgUserGroups.includes("patroller") && !wgUserGroups.includes("sysop")
            || !wgIsProbablyEditable
        ) {
            return;
        }
        for (const restriction of wgRestrictionMove) {
            if (requiredGroups[restriction]?.every((group) => !wgUserGroups.includes(group))) {
                return;
            }
        }

        const $body = $("body");
        $("#mw-notification-area").appendTo($body);

        const convTemplate = (str, name, val) => str.replaceAll(`$${name}`, val);
        class MTUSWindow extends OO.ui.ProcessDialog {
            static static = {
                ...super.static,
                tagName: "div",
                name: "lr-mtus",
                title: isModule ? wgULS("打回创建者模块沙盒", "打回創建者模塊沙盒") : wgULS("打回创建者用户页", "打回創建者用戶頁"),
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
            constructor(config) {
                // Parent constructor
                super(config);
            }
            initialize() {
                // Parent method
                super.initialize();

                this.panelLayout = new OO.ui.PanelLayout({
                    scrollable: false,
                    expanded: false,
                    padded: true,
                });

                this.reasonBox = new OO.ui.TextInputWidget({
                    value: "内容极少或质量极差",
                    validate: "non-empty",
                });
                this.notifTitleBox = new OO.ui.TextInputWidget({
                    value: "提醒：请不要创建低质量页面",
                });
                this.notifContentBox = new OO.ui.MultilineTextInputWidget({
                    value: `您好，您最近创建的“${wgPageName}”页面由于质量不足，待审核通过后将被移动至${isModule ? "[[Module:Sandbox]]下您的[[$2|用户名页面子页面]]" : "您的[[$2|用户页子页面]]"}下。请您以后避免在页面尚未达到最低质量标准的情况下直接在主命名空间创建。您可以先于[[Special:MyPage/sandbox|您的沙盒]]创建，待完善后再[[Help:移动页面|移动]]回主命名空间。感谢您的配合，祝您编辑愉快！`,
                    autosize: true,
                });
                this.noNoticeBox = new OO.ui.CheckboxInputWidget();
                this.moveTalkBox = new OO.ui.CheckboxInputWidget({
                    selected: true,
                });
                this.watchAfterBox = new OO.ui.CheckboxInputWidget();
                this.watchTalkBox = new OO.ui.CheckboxInputWidget({
                    selected: true,
                });

                const reasonField = new OO.ui.FieldLayout(this.reasonBox, {
                    label: "打回理由",
                    align: "top",
                });
                const notifTitleField = new OO.ui.FieldLayout(this.notifTitleBox, {
                    label: wgULS("通知标题", "通知標題"),
                    align: "top",
                });
                const notifContentField = new OO.ui.FieldLayout(this.notifContentBox, {
                    label: wgULS("通知内容", "通知內容"),
                    align: "top",
                });
                const noNoticeField = new OO.ui.FieldLayout(this.noNoticeBox, {
                    label: wgULS("不在用户讨论页留下通知", "不在用戶討論頁留下通知"),
                    align: "inline",
                });
                const moveTalkField = new OO.ui.FieldLayout(this.moveTalkBox, {
                    label: wgULS("移动讨论页", "移動討論頁"),
                    align: "inline",
                });
                const watchAfterField = new OO.ui.FieldLayout(this.watchAfterBox, {
                    label: wgULS("监视移动后页面", "監視移動後頁面"),
                    align: "inline",
                });
                const watchTalkField = new OO.ui.FieldLayout(this.watchTalkBox, {
                    label: wgULS("监视创建者讨论页", "監視創建者討論頁"),
                    align: "inline",
                });

                this.panelLayout.$element.append(
                    reasonField.$element,
                    notifTitleField.$element,
                    notifContentField.$element,
                    noNoticeField.$element,
                    moveTalkField.$element,
                    watchAfterField.$element,
                    watchTalkField.$element,
                );

                this.noNoticeBox.connect(this, { change: "disableNotif" });

                this.$body.append(this.panelLayout.$element);
            }
            disableNotif(selected) {
                this.notifTitleBox.setDisabled(selected);
                this.notifContentBox.setDisabled(selected);
            }
            getBodyHeight() {
                return this.panelLayout.$element.outerHeight(true);
            }
            getReadyProcess(data) {
                return super.getReadyProcess(data)
                    .next(() => {
                        this.reasonBox.focus();
                        this.warnings = {};
                    }, this);
            }
            getActionProcess(action) {
                if (action === "cancel") {
                    return new OO.ui.Process(() => {
                        this.close({ action });
                    }, this);
                } else if (action === "submit") {
                    return new OO.ui.Process($.when((async () => {
                        try {
                            await this.reasonBox.getValidity();
                        } catch {
                            throw new OO.ui.Error(wgULS("请输入打回理由", "請輸入打回理由"));
                        }
                        try {
                            await this.doMove();
                            this.close({ action });
                            mw.notify(wgULS("即将刷新……", "即將刷新……"), {
                                title: "打回成功",
                                type: "success",
                                tag: "lr-mtus",
                            });
                            setTimeout(() => location.reload(), 730);
                        } catch (e) {
                            if (e.warning && !this.warnings[e.code]) {
                                this.warnings[e.code] = true;
                                console.warn(`[MoveToUserSubpage] Warning (${e.code}): ${e.msg}`);
                                throw new OO.ui.Error(e.msg, { warning: true });
                            } else {
                                console.error("[MoveToUserSubpage] Error:", e);
                                throw new OO.ui.Error(e);
                            }
                        }
                    })()).promise(), this);
                }
                // Fallback to parent handler
                return super.getActionProcess(action);
            }
            async doMove() {
                const api = new mw.Api();

                const reason = `${isModule ? "移动至创建者模块沙盒" : "移动至创建者用户页"}：${this.reasonBox.getValue()}`;
                const notifTitle = this.notifTitleBox.getValue();
                const notifContent = this.notifContentBox.getValue();
                const noNotice = this.noNoticeBox.isSelected();
                const moveTalk = this.moveTalkBox.isSelected();
                const watchAfter = this.watchAfterBox.isSelected() ? "watch" : "nochange";
                const watchTalk = this.watchTalkBox.isSelected() ? "watch" : "nochange";

                // 查询贡献者数量
                if (!this.warnings.multipleContribs) {
                    const contribs = (await api.get({
                        action: "query",
                        assertuser: wgUserName,
                        prop: "contributors",
                        pageids: wgArticleId,
                        pclimit: 2,
                    })).query.pages[wgArticleId].contributors;
                    if (contribs.length > 1) {
                        throw {
                            warning: true,
                            msg: "贡献者并非只有创建者一人，请检查页面历史。确定打回创建者用户页？",
                            code: "multipleContribs",
                        };
                    }
                }

                // 查询创建者用户名
                const { query: { pages: { [wgArticleId]: { revisions: [{ user }] } } } } = await api.get({
                    action: "query",
                    assertuser: wgUserName,
                    prop: "revisions",
                    titles: wgPageName,
                    rvprop: "user",
                    rvlimit: 1,
                    rvdir: "newer",
                });
                const page = isModule ? `Module:Sandbox/${user}/${wgTitle}` : `User:${user}/${wgPageName}`;

                if (!noNotice) {
                    // 留言
                    const notifRes = await api.postWithToken("csrf", {
                        action: "edit",
                        assertuser: wgUserName,
                        format: "json",
                        title: `User talk:${user}`,
                        section: "new",
                        sectiontitle: notifTitle,
                        text: `${convTemplate(notifContent, "2", page)}——~~~~`,
                        watchlist: watchTalk,
                        tags: "Automation tool",
                    });
                    if (notifRes?.value?.error) {
                        throw notifRes.value.error;
                    }
                }

                // 移动页面
                try {
                    const moveRes = await api.postWithToken("csrf", {
                        action: "move",
                        assertuser: wgUserName,
                        from: wgPageName,
                        to: page,
                        movetalk: moveTalk,
                        movesubpages: true,
                        reason,
                        noredirect: true,
                        watchlist: watchAfter,
                        tags: "Automation tool",
                    });
                    if (Reflect.has(moveRes, "error")) {
                        throw moveRes;
                    }
                } catch (e) {
                    if (e !== "moderation-move-queued") {
                        throw e;
                    }
                }
            }
        }

        const windowManager = new OO.ui.WindowManager();
        $body.append(windowManager.$element);
        const mtusDialog = new MTUSWindow({
            size: "large",
        });
        windowManager.addWindows([mtusDialog]);

        $(mw.util.addPortletLink("p-cactions", "#", "打回", "ca-lr-mtus", isModule ? wgULS("移动至创建者模块沙盒", "移至創建者模組沙盒") : wgULS("移动至创建者用户页并挂删", "移至創建者用戶頁並掛删"), "m")).on("click", (e) => {
            e.preventDefault();
            windowManager.openWindow(mtusDialog);
            $body.css("overflow", "auto");
        });
    } catch (e) {
        /* eslint-disable no-var, prefer-arrow-functions/prefer-arrow-functions, prefer-arrow-callback, prefer-template */
        var parseError = function (errLike, _space/* ? */) {
            let space = _space;
            if (_space === void 0) {
                space = 4;
            }
            return JSON.stringify(errLike, function (_, v) {
                if (v instanceof Error) {
                    var stack = [];
                    if (v.stack) {
                        Reflect.apply(stack.push, stack, v.stack.split("\n").map(function (n) {
                            return n.trim();
                        }).filter(function (n) {
                            var _a;
                            return ((_a = n === null || n === void 0 ? void 0 : n.length) !== null && _a !== void 0 ? _a : -1) > 0;
                        }));
                    }
                    var keys = Object.keys(v).filter(function (key) {
                        return !Reflect.has(Error.prototype, key);
                    });
                    if (keys.length) {
                        stack.push(JSON.stringify(Object.fromEntries(keys.map(function (key) {
                            return [key, v[key]];
                        })), null, space));
                    }
                    return stack.join("\n").trim() || "";
                }
                return v;
            }, space).replace(/^"(.*)"$/, "$1");
        };
        oouiDialog.alert("错误信息：<br>" + oouiDialog.sanitize(parseError(e)), {
            title: "打回工具发生错误",
        });
        console.error("[MoveToUserSubpage] Setup error: ", e);
        /* eslint-enable */
    }
});
// </pre>
