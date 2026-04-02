// <pre>
"use strict";
(() => {
    const container = document.querySelector(".mw-parser-output");
    if (!container) {
        return;
    }

    const links = container.querySelectorAll("a[data-user-nick]");
    for (const a of links) {
        const { userName, userNick } = a.dataset;
        if (!userName || !userNick) {
            continue;
        }

        // 如果链接处于不显示昵称的模式，则跳过
        if (a.closest(".moe-displayname-none")) {
            continue;
        }

        // 判断是否处于同时显示用户名和昵称的模式，管理员强制显示
        const inBothDisplayMode = !!a.closest(".moe-displayname-both")
            && (+mw.user.options.get("gadget-displayname-both", 0) === 1 || mw.config.get("wgUserGroups").includes("sysop"));

        // 定义要替换成的目标文本
        const targetText = inBothDisplayMode
            ? `${userName} | ${userNick}`
            : userNick;

        // 递归替换所有等于 userName 的文本节点
        const replaceTextNodes = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.nodeValue.trim() === userName) {
                    node.nodeValue = targetText;
                }
            } else {
                const children = [...node.childNodes];
                for (const child of children) {
                    replaceTextNodes(child);
                }
            }
        };

        replaceTextNodes(a);
    }
})();
// </pre>
