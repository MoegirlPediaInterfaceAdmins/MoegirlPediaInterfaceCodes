"use strict";
$(() => (async () => {
    const { wgIsArticle, wgUserGroups, wgPageName, wgUserName, wgTitle } = mw.config.get();

    if (!wgIsArticle || !wgUserGroups.includes("sysop") || !$(".mw-category-generated > div")[0]) {
        return;
    }

    // await mw.loader.using(["ext.gadget.site-lib", "mediawiki.util", "mediawiki.api", "ext.gadget.libOOUIDialog"]);

    const deduplicate = (iterable) => [...new Set(iterable).values()];
    const generatePageLinkSelector = (title) => deduplicate([encodeURI(title), mw.util.wikiUrlencode(title)]).map((selector) => `a[href$="/${selector}"]`).join(",");
    // e.stack 可能缺失或只有一行（此时取第二行会抛错），须做防御
    const describeError = (e) => {
        const detail = e instanceof Error && typeof e.stack === "string" ? (e.stack.split("\n")[1] || "").trim() : "";
        return detail ? `${e} ${detail}` : e instanceof Error ? String(e) : JSON.stringify(e);
    };

    const CONTENT_BATCH_SIZE = 500;
    const FLAG_CALL = /\{\{\s*(?:(?:模板|样板|t|模板|template)\s*:\s*)?即将删除\s*(?:\|([^{}]*))?\}\}/i;
    const ARG_SEPARATOR = /\|(?![^[]*\]\])/u;

    const extractFlag = (wikitext) => {
        const args = new Map();
        let index = 1;
        for (const part of (FLAG_CALL.exec(wikitext.replace(/<!--[\s\S]*?-->/g, ""))?.[1] ?? "").split(ARG_SEPARATOR)) {
            const [key, ...value] = part.split("=");
            if (value.length) {
                args.set(key.trim(), value.join("=").trim());
            } else {
                args.set(String(index), part);
                index += 1;
            }
        }
        return { reason: (args.get("1") ?? "").trim(), actor: (args.get("user") ?? "").trim() };
    };

    let globalDeletionLock = false;
    const DELCATS = {
        "zh.moegirl.org.cn": "即将删除的页面",
        "mzh.moegirl.org.cn": "即将删除的页面",
        "commons.moegirl.org.cn": "即将删除的页面",
        "en.moegirl.org.cn": "Pages awaiting deletion",
        "ja.moegirl.org.cn": "削除依頼中のページ",
        "library.moegirl.org.cn": "即将删除的页面",
    };
    // Make sure that all links open in a new tab when locked
    $("body").on("click", "a", (e) => {
        if (!globalDeletionLock) {
            return;
        }
        // Delegated handler: e.currentTarget is the matched <a>, more reliable than closest() from e.target
        const $self = $(e.currentTarget);
        const href = $self.attr("href");
        if (!href) {
            return;
        }
        // Skip the batch deletion button and same-page anchors (href="#...", or any URL resolving
        // to the current page modulo the fragment, e.g. "javascript:"-free relative links);
        // otherwise clicking them while locked opens a new page. Same-page check as suggested
        // by gui-ying233 in #1027
        const target = new URL(href, location.href);
        target.hash = "";
        const current = new URL(location.href);
        current.hash = "";
        if (target.href === current.href || $self.closest("#ca-batdel").length) {
            return;
        }
        window.open(target.href, "_blank");
        return false;
    });

    const api = new mw.Api();
    const $root = $(".mw-category-generated"), $items = $root.find("li");
    const $control = $("<p id='batdel-control'>");
    const $portlet = $(mw.util.addPortletLink("p-cactions", "#", wgULS("批量删除本分类下页面", "批次刪除本分類下頁面"), "ca-batdel", wgULS("批量删除本分类下页面", "批次刪除本分類下頁面"))).addClass("sysop-show"), $portletAnchor = $portlet.find("a");
    const pages = [];

    const fetchLatestContents = async (pageids) => {
        const contents = new Map();
        const fetchChunk = async (ids) => {
            try {
                const { query: { pages: fetchedPages } } = await api.post({
                    action: "query",
                    assertuser: wgUserName,
                    formatversion: 2,
                    prop: "revisions",
                    pageids: ids.join("|"),
                    rvprop: "ids|user|content",
                    rvslots: "main",
                }, { timeout: 120000 });
                for (const { pageid, revisions } of fetchedPages) {
                    const revision = revisions?.[0];
                    if (revision) {
                        contents.set(pageid, { user: revision.user, content: revision.slots?.main?.content ?? "" });
                    }
                }
            } catch (e) {
                // 整批失败（响应过大 / 超时）就二分重试，单页仍失败才放弃
                if (ids.length === 1) {
                    console.warn("[BatchDelete]", e);
                    return;
                }
                const middle = Math.ceil(ids.length / 2);
                await fetchChunk(ids.slice(0, middle));
                await fetchChunk(ids.slice(middle));
            }
        };
        for (let i = 0; i < pageids.length; i += CONTENT_BATCH_SIZE) {
            await fetchChunk(pageids.slice(i, i + CONTENT_BATCH_SIZE));
        }
        return contents;
    };

    // Auto load flag status (for delcats)
    const isDelCat = wgTitle === DELCATS[location.hostname];
    if (isDelCat) {
        globalDeletionLock = true;
        $portletAnchor.text(wgULS("正在加载中……", "正在加載中……"));

        // Find all users with rollback perms (patroller+)
        const trustedUsers = await (async () => {
            const result = [];
            const eol = Symbol();
            let aufrom = undefined;
            while (aufrom !== eol) {
                const _result = await api.post({
                    action: "query",
                    assertuser: wgUserName,
                    list: "allusers",
                    aurights: "rollback",
                    aulimit: "max",
                    aufrom,
                });
                if (_result.continue) {
                    aufrom = _result.continue.aufrom;
                } else {
                    aufrom = eol;
                }
                result.push(..._result.query.allusers.map(({ name }) => name));
            }
            return result;
        })();

        // Query candidate pages in the delcat
        const candidatePages = await (async () => {
            const result = [];
            const eol = Symbol();
            let gcmcontinue = undefined;
            while (gcmcontinue !== eol) {
                const _result = await api.post({
                    action: "query",
                    assertuser: wgUserName,
                    format: "json",
                    generator: "categorymembers",
                    gcmtitle: wgPageName,
                    gcmprop: "ids|title",
                    gcmtype: "page|subcat|file",
                    gcmlimit: "max",
                    gcmcontinue,
                });
                if (_result.continue) {
                    gcmcontinue = _result.continue.gcmcontinue;
                } else {
                    gcmcontinue = eol;
                }
                result.push(...Object.values(_result.query.pages));
            }
            return result.filter(({ title }) => document.querySelector(generatePageLinkSelector(title)));
        })();

        const contents = await fetchLatestContents(candidatePages.map(({ pageid }) => pageid));

        for (const { title, pageid } of candidatePages) {
            const link = $(generatePageLinkSelector(title));
            const fetched = contents.get(pageid);
            if (!fetched) {
                // 取不到源码的链接，留给下面「For unprocessed links」统一标注
                continue;
            }
            const { reason, actor } = extractFlag(fetched.content);
            const isTrusted = Boolean(reason && actor && fetched.user === actor && trustedUsers.includes(actor));
            pages.push({
                title,
                user: actor,
                isTrusted,
                reason,
            });
            if (!reason || !actor) {
                link.addClass("batdel-bypass").prop("target", "_blank").after(`<div class="batdel-error">${wgULS("禁止删除：该次挂删不可靠，请手动检查（挂删模板未给出理由或挂删人）", "禁止刪除：該次掛刪不可靠，請手動檢查（掛刪模板未給出理由或掛刪人）")}</div>`);
                console.warn(`[BatchDelete] ${title} has empty reason or actor`);
            } else if (isTrusted) {
                link.addClass("batdel-checked").after(
                    $("<div>").text(`${wgULS("挂删人", "掛刪人")}：`).append($("<a>").addClass("mw-userlink batdel-bypass").attr("href", `/User:${actor}`).append($("<bdi>").text(actor))),
                    $("<div>").text(`${wgULS("挂删理由", "掛刪理由")}：${reason}`),
                );
            } else {
                link.addClass("batdel-bypass").prop("target", "_blank").after(`<div class="batdel-error">${wgULS("禁止删除：该次挂删不可靠，请手动检查", "禁止刪除：該次掛刪不可靠，請手動檢查")}（${fetched.user !== actor ? wgULS("最后编辑者与挂删人不符", "最後編輯者與掛刪人不符") : wgULS("最后编辑者没有巡查权限", "最後編輯者沒有巡查權限")}）</div>`);
                console.warn(`[BatchDelete] ${title} does not have a trusted flag`);
            }
        }

        // For unprocessed links
        $items.find("a:not(.batdel-bypass, .batdel-checked)").each((_, ele) => {
            const $link = $(ele);
            $link.prop("target", "_blank").after(`<div class="batdel-error">${wgULS("禁止删除：无法获取页面挂删信息", "禁止刪除：無法取得頁面掛刪信息")}</div>`);
            console.warn(`[BatchDelete] ${$link.text()} is not processed`);
        });

        globalDeletionLock = false;

        // Fire hook for userlink gadget
        mw.hook("wikipage.content").fire($(".mw-userlink.batdel-bypass"));
        // Restore portlet link text
        $portletAnchor.text(wgULS("批量删除本分类下页面", "批次刪除本分類下頁面"));
    }

    // Deletion buttons
    $portlet.on("click", (e) => {
        e.preventDefault();
        if ($("#batdel-control")[0] || globalDeletionLock) {
            return;
        }

        // Initialise UI
        const selectedNum = $("<span>0</span>"), totalNum = $("<span>?</span>");
        const toggleSelection = $(`<button>${wgULS("全选/全不选", "全選/全不選")}</button>`),
            runDeletion = $("<button>提交</button>"),
            cancelDeletion = $("<button>取消</button>");
        $control.empty().append([
            `${wgULS("请选择要删除的页面", "請選擇要刪除的頁面")} [`, selectedNum, "/", totalNum, "] ",
            toggleSelection, runDeletion, cancelDeletion,
        ]).prependTo($root);
        $("body").addClass("batdel-body");

        // Add checkboxes
        $items.each((_, ele) =>
            $(ele).prepend($("<input type='checkbox' class='batdel-select'>").prop("disabled", $(ele).find(".batdel-error")[0])),
        ).find(".stub").toggleClass("stub _stub");
        const checkboxes = $items.find(".batdel-select:not(:disabled)");
        totalNum.text(checkboxes.length);
        checkboxes.on("change", () =>
            selectedNum.text(checkboxes.filter(":checked").length),
        );
        $root.children("div").children("p").each((_, ele) => {
            $(`<button class="batdel-controlButton">${wgULS("全选/全不选本类别页面", "全選/全不選本類別頁面")}</button>`).on("click", (e) =>
                $(e.target).closest(".mw-category-generated > div").find(".batdel-select:not(:disabled)").each((_, ele) => $(ele).prop("checked", !ele.checked)).trigger("change"),
            ).appendTo(ele);
        });

        // Functional code for buttons
        toggleSelection.on("click", () => {
            $items.find(".batdel-select:not(:disabled)").each((_, ele) => $(ele).prop("checked", !ele.checked)).trigger("change");
        });
        cancelDeletion.on("click", () => {
            if (globalDeletionLock) {
                return;
            }
            $control.remove();
            $(".batdel-controlButton").remove();
            $root.find("._stub").toggleClass("stub _stub");
            $items.find(".batdel-select").remove();
            $(".batdel-disabled").removeClass("batdel-disabled");
            $("body").removeClass("batdel-body");
        });
        runDeletion.on("click", async () => {
            if (globalDeletionLock || !await oouiDialog.confirm(`${wgULS("您确定要删除这些页面吗？", "您確定要刪除這些頁面嗎？")}（${wgULS("选中了", "選中了")}${$items.find(".batdel-select:checked").length}${wgULS("个页面", "個頁面")}）`, {
                title: wgULS("批量删除分类页面工具", "批次刪除分類頁面工具"),
            })) {
                return;
            }

            let deletionReason = isDelCat
                ? ""
                : await oouiDialog.prompt(`${wgULS("请输入删除理由", "請輸入刪除理由")}`, {
                    title: wgULS("批量删除分类页面工具", "批次刪除分類頁面工具"),
                    size: "medium",
                    required: true,
                });

            // Temporary fix, remove after libOOUIDialog is fixed
            while (!isDelCat && deletionReason === "") {
                deletionReason = await oouiDialog.prompt(`${wgULS("请输入删除理由", "請輸入刪除理由")}`, {
                    title: wgULS("批量删除分类页面工具", "批次刪除分類頁面工具"),
                    size: "medium",
                    required: true,
                });
            }

            if (deletionReason === null) {
                return;
            }
            deletionReason = deletionReason ? `（${deletionReason}）` : "";

            // eslint-disable-next-line require-atomic-updates
            globalDeletionLock = true;

            const $spinner = $('<img src="https://storage.moegirl.org.cn/moegirl/commons/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;">'), $status = $("<span>");

            try {
                $root.find(".batdel-result").remove();
                $root.find(".batdel-select").prop("disabled", true);
                $control.append("<br>", $spinner, $status);
                $root.find("a:not(.batdel-bypass)").each((_, ele) => {
                    const self = $(ele);
                    if (!self.closest("li").find(".batdel-select:checked")[0]) {
                        self.addClass("batdel-disabled");
                    }
                });
                try {
                    $status.text(wgULS("正在删除，已完成删除的页面将会被删除线划去……", "正在刪除，已完成刪除的頁面將會被刪除線划去……"));
                    // Cache deletion results by target title, so that duplicated links pointing to the same page
                    // (e.g. the thumbnail link and the caption link of one gallery item) won't be deleted twice
                    const deletionResults = new Map();
                    for (const ele of $root.find("a").not(".batdel-bypass, .batdel-disabled").toArray()) {
                        const self = $(ele);
                        self.css("margin-right", "1em");
                        const url = new URL(self.prop("href"), location.origin);
                        const target = decodeURIComponent(url.searchParams.has("title") ? url.searchParams.get("title") : url.pathname.replace(/^\//, "")).replace(/_/g, " ");
                        let isDeleted = deletionResults.get(target);
                        const fromCache = isDeleted !== undefined;
                        if (isDeleted === undefined) {
                            const page = pages.filter(({ title }) => title === target)[0];
                            try {
                                await api.postWithToken("csrf", {
                                    action: "delete",
                                    assertuser: wgUserName,
                                    format: "json",
                                    title: target,
                                    tags: "Automation tool",
                                    reason: `批量删除【${wgPageName}】下的页面${isDelCat && page && page.isTrusted && page.reason && page.user ? `（[[User_talk:${page.user}|${page.user}]]的挂删理由：${page.reason} ）` : deletionReason}`,
                                }, {
                                    timeout: 99999,
                                });
                                isDeleted = true;
                            } catch (e) {
                                self.after(`<span class="batdel-result batdel-error"> ${wgULS("删除失败", "刪除失敗")}：${describeError(e)}</span>`);
                                isDeleted = false;
                            }
                            deletionResults.set(target, isDeleted);
                        }
                        if (isDeleted) {
                            self.css("text-decoration", "line-through").after(`<span class="batdel-result batdel-success">${wgULS("删除成功", "刪除成功")}</span>`);
                        } else if (fromCache) {
                            // 详细错误已在首个链接旁展示，重复链接仅补充简短失败标记
                            self.after(`<span class="batdel-result batdel-error"> ${wgULS("删除失败", "刪除失敗")}（${wgULS("同上", "同上")}）</span>`);
                        }
                    }
                    $spinner.remove();
                    $status.addClass("batdel-success").text(wgULS("删除已完成！", "刪除已完成！"));
                } catch (e) {
                    $spinner.remove();
                    $status.text(`${wgULS("发生错误", "發生錯誤")}：${describeError(e)}`);
                }
            } finally {
                // eslint-disable-next-line require-atomic-updates
                globalDeletionLock = false;
            }
        });

        // Prevent default
        return false;
    });
})());
