/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
// <pre>
(function () {
    var magnifierOn = +mw.user.options.get("gadget-userLinkAvatarMagnifier", 0) === 1;
    var $window = $(window);
    var loadingImage = "https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif";
    $window.on("load.UserLinkAvatar", function () {
        var images = [];
        $(".mw-userlink:not(.user-avatar-added)").each(function () {
            var item = $(this);
            var src = mw.config.get("wgServer").replace("zh.moegirl", "commons.moegirl") + mw.config.get("wgScriptPath") + "/extensions/Avatar/avatar.php?user=" + encodeURIComponent(item.text());
            var img = $("<img/>").on("error", function () {
                window.setTimeout(function () {
                    img.closest(".userlink-avatar").remove();
                }, 0);
            }).addClass("userlink-avatar-small").attr({
                "data-src": src,
                src: loadingImage
            });
            images.push(img[0]);
            var bigAvatar = $("<span/>").addClass("userlink-avatar");
            item.prepend(bigAvatar.append(img));
            item.addClass("user-avatar-added");
            if (magnifierOn) {
                var magnifierImg = $("<img/>", {
                    attr: {
                        "data-src": src,
                        src: loadingImage
                    },
                    on: {
                        error: function () {
                            window.setTimeout(function () {
                                magnifierImg.closest(".userlink-avatar-large").remove();
                            }, 0);
                        }
                    }
                });
                images.push(magnifierImg[0]);
                bigAvatar.on("click", function () {
                    window.open(mw.config.get("wgServer").replace("zh.moegirl", "commons.moegirl") + mw.config.get("wgScriptPath") + "/index.php?title=Special%3A查看头像&user=" + encodeURIComponent(item.text()), "_blank");
                    return false;
                }).append($("<div/>", {
                    attr: {
                        "class": "userlink-avatar-large"
                    }
                }).prepend(magnifierImg)).addClass("userlink-avatar-hover");
                item.before(bigAvatar);
                bigAvatar.add(bigAvatar.children()).attr("title", "查看用户" + item.text() + "的头像");
            }
        });
        if (typeof window.lazyload === "function") {
            lazyload(images);
        } else {
            images.forEach(function (ele) {
                ele.src = ele.dataset.src;
            });
        }
    });
    $(function () {
        $window.trigger("load.UserLinkAvatar");
    });
})();
// </pre>