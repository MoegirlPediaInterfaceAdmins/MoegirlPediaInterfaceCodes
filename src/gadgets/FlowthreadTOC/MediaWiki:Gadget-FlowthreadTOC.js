/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint-disable no-unused-vars */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
// eslint-disable-next-line no-redeclare
/* global mw, $, OO, moment, Cron, wgUVS */
/* eslint-enable no-unused-vars */
"use strict";
// <pre>
$(function () {
    var toc = $("#toc, #mw-content-text > .mw-parser-output > .toc").first();
    if (toc[0] && mw.config.exists("wgFlowThreadConfig")) { //同时存在Flowthread评论栏和目录的页面，在目录添加Flowthread评论栏链接
        toc.find("li.toclevel-1:last-child").after('<li class="toclevel-1"><a href="#flowthread"><span class="tocnumber">' + (+toc.find("li.toclevel-1 span.tocnumber:last-child").text() + 1) + '</span> <span class="toctext">' + wgUVS("评论区", "評論區") + "</span></a></li>");
    }
});
// </pre>