/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
// <pre>
$(function () {
    var container = $("#mw-content-text");
    var getScrollTop = function () {
        var lastH2 = $("#mw-content-text .mw-parser-output h2").last();
        return (lastH2.length > 0 ? lastH2.offset().top : container.offset().top + container.outerHeight()) - 20;
    };
    var scrollTop = getScrollTop();
    setInterval(function () {
        scrollTop = getScrollTop();
    }, 7130);
    /**
     * @type {JQuery<HTMLElement>}
     */
    var btn = insertToBottomRightCorner("跳到底部").attr({
        title: "跳到底部",
        id: "LetYouDown"
    }).css({
        "user-select": "none",
        transition: "opacity .13s ease-in-out",
        order: "999"
    }).on("click", function () {
        $("html, body").animate({
            scrollTop: scrollTop
        }, 130);
    });
    var $document = $(document);
    $(window).on("resize", function () {
        scrollTop = getScrollTop();
    }).on("scroll", function () {
        btn.css("opacity", $document.scrollTop() < scrollTop ? ".6" : "0");
    }).trigger("scroll");
});
// </pre>