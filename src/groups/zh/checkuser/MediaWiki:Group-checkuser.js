/* eslint-disable require-atomic-updates */
"use strict";
(async () => {
    /* 函数定义体 */
    // 一键复制用户名
    function copyUsername() {
        /**
         * @type { HTMLAnchorElement[] }
         */
        const nodes = document.querySelector("#mw-content-text")?.querySelectorAll("a") || [];
        for (const usernameNode of nodes) {
            const uri = new mw.Uri(usernameNode.href);
            let username = decodeURIComponent(uri.path).substring(1);
            if (!/user:/i.test(username)) {
                username = uri.query.title;
            }
            if (!/user:/i.test(username)) {
                break;
            }
            const node = document.createElement("button");
            node.classList.add("copyUsername");
            node.innerText = "复制用户名";
            node.dataset.username = username;
            usernameNode.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(username);
                    node.innerText = "复制成功";
                } catch (e) {
                    console.error("copyUsername", e);
                    node.innerText = "复制失败，请查看控制台";
                } finally {
                    node.dataset.timestamp = Date.now();
                }
            });
        }
        setInterval(() => {
            const now = Date.now();
            for (const node of document.querySelectorAll(".copyUsername[data-timestamp]")) {
                const { dataset: { timestamp } } = node;
                if (now >= +timestamp + 3000) {
                    node.removeAttribute("data-timstamp");
                    node.innerText = "复制用户名";
                }
            }
        }, 1000);
    }
    await Promise.all([
        $.ready,
        mw.loader.using(["mediawiki.Uri"]),
    ]);
    const wgArticleId = mw.config.get("wgArticleId");
    // 一键复制用户名
    if (wgArticleId === 325714) {
        copyUsername();
    }
})();
