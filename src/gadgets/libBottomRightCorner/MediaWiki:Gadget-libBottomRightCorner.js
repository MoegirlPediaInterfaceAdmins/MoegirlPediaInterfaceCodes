"use strict";
$(() => {
    const body = document.body;
    const bottomRightCorner = $("<div>").attr("id", "bottomRightCorner");
    bottomRightCorner.appendTo(body);
    window.insertToBottomRightCorner = function (text) {
        return $("<div>").text(text).appendTo(bottomRightCorner);
    };
});