/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint-disable no-unused-vars */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
// eslint-disable-next-line no-redeclare
/* global mw, $, OO, moment, Cron */
/* eslint-enable no-unused-vars */
"use strict";
$(function () {
    var body = document.body;
    var bottomRightCorner = $("<div>").attr("id", "bottomRightCorner");
    bottomRightCorner.appendTo(body);
    window.insertToBottomRightCorner = function (text) {
        return $("<div>").text(text).appendTo(bottomRightCorner);
    };
});