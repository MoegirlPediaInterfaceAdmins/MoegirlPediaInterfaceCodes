"use strict";
$(() => {
    const body = document.body;
    const bottomRightCorner = $("<div>").attr("id", "bottomRightCorner");
    bottomRightCorner.appendTo(body);
    window.insertToBottomRightCorner = (text) => $("<div>").text(text).appendTo(bottomRightCorner);
});
