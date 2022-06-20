"use strict";
mw.hook("wikipage.collapsibleContent").add(function ($collapsibleContent) {
    var autoCollapseThreshold = 2;
    $collapsibleContent.each(function (_, ele) {
        var $ele = $(ele);
        if ($collapsibleContent.length >= autoCollapseThreshold && $ele.hasClass("autocollapse")) {
            $ele.data("mw-collapsible").collapse();
        } else if ($ele.hasClass("innercollapse") && $ele.closest(".outercollapse").length > 0) {
            $ele.data("mw-collapsible").collapse();
        }
    });
});