"use strict";
(async () => {
    if (mw.config.get("wgNamespaceNumber") === -1) {
        return;
    }

    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const appendRestrictionSection = ($container, action, levels) => {
        if (!Array.isArray(levels) || levels.length === 0) {
            return null;
        }
        const $requestList = $("<ul>");
        $container.append($("<br>"), document.createTextNode(`${mw.msg(action)}：${levels.map((level) => mw.msg(`protect-level-${level}`)).join("、")}`), $requestList);
        return $requestList;
    };
    const buildRequestUrl = ({ title, preload, preloadTitle, preloadParams, scriptPath }) => {
        const requestURL = new URL(`${scriptPath}/index.php`, location.origin);
        requestURL.searchParams.set("action", "edit");
        requestURL.searchParams.set("preload", preload);
        requestURL.searchParams.set("preloadtitle", preloadTitle);
        requestURL.searchParams.set("dtpreload", "1");
        requestURL.searchParams.set("section", "new");
        requestURL.searchParams.set("title", title);
        if (Array.isArray(preloadParams)) {
            preloadParams.forEach((param) => requestURL.searchParams.append("preloadparams[]", param));
        }
        return requestURL.href;
    };
    const appendRequestLink = ($list, { title, preload, preloadTitle, preloadParams, scriptPath, text }) => {
        $("<li>").append($("<a>", {
            href: buildRequestUrl({
                title,
                preload,
                preloadTitle,
                preloadParams,
                scriptPath,
            }),
            target: "_blank",
            "class": "external",
            css: {
                marginLeft: "1em",
            },
            text,
        })).appendTo($list);
    };
    const getRequestTitleSuffix = (userName, now) => ` - ${userName} - ${now.getFullYear()}.${libPrefixNumber(now.getMonth() + 1)}.${libPrefixNumber(now.getDate())}`;
    const getEditRequestPreload = (pageName, basePageName) => wgGetEditRequestPreload(pageName, basePageName);

    await $.ready;

    /**
     * @type { string[] | null }
     */
    const wgRestrictionCreate = mw.config.get("wgRestrictionCreate");
    const { wgRestrictionEdit, wgRestrictionMove, wgPageName, wgUserName, wgScriptPath, skin } = mw.config.get(["wgRestrictionEdit", "wgRestrictionMove", "wgPageName", "wgUserName", "wgScriptPath", "skin"]);

    const protectLevels = new Set();
    if (Array.isArray(wgRestrictionEdit) && wgRestrictionEdit.length > 0) {
        wgRestrictionEdit.forEach((level) => protectLevels.add(`protect-level-${level}`));
        protectLevels.add("edit");
    }
    if (Array.isArray(wgRestrictionMove) && wgRestrictionMove.length > 0) {
        wgRestrictionMove.forEach((level) => protectLevels.add(`protect-level-${level}`));
        protectLevels.add("move");
    }
    if (Array.isArray(wgRestrictionCreate) && wgRestrictionCreate.length > 0) {
        wgRestrictionCreate.forEach((level) => protectLevels.add(`protect-level-${level}`));
        protectLevels.add("create");
    }
    // 有无保护记录统一由 protectLevels 表达，不可裸取 wgRestrictionEdit.length：
    // 不存在的页面（红链等）MW 只设置 wgRestrictionCreate，其余键未设置，
    // mw.config.get 数组形式对未设置的键返回 null，裸取 .length 会抛 TypeError
    const hasProtectionRecord = protectLevels.size > 0;
    // 补充入口（issue #1148）：命名空间保护（MediaWiki:、Widget: 等经 $wgNamespaceProtection 限定）
    // 不产生页面保护记录，仅看 protectLevels 会漏掉。wgIsProbablyEditable 与皮肤"编辑/查看源代码"
    // 标签同源（OutputPage 赋值处注释 "Same test as SkinTemplate"），基于 quickUserCan：
    // - 不含级联保护与 hook 拦截（TitleBlacklist 类），此类页面依旧不显示，与旧行为一致；
    // - 匿名用户无 edit 权限，该值对匿名全站恒 false，须以登录态门控，否则匿名到处见锁
    const notEditable = !!wgUserName && mw.config.get("wgIsProbablyEditable") === false;

    if (!hasProtectionRecord && !notEditable) {
        return;
    }

    let $container;
    switch (skin) {
        case "moeskin": {
            while (Number.MAX_SAFE_INTEGER > Number.MIN_SAFE_INTEGER) {
                if (!document.querySelector(".edit-button-group")) {
                    await sleep(100);
                    continue;
                }
                break;
            }
            $container = $("<div>", {
                "class": "page-info-container",
            });
            $container.prependTo($(document.querySelector("#pagetools-desktop-container .edit-button-group") || document.querySelector("#pagetools-mobile-container .mobile-page-more-actions")));
            break;
        }
        case "vector-2022":
        default: {
            $container = $("<li>", {
                "class": "page-info-container vector-tab-noicon mw-list-item",
            });
            if (skin === "vector-2022") {
                // Vector 2022 在 <640px（min-width-breakpoint-tablet）时整体隐藏 #p-views
                // （PageToolbar.less 的 .vector-page-toolbar-container .mw-portlet-views { display: none }），
                // 此时改挂到任何宽度都可见的命名空间 tab 列表，跨过断点时在两处列表间搬运容器（issue #1133）。
                // 只有 vector-2022 保证存在 #p-associated-pages，其他皮肤不得套用此搬迁逻辑，
                // 否则窄屏首载时容器会因目标缺失而无处挂载（appendTo 空集合不报错、静默无效）
                const $viewsList = $("#p-views .vector-menu-content-list");
                const $associatedPagesList = $("#p-associated-pages .vector-menu-content-list");
                const tabletViewport = window.matchMedia("(min-width: 640px)");
                const placeContainer = () => {
                    $container.appendTo(tabletViewport.matches ? $viewsList : $associatedPagesList);
                };
                placeContainer();
                tabletViewport.addEventListener("change", placeContainer);
            } else {
                $container.appendTo("#p-views .vector-menu-content-list");
            }
            break;
        }
    }

    const { talkPage, basePageName } = libGetPageNames();
    const isDark = document.documentElement.classList.contains("skin-theme-clientpref-night") || document.documentElement.classList.contains("dark");
    const $protectionInfoContainer = $("<a>", {
        "class": "page-info-protection annotation",
    });
    $protectionInfoContainer.appendTo($container);
    $("<img>", {
        src: `/resources/lib/ooui/themes/wikimediaui/images/icons/${isDark ? "lock-invert.svg" : "lock.svg"}`,
        alt: "",
        "aria-hidden": "true",
    }).appendTo($protectionInfoContainer);
    const $protectionInfoContent = $("<div>", {
        "class": "annotation-content",
    });
    if (hasProtectionRecord) {
        const api = new mw.Api();
        try {
            await api.loadMessagesIfMissing(Array.from(protectLevels));
        } catch (error) {
            // 容器构建已提前到本分支之前（旧版在消息加载成功后才创建容器），
            // 失败时须显式移除锁图标，恢复旧版干净降级
            console.warn("[Gadget-pageInfo] Failed to load protection level messages", error);
            $protectionInfoContainer.remove();
            return;
        }
        const intestactionsPromise = api.post({
            action: "query",
            prop: "info",
            titles: wgPageName,
            formatversion: "2",
            intestactions: "edit|move|create",
            intestactionsdetail: "boolean",
        });
        $protectionInfoContent.append($("<b>").text(wgULS("页面受到以下保护：", "頁面受到以下保護：")));
        const $editRequestList = appendRestrictionSection($protectionInfoContent, "edit", wgRestrictionEdit);
        const $moveRequestList = appendRestrictionSection($protectionInfoContent, "move", wgRestrictionMove);
        const $createRequestList = appendRestrictionSection($protectionInfoContent, "create", wgRestrictionCreate);
        $protectionInfoContent.appendTo($protectionInfoContainer);
        $protectionInfoContainer.trigger("mouseout");
        let actions = {};
        try {
            const pageActions = (/** @type {ApiQueryResponse} */ (await intestactionsPromise))?.query?.pages?.[0]?.actions;
            if (pageActions && typeof pageActions === "object") {
                actions = pageActions;
            }
        } catch (error) {
            console.warn("[Gadget-pageInfo] Failed to query intestactions", error);
            actions = {};
        }
        if (wgUserName) {
            const now = new Date();
            const requestTitleSuffix = getRequestTitleSuffix(wgUserName, now);
            if (actions.edit === false && talkPage && $editRequestList) {
                appendRequestLink($editRequestList, {
                    title: talkPage,
                    preload: getEditRequestPreload(wgPageName, basePageName),
                    preloadTitle: `编辑请求${requestTitleSuffix}`,
                    scriptPath: wgScriptPath,
                    text: "提出编辑请求",
                });
            } else {
                $editRequestList?.remove();
            }
            if (actions.move === false && $moveRequestList) {
                appendRequestLink($moveRequestList, {
                    title: "萌娘百科讨论:讨论版/操作申请",
                    preload: "Template:移动请求预载",
                    preloadTitle: `移动请求${requestTitleSuffix}`,
                    preloadParams: [wgPageName],
                    scriptPath: wgScriptPath,
                    text: "提出移动请求",
                });
            } else {
                $moveRequestList?.remove();
            }
            if (actions.create === false && $createRequestList) {
                appendRequestLink($createRequestList, {
                    title: "萌娘百科讨论:讨论版/操作申请",
                    preload: "Template:创建请求预载",
                    preloadTitle: `创建请求${requestTitleSuffix}`,
                    preloadParams: [wgPageName],
                    scriptPath: wgScriptPath,
                    text: "提出创建请求",
                });
            } else {
                $createRequestList?.remove();
            }
        }
    } else {
        // 无保护记录但当前登录用户不可编辑（命名空间保护等）。此时 intestactions 的 edit
        // 也必然无权限（精确检查只会更严于 quickUserCan），不发起查询；
        // "点此查看原因"指向编辑界面，由 MediaWiki 在该处展示无权编辑的具体原因，
        // 按需求在当前标签页打开（不设 target）
        const viewReasonUrl = new URL(`${wgScriptPath}/index.php`, location.origin);
        viewReasonUrl.searchParams.set("title", wgPageName);
        viewReasonUrl.searchParams.set("action", "edit");
        $protectionInfoContent.append($("<b>").text(wgULS("此页面因故无法编辑，", "此頁面因故無法編輯，")), $("<a>", {
            href: viewReasonUrl.href,
            text: wgULS("点此查看原因", "點此查看原因"),
        }));
        if (talkPage) {
            const now = new Date();
            const requestTitleSuffix = getRequestTitleSuffix(wgUserName, now);
            appendRequestLink($("<ul>").appendTo($protectionInfoContent), {
                title: talkPage,
                preload: getEditRequestPreload(wgPageName, basePageName),
                preloadTitle: `编辑请求${requestTitleSuffix}`,
                scriptPath: wgScriptPath,
                text: "提出编辑请求",
            });
        }
        $protectionInfoContent.appendTo($protectionInfoContainer);
        $protectionInfoContainer.trigger("mouseout");
    }
})();
