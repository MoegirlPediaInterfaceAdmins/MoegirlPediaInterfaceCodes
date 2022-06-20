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
    if ($(".mw-editsection")[0] && !$("#template-documentation, .template-documentation")[0]) {
        $("#ca-edit").after('<li id="ca-editTopSection"><span class="mw-editsection"><a href="' + $("#ca-edit a").attr("href") + '&section=0" title="编辑本页序言">编辑序言</a><span class="mw-editsection-bracket"></span></span></li>');
    }
});
// </pre>