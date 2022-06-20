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
    var $simpleSearch = $("#simpleSearch");
    $("input#searchInput").on({
        focus: function () {
            $simpleSearch.animate({
                width: 339
            }, 339);
        },
        blur: function () {
            $simpleSearch.animate({
                width: 226
            }, 339);
        }
    });
});
// </pre>