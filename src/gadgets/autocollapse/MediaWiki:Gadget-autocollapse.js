"use strict";
mw.hook("wikipage.collapsibleContent").add(($collapsibleContent) => {
    const autoCollapseThreshold = 2;
    $collapsibleContent.each((_, ele) => {
        const $ele = $(ele);
        if ($collapsibleContent.length >= autoCollapseThreshold && $ele.hasClass("autocollapse")) {
            $ele.data("mw-collapsible").collapse();
        } else if ($ele.hasClass("innercollapse") && $ele.closest(".outercollapse").length > 0) {
            $ele.data("mw-collapsible").collapse();
        }
    });
});
