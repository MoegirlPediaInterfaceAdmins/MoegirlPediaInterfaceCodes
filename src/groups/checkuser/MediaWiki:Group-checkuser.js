/* eslint-disable require-atomic-updates */
"use strict";
(async () => {
    /* 函数定义体 */
    // 一键复制用户名
    function copyUsername() {
        $('a[href^="/User:" i], a[href*="?title=User:" i], a[href*="&title=User:" i]').after('<button class="copyUsername">复制用户名</button');
        for (const node of document.querySelectorAll(".copyUsername")) {
            node.addEventListener("click", async () => {
                const usernameNode = $(node).prev();
                if (!usernameNode.is("a")) {
                    return;
                }
                const uri = new mw.Uri(usernameNode.attr("href"));
                let text = "";
                if (usernameNode.is('a[href^="/User:" i]')) {
                    text = decodeURIComponent(uri.path).substring(1);
                } else {
                    text = uri.query.title;
                }
                if (text.length > 0 && text.toLowerCase().startsWith("user:")) {
                    try {
                        await navigator.clipboard.writeText(text);
                        node.innerText = "复制成功";
                    } catch (e) {
                        console.error("copyUsername", e);
                        node.innerText = "复制失败，请查看控制台";
                    } finally {
                        node.dataset.timestamp = Date.now();
                    }
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
        });
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
