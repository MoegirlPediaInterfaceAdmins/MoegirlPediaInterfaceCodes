"use strict";
// <pre>
$(() => {
    const commonsUrl = new mw.Uri("https://commons.moegirl.org.cn/");
    commonsUrl.query.user = mw.config.get("wgPageName").replace(/^user:/i, "");
    commonsUrl.path = "/extensions/Avatar/avatar.php";
    const imgUrl = new mw.Uri(commonsUrl);
    imgUrl.query.user = mw.config.get("wgUserName");
    const img = $("<img>").attr({
        "src": imgUrl,
        title: "上传头像",
    });
    const link = $("<a>").attr("href", "https://commons.moegirl.org.cn/Special:UploadAvatar").append(img);
    $("#pt-userpage").before($('<li id="pt-avatar"></li>').append(link));
    if (mw.config.get("wgNamespaceNumber") === 2 && !mw.config.get("wgPageName").includes("/")) {
        const hrefUrl = new mw.Uri(commonsUrl);
        hrefUrl.path = "/Special:Viewavatar";
        const srcUrl = new mw.Uri(commonsUrl);
        $(".ns-2 #firstHeading").prepend($("<a/>").attr({
            href: hrefUrl,
            title: "查看头像",
        }).prepend($("<img/>").attr({
            "src": srcUrl,
            "id": "user-rootpage-avatar",
        }).css({
            width: "1.2em",
            height: "1.2em",
        })));
    }
});
// </pre>
