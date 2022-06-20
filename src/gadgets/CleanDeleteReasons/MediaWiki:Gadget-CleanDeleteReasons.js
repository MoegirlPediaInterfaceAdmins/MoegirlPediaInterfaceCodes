/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload, wgULS */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
// <pre>
$(function () {
    var wpReason = $("#wpReason");
    if (mw.config.get("wgAction") === "delete" && wpReason.length > 0) {
        if (/(?:^内容|內容|被清空前|页面为空|頁面為空|page was empty|content was|content before blanking was)/i.test($("#wpReason").val())) {
            $("#wpReason").val("");
        }
        $.get(mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?action=render&curid=" + mw.config.get("wgArticleId"), function (h) {
            var root = $("<div/>").html(h);
            var reason = root.find(".mw-parser-output > .infoBox.will2Be2Deleted #reason");
            var actor = root.find(".mw-parser-output > .infoBox.will2Be2Deleted #actor a").first();
            if (reason.length === 1 && actor.length === 1) {
                $("#wpReason").val("删除被挂删的页面，[[User_talk:" + actor.text() + "|" + actor.text() + "]]的挂删理由：''" + reason.text() + "''");
            }
        });
    }
});
// </pre>