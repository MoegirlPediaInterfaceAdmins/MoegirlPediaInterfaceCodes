"use strict";
// <pre>
$(() => {
    const instanceRAF = new libRequestAnimationFrame.LibRequestAnimationFrame();
    const container = $("#mw-content-text");
    let scrollTop = 0;
    const getScrollTop = () => {
        const headings = $("#mw-content-text .mw-parser-output > :is(h1, h2)");
        scrollTop = (headings.length >= 3 ? headings.last().offset().top : container.offset().top + container.outerHeight()) - 20;
    };
    setInterval(() => {
        instanceRAF.request(getScrollTop);
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
    const action = () => {
        btn.css("opacity", $document.scrollTop() < scrollTop ? ".6" : "0");
    };
    $(window).on("resize", () => {
        instanceRAF.request(getScrollTop);
    }).trigger("resize").on("scroll", () => {
        instanceRAF.request(action);
    }).trigger("scroll");
});
// </pre>
