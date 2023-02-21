"use strict";
$(() => {
    if (mw.config.get("wgCanonicalSpecialPageName") === "AbuseFilter" || $("#wpAceFilterEditor")[0]) {
        /*
        if ($("[name=wpFilterDescription][readonly=readonly]")[0]) {
            return;
        }
        */
        const $filterBox = $("#wpAceFilterEditor");
        const filterEditor = ace.edit("wpAceFilterEditor");
        if (typeof ResizeObserver !== "undefined") {
            $filterBox.css("resize", "both");
            new ResizeObserver(() => {
                filterEditor.resize();
            }).observe($filterBox[0]);
        }
    }
});
