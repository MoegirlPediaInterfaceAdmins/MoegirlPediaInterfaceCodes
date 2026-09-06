"use strict";
$(() => {
    const { wgArticleId, wgUserName, wgPageName, wgTitle, wgUserGroups, wgScriptPath, wgIsRedirect } = mw.config.get([
        "wgArticleId",
        "wgUserName",
        "wgPageName",
        "wgTitle",
        "wgUserGroups",
        "wgScriptPath",
        "wgIsRedirect",
    ]);

    if (wgArticleId === 0 || wgPageName.startsWith("Draft:沙盒") || document.querySelector(".nsdd") || wgIsRedirect) {
        return;
    }

    const isAutoConfirmed = wgUserGroups.includes("autoconfirmed");
    const enableButton = +mw.user.options.get("gadget-publishDraft", 0) === 1;
    const api = new mw.Api();
    const getRequestTitleSuffix = (userName, now) => ` - ${userName} - ${now.getFullYear()}.${libPrefixNumber(now.getMonth() + 1)}.${libPrefixNumber(now.getDate())}`;

    const getTargetExists = async () => {
        const res = await api.get({
            action: "query",
            titles: wgTitle,
            prop: "info",
            formatversion: 2,
        });
        return !res.query.pages[0].missing;
    };

    const targetExistsPromise = getTargetExists();
    const buildDiscussionNotice = (targetExists) => {
        const buildLink = (title, label, edit = true) => {
            const url = new URL(`${wgScriptPath}/index.php`, location.origin);
            url.searchParams.set("title", title);
            if (edit) {
                url.searchParams.set("action", "edit");
                url.searchParams.set("dtpreload", "1");
                url.searchParams.set("section", "new");
                url.searchParams.set("preloadtitle", `关于[[${wgPageName}]]${getRequestTitleSuffix(wgUserName, new Date())}`);
            }
            return `<a href="${mw.html.escape(`${url.pathname}${url.search}`)}">${label}</a>`;
        };

        const questionLink = buildLink(
            "Project talk:讨论版/提问求助",
            wgULS("提问求助区", "提問求助區"),
        );
        const pageLink = buildLink(
            "Project talk:讨论版/页面相关",
            wgULS("页面相关区", "頁面相關區"),
        );
        const talkLink = targetExists
            ? `或${buildLink(
                mw.Title.newFromText(wgTitle).getTalkPage().getPrefixedText(),
                wgULS("对应页面的讨论页", "對應頁面的討論頁"),
                false,
            )}`
            : "";

        return `${wgULS("如有疑问，请到", "如有疑問，請到")}${questionLink}${targetExists ? "、" : "或"}${pageLink}${talkLink}${wgULS("进行讨论。", "進行討論。")}`;
    };

    $("#mw-content-text").before(`
        <div class="draft-notice">
            <div class="draft-notice-inner">
                <div class="draft-notice-content">
                    <div class="draft-notice-icon">
                        <img src="https://storage.moegirl.org.cn/moegirl/commons/a/a3/MoeDraft.png!/fw/50" srcset="https://storage.moegirl.org.cn/moegirl/commons/a/a3/MoeDraft.png!/fw/75 1.5x, https://storage.moegirl.org.cn/moegirl/commons/a/a3/MoeDraft.png!/fw/100 2x" alt="草稿" width="50" height="50" decoding="async">
                    </div>
                    <div class="draft-notice-text">
                        <div class="draft-notice-title">${wgULS("提示：本页面是【", "提示：本頁面是【")}<a href="/${encodeURIComponent(wgTitle)}">${mw.html.escape(wgTitle)}</a>${wgULS("】的", "】的")}<a href="/%E8%90%8C%E5%A8%98%E7%99%BE%E7%A7%91:%E8%8D%89%E7%A8%BF%E6%96%B9%E9%92%88">${wgULS("草稿", "草稿")}</a></div>
                        <ul>
                            <li id="draft-discussion-notice">${buildDiscussionNotice(false)}</li>
                            <li>${wgULS("如果草稿已经完善，您可以", "如果草稿已經完善，您可以")}${enableButton ? wgULS("使用按钮", "使用按鈕") : wgULS("自行", "自行")}${wgULS("发布草稿。", "發佈草稿。")}</li>
                        </ul>
                    </div>
                    ${enableButton
                        ? `
                    <div class="draft-notice-action">
                        <button id="draft-action-btn" class="cdx-button cdx-button--action-progressive" disabled>${wgULS("检查中…", "檢查中…")}</button>
                    </div>
                    `
                        : ""}
                </div>
            </div>
        </div>
    `);

    (async () => {
        try {
            const targetExists = await targetExistsPromise;
            $("#draft-discussion-notice").html(buildDiscussionNotice(targetExists));
            if (targetExists) {
                return;
            }
            const $targetLink = $(".draft-notice-title > a").first();
            const targetURL = new URL($targetLink.attr("href"), location.origin);
            targetURL.searchParams.set("action", "edit");
            targetURL.searchParams.set("redlink", "1");
            $targetLink.attr("href", `${targetURL.pathname}${targetURL.search}${targetURL.hash}`).addClass("new");
        } catch (e) {
            console.error("[DraftInfo] Failed to resolve target link:", e);
        }
    })();

    if (!enableButton) {
        return;
    }

    const $btn = $("#draft-action-btn");

    const getNonBotContributors = async () => {
        const res = await api.get({
            action: "query",
            titles: wgPageName,
            prop: "contributors",
            pcexcludegroup: "bot",
            pclimit: "2",
            formatversion: 2,
        });
        const contributors = res.query.pages[0]?.contributors;
        if (!Array.isArray(contributors)) {
            throw new Error("[DraftInfo] Failed to get contributors");
        }
        return contributors;
    };

    const requestPreloadConfig = {
        move: {
            preload: "Template:移动请求预载/draft",
            titlePrefix: "移动请求",
        },
        merge: {
            preload: "Template:合并请求预载/draft",
            titlePrefix: "合并请求",
        },
    };

    const buildRequestUrl = (kind) => {
        const { preload, titlePrefix } = requestPreloadConfig[kind];
        const now = new Date();
        const requestTitleSuffix = getRequestTitleSuffix(wgUserName, now);
        const requestURL = new URL(`${wgScriptPath}/index.php`, location.origin);
        requestURL.searchParams.set("title", "萌娘百科讨论:讨论版/操作申请");
        requestURL.searchParams.set("action", "edit");
        requestURL.searchParams.set("preload", preload);
        requestURL.searchParams.set("preloadtitle", `${titlePrefix}${requestTitleSuffix}`);
        requestURL.searchParams.set("dtpreload", "1");
        requestURL.searchParams.set("section", "new");
        requestURL.searchParams.append("preloadparams[]", wgPageName);
        requestURL.searchParams.append("preloadparams[]", wgTitle);
        return `${requestURL.pathname}${requestURL.search}`;
    };

    const openRequest = (kind) => window.open(buildRequestUrl(kind), "_blank");

    const buildConfirmOptions = ({
        acceptLabel,
        acceptFlags = ["primary", "progressive"],
        rejectLabel = wgULS("取消", "取消"),
        rejectFlags = ["safe", "close", "primary"],
    }) => ({
        size: "medium",
        actions: [
            { action: "reject", label: rejectLabel, flags: rejectFlags },
            { action: "accept", label: acceptLabel, flags: acceptFlags },
        ],
    });

    const doMove = async () => {
        const moveConfirmOptions = buildConfirmOptions({
            acceptLabel: wgULS("确认", "確認"),
            acceptFlags: ["progressive"],
        });
        const confirmed = await OO.ui.confirm(wgULS(`发布到：${wgTitle}`, `發佈到：${wgTitle}`), moveConfirmOptions);
        if (!confirmed) {
            return;
        }
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
        mw.notify(wgULS("即将刷新……", "即將重新整理……"), {
            title: wgULS("发布成功", "發佈成功"),
            type: "success",
            tag: "lr-publish-draft",
        });
        setTimeout(() => location.reload(), 730);
    };

    const getLatestRevision = async (title) => {
        const res = await api.get({
            action: "query",
            titles: title,
            prop: "revisions",
            rvprop: "ids|content",
            rvslots: "main",
            rvlimit: "1",
            formatversion: 2,
        });
        const revision = res.query.pages[0]?.revisions?.[0];
        const content = revision?.slots?.main?.content;
        if (!revision || typeof content !== "string") {
            throw new Error(`[DraftInfo] Failed to get latest revision for page “${title}”.`);
        }
        return {
            revid: revision.revid,
            content,
        };
    };

    const doSingleContributorPublish = async () => {
        const [targetRevision, draftRevision] = await Promise.all([
            getLatestRevision(wgTitle),
            getLatestRevision(wgPageName),
        ]);
        const diffURL = mw.util.getUrl(`Special:Diff/${targetRevision.revid}/${draftRevision.revid}`);
        const diffMessage = $("<p>").append(
            document.createTextNode(wgULS("目标页面已存在，且草稿仅由您一人贡献（不计机器人编辑），是否", "目標頁面已存在，且草稿僅由您一人貢獻（不計機器人編輯），是否")),
            $("<b>").text(wgULS("覆盖", "覆蓋")),
            document.createTextNode(wgULS("至目标页面？您可在", "至目標頁面？您可")),
            $("<a>", {
                href: diffURL,
                target: "_blank",
                rel: "noopener",
            }).text(wgULS("在此查看差异", "在此查看差異")),
            document.createTextNode(wgULS("。", "。")),
        );
        const existsConfirmOptions = buildConfirmOptions({
            acceptLabel: wgULS("继续", "繼續"),
            acceptFlags: ["progressive"],
        });
        const existsConfirmed = await OO.ui.confirm(diffMessage, existsConfirmOptions);
        if (!existsConfirmed) {
            return;
        }
        const overwriteMessage = $("<p>").append(
            document.createTextNode(wgULS("确认", "確認")),
            $("<b>").text(wgULS("覆盖", "覆蓋")),
            document.createTextNode(wgULS("至目标页面？", "至目標頁面？")),
        );
        const overwriteConfirmOptions = buildConfirmOptions({
            acceptLabel: wgULS("确认", "確認"),
            acceptFlags: ["destructive"],
            rejectLabel: wgULS("取消", "取消"),
            rejectFlags: ["safe", "close", "primary"],
        });
        const overwriteConfirmed = await OO.ui.confirm(overwriteMessage, overwriteConfirmOptions);
        if (!overwriteConfirmed) {
            return;
        }
        const editRes = await api.postWithToken("csrf", {
            action: "edit",
            assertuser: wgUserName,
            format: "json",
            title: wgTitle,
            text: draftRevision.content,
            summary: `覆盖发布草稿自[[Special:PermanentLink/${draftRevision.revid}]]`,
            baserevid: targetRevision.revid,
            nocreate: true,
            watchlist: "nochange",
            tags: "Automation tool",
        });
        if (Reflect.has(editRes, "error")) {
            throw editRes;
        }
        const flagRes = await api.postWithToken("csrf", {
            action: "edit",
            assertuser: wgUserName,
            format: "json",
            title: wgPageName,
            text: "<noinclude>{{nsdd}}</noinclude>",
            summary: "发布草稿后挂删草稿页面",
            baserevid: draftRevision.revid,
            nocreate: true,
            watchlist: "nochange",
            tags: "Automation tool",
            contentmodel: "wikitext",
        });
        if (Reflect.has(flagRes, "error")) {
            throw flagRes;
        }
        mw.notify(wgULS("即将刷新……", "即將重新整理……"), {
            title: wgULS("发布成功", "發佈成功"),
            type: "success",
            tag: "lr-publish-draft",
        });
        setTimeout(() => location.reload(), 730);
    };

    const handleActionError = (e) => {
        if (e === "moderation-move-queued") {
            return;
        }
        console.error("[DraftInfo] Publish error:", e);
        const errorCode = typeof e === "string" ? e : e?.error?.code ?? e?.error ?? e?.code;
        if (errorCode === "editconflict") {
            OO.ui.alert(wgULS("检测到编辑冲突，已中止。", "檢測到編輯衝突，已中止。"), {
                title: wgULS("发布草稿出错", "發佈草稿出錯"),
            });
            return;
        }
        const errorMessage = e?.error?.info ?? e?.message ?? String(e ?? "");
        OO.ui.alert($("<p>").text(`错误信息：${errorMessage}`), {
            title: wgULS("发布草稿出错", "發佈草稿出錯"),
        });
    };

    const setupSingleContributorPublish = () => {
        $btn.text(wgULS("发布草稿", "發布草稿")).prop("disabled", false).off("click").on("click", async () => {
            try {
                await doSingleContributorPublish();
            } catch (e) {
                handleActionError(e);
            }
        });
    };

    const askMergeRequest = async (isAssistedPublish, contributorInfoError = false) => {
        const mergeMessage = contributorInfoError
            ? wgULS(
                "未能获取草稿的实质贡献者。为避免错误覆盖目标页面，建议刷新页面后重试。您也可以申请合并页面历史，是否要发起合并请求？",
                "未能取得草稿的實質貢獻者。為避免錯誤覆蓋目標頁面，建議重新整理頁面後重試。您也可以申請合併頁面歷史，是否要發起合併請求？",
            )
            : wgULS(
                isAssistedPublish
                    ? "目标页面已存在，且草稿由其他编辑者贡献，您正在代为发布。建议先与该编辑者确认，再申请合并页面历史。是否要发起合并请求？"
                    : "目标页面已存在，且草稿可能有多名实质贡献者，需要合并页面历史。是否要发起合并请求？",
                isAssistedPublish
                    ? "目標頁面已存在，且草稿由其他編輯者貢獻，您正在代為發布。建議先與該編輯者確認，再申請合併頁面歷史。是否要發起合併請求？"
                    : "目標頁面已存在，且草稿可能有多名实质贡献者，需要合併頁面歷史。是否要發起合併請求？",
            );
        const confirmed = await OO.ui.confirm(
            mergeMessage,
            buildConfirmOptions({
                acceptLabel: wgULS("确认", "確認"),
                acceptFlags: ["progressive"],
            }),
        );
        if (confirmed) {
            openRequest("merge");
        }
    };

    (async () => {
        try {
            const targetExists = await targetExistsPromise;

            if (!targetExists) {
                if (isAutoConfirmed) {
                    $btn.text(wgULS("发布草稿", "發佈草稿")).prop("disabled", false).on("click", async () => {
                        try {
                            await doMove();
                        } catch (e) {
                            handleActionError(e);
                        }
                    });
                } else {
                    $btn.text(wgULS("请求发布", "請求發佈")).prop("disabled", false).on("click", () => openRequest("move"));
                }
                return;
            }

            let contributors;
            try {
                contributors = await getNonBotContributors();
            } catch {
                $btn.text(wgULS("请求合并", "請求合併")).prop("disabled", false).on("click", async () => {
                    try {
                        await askMergeRequest(false, true);
                    } catch (error) {
                        handleActionError(error);
                    }
                });
                return;
            }

            if (contributors.length === 0 || contributors.length === 1 && contributors[0].name === wgUserName) {
                setupSingleContributorPublish();
            } else {
                const isAssistedPublish = contributors.length === 1;
                $btn.text(wgULS("请求合并", "請求合併")).prop("disabled", false).on("click", async () => {
                    try {
                        await askMergeRequest(isAssistedPublish);
                    } catch (e) {
                        handleActionError(e);
                    }
                });
            }
        } catch (e) {
            console.error("[DraftInfo] Failed to resolve publish strategy:", e);
            $btn.text(wgULS("请求发布", "請求發佈")).prop("disabled", false).on("click", () => openRequest("move"));
        }
    })();
});
