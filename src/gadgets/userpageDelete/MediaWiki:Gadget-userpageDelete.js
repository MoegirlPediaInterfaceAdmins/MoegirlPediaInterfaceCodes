// <pre>
"use strict";
$(() => {
    try {
        if (!$(".ns-2")[0] || mw.config.get("wgRevisionId") === 0 || mw.config.get("wgTitle").replace(/\/.+$/, "") !== mw.config.get("wgUserName") || mw.config.get("wgUserGroups").includes("sysop")) {
            return;
        }

        const $body = $("body");
        $("#mw-notification-area").appendTo($body);

        class Ns2dWindow extends OO.ui.ProcessDialog {
            static static = {
                ...super.static,
                tagName: "div",
                name: "lr-ns2d",
                title: wgULS("自助删除用户页面", "自助刪除使用者頁面", null, null, "自助刪除用戶頁面"),
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

            initialize() {
                super.initialize();

                // TODO 添加台湾繁体、香港繁体支持
                this.$body.append(
                    '<p style="margin:0.5em 1em">请注意：</p><ul style="margin:0.5em 1.6em"><li>只能用于用户名字空间（namespace=2）</li><li>页面创建者必须与用户页所有者一致</li><li>页面编辑历史须只包含用户页所有者、维护人员或机器人</li><li>如遇API WAF，请手动悬挂 <code>{{Ns2d}}</code> 模板</li></ul>',
                );
            }

            getActionProcess(action) {
                if (action === "cancel") {
                    return new OO.ui.Process(() => {
                        this.close({ action });
                    }, this);
                } else if (action === "submit") {
                    return new OO.ui.Process($.when((async () => {
                        try {
                            await this.flagTemplate();
                            this.close({ action });
                            mw.notify(wgULS("即将刷新……", "即將刷新……"), {
                                title: wgULS("自助删除成功", "自助刪除成功"),
                                type: "success",
                                tag: "lr-ns2d",
                            });
                            setTimeout(() => location.reload(), 730);
                        } catch (e) {
                            console.error("[Ns2d] Error:", e);
                            throw new OO.ui.Error(e);
                        }
                    })()).promise(), this);
                }
                // Fallback to parent handler
                return super.getActionProcess(action);
            }
            async flagTemplate() {
                const api = new mw.Api();
                const d = await api.postWithToken("csrf", {
                    action: "edit",
                    format: "json",
                    title: mw.config.get("wgPageName"),
                    text: "<noinclude>{{ns2d}}</noinclude>",
                    summary: "自助挂删用户页面",
                    nocreate: true,
                    watchlist: "nochange",
                    tags: "Automation tool",
                });
                if (d.error) {
                    throw d.error.code;
                }
            }
        }

        const windowManager = new OO.ui.WindowManager();
        $body.append(windowManager.$element);
        const ns2dDialog = new Ns2dWindow({
            size: "medium",
            text: "test",
        });
        windowManager.addWindows([ns2dDialog]);

        $(mw.util.addPortletLink( "p-cactions", "#", wgULS("自助删除", "自助刪除"), "ca-lr-ns2d", `${wgULS("自助删除用户页面", "自助刪除使用者頁面", null, null, "自助刪除用戶頁面")}`)).on("click", (e) => {
            e.preventDefault();
            windowManager.openWindow(ns2dDialog);
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
                var keys = Object.keys(v).filter(function (key) { return !(Reflect.has(Error.prototype, key)); });
                if (keys.length) {
                    stack.push(JSON.stringify(Object.fromEntries(keys.map(function (key) { return [key, v[key]]; })), null, space));
                }
                return stack.join("\n").trim() || "";
            }
            return v;
        }, space).replace(/^"(.*)"$/, "$1");
    };
    oouiDialog.alert("错误信息：<br>" + oouiDialog.sanitize(parseError(e)), {
        title: "自助删除工具发生错误",
    });
    console.error("[Ns2d] Setup error:", e);
    /* eslint-enable */
    }
});
// </pre>
