/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload, wgULS, insertToBottomRightCorner */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
// <pre>
$(function () {
    /**
     * @type {JQuery<HTMLElement>}
     */
    var btn = insertToBottomRightCorner(wgULS("返回顶部", "返回頂部")).attr({
        title: "返回顶部",
        id: "GiveYouUp"
    }).css({
        "user-select": "none",
        transition: "opacity .13s ease-in-out",
        order: "998" // 跳到底部是999
    }).on("click", function () {
        $("html, body").animate({
            scrollTop: 0
        }, 130);
    });
    var $document = $(document);
    $(window).on("scroll", function () {
        btn.css("opacity", $document.scrollTop() > 0 ? ".6" : "0");
    }).trigger("scroll");
});
// </pre>