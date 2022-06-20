/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
// <pre>
$(function () {
    var commonsUrl = new mw.Uri(mw.config.get("wgServer").replace("zh.moegirl", "commons.moegirl") + mw.config.get("wgScriptPath") + "/");
    commonsUrl.query.user = mw.config.get("wgPageName").replace(/^user:/i, "");
    commonsUrl.path = "/extensions/Avatar/avatar.php";
    var imgUrl = new mw.Uri(commonsUrl);
    imgUrl.query.user = mw.config.get("wgUserName");
    var img = $("<img>").attr("src", imgUrl);
    var link = $("<a>").attr("href", mw.config.get("wgServer").replace("zh.moegirl", "commons.moegirl") + "/Special:UploadAvatar").append(img);
    $("#pt-userpage").before($('<li id="pt-avatar"></li>').append(link));
    if (mw.config.get("wgNamespaceNumber") === 2 && !mw.config.get("wgPageName").includes("/")) {
        var hrefUrl = new mw.Uri(commonsUrl);
        hrefUrl.path = "/Special:Viewavatar";
        var srcUrl = new mw.Uri(commonsUrl);
        $(".ns-2 #firstHeading").prepend($("<a/>").attr({
            href: hrefUrl,
            title: "查看头像"
        }).prepend($("<img/>").attr("src", srcUrl).css({
            width: "1.2em",
            height: "1.2em",
            "border-radius": "10px",
            padding: "4px"
        })));
    }
});
// </pre>