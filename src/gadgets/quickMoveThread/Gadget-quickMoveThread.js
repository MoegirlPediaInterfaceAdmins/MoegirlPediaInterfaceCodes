"use strict";
$(() => {
    try {
        const { wgRevisionId, wgNamespaceNumber, wgPageName, wgRestrictionEdit, wgUserName } = mw.config.get(["wgRevisionId", "wgNamespaceNumber", "wgPageName", "wgRestrictionEdit", "wgUserName"]);
        if (wgRevisionId === 0 || (wgNamespaceNumber & 1) === 0) {
            return;
        }
        if (wgPageName.startsWith("萌娘百科_talk:提案/") || wgRestrictionEdit.includes("sysop")) {
            return;
        }
        const PUBLICDB = ["技术实现", "权限变更", "操作申请", "方针政策", "页面相关", "提问求助", "群组信息"].filter(
            (v) => wgPageName.substring(wgPageName.lastIndexOf("/") + 1, wgPageName.length) !== v,
        );

        const $body = $("body");
        $("#mw-notification-area").appendTo($body);

        // 锚点进入 {{movedfrom|1=…}}/{{movedto|1=…}} 参数时必须转义：模板标题（如 {{tl|foo}}）的
        // h2 锚点字面含 {{foo}}，未转义的 {{ }} | [ ] 会在模板展开或链接解析阶段被当作语法，
        // 通知链接因此碎裂（#1112）。HTML 实体在模板展开阶段不解析、在链接解析阶段解码；
        // # 例外地用 %23，因为服务端片段切分取最后一个 #、发生在实体解码之后，&#35; 会被
        // 解码回 # 再遭截断，而 %23 由服务端解码回字面 # 输出进 href，浏览器按第一个 # 取片段恰好命中。
        // 顺序约束：# 与 & 必须先于其余替换执行，否则已插入实体（如 &#123;）中的 # / & 会被二次转义。
        // 残余限制：锚点含字面 % 且后跟两位十六进制时浏览器解码有歧义，此类锚点无法命中。
        const escapeAnchorForTemplateParam = (s) => s
            .replaceAll("#", "%23")
            .replaceAll("&", "&amp;")
            .replaceAll("{", "&#123;")
            .replaceAll("}", "&#125;")
            .replaceAll("|", "&#124;")
            .replaceAll("[", "&#91;")
            .replaceAll("]", "&#93;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");

        class QMTWindow extends OO.ui.ProcessDialog {
            static static = {
                ...super.static,
                tagName: "div",
                name: "lr-qmt",
                title: wgULS("快速移动讨论串", "快速移動討論串"),
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
                this.targetDropdown = new OO.ui.DropdownInputWidget({
                    options: [
                        ...PUBLICDB.map((v) => ({
                            data: `萌娘百科_talk:讨论版/${v}`,
                            label: `${v}版`,
                        })),
                        {
                            data: "",
                            label: "其他",
                        },
                    ],
                });
                this.targetText = new OO.ui.TextInputWidget({
                    value: wgPageName,
                });
                this.enterCheckbox = new OO.ui.CheckboxInputWidget({
                    selected: this.storage.getItem("submit-on-enter"),
                });

                this.targetDropdownMenu = this.targetDropdown.dropdownWidget.getMenu();

                const targetDropdownField = new OO.ui.FieldLayout(this.targetDropdown, {
                    label: wgULS("目标页面", "目標頁面"),
                    align: "top",
                });
                const targetTextField = new OO.ui.FieldLayout(this.targetText, {
                    label: wgULS("页面名", "頁面名"),
                    align: "top",
                });
                const enterField = new OO.ui.FieldLayout(this.enterCheckbox, {
                    label: wgULS("按回车键提交（浏览器级设置）", "按確認鍵提交（瀏覽器級設置）"),
                    align: "inline",
                });

                this.needToggle = $([targetTextField.$element[0], enterField.$element[0]]);

                this.panelLayout.$element.append([
                    targetDropdownField.$element,
                    targetTextField.$element,
                    enterField.$element,
                ]);

                this.targetDropdownMenu.connect(this, { toggle: "dropdownToggle" });
                this.targetDropdown.connect(this, { change: "showTextInput" });
                this.targetText.connect(this, { enter: "onEnter" });
                this.enterCheckbox.connect(this, { change: "setStorage" });

                this.$body.append(this.panelLayout.$element);
            }
            dropdownToggle(visible) {
                if (visible) {
                    // Manually resize
                    const newHeight = parseFloat(this.$frame.css("height")) + 200;
                    this.withoutSizeTransitions(() => {
                        this.$frame.css("height", newHeight);
                        this.targetDropdownMenu.clip();
                        $(this.$frame).animate({
                            height: newHeight,
                        }, 700);
                    });
                } else {
                    this.updateSize();
                }
            }
            showTextInput(value) {
                if (value) {
                    this.needToggle.slideUp("fast", () => this.updateSize());
                } else {
                    this.needToggle.slideDown("fast", () => this.updateSize());
                }
            }
            setStorage(selected) {
                this.storage.setItem("submit-on-enter", selected);
            }
            onEnter() {
                if (this.enterCheckbox.isSelected()) {
                    this.executeAction("submit");
                }
            }
            getBodyHeight() {
                return this.panelLayout.$element.outerHeight(true);
            }
            getReadyProcess(data) {
                return super.getReadyProcess(data).next(() => {
                    this.targetText.focus();
                }, this);
            }
            getSetupProcess(data) {
                return super.getSetupProcess(data).next(() => {
                    this.section = data.section;
                    this.anchor = data.anchor;
                }, this);
            }
            getActionProcess(action) {
                if (action === "cancel") {
                    return new OO.ui.Process(() => {
                        this.close({ action });
                    }, this);
                } else if (action === "submit") {
                    return new OO.ui.Process($.when((async () => {
                        this.target = this.targetDropdown.getValue() || this.targetText.getValue();
                        if (!this.target) {
                            throw new OO.ui.Error(wgULS("请填写目标页面", "請填寫目標頁面"));
                        }
                        if (this.target === wgPageName) {
                            throw new OO.ui.Error(wgULS("目标页面不得与当前页面相同", "目標頁面不得與當前頁面相同"));
                        }
                        if (!/talk|[讨討][论論]|[对對][话話]/i.test(this.target)) {
                            throw new OO.ui.Error(wgULS("目标页面必须为讨论页面", "目標頁面必須為討論頁面"));
                        }
                        try {
                            await this.doMove();
                            this.close({ action });
                            mw.notify(wgULS("即将刷新……", "即將重新整理……"), {
                                title: wgULS("移动成功", "移動成功"),
                                type: "success",
                                tag: "lr-qmt",
                            });
                            setTimeout(() => location.reload(), 730);
                        } catch (e) {
                            console.error("[QuickMoveThread] Error:", e);
                            throw new OO.ui.Error(e);
                        }
                    })()).promise(), this);
                }
                // Fallback to parent handler
                return super.getActionProcess(action);
            }
            async doMove() {
                const api = new mw.Api();
                // 摘要中的链接保留未转义锚点：摘要不经过模板展开，字面 {{}} 原样存活
                const fromAnchor = `${wgPageName}#${this.anchor}`;
                const toAnchor = `${this.target}#${this.anchor}`;
                // 模板参数中的锚点须转义，见 escapeAnchorForTemplateParam 的注释
                const fromAnchorEscaped = `${wgPageName}#${escapeAnchorForTemplateParam(this.anchor)}`;
                const toAnchorEscaped = `${this.target}#${escapeAnchorForTemplateParam(this.anchor)}`;

                let original = (await api.get({
                    action: "parse",
                    assertuser: wgUserName,
                    page: wgPageName,
                    prop: "wikitext",
                    section: this.section,
                })).parse.wikitext["*"];
                // 惰性匹配以支持含 = 的标题（如 {{tl|1=a=b}}），并避免捕获尾随空格
                const rawTitle = original.match(/^== *(.*?) *==/m)?.[1] || this.anchor;
                original = original.replace(/^==.*?==/, "").trim();
                original = `{{movedfrom|1=${fromAnchorEscaped}}}\n\n${original}`;

                // Move to target
                console.log("[QuickMoveThread] Moving thread to target page");
                await api.postWithToken("csrf", {
                    action: "edit",
                    assertuser: wgUserName,
                    title: this.target,
                    section: "new",
                    sectiontitle: rawTitle,
                    text: original,
                    summary: `/* ${this.anchor} */ 移动讨论串自[[${fromAnchor}]] !nobot!`,
                    tags: "Automation tool",
                });

                // Remove original
                console.log("[QuickMoveThread] Removing original thread");
                await api.postWithToken("csrf", {
                    action: "edit",
                    assertuser: wgUserName,
                    title: wgPageName,
                    section: this.section,
                    text: `== ${rawTitle} ==\n{{movedto|1=${toAnchorEscaped}}}`,
                    summary: `/* ${this.anchor} */ 移动讨论串至[[${toAnchor}]] !nobot!`,
                    tags: "Automation tool",
                });
            }
        }

        const storage = new LocalObjectStorage("lr-qmt");

        const windowManager = new OO.ui.WindowManager();
        $body.append(windowManager.$element);
        const qmtDialog = new QMTWindow({
            size: "medium",
            data: { storage },
        });
        windowManager.addWindows([qmtDialog]);

        const injectButtons = () => {
            $(".mw-parser-output .mw-heading h2").each((_, ele) => {
                const $ele = $(ele).parent();
                if (!$ele.find(".mw-editsection")[0] || $ele.find(".lr-qmt-link")[0] || $ele.next(".movedToNotice, .movedFromNotice, .saveNotice")[0]) {
                    return;
                }
                const section = +new URL($ele.find('.mw-editsection a[href*="action=edit"][href*="section="]').attr("href"), location.origin).searchParams.get("section");
                const anchor = $(ele).attr("id");
                const button = $("<a>").attr("href", "#").prop("draggable", false).addClass("lr-qmt-link").text(wgULS("移动", "移動")).on("click", (e) => {
                    e.preventDefault();
                    windowManager.openWindow(qmtDialog, { section, anchor });
                });
                const $splButton = $ele.find(".section-permanent-link");
                if ($splButton[0]) {
                    $splButton.next(".mw-editsection-divider").after('<span class="mw-editsection-divider"> | </span>').after(button);
                } else {
                    $ele.find(".mw-editsection-bracket").first().after('<span class="mw-editsection-divider"> | </span>').after(button);
                }
            });
        };
        injectButtons();
        window.libDiscussionUtil.onContentChange(injectButtons);
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
            title: "快速移动工具发生错误",
        });
        console.error("[QuickMoveThread] Setup error:", e);
    }
});
