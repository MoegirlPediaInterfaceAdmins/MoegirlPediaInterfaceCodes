// [[cm:User:星海子/js/ContentAboveBelowImage.js]]
"use strict";
$(() =>
    $("#mw-imagepage-content")[0] && $(".will2Be2Deleted")[0] ? $("#file").before($("#mw-imagepage-content")) : null,
);
