// <pre>
// From [[Special:固定链接/5030142]]
// eslint-disable-next-line no-redeclare
/* global $, OO, mw, wgULS */
// await mw.loader.using(["oojs-ui", "ext.gadget.LocalObjectStorage"]);
"use strict";
$(() => (async () => {
    try {
        if ($(".noarticletext")[0] || $(".will2Be2Deleted")[0] || !mw.config.get("wgUserGroups").includes("patroller") && !(new URL(location.href).searchParams.get("AnnTools-debug") || "").split("|").includes("registerToDelete")) {
            return;
        }

        const $body = $("body");
        $("#mw-notification-area").appendTo($body);

        class FFDWindow extends OO.ui.ProcessDialog {
            static static = $.extend(Object.create(super.static), {
                name: "lr-ffd",
                title: wgULS("挂删", "掛删"),
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
            });
            constructor(config) {
                // Parent constructor
                super(config);

                this.storage = config.data.storage;
                this.localCache = config.data.localCache;
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
                        label: "其他（请自行说明理由）",
                    }, ...this.localCache],
                });
                this.detailsText = new OO.ui.TextInputWidget();
                this.dbCheckbox = new OO.ui.CheckboxInputWidget();
                this.enterCheckbox = new OO.ui.CheckboxInputWidget({
                    selected: this.storage.getItem("enterToSubmit"),
                });

                this.reasonsDropdownMenu = this.reasonsDropdown.dropdownWidget.getMenu();

                const reasonsField = new OO.ui.FieldLayout(this.reasonsDropdown, {
                    label: wgULS("挂删理由", "掛删緣由"),
                    align: "top",
                });
                const detailsField = new OO.ui.FieldLayout(this.detailsText, {
                    label: wgULS("详情", "詳情"),
                    align: "top",
                });
                const dbField = new OO.ui.FieldLayout(this.dbCheckbox, {
                    label: wgULS("讨论版申请", "討論版申請"),
                    align: "inline",
                });
                const enterField = new OO.ui.FieldLayout(this.enterCheckbox, {
                    label: wgULS("理由详情按回车提交（浏览器级设置）", "緣由詳情按回車鍵提交（瀏覽器級設置）"),
                    align: "inline",
                });

                this.panelLayout.$element.append(
                    reasonsField.$element,
                    detailsField.$element,
                    dbField.$element,
                    enterField.$element,
                );

                this.reasonsDropdownMenu.connect(this, { toggle: "dropdownToggle" });
                this.detailsText.connect(this, { enter: "onEnter" });
                this.enterCheckbox.connect(this, { change: "setStorage" });

                this.$body.append(this.panelLayout.$element);
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
                    // TODO: make this animated
                    const newHeight = parseFloat(this.$frame.css("height")) + 300;
                    this.withoutSizeTransitions(() => {
                        this.$frame.css("height", newHeight);
                        this.reasonsDropdownMenu.clip();
                    });
                } else {
                    this.updateSize();
                }
            }
            getBodyHeight() {
                return this.panelLayout.$element.outerHeight(true);
            }
            getReadyProcess(data) {
                return super.getReadyProcess(data)
                    .next(() => {
                        this.reasonsDropdown.focus();
                    }, this);
            }
            getActionProcess(action) {
                const dfd = $.Deferred();
                if (action === "cancel") {
                    return new OO.ui.Process(() => {
                        this.close({ action });
                    }, this);
                } else if (action === "submit") {
                    return new OO.ui.Process(() => {
                        this.reason = this.reasonsDropdown.getValue();
                        this.detail = this.detailsText.getValue();
                        if (!this.reason && !this.detail) {
                            dfd.reject(new OO.ui.Error("请填写理由或详情"));
                            return dfd.promise();
                        }
                        // if (reason) {
                        //     reason += detail ? (reason ? "：" : "") + detail : "";
                        // } else {
                        //     reason = detail;
                        // }
                        // if (isDB.isSelected()) {
                        //     reason = `讨论版申请：${reason}`;
                        // }
                        this.reason = `${this.dbCheckbox.isSelected() ? "讨论版申请：" : ""}${this.reason ? `${this.reason}${this.detail ? `：${this.detail}` : ""}` : this.detail}`; // 压行
                        this.flagTemplate().then(() => {
                            this.close({ action });
                            mw.notify(wgULS("即将刷新……", "即將刷新……"), {
                                title: wgULS("挂删成功", "掛删成功"),
                                type: "success",
                                tag: "lr-ffd",
                            });
                            dfd.resolve();
                            setTimeout(() => location.reload(), 730);
                        }).catch((e) => {
                            console.error("[FlagForDeletion] Error:", e);
                            dfd.reject(new OO.ui.Error(e));
                        });
                        return dfd.promise();
                    }, this);
                }
                // Fallback to parent handler
                return super.getActionProcess(action);
            }
            async flagTemplate() {
                const api = new mw.Api();
                const template = /^en/.test(location.hostname) ? "Awaiting_deletion" : "即将删除";
                const d = await api.postWithToken("csrf", {
                    action: "edit",
                    format: "json",
                    title: mw.config.get("wgPageName"),
                    text: `<noinclude>{{${template}|1=${this.reason}|user=${mw.config.get("wgUserName")}}}</noinclude>`,
                    summary: `挂删：${this.reason}`,
                    nocreate: true,
                    watchlist: "nochange",
                    tags: "Automation tool",
                });
                if (d.error) {
                    throw d.error.code;
                }
            }
        }

        const storage = new LocalObjectStorage("AnnTools-registerToDelete");
        const localCache = await new Promise((resolve) => {
            const cache = storage.getItem("deletereason-cache");
            if (Array.isArray(cache)) {
                resolve(cache);
                return;
            }
            if (storage.getItem("deletereason-fetching")) {
                const c = setInterval(() => {
                    if (!storage.getItem("deletereason-fetching")) {
                        clearInterval(c);
                        resolve(storage.getItem("deletereason-cache"));
                    }
                });
                return;
            }
            storage.setItem("deletereason-fetching", true);
            $.get(`${mw.config.get("wgServer") + mw.config.get("wgScriptPath")}/MediaWiki:Deletereason-dropdown?action=raw`, (reasons) => {
                const cache = [];
                reasons.split(/\n+/).forEach((reason) => {
                    if (reason.length === 0 || !reason.startsWith("*")) {
                        return;
                    }
                    if (/^\*[^*]/.test(reason)) {
                        cache.push({
                            optgroup: reason.slice(1).trim(),
                        });
                    } else if (/^\*\*[^*]/.test(reason)) {
                        cache.push({
                            data: reason.slice(2).trim(),
                            label: reason.slice(2).trim(),
                        });
                    }
                });
                storage.setItem("deletereason-cache", cache);
                storage.setItem("deletereason-fetching", false);
                resolve(cache);
            });
        });

        const windowManager = new OO.ui.WindowManager();
        $body.append(windowManager.$element);
        const ffdDialog = new FFDWindow({
            size: "medium",
            data: { storage, localCache },
        });
        windowManager.addWindows([ffdDialog]);

        $(mw.util.addPortletLink("p-cactions", "#", wgULS("挂删", "掛删"), "ca-lr-ffd", `${wgULS("挂删本页", "掛删本頁")}[alt-shift-d]`), "d").on("click", (e) => {
            e.preventDefault();
            windowManager.openWindow(ffdDialog);
            $body.css("overflow", "auto");
        });
    } catch (e) {
        /* eslint-disable */
        var parseError = function (errLike, space) {
            if (space === void 0) { space = 4; }
            return JSON.stringify(errLike, function (_, v) {
                if (v instanceof Error) {
                    var stack = [];
                    if (v.stack) {
                        stack.push.apply(stack, v.stack.split("\n").map(function (n) { return n.trim(); }).filter(function (n) { var _a; return ((_a = n === null || n === void 0 ? void 0 : n.length) !== null && _a !== void 0 ? _a : -1) > 0; }));
                    }
                    var keys = Object.keys(v).filter(function (key) { return !(key in Error.prototype); });
                    if (keys.length) {
                        stack.push(JSON.stringify(Object.fromEntries(keys.map(function (key) { return [key, v[key]]; })), null, space));
                    }
                    return stack.join("\n").trim() || "";
                }
                return v;
            }, space).replace(/^"(.*)"$/, "$1");
        };
        oouiDialog.alert("错误信息：<br>" + oouiDialog.sanitize(parseError(e)), {
            title: "挂删工具发生错误"
        });
        console.error("[FlagForDeletion] Setup error:", e);
        /* eslint-enable */
    }
})());
// </pre>