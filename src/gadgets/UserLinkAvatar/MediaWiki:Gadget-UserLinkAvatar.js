"use strict";
// <pre>
(function () {
    const magnifierOn = +mw.user.options.get("gadget-userLinkAvatarMagnifier", 0) === 1;
    const $window = $(window);
    const loadingImage = "https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif";
    $window.on("load.UserLinkAvatar", () => {
        const images = [];
        $(".mw-userlink:not(.user-avatar-added)").each(function () {
            const item = $(this);
            const src = `${mw.config.get("wgServer").replace("zh.moegirl", "commons.moegirl") + mw.config.get("wgScriptPath") }/extensions/Avatar/avatar.php?user=${ encodeURIComponent(item.text())}`;
            var img = $("<img/>").on("error", () => {
                window.setTimeout(() => {
                    img.closest(".userlink-avatar").remove();
                }, 0);
            }).addClass("userlink-avatar-small").attr({
                "data-src": src,
                src: loadingImage,
            });
            images.push(img[0]);
            const bigAvatar = $("<span/>").addClass("userlink-avatar");
            item.prepend(bigAvatar.append(img));
            item.addClass("user-avatar-added");
            if (magnifierOn) {
                var magnifierImg = $("<img/>", {
                    attr: {
                        "data-src": src,
                        src: loadingImage,
                    },
                    on: {
                        error: function () {
                            window.setTimeout(() => {
                                magnifierImg.closest(".userlink-avatar-large").remove();
                            }, 0);
                        },
                    },
                });
                images.push(magnifierImg[0]);
                bigAvatar.on("click", () => {
                    window.open(`${mw.config.get("wgServer").replace("zh.moegirl", "commons.moegirl") + mw.config.get("wgScriptPath") }/index.php?title=Special%3A查看头像&user=${ encodeURIComponent(item.text())}`, "_blank");
                    return false;
                }).append($("<div/>", {
                    attr: {
                        "class": "userlink-avatar-large",
                    },
                }).prepend(magnifierImg)).addClass("userlink-avatar-hover");
                item.before(bigAvatar);
                bigAvatar.add(bigAvatar.children()).attr("title", `查看用户${ item.text() }的头像`);
            }
        });
        if (typeof window.lazyload === "function") {
            lazyload(images);
        } else {
            images.forEach((ele) => {
                ele.src = ele.dataset.src;
            });
        }
    });
    $(() => {
        $window.trigger("load.UserLinkAvatar");
    });
})();
// </pre>