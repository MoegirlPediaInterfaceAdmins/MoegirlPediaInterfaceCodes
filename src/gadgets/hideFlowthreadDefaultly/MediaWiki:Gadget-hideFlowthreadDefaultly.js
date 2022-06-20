// <pre>
/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable prefer-rest-params */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload, wgULS */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
$("#bodyContent").append('<div id="flowthread-toggle" class="mw-parser-output">' + wgULS("显示/隐藏评论区", "顯示/隱藏評論區") + "</div>");
if (location.hash !== "#flowthread") {
    $("#flowthread").hide();
}
mw.loader.addStyleTag("#flowthread-toggle { cursor: pointer; border-radius: 5px; background-color: rgba(191, 234, 181, .2); border: 1px solid rgba(18, 152, 34, .47); padding: 1em; text-align: center; margin: 1em 0 .5em; } #bodyContent + #flowthread { margin-top: 0; }");
$("#flowthread-toggle").on("click", function (e) {
    e.preventDefault();
    const flowthread = $("#flowthread");
    if (flowthread.is(":visible")) {
        flowthread.slideUp(500);
        if (location.hash === "#flowthread") {
            location.replace("#/");
        }
    } else {
        flowthread.slideDown(500);
    }
});
$(window).on("hashchange", function () {
    if (location.hash === "#flowthread") {
        $("#flowthread").show();
    }
});
// </pre>