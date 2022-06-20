// <pre>
"use strict";
$(() => {
    const usergroup = mw.config.get("wgUserGroups");
    const pagename = mw.config.get("wgPageName");
    if (mw.config.get("wgNamespaceNumber") !== 2 || !mw.config.get("wgIsArticle") || /\//.test(pagename) || !usergroup.includes("sysop") && !usergroup.includes("patroller") ) {
        return;
    }

    let working = false;
    const main = async () => {
        working = true;

        //await mw.loader.using(["mediawiki.api", "mediawiki.notification", "mediawiki.notify", "moment"]);
        $("#mw-notification-area").appendTo("body");

        const api = new mw.Api();
        try {
            mw.notify("正在查询日志……", {
                title: "正在标记永久封禁",
                autoHide: false,
                tag: "lr-flagBlocked",
            });
            const data = (await api.get({
                action: "query",
                list: "logevents",
                letype: "block",
                leprop: "timestamp|details|comment",
                lelimit: 1,
                letitle: pagename,
            })).query.logevents["0"];
            const comment = data.comment;
            const duration = data.params.duration;
            let blockTime = data.timestamp;
            if (!/never|infinite|indefinite|infinity/i.test(duration)) {
                throw new Error("该用户未被永久封禁！");
            } else {
                blockTime = moment(blockTime).utcOffset(8).format("YYYY年MM月DD日"); // 精确到日
            }
            if (data.params.flags.includes("hiddenname") || "suppressed" in data) {
                throw new Error("用户名被隐藏或日志被监督！");
            }
            if (/Abuse|长期破坏者|a\s*\d+/gi.test(comment)) {
                const abuse = comment.replace(/\D*/g, "");
                var template = `{{永久封禁|time=${blockTime}|reason=${comment}|abuse=${abuse}}}`;
            } else {
                var template = `{{永久封禁|time=${blockTime}|reason=${comment}}}`;
            }

            mw.notify("正在添加永久封禁模板……", {
                title: "正在标记永久封禁",
                autoHide: false,
                tag: "lr-flagBlocked",
            });
            await api.postWithToken("csrf", {
                action: "edit",
                title: pagename,
                text: template,
                minor: true,
                nocreate: true, //无需创建不存在用户页的永久封禁用户的用户页
                bot: usergroup.includes("flood"),
                watchlist: "nochange",
                summary: "标记永久封禁用户",
                tags: "Automation tool",
            });

            mw.notify("即将刷新……", {
                title: "标记永久封禁成功",
                type: "success",
                tag: "lr-flagBlocked",
            });
            window.setTimeout(() => location.reload(), 730);
        } catch (e) {
            mw.notify(["编辑页面时出现错误：", $("<code />").text(e)], {
                title: "标记永久封禁失败",
                type: "error",
                tag: "lr-flagBlocked",
            });
            working = false;
        }
    };

    $(mw.util.addPortletLink("p-tb", "#", "标记永久封禁", "t-lr-flagBlocked", "将此页面替换为永久封禁模板")).on("click", async (e) => { 
        e.preventDefault();
        if (working || !await oouiDialog.confirm("确定要将此页面替换为永久封禁模板吗？", {
            title: "标记永久封禁小工具",
        })) {
            return;
        }
        main();
    });
});
// </pre>