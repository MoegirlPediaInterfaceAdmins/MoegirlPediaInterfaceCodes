"use strict";
// <pre>
$(() => {
    if (!$(".heimu, .colormu")[0] || $("#heimu_toggle")[0]) {
        return;
    }
    $(".colormu").each(function () {
        this.dataset.backgroundColor = $(this).css("background-color");
    });
    const $body = $("body");
    const btn = insertToBottomRightCorner(wgULS("半隐黑幕", "半隱黑幕")).attr("id", "heimu_toggle").css({
        "user-select": "none",
        order: "50",
    });
    btn.on("click", () => {
        btn.text($("body.heimu_toggle_on")[0] ? wgULS("半隐黑幕", "半隱黑幕") : wgULS("隐藏黑幕", "隱藏黑幕"));
        $body.toggleClass("heimu_toggle_on");
        $(".colormu").each(function () {
            const $thisColormu = $(this);
            if ($thisColormu.hasClass("colormu_toggle_on")) {
                $thisColormu.removeClass("colormu_toggle_on");
                $thisColormu.css("background-color", this.dataset.backgroundColor);
            } else {
                $thisColormu.addClass("colormu_toggle_on");
                $thisColormu.css("background-color", this.dataset.backgroundColor.replace(/\brgb\(([^)]+)\)/, "rgba($1, .17)").replace(/\brgba\((\d+,\s*\d+,\s*\d+),\s*\d+(?:\.\d+)?\)/, "rgba($1, .17)"));
            }
        });
    });
    if (+mw.user.options.get("gadget-HeimuToggleDefaultOn", 0) === 1) {
        btn.trigger("click");
    }
});
// </pre>