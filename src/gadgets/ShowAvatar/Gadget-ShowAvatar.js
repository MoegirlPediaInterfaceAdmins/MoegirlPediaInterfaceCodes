"use strict";
// <pre>
$(() => {
    const UploadAvatar = (_, children) => $("<a>", {
        href: "https://commons.moegirl.org.cn/Special:UploadAvatar",
        title: "上传头像",
        target: "_blank",
    }).append(children);
    const ViewAvatar = ({ userName }, children) => {
        const url = new URL("https://commons.moegirl.org.cn/Special:Viewavatar");
        userName && url.searchParams.set("user", userName);
        return $("<a>", {
            href: url.href,
            title: "查看头像",
            target: "_blank",
        }).append(children);
    };

    // Current user avatar
    const currentUserAvatar = mw.config.get("ext.avatar.current_user.thumb_url");
    if (currentUserAvatar) {
        const $img = $("<img>", { src: currentUserAvatar });
        const $avatarLink = UploadAvatar({}, $img);
        const $ptAvatar = $("<li>", { id: "pt-avatar" }).append($avatarLink);
        $("#pt-userpage-2").before($ptAvatar);
    }

    // Page user avatar
    const pageUserAvatar = mw.config.get("ext.avatar.page_user.thumb_url");
    if (pageUserAvatar && !mw.config.get("wgPageName").includes("/")) {
        const $img = $("<img>", { src: pageUserAvatar }).attr({ id: "user-rootpage-avatar" }).css({ width: "1.2em", height: "1.2em" });
        const $avatarLink = ViewAvatar({ userName: mw.config.get("wgTitle") }, $img);
        $("#firstHeading").prepend($avatarLink);
    }
    /*
    if (mw.config.get("wgNamespaceNumber") === 2 && !mw.config.get("wgPageName").includes("/")) {
        const hrefUrl = commonsUrl.clone();
        hrefUrl.path = "/Special:Viewavatar";
        const srcUrl = commonsUrl.clone();
        $(".ns-2 #firstHeading").prepend($("<a/>").attr({
            href: hrefUrl,
            title: "查看头像",
        }).prepend($("<img/>").attr({
            src: srcUrl,
            id: "user-rootpage-avatar",
        }).css({
            width: "1.2em",
            height: "1.2em",
        })));
    }
    */
});
// </pre>
