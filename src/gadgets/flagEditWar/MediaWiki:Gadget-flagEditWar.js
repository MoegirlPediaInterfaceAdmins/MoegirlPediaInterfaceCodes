// <pre>
"use strict";
$(() => {
    const protectLevel = ["sysop", "patrolleredit"];
    if ($("#EditWarWarningEndTime")[0] || mw.config.get("wgNamespaceNumber") !== 0 || !mw.config.get("wgUserGroups").includes("sysop") || !protectLevel.includes(mw.config.get("wgRestrictionEdit")[0])) {
        return;
    }

    const hasWarning = !!$("#EditWarWarning")[0];
    let working = false;
    const main = async () => {
        working = true;

        // await mw.loader.using(["mediawiki.api", "mediawiki.notification", "mediawiki.notify", "moment"]);
        $("#mw-notification-area").appendTo("body");

        const pagename = mw.config.get("wgPageName");
        const api = new mw.Api();
        try {
            mw.notify("正在查询日志……", {
                title: "正在标记编辑战",
                autoHide: false,
                tag: "lr-flagEditWar",
            });
            const data = (await api.get({
                action: "query",
                list: "logevents",
                letype: "protect",
                leprop: "user|details",
                lelimit: 1,
                letitle: pagename,
            })).query.logevents["0"];
            const { user } = data;
            let endTime = data.params.details[0].expiry;
            if (endTime === "infinite") {
                throw new Error("编辑战保护时长不应为「无限期」！");
            } else {
                endTime = moment(endTime).utcOffset(8).format("YYYY年M月D日 HH:mm:ss [(CST)]");
            }
            const template = `{{编辑战|sysop=${user}|end=${endTime}}}\n`, summary = `编辑战模板：由[[User_talk:${user}|${user}]]保护至${endTime}`;

            if (hasWarning) {
                mw.notify("检测到编辑战模板，正在获取页面内容……", {
                    title: "正在标记编辑战",
                    autoHide: false,
                    tag: "lr-flagEditWar",
                });
                let text = (await api.get({
                    action: "parse",
                    prop: "wikitext",
                    page: pagename,
                    section: 0,
                })).parse.wikitext["*"];
                text = text.replace(/\{\{编辑战(?:\|.*?)?\}\}\n?/, template);

                mw.notify("正在修改编辑战模板……", {
                    title: "正在标记编辑战",
                    autoHide: false,
                    tag: "lr-flagEditWar",
                });
                await api.postWithToken("csrf", {
                    action: "edit",
                    title: pagename,
                    section: 0,
                    text,
                    minor: true,
                    summary: `修改${summary}`,
                    tags: "Automation tool",
                });
            } else {
                mw.notify("正在添加编辑战模板……", {
                    title: "正在标记编辑战",
                    autoHide: false,
                    tag: "lr-flagEditWar",
                });
                await api.postWithToken("csrf", {
                    action: "edit",
                    title: pagename,
                    section: 0,
                    prependtext: template,
                    minor: true,
                    summary: `添加${summary}`,
                    tags: "Automation tool",
                });
            }

            mw.notify("即将刷新……", {
                title: "标记编辑战成功",
                type: "success",
                tag: "lr-flagEditWar",
            });
            window.setTimeout(() => location.reload(), 730);
        } catch (e) {
            mw.notify(["编辑页面时出现错误：", $("<code />").text(e)], {
                title: "标记编辑战失败",
                type: "error",
                tag: "lr-flagEditWar",
            });
            working = false;
        }
    };

    $(mw.util.addPortletLink("p-tb", "#", "标记编辑战", "t-lr-flagEditWar", `${hasWarning ? "修改此页面的" : "在此页面悬挂"}编辑战模板`)).on("click", async (e) => {
        e.preventDefault();
        if (working || !await oouiDialog.confirm(`确定要${hasWarning ? "修改此页面的" : "在此页面悬挂"}编辑战模板吗？`, {
            title: "标记编辑战小工具",
        })) {
            return;
        }
        main();
    });
});
// </pre>
