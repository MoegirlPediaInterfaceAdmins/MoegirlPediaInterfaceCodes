"use strict";
$(() => {
    const { wgArticleId, wgPageName, wgTitle } = mw.config.get([
        "wgArticleId",
        "wgPageName",
        "wgTitle",
    ]);

    if (wgArticleId === 0) {
        return;
    }

    const publish = async () => {
        try {
            const moveRes = await new mw.Api().postWithToken("csrf", {
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
        wgULS("发布草稿", "發佈草稿"),
    )).on("click", async (e) => {
        e.preventDefault();
        try {
            const confirmed = await OO.ui.confirm(
                wgULS(`确认要将此草稿发布到${wgTitle}吗？`, `確認要將此草稿發佈到${wgTitle}嗎？`),
                { size: "medium" },
            );
            if (!confirmed) {
                return;
            }
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
