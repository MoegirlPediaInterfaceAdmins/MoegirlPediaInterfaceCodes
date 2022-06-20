"use strict";
// <pre>
$(() => {
    const $simpleSearch = $("#simpleSearch");
    $("input#searchInput").on({
        focus: function () {
            $simpleSearch.animate({
                width: 339,
            }, 339);
        },
        blur: function () {
            $simpleSearch.animate({
                width: 226,
            }, 339);
        },
    });
});
// </pre>