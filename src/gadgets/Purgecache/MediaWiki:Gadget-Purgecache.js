"use strict";
// <pre>
$(() => {
    const li = mw.config.get("skin") === "vector" ? $("<li/>").appendTo("#p-personal > ul") : $("<div/>").prependTo("#moe-article-header-container #moe-article-header-top .right-block"),
        textNode = $("<span/>");
    let containerNode;
    if (mw.config.get("wgNamespaceNumber") === -1) {
        containerNode = $("<span/>");
        containerNode.css({
            cursor: "default",
            "user-select": "none",
        });
        containerNode.append(wgULS("特殊页面（", "特殊頁面（")).append(textNode).append("）");
    } else {
        containerNode = $("<a/>");
        const statusNode = $("<span/>").text(wgULS("清除页面缓存", "清除頁面快取"));
        let runningStatus = false;
        containerNode.attr("href", "javascript:void(0);");
        containerNode.append(statusNode).append("（").append(textNode).append("）");
        containerNode.on("click", async () => {
            if (runningStatus) {
                return;
            }
            statusNode.text(wgULS("正在清除页面缓存 0/2……", "正在清除頁面快取 0/2……"));
            statusNode.prepend('<img src="https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;">');
            runningStatus = true;
            const api = new mw.Api(),
                opt = {
                    action: "purge",
                    format: "json",
                    forcelinkupdate: true,
                    titles: mw.config.get("wgPageName"),
                };
            try {
                await api.post(opt);
                statusNode.text(wgULS("正在清除页面缓存 1/2……", "正在清除頁面快取 1/2……"));
                await new Promise((res) => {
                    setTimeout(res, 370);
                });
                await api.post(opt);
                statusNode.text(wgULS("清除页面缓存成功！", "清除頁面快取成功！"));
                setTimeout(location.reload.bind(location), 1000);
            } catch {
                statusNode.text(wgULS("清除页面缓存失败，点击可重试！", "清除頁面快取失敗，點選可重試！", null, null, "清除頁面快取失敗，點擊可重試！"));
                // eslint-disable-next-line require-atomic-updates
                runningStatus = false;
                setTimeout(() => {
                    if (!runningStatus) {
                        statusNode.text(wgULS("清除页面缓存", "清除頁面快取"));
                    }
                }, 5000);
            }
        });
    }
    li.append(containerNode);
    Cron.CronJob.from({
        cronTime: "* * * * * *",
        start: true,
        runOnInit: true,
        onTick: () => {
            textNode.text(moment().format("A h[:]mm[:]ss"));
        },
    });
    new Image().src = "https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif";
});
// </pre>
