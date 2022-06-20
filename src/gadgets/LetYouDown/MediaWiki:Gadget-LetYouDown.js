"use strict";
// <pre>
$(() => {
    const container = $("#mw-content-text");
    const getScrollTop = function () {
        const lastH2 = $("#mw-content-text .mw-parser-output h2").last();
        return (lastH2.length > 0 ? lastH2.offset().top : container.offset().top + container.outerHeight()) - 20;
    };
    let scrollTop = getScrollTop();
    setInterval(() => {
        scrollTop = getScrollTop();
    }, 7130);
    /**
     * @type {JQuery<HTMLElement>}
     */
    const btn = insertToBottomRightCorner("跳到底部").attr({
        title: "跳到底部",
        id: "LetYouDown",
    }).css({
        "user-select": "none",
        transition: "opacity .13s ease-in-out",
        order: "999",
    }).on("click", () => {
        $("html, body").animate({
            scrollTop: scrollTop,
        }, 130);
    });
    const $document = $(document);
    $(window).on("resize", () => {
        scrollTop = getScrollTop();
    }).on("scroll", () => {
        btn.css("opacity", $document.scrollTop() < scrollTop ? ".6" : "0");
    }).trigger("scroll");
});
// </pre>