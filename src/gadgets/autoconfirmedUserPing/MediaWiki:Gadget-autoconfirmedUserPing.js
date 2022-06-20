// <pre>
"use strict";
$(() => {
    if (!mw.config.get("wgTitle").startsWith("提案/讨论中提案/")) {
        return;
    }
    // await mw.loader.using(["mediawiki.api", "oojs-ui-core", "moment"]);

    const api = new mw.Api({ timeout: 5000 });
    const chunkify = (arr, size = 50) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
    const sleep = (ms = 1000) => new Promise((res) => setTimeout(res, ms));
    let working = false, success = false;
    const main = async () => {
        const hasHighLim = (await mw.user.getRights()).includes("apihighlimits");
        const pageid = mw.config.get("wgArticleId");

        try {
            wrapper.trigger("acup:step", "正在获取忽略用户名单...");
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
            const ignoreList = [...Array.from(new Set([...bots, ...MGUsers.bureaucrat, ...MGUsers.sysop, ...MGUsers.patroller, ...MGUsers.staff]))];
            const filterResult = (result) => result.query.pages[pageid].contributors.map(c => c.name).filter(c => !ignoreList.includes(c));
            console.log("ACUserPing: Got ignored user list.", ignoreList);

            wrapper.trigger("acup:step", "正在获取发言用户名单...");
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
            console.log("ACUserPing: Got filtered list of users.", nonMGUsers);

            const validAC = await chunkify(nonMGUsers, hasHighLim && 500 || undefined).reduce(async (acc, chunk, i) => {
                wrapper.trigger("acup:step", `正在复核用户条件...（第${i + 1}批）`);
                const prelimRes = (await api.get({
                    action: "query",
                    list: "users",
                    ususers: chunk.join("|"),
                    usprop: "implicitgroups|blockinfo|registration",
                })).query.users.filter(u => u.implicitgroups.includes("autoconfirmed") && !u.blockedby && moment().diff(moment(u.registration), "days") > 30).map(u => u.name);
                console.log(`ACUserPing: (Chunck ${i + 1}) Got preliminary result.`, prelimRes);
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
                console.log(`ACUserPing: (Chunck ${i + 1}) Got refined result.`, lastEdit);
                return [...await acc, ...lastEdit];
            }, []);

            wrapper.trigger("acup:step", "正在合并结果...");
            const plain = validAC.join("\n"), ping = chunkify(validAC).map(c => `{{ping|${c.join("|")}}}`).join("\n");
            console.log("ACUserPing: Success!", plain, ping);

            wrapper.trigger("acup:success", { plain, ping });
        } catch (e) {
            console.error("ACUserPing: Error", e);
            wrapper.trigger("acup:error", e);
        }
    };

    const container = $("<div>", {
        css: {
            position: "fixed",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            color: "black",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "background-color": "rgba(255, 255, 255, 0.73)",
            "z-index": 199,
        },
        id: "lr-ACUserPing",
    });
    const wrapper = $("<div>", {
        css: {
            width: "50%",
            "max-width": "50em",
            border: "thin solid black",
            padding: "2em",
            "border-radius": "10px",
            "background-color": "#fff",
        },
    }).on("acup:init", () => {
        if (success) {
            container.show();
            return;
        }
        const submit = new OO.ui.ButtonWidget({
            label: "确认",
            icon: "check",
            flags: ["primary", "progressive"],
        }).on("click", () => {
            wrapper.trigger("acup:confirmed");
        });
        const cancel = new OO.ui.ButtonWidget({
            label: "取消",
            icon: "close",
            flags: ["destructive"],
        }).on("click", () => {
            container.hide();
        });
        wrapper.empty().append("<div>确认获取参与讨论的自动确认用户列表？（该操作将对每个可能用户发出一次查询贡献的API请求，请谨慎使用！）</div>", $("<p>").append(submit.$element, cancel.$element));
        container.show();
    }).on("acup:confirmed", () => {
        working = true;
        wrapper.html("<p>为确保剪贴板复制成功，请不要将鼠标移动出页面或切换窗口！</p><ul></ul>");
        main();
    }).on("acup:step", (_, state) => {
        wrapper.find("ul").append(`<li>${state}</li>`);
    }).on("acup:success", async (_, { plain, ping }) => {
        try {
            await navigator.clipboard.writeText(ping);
        } catch (_) {
            const textarea = $(`<textarea>${ping}</textarea>`).appendTo("body");
            const textareaDom = textarea[0]/* as HTMLTextAreaElement */; // For TypeScript only
            textareaDom.select();
            document.execCommand("copy");
            textarea.remove();
        }
        const results = $("<div>", {
            css: {
                display: "flex",
                margin: "1em 0",
            },
        }).append([
            new OO.ui.MultilineTextInputWidget({
                value: plain,
                readOnly: true,
                autosize: true,
                maxRows: 3,
            }).$element,
            new OO.ui.MultilineTextInputWidget({
                value: ping,
                readOnly: true,
                autosize: true,
                maxRows: 3,
            }).$element,
        ]);
        wrapper.append("<hr>", results, "<div>成功！ping已复制到剪贴板。</div>");
        wrapper.trigger("acup:finish", "progressive");
        success = true;
    }).on("acup:error", (_, error) => {
        wrapper.find("ul").append(`<li class="error">错误：${error}</li>`);
        wrapper.trigger("acup:finish", "destructive");
    }).on("acup:finish", (_, flag) => {
        const close = new OO.ui.ButtonWidget({
            label: "关闭",
            icon: "close",
            flags: ["primary", flag],
        }).on("click", () => {
            container.hide();
            working = false;
        });
        wrapper.append($("<p>").append(close.$element));
    }).appendTo(container);

    $(mw.util.addPortletLink("p-tb", "#", "获取发言列表", "t-lr-ACUserPing", "获取参与讨论的自动确认用户列表")).on("click", (e) => {
        e.preventDefault();
        if (working) {
            return;
        }
        wrapper.trigger("acup:init");
    });
    container.appendTo("body").hide();
});
// </pre>