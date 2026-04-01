// <pre>
"use strict";
$(() => {
    // for 外显昵称日志
    if (mw.config.get("wgCanonicalSpecialPageName") !== "Log") {
        return;
    }

    const userLinks = document.querySelectorAll(".mw-logevent-loglines .mw-logline-moedisplayname .mw-userlink");
    if (userLinks.length === 0) {
        return;
    }

    // 更新用户链接文本，同时保留徽章等非文本节点
    for (const userLink of userLinks) {
        const userName = userLink.dataset.userName;
        if (!userName) {
            continue;
        }

        const children = [...userLink.childNodes].filter((node) => node.nodeType !== Node.TEXT_NODE);
        userLink.textContent = userName;
        userLink.append(...children);
    }
});
// </pre>
