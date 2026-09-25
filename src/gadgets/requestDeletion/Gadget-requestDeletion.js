"use strict";
$(() => {
    try {
        const { wgArticleId, wgPageName, wgUserName, wgUserGroups, wgNamespaceNumber, wgNamespaceIds, wgIsRedirect } = mw.config.get([
            "wgArticleId",
            "wgPageName",
            "wgUserName",
            "wgUserGroups",
            "wgNamespaceNumber",
            "wgNamespaceIds",
            "wgIsRedirect",
        ]);

        if (
            wgArticleId === 0
            || wgNamespaceNumber < 0
            || wgPageName.startsWith("萌娘百科_talk:讨论版")
            || $(".will2Be2Deleted")[0]
            || (wgUserGroups.includes("patroller") || wgUserGroups.includes("sysop")) && !(new URL(location.href).searchParams.get("AnnTools-debug") || "").split("|").includes("requestDeletion")
        ) {
            return;
        }

        const isZh = /^m?zh\.moegirl\.org\.cn$/.test(location.hostname);
        const api = new mw.Api(), zhAPI = isZh ? api : new mw.ForeignApi("https://mzh.moegirl.org.cn/api.php");

        const BOARD_PAGE = "萌娘百科_talk:讨论版/操作申请";
        const boardUrl = `${isZh ? "" : "https://mzh.moegirl.org.cn"}${mw.util.getUrl(BOARD_PAGE)}`;
        const linkedPageName = isZh ? wgPageName : `cm:${wgPageName}`;

        const $body = $("body");
        $("#mw-notification-area").appendTo($body);

        const getRequestTitleSuffix = (userName, now) => ` - ${userName} - ${now.getFullYear()}.${libPrefixNumber(now.getMonth() + 1)}.${libPrefixNumber(now.getDate())}`;

        const buildSectionTitle = () => `请求删除页面：[[${linkedPageName}]]${getRequestTitleSuffix(wgUserName, new Date())}`;

        /**
         * 新讨论串的正文
         *
         * @param {string} reason 理由
         * @param {string} detail 详情；为空时整行不输出
         * @returns {string} 正文 wikitext
         */
        const buildWikitext = (reason, detail) => {
            const lines = [
                `* '''页面标题'''：${wgIsRedirect ? `{{NoRedirectLink|${linkedPageName}}}` : `[[:${linkedPageName}]]`}`,
                `* '''申请理由：'''：${reason}`,
            ];
            if (detail) {
                lines.push(`* '''详细原因'''：${detail}`);
            }
            lines.push("~~~~");
            return lines.join("\n");
        };

        const fetchNewSectionAnchor = async (oldid) => {
            try {
                const res = await zhAPI.get({
                    action: "parse",
                    oldid,
                    prop: "sections",
                    formatversion: 2,
                });
                return res?.parse?.sections?.at(-1)?.anchor ?? "";
            } catch (e) {
                console.warn("[RequestDeletion] 读取新讨论串锚点失败", e);
                return "";
            }
        };

        class RDWindow extends OO.ui.ProcessDialog {
            static static = {
                ...super.static,
                tagName: "div",
                name: "lr-rd",
                title: wgULS("提删", "提刪"),
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

                this.storage = config.data.storage;
            }
            initialize() {
                // Parent method
                super.initialize();

                this.panelLayout = new OO.ui.PanelLayout({
                    scrollable: false,
                    expanded: false,
                    padded: true,
                });
                this.reasonsDropdown = new OO.ui.DropdownInputWidget({
                    options: [{
                        data: "",
                        label: wgULS("其他（请自行说明理由）", "其他（請自行說明緣由）"),
                    }, {
                        data: "",
                        disabled: true,
                        label: wgULS("加载中……", "載入中……"),
                    }],
                });
                this.detailsText = new OO.ui.TextInputWidget();
                this.enterCheckbox = new OO.ui.CheckboxInputWidget({
                    selected: this.storage.getItem("enterToSubmit"),
                });

                this.reasonsDropdownMenu = this.reasonsDropdown.dropdownWidget.getMenu();

                const reasonsField = new OO.ui.FieldLayout(this.reasonsDropdown, {
                    label: wgULS("提删理由", "提刪緣由"),
                    align: "top",
                });
                const detailsField = new OO.ui.FieldLayout(this.detailsText, {
                    label: wgULS("详情", "詳情"),
                    align: "top",
                });
                const enterField = new OO.ui.FieldLayout(this.enterCheckbox, {
                    label: wgULS("理由详情按回车提交（浏览器级设置）", "緣由詳情按回車鍵提交（瀏覽器級設置）"),
                    align: "inline",
                });

                this.panelLayout.$element.append(
                    reasonsField.$element,
                    detailsField.$element,
                    enterField.$element,
                );

                this.reasonsDropdownMenu.connect(this, { toggle: "dropdownToggle" });
                this.detailsText.connect(this, { enter: "onEnter" });
                this.enterCheckbox.connect(this, { change: "setStorage" });

                this.$body.append(this.panelLayout.$element);
            }
            updateReasons(reasons) {
                this.reasonsDropdown.setOptions([{
                    data: "",
                    label: wgULS("其他（请自行说明理由）", "其他（請自行說明緣由）"),
                }, ...reasons]);
            }
            setStorage(selected) {
                this.storage.setItem("enterToSubmit", selected);
            }
            onEnter() {
                if (this.enterCheckbox.isSelected()) {
                    this.executeAction("submit");
                }
            }
            dropdownToggle(visible) {
                if (visible) {
                    // Manually resize
                    const newHeight = parseFloat(this.$frame.css("height")) + 300;
                    this.withoutSizeTransitions(() => {
                        this.$frame.css("height", newHeight);
                        this.reasonsDropdownMenu.clip();
                        $(this.$frame).animate({
                            height: newHeight,
                        }, 700);
                    });
                } else {
                    this.updateSize();
                }
            }
            getBodyHeight() {
                return this.panelLayout.$element.outerHeight(true);
            }
            getReadyProcess(data) {
                return super.getReadyProcess(data).next(() => {
                    this.reasonsDropdown.focus();
                }, this);
            }
            getActionProcess(action) {
                if (action === "cancel") {
                    return new OO.ui.Process(() => {
                        this.close({ action });
                    }, this);
                } else if (action === "submit") {
                    return new OO.ui.Process($.when((async () => {
                        const reason = this.reasonsDropdown.getValue();
                        const detail = this.detailsText.getValue();
                        if (!reason && !detail) {
                            throw new OO.ui.Error(wgULS("请填写理由或详情", "請填寫緣由或詳情"));
                        }
                        try {
                            const anchor = await this.postRequest(buildWikitext(reason || detail, reason ? detail : ""));
                            this.close({ action });
                            mw.notify(wgULS("提删请求已发出，3 秒后跳转到讨论串", "提刪請求已發出，3 秒後跳轉到討論串"), {
                                title: wgULS("提删成功", "提刪成功"),
                                type: "success",
                                tag: "lr-rd",
                            });
                            setTimeout(() => {
                                location.assign(anchor === "" ? boardUrl : `${boardUrl}#${encodeURIComponent(anchor)}`);
                            }, 3000);
                        } catch (e) {
                            console.error("[RequestDeletion] Error:", e);
                            throw new OO.ui.Error(e);
                        }
                    })()).promise(), this);
                }
                // Fallback to parent handler
                return super.getActionProcess(action);
            }

            /**
             * 往讨论版发一个新话题，并返回该讨论串的锚点。
             *
             * @param {string} wikitext 正文 wikitext
             * @returns {Promise<string>} 讨论串锚点（不含 `#`）；取不到时为空串
             */
            postRequest = async (wikitext) => {
                const res = await zhAPI.postWithToken("csrf", {
                    action: "discussiontoolsedit",
                    paction: "addtopic",
                    page: BOARD_PAGE,
                    sectiontitle: buildSectionTitle(),
                    wikitext,
                    assertuser: wgUserName,
                    nocontent: "",
                    watchlist: "nochange",
                    tags: "Automation tool",
                });
                if (res.error) {
                    throw res.error.code;
                }
                return fetchNewSectionAnchor(res?.discussiontoolsedit?.newrevid);
            };
        }

        const storage = new LocalObjectStorage("AnnTools-requestDeletion");

        const windowManager = new OO.ui.WindowManager();
        $body.append(windowManager.$element);
        const rdDialog = new RDWindow({
            size: "medium",
            data: { storage },
        });
        windowManager.addWindows([rdDialog]);

        let loadReason = false;

        $(mw.util.addPortletLink("p-cactions", "#", wgULS("提删", "提刪"), "ca-lr-rd", wgULS("向讨论版提出删除请求", "向討論版提出刪除請求"))).on("click", async (e) => {
            e.preventDefault();
            windowManager.openWindow(rdDialog);
            $body.css("overflow", "auto");
            if (loadReason === false) {
                loadReason = true;
                const { parse: { text: { "*": html } } } = await api.post({
                    action: "parse",
                    assertuser: wgUserName,
                    page: wgNamespaceNumber === wgNamespaceIds.file ? "MediaWiki:Filedelete-reason-dropdown" : "MediaWiki:Deletereason-dropdown",
                    prop: "text",
                });
                const container = $("<div>");
                container.html(html);
                const result = [];
                const getReason = (ele) => {
                    result.push({
                        data: ele.innerText.trim(),
                        label: ele.innerText.trim(),
                    });
                };
                container.children(".mw-parser-output").children("ul").children("li").each((_, ele) => {
                    const $ele = $(ele);
                    if ($ele.children("ul").length > 0) {
                        result.push({
                            optgroup: $ele.clone().find("*").remove().end().text().trim(),
                        });
                        $ele.children("ul").children("li").each((_, e) => getReason(e));
                    } else {
                        getReason(ele);
                    }
                });
                rdDialog.updateReasons(result);
            }
        });
    } catch (e) {
        const parseError = (errLike, _space) => {
            let space = _space;
            if (_space === void 0) {
                space = 4;
            }
            return JSON.stringify(errLike, (_, v) => {
                if (v instanceof Error) {
                    const stack = [];
                    if (v.stack) {
                        Reflect.apply(stack.push, stack, v.stack.split("\n").map((n) => n.trim()).filter((n) => {
                            let _a;
                            return ((_a = n === null || n === void 0 ? void 0 : n.length) !== null && _a !== void 0 ? _a : -1) > 0;
                        }));
                    }
                    const keys = Object.keys(v).filter((key) => !Reflect.has(Error.prototype, key));
                    if (keys.length) {
                        stack.push(JSON.stringify(Object.fromEntries(keys.map((key) => [key, v[key]])), null, space));
                    }
                    return stack.join("\n").trim() || "";
                }
                return v;
            }, space).replace(/^"(.*)"$/, "$1");
        };
        oouiDialog.alert(`错误信息：<br>${oouiDialog.sanitize(parseError(e))}`, {
            title: "提删工具发生错误",
        });
        console.error("[RequestDeletion] Setup error:", e);
    }
});
