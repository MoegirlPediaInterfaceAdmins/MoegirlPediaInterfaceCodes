"use strict";
(async () => {
    /* 函数定义体 */
    // 一键复制用户名
    const copyUsername = () => {
        /**
         * @type { HTMLAnchorElement[] }
         */
        const nodes = document.querySelector("#mw-content-text")?.querySelectorAll('a[href*="user:" i]') || [];
        for (const usernameNode of nodes) {
            try {
                const url = new URL(usernameNode.href, location.origin);
                let username = decodeURIComponent(url.pathname).substring(1);
                if (!/user:/i.test(username)) {
                    username = url.searchParams.get("title");
                }
                if (!/user:/i.test(username)) {
                    continue;
                }
                const node = document.createElement("button");
                node.classList.add("copyUsername");
                node.innerText = "复制用户名";
                node.dataset.username = username;
                node.addEventListener("click", async () => {
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
                usernameNode.after(node);
            } catch { }
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
    };

    // 一键复制用户名列表
    const copyUserlist = () => {
        const h3s = [...document.querySelectorAll("#mw-content-text > .mw-parser-output > h3"), document.querySelector("table.navbox")];
        h3s.slice(0, -1).forEach((section, index) => {
            const nextSection = h3s[index + 1];

            const userlist = [];
            for (let ele = section.nextElementSibling; ele && ele !== nextSection; ele = ele.nextElementSibling) {
                const elements = ele.querySelectorAll("li:not(:has( small.checkuser-show)) > a");
                const usernames = Array.from(elements)
                    .map((a) => a.textContent.trim())
                    .filter((text) => text.match(/^user:/i));
                userlist.push(...usernames);
            }

            const $bar = $(section.getElementsByClassName("mw-editsection")[0]);
            const $divider = $('<span class="mw-editsection-divider"> | </span>');
            const $copyButton = $(`<a class="section-username-list" title="共${userlist.length}个用户名">复制用户列表</a>`);
            $bar.find(".mw-editsection-bracket").first().after($divider).after($copyButton);

            let lastClicked = -1;
            $copyButton.on("click", () => {
                navigator.clipboard.writeText(userlist.join("\n"));
                $copyButton.text("复制列表成功");
                lastClicked = Date.now() + 2000 - 2;
                setTimeout(() => {
                    if (Date.now() > lastClicked) {
                        $copyButton.text("复制用户列表");
                    }
                }, 2000);
            });
        });
    };

    await $.ready;
    const wgArticleId = mw.config.get("wgArticleId");
    const wgIsArticle = mw.config.get("wgIsArticle");
    // 一键复制用户名
    if (wgArticleId === 325714 && wgIsArticle) {
        copyUsername();
        copyUserlist();
    }
})();
