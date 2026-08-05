"use strict";
$(() => {
    const { wgArticleId, wgUserName, wgPageName, wgTitle, wgUserGroups, wgScriptPath } = mw.config.get([
        "wgArticleId",
        "wgUserName",
        "wgPageName",
        "wgTitle",
        "wgUserGroups",
        "wgScriptPath",
    ]);

    if (wgArticleId === 0) {
        return;
    }

    const isAutoConfirmed = wgUserGroups.includes("autoconfirmed");
    const enableButton = +mw.user.options.get("gadget-publishDraft", 0) === 1;

    $("#mw-content-text").before(`
        <div class="draft-notice">
            <div class="draft-notice-inner">
                <div class="draft-notice-content">
                    <div class="draft-notice-icon">
                        <img src="https://storage.moegirl.org.cn/moegirl/commons/a/a3/MoeDraft.png!/fw/75" alt="草稿" width="50" height="50">
                    </div>
                    <div class="draft-notice-text">
                        <div class="draft-notice-title">${wgULS("提示：本页面是【", "提示：本頁面是【")}<a href="${location.origin}/${encodeURIComponent(wgTitle)}">${mw.html.escape(wgTitle)}</a>${wgULS("】的草稿", "】的草稿")}</div>
                        <ul>
                            <li>${wgULS("如有疑问，请到", "如有疑問，請到")}<a href="${location.origin}/%E8%90%8C%E5%A8%98%E7%99%BE%E7%A7%91_talk:%E8%AE%A8%E8%AE%BA%E7%89%88/%E6%8F%90%E9%97%AE%E6%B1%82%E5%8A%A9">${wgULS("提问求助区", "提問求助區")}</a>或<a href="${location.origin}/%E8%90%8C%E5%A8%98%E7%99%BE%E7%A7%91_talk:%E8%AE%A8%E8%AE%BA%E7%89%88/%E9%A1%B5%E9%9D%A2%E7%9B%B8%E5%85%B3">${wgULS("页面相关区", "頁面相關區")}</a>${wgULS("进行讨论。", "進行討論。")}</li>
                            <li>${wgULS("如果草稿已经完善，您可以", "如果草稿已經完善，您可以")}${enableButton ? wgULS("点击右侧的按钮", "點擊右側的按鈕") + (isAutoConfirmed ? wgULS("直接", "直接") : wgULS("请求", "請求")) : wgULS("自行", "自行")}${wgULS("发布草稿。", "發佈草稿。")}</li>
                        </ul>
                    </div>
                    ${enableButton
                        ? `
                    <div class="draft-notice-action">
                        <button id="${isAutoConfirmed ? "draft-publish-btn" : "draft-request-btn"}" class="cdx-button cdx-button--action-progressive">${wgULS(isAutoConfirmed ? "发布草稿" : "请求发布", isAutoConfirmed ? "發佈草稿" : "請求發佈")}</button>
                    </div>
                    `
                        : ""}
                </div>
            </div>
        </div>
    `);

    const buildRequestUrl = () => {
        const requestURL = new URL(`${wgScriptPath}/index.php`, location.origin);
        requestURL.searchParams.set("title", "萌娘百科讨论:讨论版/操作申请");
        requestURL.searchParams.set("action", "edit");
        requestURL.searchParams.set("preload", "Template:移动请求预载/draft");
        requestURL.searchParams.set("preloadtitle", `移动请求 - ${wgUserName} - ${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, "0")}.${String(new Date().getDate()).padStart(2, "0")}`);
        requestURL.searchParams.set("dtpreload", "1");
        requestURL.searchParams.set("section", "new");
        requestURL.searchParams.append("preloadparams[]", wgPageName);
        requestURL.searchParams.append("preloadparams[]", wgTitle);
        return requestURL.href;
    };

    if (enableButton) {
        if (isAutoConfirmed) {
            $("#draft-publish-btn").on("click", async () => {
                try {
                    const confirmed = await OO.ui.confirm(
                        wgULS(`确认要将此草稿发布到${wgTitle}吗？`, `確認要將此草稿發佈到${wgTitle}嗎？`),
                        { size: "medium" },
                    );
                    if (!confirmed) {
                        return;
                    }
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
                    mw.notify(wgULS("即将刷新……", "即將刷新……"), {
                        title: wgULS("发布成功", "發佈成功"),
                        type: "success",
                        tag: "lr-publish-draft",
                    });
                    setTimeout(() => location.reload(), 730);
                } catch (e) {
                    if (e === "moderation-move-queued") {
                        return;
                    }
                    console.error("[DraftInfo] Publish error:", e);
                    OO.ui.alert(String(e?.message ?? e ?? ""), {
                        title: wgULS("发布草稿出错", "發佈草稿出錯"),
                    });
                }
            });
        } else {
            $("#draft-request-btn").on("click", () => {
                window.open(buildRequestUrl(), "_blank");
            });
        }
    }
});
