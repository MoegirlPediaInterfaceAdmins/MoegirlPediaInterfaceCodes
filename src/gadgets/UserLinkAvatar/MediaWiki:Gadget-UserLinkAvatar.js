/**
 * TODO: 悬浮大头像功能暂时还没做，暂未提供大头像的链接
 */

"use strict";
// <pre>
$(() => {
    const DEFAULT_AVATAR = "https://img.moegirl.org.cn/moehime.jpg";
    const userLinks = document.querySelectorAll(".mw-userlink[data-user-avatar]");
    /**
     * @param {HTMLElement} el
     */
    const checkIfAvatarLoaded = (el) => typeof el.dataset.userAvatarLoaded !== "undefined";

    /**
     * @param {HTMLAnchorElement} target
     */
    const attachAvatarToUserLink = (target) => {
        if (checkIfAvatarLoaded(target)) {
            return;
        }
        const userName = decodeURI(target.getAttribute("href").split(":").pop());
        const avatar = target.dataset.userAvatar;

        const avatarLink = document.createElement("a");
        const img = document.createElement("img");

        img.loading = "lazy";
        img.src = avatar;
        img.alt = `${userName}的头像`;
        img.classList.add("userlink-avatar-small");
        img.addEventListener("error", () => {
            if (img.src !== DEFAULT_AVATAR) {
                img.src = DEFAULT_AVATAR;
            } else {
                avatarLink.remove();
            }
        });

        avatarLink.href = `https://commons.moegirl.org.cn/Special:ViewAvatar?user=${userName}`;
        avatarLink.target = "_blank";
        avatarLink.title = "查看头像";
        avatarLink.appendChild(img);
        avatarLink.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        target.insertAdjacentElement("beforebegin", avatarLink);
        target.dataset.userAvatarLoaded = "1";

        return avatarLink;
    };

    userLinks.forEach(attachAvatarToUserLink);
});
// </pre>
