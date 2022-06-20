/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint-disable no-unused-vars */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
// eslint-disable-next-line no-redeclare
/* global mw, $, OO, moment, Cron, wgULS */
/* eslint-enable no-unused-vars */
"use strict";
// <pre>
$(function () {
    var li =
        mw.config.get("skin") === "vector"
            ? $("<li/>").appendTo("#p-personal > ul")
            : $("<div/>").prependTo("#moe-page-header-container #moe-page-header-top .right-block"),
        textNode = $("<span/>"),
        containerNode;
    if (mw.config.get("wgNamespaceNumber") === -1) {
        containerNode = $("<span/>");
        containerNode.css({
            cursor: "default",
            "user-select": "none"
        });
        containerNode.append(wgULS("特殊页面（", "特殊頁面（")).append(textNode).append("）");
    } else {
        containerNode = $("<a/>");
        var statusNode = $("<span/>").text(wgULS("清除页面缓存", "清除頁面快取")),
            runningStatus = false;
        containerNode.attr("href", "javascript:void(0);");
        containerNode.append(statusNode).append("（").append(textNode).append("）");
        containerNode.on("click", function () {
            if (runningStatus) {
                return;
            }
            statusNode.text(wgULS("正在清除页面缓存 0/2……", "正在清除頁面快取 0/2……"));
            statusNode.prepend('<img src="https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;">');
            runningStatus = true;
            var api = new mw.Api(),
                opt = {
                    action: "purge",
                    format: "json",
                    forcelinkupdate: true,
                    titles: mw.config.get("wgPageName")
                };
            api.post(opt).then(function () {
                statusNode.text(wgULS("正在清除页面缓存 1/2……", "正在清除頁面快取 1/2……"));
                return new Promise(function (res) {
                    setTimeout(res, 370);
                });
            }).then(function () {
                return api.post(opt);
            }).then(function () {
                statusNode.text(wgULS("清除页面缓存成功！", "清除頁面快取成功！"));
                setTimeout(location.reload.bind(location), 1000);
            })["catch"](function () {
                statusNode.text(wgULS("清除页面缓存失败，点击可重试！", "清除頁面快取失敗，點選可重試！", null, null, "清除頁面快取失敗，點擊可重試！"));
                runningStatus = false;
                setTimeout(function () {
                    if (!runningStatus) { statusNode.text(wgULS("清除页面缓存", "清除頁面快取")); }
                }, 5000);
            });
        });
    }
    li.append(containerNode);
    new Cron.CronJob({
        cronTime: "* * * * * *",
        start: true,
        runOnInit: true,
        onTick: function () {
            textNode.text(moment().format("A h[:]mm[:]ss"));
        }
    });
    new Image().src = "https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif";
});
// </pre>