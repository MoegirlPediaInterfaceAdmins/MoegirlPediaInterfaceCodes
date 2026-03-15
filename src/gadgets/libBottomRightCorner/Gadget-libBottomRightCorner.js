"use strict";
$(() => {
    const body = document.body;
    const bottomRightCorner = $("<div>").attr("id", "bottomRightCorner");
    bottomRightCorner.appendTo(body);
    window.insertToBottomRightCorner = (text) => $("<div>").text(text).appendTo(bottomRightCorner);
    /**
     * @type { JQuery<HTMLElement> | undefined }
     */
    let $target;
    switch (mw.config.get("skin")) {
        case "vector-2022":
            $target = $("body > .mw-page-container");
            break;
    }
    if ($target?.length > 0) {
        let nextAnimationFrameTriggered = false;
        $(window).on("resize", () => {
            if (nextAnimationFrameTriggered) {
                return;
            }
            nextAnimationFrameTriggered = true;
            requestAnimationFrame(() => {
                const targetOuterWidth = $target.outerWidth();
                if (typeof targetOuterWidth !== "number") {
                    return;
                }
                const windowWidth = $(window).width();
                if (typeof windowWidth !== "number") {
                    return;
                }
                const right = Math.max((windowWidth - targetOuterWidth) / 2 - 20, 20);
                bottomRightCorner.css("right", `${right}px`);
                nextAnimationFrameTriggered = false;
            });
        }).trigger("resize");
    }
});
