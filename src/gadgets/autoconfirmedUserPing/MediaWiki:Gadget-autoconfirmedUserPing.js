// <pre>
"use strict";
$(() => (async () => {
    if (!mw.config.get("wgTitle").startsWith("提案/讨论中提案/")) {
        return;
    }
    // await mw.loader.using(["mediawiki.api", "oojs-ui-core", "moment"]);

    const api = new mw.Api({ timeout: 5000 });
    const chunkify = (arr, size = 50) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
    const sleep = (ms = 1000) => new Promise((res) => setTimeout(res, ms));
    const hasHighLimit = (await mw.user.getRights()).includes("apihighlimits");
    const pageid = mw.config.get("wgArticleId");
    let result = {};

    const $body = $("body");
    $("#mw-notification-area").appendTo($body);

    class ACUPWindow extends OO.ui.ProcessDialog {
        static static = {
            ...super.static,
            name: "lr-acup",
            title: wgULS("自动确认用户列表", "自動確認使用者列表"),
            actions: [
                {
                    action: "close",
                    label: "取消",
                    flags: ["safe", "close"],
                    modes: "confirm",
                },
                {
                    action: "continue",
                    label: wgULS("继续", "繼續"),
                    flags: ["primary", "progressive"],
                    modes: "confirm",
                },
                {
                    action: "close",
                    label: wgULS("关闭", "關閉"),
                    flags: ["safe", "close"],
                    modes: "result",
                },
            ],
        };
        initialize() {
            // Parent method
            super.initialize();

            this.confirmPanel = new OO.ui.PanelLayout({
                scrollable: false,
                expanded: false,
                padded: true,
            });
            this.confirmPanel.$element.append(`<div>${wgULS("确认获取参与讨论的自动确认用户列表？（该操作将对每位可能用户发出一次查询贡献的API请求，请谨慎使用！）", "確認獲取參與討論的自動確認使用者列表？（該操作將對每位可能使用者發出一次查詢貢獻的API請求，請謹慎使用！）")}</div>`);

            this.resultPanel = new OO.ui.PanelLayout({
                scrollable: false,
                expanded: false,
                padded: true,
            });
            this.stepList = $("<ul>");

            this.stackLayout = new OO.ui.StackLayout({
                items: [this.confirmPanel, this.resultPanel],
            });

            this.$body.append(this.stackLayout.$element);
        }
        getBodyHeight() {
            return this.stackLayout.getCurrentItem().$element.outerHeight(true);
        }
        getSetupProcess(data) {
            return super.getSetupProcess(data).next(() => {
                if (Object.keys(result).length) {
                    this.displayResults(result);
                } else {
                    this.actions.setMode("confirm");
                    this.stackLayout.setItem(this.confirmPanel);
                }
            }, this);
        }
        getActionProcess(action) {
            if (action === "close") {
                return new OO.ui.Process(() => {
                    this.close({ action });
                }, this);
            } else if (action === "continue") {
                return new OO.ui.Process($.when((async () => {
                    // First time?
                    try {
                        result = await this.getPing();
                        this.displayResults(result);
                    } catch (e) {
                        console.error("[ACUserPing] Error:", e);
                        throw new OO.ui.Error(e);
                    }
                })()).promise(), this);
            }
            // Fallback to parent handler
            return super.getActionProcess(action);
        }
        addStep(state) {
            this.stepList.append(`<li>${state}</li>`);
            this.updateSize();
        }
        async getPing() {
            this.confirmPanel.$element.empty().append([
                `<p>${wgULS("为确保剪贴板复制成功，请不要将鼠标移动出页面或切换窗口！", "為確保剪貼簿複製成功，請不要將滑鼠移動出頁面或切換視窗！")}</p>`,
                this.stepList]);
            this.updateSize();

            this.addStep(wgULS("正在获取忽略用户名单...", "正在獲取忽略使用者名稱單..."));
            const bots = (await api.get({
                action: "query",
                list: "allusers",
                augroup: "bot",
                aulimit: "max",
            })).query.allusers.map(u => u.name);
            const MGUsers = JSON.parse((await api.get({
                action: "parse",
                page: "Module:UserGroup/data",
                prop: "wikitext",
            })).parse.wikitext["*"]);
            const ignoreList = Array.from(new Set([...bots, ...MGUsers.bureaucrat, ...MGUsers.sysop, ...MGUsers.patroller, ...MGUsers.staff]));
            const filterResult = (result) => result.query.pages[pageid].contributors.map(c => c.name).filter(c => !ignoreList.includes(c));
            console.log("[ACUserPing] Got ignored user list.", ignoreList);

            this.addStep(wgULS("正在获取发言用户名单...", "正在獲取發言使用者名稱單..."));
            let contributorsResult = await api.get({
                action: "query",
                prop: "contributors",
                pageids: pageid,
                pclimit: "max",
            });
            let nonMGUsers = filterResult(contributorsResult);
            while (contributorsResult.continue) {
                contributorsResult = await api.get({
                    action: "query",
                    prop: "contributors",
                    pageids: pageid,
                    pclimit: "max",
                    pccontinue: contributorsResult.continue.pccontinue,
                });
                nonMGUsers = nonMGUsers.concat(filterResult(contributorsResult));
            }
            console.log("[ACUserPing] Got filtered list of users.", nonMGUsers);

            const validAC = await chunkify(nonMGUsers, hasHighLimit && 500 || undefined).reduce(async (acc, chunk, i) => {
                this.addStep(wgULS(`正在复核用户条件...（第${i + 1}批）`, `正在複核使用者條件...（第${i + 1}批）`));
                const prelimRes = (await api.get({
                    action: "query",
                    list: "users",
                    ususers: chunk.join("|"),
                    usprop: "implicitgroups|blockinfo|registration",
                })).query.users.filter(u => u.implicitgroups.includes("autoconfirmed") && !u.blockedby && moment().diff(moment(u.registration), "days") > 30).map(u => u.name);
                console.log(`[ACUserPing] Chunk ${i + 1}: Got preliminary result.`, prelimRes);
                const lastEdit = (await Promise.all(prelimRes.map(async (u) => {
                    await sleep();
                    return {
                        u,
                        lastEdit: (await api.get({
                            action: "query",
                            list: "usercontribs",
                            ucuser: u,
                            ucnamespace: "0|10|14|12|4",
                            uclimit: 1,
                            ucend: moment().subtract(30, "days").unix(),
                        })).query.usercontribs[0],
                    };
                }))).filter(({ lastEdit }) => lastEdit).map(({ u }) => u);
                console.log(`[ACUserPing] Chunk ${i + 1}: Got refined result.`, lastEdit);
                return [...await acc, ...lastEdit];
            }, []);

            this.addStep(wgULS("正在合并结果...", "正在合併結果..."));
            const plain = validAC.join("\n"), ping = chunkify(validAC).map(c => `{{ping|${c.join("|")}}}`).join("\n");
            console.log("[ACUserPing] Success!", plain, ping);

            return { plain, ping };
        }
        async displayResults({ plain, ping }) {
            try {
                await navigator.clipboard.writeText(ping);
            } catch (_) {
                const textarea = $(`<textarea>${ping}</textarea>`).appendTo("body");
                const textareaDom = textarea[0]/* as HTMLTextAreaElement */; // For TypeScript only
                textareaDom.trigger("select");
                document.execCommand("copy");
                textarea.remove();
            }
            this.resultPanel.$element.empty().append([$("<div>", {
                css: {
                    display: "flex",
                },
            }).append([
                $("<div>", {
                    css: {
                        flex: "1 1 0",
                        margin: "0.5em",
                    },
                }).append([
                    "<p>列表格式</p>",
                    new OO.ui.MultilineTextInputWidget({
                        value: plain,
                        readOnly: true,
                        rows: 10,
                    }).$element,
                ]),
                $("<div>", {
                    css: {
                        flex: "1 1 0",
                        margin: "0.5em",
                    },
                }).append([
                    "<p>Ping格式</p>",
                    new OO.ui.MultilineTextInputWidget({
                        value: ping,
                        readOnly: true,
                        rows: 10,
                    }).$element,
                ]),
            ]), `<p>${wgULS("成功！Ping已复制到剪贴板。", "成功！Ping已複製到剪貼簿。")}</p>`]);
            this.actions.setMode("result");
            this.stackLayout.setItem(this.resultPanel);
            this.updateSize();
        }
    }

    const windowManager = new OO.ui.WindowManager();
    $body.append(windowManager.$element);
    const acupDialog = new ACUPWindow({
        size: "large",
    });
    windowManager.addWindows([acupDialog]);

    $(mw.util.addPortletLink("p-tb", "#", wgULS("获取发言列表", "獲取發言列表"), "t-lr-ACUserPing", wgULS("获取参与讨论的自动确认用户列表", "獲取參與討論的自動確認使用者列表"))).on("click", (e) => {
        e.preventDefault();
        windowManager.openWindow(acupDialog);
        $body.css("overflow", "auto");
    });
})());
// </pre>
