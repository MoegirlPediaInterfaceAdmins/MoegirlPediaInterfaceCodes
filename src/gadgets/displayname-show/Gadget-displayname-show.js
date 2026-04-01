// <pre>
"use strict";
$(() => {
    /**
     * @type { mw.notification.NotificationOptions }
     */
    const baseNotificationOptions = {
        autoHide: true,
        tag: "Gadget-displayname-show-notification",
        visibleTimeout: false,
    };

    const notify = (message, type = "success") => {
        if (typeof mw.notify === "function") {
            mw.notify(message, { type, ...baseNotificationOptions });
            return;
        }
        alert(message);
    };

    const legacyCopyText = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.append(textArea);
        textArea.select();

        try {
            return document.execCommand("copy");
        } finally {
            textArea.remove();
        }
    };

    const copyText = async (text, label) => {
        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error("Clipboard API unavailable");
            }
            await navigator.clipboard.writeText(text);
            notify(`${label} "${text}" 已复制到剪贴板！`);
        } catch (error) {
            console.error(`复制${label}失败:`, error);
            if (legacyCopyText(text)) {
                notify(`${label} "${text}" 已复制到剪贴板！`);
                return;
            }
            notify(`复制失败，请手动选择文字: ${text}`, "error");
        }
    };

    const createCopyButton = (icon, text, label) => {
        const button = document.createElement("span");
        button.textContent = icon;
        button.style.marginLeft = "2px";
        button.style.cursor = "pointer";
        button.style.fontSize = "0.9em";
        button.title = `复制${label}: ${text}`;
        button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await copyText(text, label);
        });
        return button;
    };

    const buildDisplayText = (userName, userNick) => [userName, userNick].filter(Boolean).join(" | ");

    const { wgAction, wgCanonicalSpecialPageName } = mw.config.get([
        "wgAction",
        "wgCanonicalSpecialPageName",
    ]);
    if (
        wgAction !== "history"
        && wgCanonicalSpecialPageName !== "Contributions"
    ) {
        return;
    }

    if (wgCanonicalSpecialPageName === "Contributions") {
        for (const link of document.querySelectorAll(".mw-contributions-user-tools a")) {
            if (link.nextElementSibling?.tagName === "MOE-BADGES") {
                link.classList.add("mw-userlink");
            }
        }
    }

    const enableCopy = +mw.user.options.get("gadget-displayname-copy", 0) === 1;
    const userLinks = document.querySelectorAll(".mw-userlink");

    for (const userLink of userLinks) {
        const { userName = "", userNick = "" } = userLink.dataset;
        const displayText = buildDisplayText(userName, userNick);

        if (!displayText) {
            continue;
        }

        const children = [...userLink.childNodes].filter((node) => node.nodeType !== Node.TEXT_NODE);
        userLink.textContent = displayText;
        userLink.append(...children);

        if (!enableCopy) {
            continue;
        }

        const buttonsToAppend = [];

        if (userName) {
            buttonsToAppend.push(createCopyButton("👤", userName, "用户名"));
        }

        if (userNick) {
            buttonsToAppend.push(createCopyButton("🏷️", userNick, "昵称"));
        }

        if (buttonsToAppend.length > 0) {
            userLink.after(...buttonsToAppend);
        }
    }
});
// </pre>
