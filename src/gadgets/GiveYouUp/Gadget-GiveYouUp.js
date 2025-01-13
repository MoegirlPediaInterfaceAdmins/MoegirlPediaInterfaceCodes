"use strict";
// <pre>
$(() => {
    /**
     * @type {JQuery<HTMLElement>}
     */
    const btn = insertToBottomRightCorner(wgULS("返回顶部", "返回頂部")).attr({
        title: "返回顶部",
        id: "GiveYouUp",
    }).css({
        "user-select": "none",
        transition: "opacity .13s ease-in-out",
        order: "998", // 跳到底部是999
    }).on("click", () => {
        $("html, body").animate({
            scrollTop: 0,
        }, 130);
    });
    const $document = $(document);
    $(window).on("scroll", () => {
        btn.css("opacity", $document.scrollTop() > 0 ? ".6" : "0");
    }).trigger("scroll");
});
// </pre>
