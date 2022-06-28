"use strict";
// <pre>
$(() => {
    const $simpleSearch = $("#simpleSearch");
    $("input#searchInput").on({
        focus() {
            $simpleSearch.animate({
                width: 339,
            }, 339);
        },
        blur() {
            $simpleSearch.animate({
                width: 226,
            }, 339);
        },
    });
});
// </pre>