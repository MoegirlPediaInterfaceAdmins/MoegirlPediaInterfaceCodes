/* eslint-disable require-atomic-updates */
"use strict";
$(() => {
    if (!["Recentchanges", "Watchlist", "Recentchangeslinked"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
        return;
    }

    const api = new mw.Api();
    let running = false;
    const list = [];

    const handlePatroll = async (title, _revid) => await api.postWithToken("patrol", {
        action: "patrol",
        format: "json",
        revid: _revid,
        /* 在L57中更改了获取revid的方式，这段理论上应该不用了
        revid: await (async () => {
            if (typeof _revid !== "number") {
                const data = await api.post({
                    action: "query",
                    prop: "revisions",
                    rvprop: "ids",
                    rvlimit: 1,
                    rvdir: "newer",
                    titles: title,
                });
                if (Reflect.has(data, "error")) {
                    throw data.error;
                }
                return Object.entries(data.query.pages)[0][1].revisions[0].revid;
            }
            return _revid;
        })(),
        */
    });
    const sleep = (t) => new Promise((res) => setTimeout(res, t));
    $("abbr.unpatrolled").each((_, ele) => {
        const self = $(ele);
        if (self.closest("tbody").find("tr")[1] && self.closest("tr").index() === 0) {
            return;
        }
        const container = $('<a href="#" class="patrolLink"></a>');
        self.after(container).appendTo(container).before("[").after("]");
        const link = container.closest("li,tr").find('a[href*="diff"]:not([href*="diff=0"])').first();
        let uri, title, revid;
        if (link[0]) {
            uri = new mw.Uri(link.attr("href"));
            title = uri.query.title;
            revid = +uri.query.diff;
        } else {
            uri = new mw.Uri(container.closest("li, tr").find(".mw-changeslist-history").first().attr("href"));
            title = uri.query.title;
            // 对于创建新页面的编辑直接获取其第一个有data-mw-revid的祖先元素的此数据
            revid = Number(self.closest("[data-mw-revid]").attr("data-mw-revid"));
        }
        if (!list.includes(title)) {
            list.push(title);
        }
        container.attr({
            "data-title": list.indexOf(title),
            "data-revid": revid,
        });
        container.on("click", async (event) => {
            event.preventDefault();
            if (running) {
                return;
            }
            running = true;
            container.addClass("running");
            document.body.classList.add("patrolPlusRunning");
            const textStatus = $("<span></span>", {
                html: '[<img src="https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;">正在标记中……]',
            });
            container.after(textStatus).hide();
            try {
                const data = await handlePatroll(title, revid);
                if (Reflect.has(data, "error")) {
                    throw data.error;
                }
                textStatus.text("[标记成功]");
                setTimeout(() => {
                    textStatus.remove();
                }, 3000);
            } catch (error) {
                textStatus.text(`[标记失败：${error instanceof Error ? error.name : error.code}，请在3秒后重试]`);
                console.error("[patrolPlus]", error);
                await sleep(3000);
                container.show();
                textStatus.remove();
            }
            document.body.classList.remove("patrolPlusRunning");
            container.removeClass("running");
            running = false;
        });
    });

    new Image().src = "https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif";
    $(window).on("beforeunload", () => running ? true : undefined);
});
