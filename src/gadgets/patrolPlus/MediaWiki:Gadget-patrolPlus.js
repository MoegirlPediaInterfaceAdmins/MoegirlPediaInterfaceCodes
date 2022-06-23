// 开头的判断条件如有更新需要同步到本体里
"use strict";
$(() => {
    if (!["Recentchanges", "Watchlist"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
        return;
    }

    const api = new mw.Api();
    let patrolling = false;
    const list = [];

    let running = false;
    const handlePatroll = async (title, _revid) => api.postWithToken("patrol", {
        action: "patrol",
        format: "json",
        revid: await new Promise((res, rej) => {
            if (typeof _revid !== "number") {
                api.post({
                    action: "query",
                    prop: "revisions",
                    rvprop: "ids",
                    rvlimit: 1,
                    rvdir: "newer",
                    titles: title,
                }).then((data) => {
                    if ("error" in data) {
                        rej(data.error);
                    }
                    else {
                        res(Object.entries(data.query.pages)[0][1].revisions[0].revid);
                    }
                }, (error) => {
                    rej(error);
                });
            }
            else {
                res(_revid);
            }
        }),
    });
    $("abbr.unpatrolled").each((_, ele) => {
        let self = $(ele);
        if (self.closest("tbody").find("tr")[1] && self.closest("tr").index() === 0) {
            return;
        }
        const container = $('<a href="#" class="patrolLink"></a>');
        self.after(container).appendTo(container).before("[").after("]");
        self = container;
        const link = self.closest("li,tr").find('a[href*="diff"]:not([href*="diff=0"])').first();
        let uri, title, revid;
        if (link[0]) {
            uri = new mw.Uri(link.attr("href"));
            title = uri.query.title;
            revid = +uri.query.diff;
        } else {
            uri = new mw.Uri(self.closest("li, tr").find(".mw-changeslist-history").first().attr("href"));
            title = uri.query.title;
        }
        if (!list.includes(title)) {
            list.push(title);
        }
        self.attr({
            "data-title": list.indexOf(title),
            "data-revid": revid,
        });
        self.on("click", async (event) => {
            event.preventDefault();
            if (patrolling) {
                return;
            }
            if (!window.confirm("你确定要标记此编辑为已巡查吗？")) {
                return;
            }
            patrolling = true;
            $("a.patrolLink").not(self).css({
                color: "#aaa",
                "text-decoration": "none",
            });
            const textStatus = $("<span></span>", {
                html: '[<img src="https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;">正在标记中……]',
            });
            self.after(textStatus).hide();
            running = true;
            await handlePatroll(title, revid).then((data) => {
                if ("error" in data) {
                    throw data.error;
                }
                textStatus.text("[标记成功]");
                setTimeout(() => {
                    let global = false;
                    if (typeof revid === "number") {
                        global = confirm("你想将该页面所有之前的编辑标记为已巡查吗？");
                    }
                    window.setTimeout(async () => {
                        textStatus.remove();
                        self.show().replaceWith("");
                        if (global) {
                            running = true;
                            const t = $(`a.patrolLink[data-title="${list.indexOf(title)}"][data-revid]`).filter((_, ele) => {
                                return +ele.dataset.revid < revid;
                            }).toArray();
                            t.forEach((e) => {
                                $(e).after('<img src="https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;">').hide();
                            });
                            for (const { dataset: { revid } } of t) {
                                running = true;
                                try {
                                    await api.postWithToken("patrol", {
                                        action: "patrol",
                                        format: "json",
                                        revid,
                                    });
                                } catch { }
                            }
                            running = false;
                        }
                    }, typeof revid === "number" ? 16 : 3000);
                }, 50);
                patrolling = false;
                $("a.patrolLink").removeAttr("style");
            }, (error) => {
                textStatus.text(`[标记失败：${error instanceof Error ? error.name : error.code}，请在3秒后重试]`);
                window.setTimeout(() => {
                    textStatus.remove();
                    self.show();
                }, 3000);
                patrolling = false;
                $("a.patrolLink").removeAttr("style");
            });
            running = false;
        });
    });

    new Image().src = "https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif";
    $(window).on("beforeunload", () => running ? true : undefined);
});