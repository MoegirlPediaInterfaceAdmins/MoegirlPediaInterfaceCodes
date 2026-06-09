"use strict";
$(() => {
    const { wgNamespaceNumber, wgArticleId, wgPageName, wgTitle } = mw.config.get([
        "wgNamespaceNumber",
        "wgArticleId",
        "wgPageName",
        "wgTitle",
    ]);

    if (wgNamespaceNumber !== 118 || wgArticleId === 0) {
        return;
    }
    const api = new mw.Api();

    const removeTemplate = async () => {
        const {
            query: {
                pages: [
                    {
                        revisions: [{ content }],
                    },
                ],
            },
        } = await api.post({
            action: "query",
            prop: "revisions",
            rvprop: "content",
            titles: wgPageName,
            formatversion: "2",
        });
        await api.postWithToken("csrf", {
            action: "edit",
            title: wgPageName,
            text: content.replace(/\{\{\s*(?:(?:Template|T|[模样樣]板):)?\s*(草稿|draft)\s*\}\}/gimu, ""),
            summary: "移除{{[[T:Draft|Draft]]}}模板",
            minor: true,
            tags: "Automation tool",
            watchlist: "nochange",
        });
    };

    const publish = async () => {
        try {
            const moveRes = await api.postWithToken("csrf", {
                action: "move",
                from: wgPageName,
                to: wgTitle,
                reason: "发布草稿",
                noredirect: true,
                watchlist: "nochange",
                tags: "Automation tool",
            });
            if (Reflect.has(moveRes, "error")) {
                throw moveRes;
            }
        } catch (e) {
            if (e !== "moderation-move-queued") {
                throw e;
            }
        }
    };

    $(mw.util.addPortletLink(
        "p-cactions",
        "#",
        wgULS("发布草稿", "發佈草稿"),
        "ca-lr-publish-draft",
        wgULS("将草稿发布到主命名空间", "將草稿發佈到主命名空間"),
    )).on("click", async (e) => {
        e.preventDefault();
        try {
            const confirmed = await OO.ui.confirm(
                wgULS("确认要将此草稿发布到主命名空间吗？", "確認要將此草稿發佈到主命名空間嗎？"),
                { size: "medium" },
            );
            if (!confirmed) {
                return;
            }
            await removeTemplate();
            await publish();
            mw.notify(wgULS("即将刷新……", "即將刷新……"), {
                title: wgULS("发布成功", "發佈成功"),
                type: "success",
                tag: "lr-publish-draft",
            });
            setTimeout(() => location.reload(), 730);
        } catch (e) {
            console.error("[PublishDraft] Error:", e);
            OO.ui.alert(String(e?.message ?? e ?? ""), {
                title: wgULS("发布草稿出错", "發佈草稿出錯"),
            });
        }
    });
});
