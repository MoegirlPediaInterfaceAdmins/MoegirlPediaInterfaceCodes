"use strict";
$(() => {
    if (!$(".heimu, .colormu")[0] || $("#heimu_toggle")[0]) {
        return;
    }
    $(".colormu").each((_, ele) => {
        ele.dataset.backgroundColor = $(ele).css("background-color");
    });
    const $body = $("body");
    const btn = insertToBottomRightCorner(wgULS("半隐黑幕", "半隱黑幕")).attr("id", "heimu_toggle").css({
        "user-select": "none",
        order: "50",
    });
    btn.on("click", () => {
        btn.text($("body.heimu_toggle_on")[0] ? wgULS("半隐黑幕", "半隱黑幕") : wgULS("隐藏黑幕", "隱藏黑幕"));
        $body.toggleClass("heimu_toggle_on");
        // 通知其他小工具（如全站 JS 的外链确认与黑幕点击联动）半隐状态已切换，
        // 参数为切换后的状态；mw.hook 会对晚注册的监听重放，与加载顺序无关
        mw.hook("heimu_toggle").fire($body.hasClass("heimu_toggle_on"));
        $(".colormu").each((_, ele) => {
            const $thisColormu = $(ele);
            if ($thisColormu.hasClass("colormu_toggle_on")) {
                $thisColormu.removeClass("colormu_toggle_on");
                $thisColormu.css("background-color", ele.dataset.backgroundColor);
            } else {
                $thisColormu.addClass("colormu_toggle_on");
                $thisColormu.css("background-color", ele.dataset.backgroundColor.replace(/\brgb\(([^)]+)\)/, "rgba($1, .17)").replace(/\brgba\((\d+,\s*\d+,\s*\d+),\s*\d+(?:\.\d+)?\)/, "rgba($1, .17)"));
            }
        });
    });
    if (+mw.user.options.get("gadget-HeimuToggleDefaultOn", 0) === 1) {
        btn.trigger("click");
    }
});
