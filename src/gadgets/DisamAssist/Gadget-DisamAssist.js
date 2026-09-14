/* eslint-disable no-loop-func, no-use-before-define, promise/prefer-await-to-then */
"use strict";
$(() => {
    const { wgArticlePath, wgScript, wgPageName, wgAction, wgCategories } = mw.config.get();
    const api = new mw.Api();

    /**
     * 默认偏好设置。用户可在个人 JS 中按需覆盖任意项，其余沿用默认值，例如：
     *     window.DisamAssistPreferences = { radius: 1000, skipRedirects: false };
     * @type {Object}
     */
    const defaultPreferences = {
        // 只处理这些命名空间页面的入链（参见[[Help:命名空间]]）
        targetNamespaces: [0, 4, 10, 12, 14, 118],
        // 单次抓取的入链数，'max' 为服务端上限；超出时会自动翻页
        backlinkLimit: "max",
        // 单次批量加载的来源页面数（上限 50，调大可减少请求次数）
        queryTitleLimit: 1,
        // 单次获取重定向的页面数（上限 50，调大可减少请求次数）
        redirectTitleLimit: 1,
        // 上下文条中链接前后各截取的字符数
        radius: 600,
        // 上下文条的最小高度（行）
        numContextLines: 6,
        // 是否保留源代码中的换行
        preserveLineBreaks: false,
        // 待提交改动在内存中保留的数量，即撤销深度
        historySize: 5,
        // 来源页面是重定向页时跳过不处理（重定向页的内链不宜改动）
        skipRedirects: true,
        // 编辑对监视列表的影响：'watch' / 'unwatch' / 'preferences' / 'nochange'
        watch: "nochange",
    };

    // 编辑冷却秒数。固定值，不开放配置：有 bot 权限者不受限，其余一律按此间隔提交
    const editCooldown = 20;

    let cfg = {};
    let startLink, ui;
    let links, pageChanges;
    let currentPageTitle, currentPageParameters, currentLink;
    let forceSamePage = false;
    let running = false;
    let choosing = false;
    let displayedPages = new Set();
    let pageCache = {};
    let prefetchInProgress = false;
    let editCount = 0;
    let editLimit;
    const pendingSaves = [];
    let pendingEditBox = null;
    let pendingEditBoxText;
    let lastEditMillis = 0;
    let runningSaves = false;
    const inFlightSaves = new Map();
    let sessionSequence = 0;
    let activeSession = 0;
    let unloadConfirmRegistered = false;

    const isSessionActive = (session) => running && session === activeSession;

    /**
     * 入口函数：检查当前页面是否为消歧义页面，并添加工具启动链接。
     */
    const install = () => {
        cfg = { ...defaultPreferences, ...window.DisamAssistPreferences };
        if (wgAction === "view" && wgCategories.includes("消歧义页")) {
            if (wgPageName.endsWith("(消歧义页)")) {
                const startMainLink = $(
                    mw.util.addPortletLink(
                        "p-cactions",
                        "#",
                        wgULS("清理链接至主题的链接", "清理連結至主題的連結"),
                        "ca-disamassist-main",
                    ),
                ).click((event) => {
                    event.preventDefault();
                    startMain();
                });
                const startSameLink = $(
                    mw.util.addPortletLink(
                        "p-cactions",
                        "#",
                        wgULS("清理链接至消歧义页的链接", "清理連結至消歧義頁的連結"),
                        "ca-disamassist-same",
                    ),
                ).click((event) => {
                    event.preventDefault();
                    startSame();
                });
                startLink = startMainLink.add(startSameLink);
            } else {
                startLink = $(
                    mw.util.addPortletLink("p-cactions", "#", wgULS("消歧义", "消歧義"), "ca-disamassist-page"),
                ).click((event) => {
                    event.preventDefault();
                    start();
                });
            }
        }
    };

    /**
     * 启动工具，显示界面并开始查找需要修复的链接。
     */
    const start = async () => {
        if (!running) {
            const session = ++sessionSequence;
            activeSession = session;
            running = true;
            links = [];
            pageChanges = [];
            displayedPages = new Set();
            pageCache = {};
            prefetchInProgress = false;
            createUI();
            addUnloadConfirm();
            markDisamOptions(session);
            await checkEditLimit(session);
            if (!isSessionActive(session)) {
                return;
            }
            togglePendingEditBox(false);
            doPage(session);
        }
    };

    /**
     * 启动 DisamAssist，将指向当前页面的入链进行消歧义处理，不考虑页面标题。
     */
    const startSame = () => {
        forceSamePage = true;
        start();
    };

    /**
     * 启动 DisamAssist：如果页面标题以“ (disambiguation)”结尾，则处理指向主题条目的链接；否则处理指向当前页面的链接。
     */
    const startMain = () => {
        forceSamePage = false;
        start();
    };

    /**
     * 创建并显示用户界面。
     */
    const createUI = () => {
        ui = {
            display: $("<div></div>").addClass("disamassist-box disamassist-mainbox"),
            finishedMessage: $("<div></div>")
                .addClass("disamassist-finished")
                .text(wgULS("没有需要消歧义的链接了。", "沒有需要消歧義的連結了。"))
                .hide(),
            pageTitleLine: $("<span></span>").addClass("disamassist-pagetitleline"),
            pendingEditCounter: $("<div></div>").addClass("disamassist-editcounter"),
            // 上下文区用 CSS 保证至少 cfg.numContextLines 行高，不必再插入 <br> 占位
            context: $("<span></span>")
                .addClass("disamassist-context")
                .toggleClass("disamassist-preserve-linebreaks", cfg.preserveLineBreaks)
                .css("--disamassist-context-lines", cfg.numContextLines),
            undoButton: createButton(wgULS("复原", "復原"), undo),
            omitButton: createButton(wgULS("跳过", "跳過"), omit),
            endButton: createButton(wgULS("关闭", "關閉"), saveAndEnd),
            refreshButton: createButton("重新整理", refresh),
            titleAsTextButton: createButton(wgULS("链接到其它页面", "連結到其它頁面"), chooseTitleFromPrompt),
            removeLinkButton: createButton(wgULS("移除内链", "移除內鏈"), chooseLinkRemoval),
        };
        const top = $("<div></div>")
            .addClass("disamassist-top")
            .append([ui.pageTitleLine, ui.finishedMessage, ui.pendingEditCounter]);
        const leftButtons = $("<div></div>")
            .addClass("disamassist-leftbuttons")
            .append([ui.titleAsTextButton, ui.removeLinkButton, ui.omitButton]);
        const rightButtons = $("<div></div>")
            .addClass("disamassist-rightbuttons")
            .append([ui.undoButton, ui.refreshButton, ui.endButton]);
        const allButtons = $("<div></div>").addClass("disamassist-allbuttons").append([leftButtons, rightButtons]);
        ui.display.append([top, ui.context, allButtons]);
        updateEditCounter();
        toggleActionButtons(false);
        // Insert the UI in the page
        $("#mw-content-text").before(ui.display);
        ui.display.hide().fadeIn();
    };

    /**
     * 关闭页面前，如果存在待处理的更改则显示确认提示。
     * @returns {string|undefined} 需要显示的关闭确认消息；没有待处理编辑时返回 `undefined`。
     */
    const unloadConfirmHandler = () => {
        if (running && checkActualChanges()) {
            return wgULS(
                "存在尚未保存的编辑。如欲保存，请按“关闭”。",
                "存在尚未保存的編輯。如欲保存，請按“關閉”。",
            );
        } else if (editCount !== 0) {
            return wgULS(
                "DisamAssist正在提交编辑。如果您将该页面关闭，可能会丢失您的编辑。",
                "DisamAssist正在提交編輯。如果您將該頁面關閉，可能會遺失您的編輯。",
            );
        }
    };

    const addUnloadConfirm = () => {
        if (!unloadConfirmRegistered) {
            $(window).on("beforeunload", unloadConfirmHandler);
            unloadConfirmRegistered = true;
        }
    };

    /**
     * 标记消歧义页面中的候选条目。
     */
    const markDisamOptions = (session) => {
        const optionPageTitles = [];
        const optionMarkers = [];
        getDisamOptions().each(function () {
            const link = $(this);
            const title = extractPageName(link);
            const optionMarker = $("<a></a>")
                .attr("href", "#")
                .addClass("disamassist-optionmarker")
                .text(wgULS(" [链接至此处]", " [連結至此處]"))
                .click((ev) => {
                    ev.preventDefault();
                    chooseReplacement(title);
                });
            link.after(optionMarker);
            optionMarkers.push(optionMarker);
            optionPageTitles.push(title);
        });
        // Now check the disambiguation options and display a different message for those that are
        // actually the same as the target page where the links go, as choosing those options doesn't really
        // accomplish anything (except bypassing redirects, which might be useful in some cases)
        const targetPage = getTargetPage();
        fetchRedirects(optionPageTitles.concat(targetPage))
            .done((redirects) => {
                if (!isSessionActive(session)) {
                    return;
                }
                const endTargetPage = resolveRedirect(targetPage, redirects);
                optionPageTitles.forEach((optionTitle, ii) => {
                    const endOptionTitle = resolveRedirect(optionTitle, redirects);
                    if (isSamePage(optionTitle, targetPage)) {
                        optionMarkers[ii]
                            .text(wgULS(" [当前目标]", " [當前目標]"))
                            .addClass("disamassist-curroptionmarker");
                    } else if (isSamePage(endOptionTitle, endTargetPage)) {
                        optionMarkers[ii]
                            .text(wgULS(" [当前目标的重定向]", " [當前目標的重新導向]"))
                            .addClass("disamassist-curroptionmarker");
                    }
                });
            })
            .fail((description) => {
                if (isSessionActive(session)) {
                    error(description);
                }
            });
    };

    /**
     * 检查当前用户是否受编辑冷却限制：有 bot 权限者不受限，其余一律受限。
     * @returns {Promise<void>} 检查完成后 resolve。
     */
    const checkEditLimit = async (session) => {
        try {
            const rights = await mw.user.getRights();
            if (isSessionActive(session)) {
                editLimit = !rights.includes("bot");
            }
        } catch (code) {
            if (isSessionActive(session)) {
                error(wgULS('无法获取用户权限："$1",', '無法取得使用者權限："$1",').replace("$1", code));
                editLimit = true;
            }
        }
    };

    /**
     * 查找单个来源页面中指向消歧义页面的所有入链，并逐一请求用户处理。
     */
    const doPage = (session) => {
        if (!isSessionActive(session)) {
            return;
        }
        if (pageChanges.length > cfg.historySize) {
            applyChange(pageChanges.shift());
        }
        if (links.length === 0) {
            const targetPage = getTargetPage();
            getBacklinks(targetPage)
                .done((backlinks, pageTitles) => {
                    if (!isSessionActive(session)) {
                        return;
                    }
                    // 已排队保存的页面这一轮不再重复处理：其编辑尚未落盘，
                    // 入链列表里它仍指向消歧义页，重复处理会排出第二次编辑并造成编辑冲突
                    const pendingTitles = new Set(pendingSaves.map(({ args: [title] }) => title));
                    for (const title of inFlightSaves.keys()) {
                        pendingTitles.add(title);
                    }
                    const baseDestinations = [targetPage];
                    $.each(pageTitles, (_, t) => {
                        if (t !== targetPage && removeDisam(t) !== targetPage) {
                            baseDestinations.push(t);
                        }
                    });
                    buildVariantLookupTable(
                        [...new Set(baseDestinations)],
                        () => {
                            if (!isSessionActive(session)) {
                                return;
                            }
                            links = [...new Set(backlinks)].filter(
                                (title) => !displayedPages.has(title) && !pendingTitles.has(title),
                            );
                            if (links.length === 0) {
                                updateContext();
                            } else {
                                prefetchNextBatch(() => doPage(session), session);
                            }
                        },
                        session,
                    );
                })
                .fail((description) => {
                    if (isSessionActive(session)) {
                        error(description);
                    }
                });
        } else {
            currentPageTitle = links.shift();
            displayedPages.add(currentPageTitle);
            toggleActionButtons(false);

            const cachedPage = pageCache[currentPageTitle];
            if (cachedPage) {
                Reflect.deleteProperty(pageCache, currentPageTitle);
                currentPageParameters = cachedPage;
                currentLink = null;

                const cacheSize = Object.keys(pageCache).length;
                if (cacheSize <= 1 && links.length > 0) {
                    prefetchNextBatch(undefined, session);
                }

                startPage(session);
            } else {
                // Cache miss: 如果预取正在进行中，只加载当前页面，避免重复请求
                if (prefetchInProgress) {
                    loadPage(currentPageTitle)
                        .done((result) => {
                            if (!isSessionActive(session)) {
                                return;
                            }
                            currentPageParameters = result;
                            currentLink = null;
                            startPage(session);
                        })
                        .fail((description) => {
                            if (isSessionActive(session)) {
                                error(description);
                            }
                        });
                } else {
                    // 预取未在运行，批量加载当前页面 + 剩余未缓存的页面
                    const batchTitles = [currentPageTitle];
                    for (let i = 0; i < links.length && batchTitles.length < cfg.queryTitleLimit; i++) {
                        if (!Object.hasOwn(pageCache, links[i])) {
                            batchTitles.push(links[i]);
                        }
                    }
                    loadPagesBatch(batchTitles)
                        .done((results) => {
                            if (!isSessionActive(session)) {
                                return;
                            }
                            $.extend(pageCache, results);
                            // 从缓存中取出当前页面，确保只消费一次
                            Reflect.deleteProperty(pageCache, currentPageTitle);
                            currentPageParameters = results[currentPageTitle];
                            currentLink = null;
                            startPage(session);
                        })
                        .fail((description) => {
                            if (isSessionActive(session)) {
                                error(description);
                            }
                        });
                }
            }
        }
    };

    /**
     * 开始处理已载入的来源页面；若偏好为跳过重定向页而当前页正是重定向页，则直接翻到下一页。
     */
    const startPage = (session) => {
        if (!isSessionActive(session)) {
            return;
        }
        if (cfg.skipRedirects && currentPageParameters.redirect) {
            doPage(session);
        } else {
            doLink(session);
        }
    };

    /**
     * 查找并请求用户处理单个来源页面中的一条入链。
     */
    const doLink = (session) => {
        if (!isSessionActive(session)) {
            return;
        }
        currentLink = extractLinkToPage(currentPageParameters.content, currentLink ? currentLink.end : 0);
        if (currentLink) {
            updateContext();
        } else {
            doPage(session);
        }
    };

    /**
     * 将当前链接的目标替换为新的页面；title 为 null 表示跳过该链接。
     * @param {?string} title 新的链接目标。
     */
    const chooseReplacement = (title) => {
        if (choosing) {
            choosing = false;
            // 跳过不产生改动，也不记入撤销队列与编辑摘要
            if (title) {
                addChange(currentLink, `[[${title}]]`);
                // 目标就是消歧义页本身时无需改写链接
                if (title !== getTargetPage()) {
                    const contentBefore = currentPageParameters.content;
                    currentPageParameters.content = replaceLink(
                        contentBefore,
                        title,
                        currentLink,
                        currentPageParameters.redirect,
                    );
                    currentLink.end += currentPageParameters.content.length - contentBefore.length;
                }
            }
            doLink(activeSession);
        }
    };

    /**
     * 请求用户输入替代链接目标，并将其用于替换。
     */
    const chooseTitleFromPrompt = () => {
        const title = prompt(wgULS("请输入新的链接目标：", "請輸入新的連結目標："));
        if (title !== null) {
            chooseReplacement(title);
        }
    };

    /**
     * 移除当前链接，但保留链接显示文本。
     */
    const chooseLinkRemoval = () => {
        if (choosing) {
            addChange(currentLink, "-");
            const contentBefore = currentPageParameters.content;
            currentPageParameters.content = removeLink(contentBefore, currentLink);
            currentLink.end += currentPageParameters.content.length - contentBefore.length;
            doLink(activeSession);
        }
    };

    /**
     * 撤销最近一次更改。
     */
    const undo = () => {
        if (pageChanges.length !== 0) {
            const lastPage = pageChanges[pageChanges.length - 1];
            if (currentPageTitle !== lastPage.title) {
                links.unshift(currentPageTitle);
                currentPageTitle = lastPage.title;
            }
            currentPageParameters = lastPage.page;
            currentPageParameters.content = lastPage.contentBefore.pop();
            currentLink = lastPage.links.pop();
            lastPage.summary.pop();
            if (lastPage.contentBefore.length === 0) {
                pageChanges.pop();
            }
            updateContext();
        }
    };

    /**
     * 跳过当前链接，不产生更改。
     */
    const omit = () => {
        chooseReplacement(null);
    };

    /**
     * 保存所有待处理的更改，然后重新启动工具。
     */
    const refresh = () => {
        saveAndEnd();
        start();
    };

    /**
     * 启用或禁用页面操作及当前链接操作按钮。
     * @param {boolean} enabled 是否启用按钮。
     */
    const toggleActionButtons = (enabled) => {
        const affectedButtons = [ui.omitButton, ui.titleAsTextButton, ui.removeLinkButton, ui.undoButton];
        $.each(affectedButtons, (_, button) => {
            button.prop("disabled", !enabled);
        });
    };

    /**
     * 显示或隐藏“没有更多链接”提示。
     * @param {boolean} show 是否显示提示。
     */
    const toggleFinishedMessage = (show) => {
        toggleActionButtons(!show);
        ui.undoButton.prop("disabled", pageChanges.length === 0);
        ui.finishedMessage.toggle(show);
        ui.pageTitleLine.toggle(!show);
        ui.context.toggle(!show);
    };

    /**
     * 显示或隐藏待编辑提示框。
     * @param {boolean} show 是否显示提示框。
     */
    const togglePendingEditBox = (show) => {
        if (pendingEditBox === null) {
            pendingEditBox = $("<div></div>").addClass("disamassist-box disamassist-pendingeditbox");
            pendingEditBoxText = $("<div></div>").addClass("disamassist-pendingedittext");
            pendingEditBox.append(pendingEditBoxText).hide();
            if (editLimit) {
                pendingEditBox.append(
                    $("<div></div>")
                        .text(
                            wgULS(
                                "在所有编辑均被提交前，请勿关闭此页面。您可在其它页面继续编辑，不过不建议同时在多个页面使用DisamAssist。这可能导致大量编辑出现在最近更改中，干扰到其他人。",
                                "在所有編輯均被提交前，請勿關閉此頁面。您可在其它頁面繼續編輯，不過不建議同時在多個頁面使用DisamAssist。這可能導致大量編輯出現在最近變更中，干擾到其他人。",
                            ),
                        )
                        .addClass("disamassist-subtitle"),
                );
            }
            $("#mw-content-text").before(pendingEditBox);
            updateEditCounter();
        }
        if (show) {
            pendingEditBox.fadeIn();
        } else {
            pendingEditBox.fadeOut();
        }
    };

    const notifyCompletion = () => {
        const oldTitle = document.title;
        document.title = `✔${document.title}`;
        $(document.body).one("mousemove", () => {
            document.title = oldTitle;
        });
    };

    /**
     * 更新当前链接及其上下文的显示内容。
     */
    const updateContext = () => {
        updateEditCounter();
        if (!currentLink) {
            toggleFinishedMessage(true);
        } else {
            const pageUrl = mw.util.getUrl(currentPageTitle, { redirect: "no" });
            ui.pageTitleLine.html(`<a href="${pageUrl}">${mw.html.escape(currentPageTitle)}</a>`);
            const [before, linkText, after] = extractContext(currentPageParameters.content, currentLink);
            ui.context
                .empty()
                .append($("<span></span>").text(before))
                .append($("<span></span>").text(linkText).addClass("disamassist-inclink"))
                .append($("<span></span>").text(after));
            toggleFinishedMessage(false);
            ui.undoButton.prop("disabled", pageChanges.length === 0);
            ui.removeLinkButton.prop("disabled", currentPageParameters.redirect);
            choosing = true;
        }
    };

    /**
     * 更新待处理编辑数量的显示。
     */
    const updateEditCounter = () => {
        if (ui.pendingEditCounter) {
            ui.pendingEditCounter.text(
                wgULS("提交中：$1；临时储存：$2", "提交中：$1；臨時儲存：$2")
                    .replace("$1", editCount)
                    .replace("$2", countActuallyChangedFullyCheckedPages()),
            );
        }
        if (pendingEditBox) {
            if (editCount === 0 && !running) {
                togglePendingEditBox(false);
                notifyCompletion();
            }
            let textContent = editCount;
            if (editLimit) {
                textContent = wgULS("$1; 剩余时间: $2", "$1; 剩餘時間: $2")
                    .replace("$1", editCount)
                    .replace("$2", secondsToHHMMSS(editCooldown * editCount));
            }
            pendingEditBoxText.text(wgULS("编辑提交中（$1）", "編輯提交中（$1）").replace("$1", textContent));
        }
    };

    /**
     * 将指定来源页面的更改应用到待保存记录。
     * @param {Object} pageChange 待保存的页面更改。
     */
    const applyChange = (pageChange) => {
        if (pageChange.page.content !== pageChange.contentBefore[0]) {
            editCount++;
            inFlightSaves.set(pageChange.title, (inFlightSaves.get(pageChange.title) ?? 0) + 1);
            // 同一去向只列一次
            const changeSummaries = [...new Set(pageChange.summary)].join("、");
            const summary = `[[${getTargetPage()}]] → ${changeSummaries}`;
            const save = editLimit ? saveWithCooldown : savePage;
            save(pageChange.title, pageChange.page, summary)
                .always(() => {
                    const saveCount = inFlightSaves.get(pageChange.title);
                    if (saveCount > 1) {
                        inFlightSaves.set(pageChange.title, saveCount - 1);
                    } else {
                        inFlightSaves.delete(pageChange.title);
                    }
                    if (editCount > 0) {
                        editCount--;
                    }
                    updateEditCounter();
                })
                .fail(error);
            updateEditCounter();
        }
    };

    /**
     * 保存所有待处理的更改。
     */
    const applyAllChanges = () => {
        for (const change of pageChanges) {
            applyChange(change);
        }
        pageChanges = [];
    };

    /**
     * 记录当前页面上的一次链接改动，供撤销与编辑摘要使用。
     * @param {Object} link 被修改的链接。
     * @param {string} summary 该改动在编辑摘要中的表示。
     */
    const addChange = (link, summary) => {
        if (pageChanges.length === 0 || pageChanges[pageChanges.length - 1].title !== currentPageTitle) {
            pageChanges.push({
                title: currentPageTitle,
                page: currentPageParameters,
                contentBefore: [],
                links: [],
                summary: [],
            });
        }
        const lastPageChange = pageChanges[pageChanges.length - 1];
        lastPageChange.contentBefore.push(currentPageParameters.content);
        lastPageChange.links.push(link);
        lastPageChange.summary.push(summary);
    };

    /**
     * 检查历史记录中是否存在实际更改。
     * @returns {boolean} 是否存在实际更改。
     */
    const checkActualChanges = () => countActualChanges() !== 0;

    /**
     * 返回历史记录中代表实际更改的条目数量。
     * @returns {number} 实际更改数量。
     */
    const countActualChanges = () =>
        pageChanges.filter((change) => change.page.content !== change.contentBefore[0]).length;

    /**
     * 返回已完成检查的页面数量；如果当前页面尚未处理完，则忽略最后一项。
     * @returns {number} 已完成检查且发生更改的页面数量。
     */
    const countActuallyChangedFullyCheckedPages = () => {
        let changeCount = countActualChanges();
        if (pageChanges.length !== 0) {
            const lastChange = pageChanges[pageChanges.length - 1];
            if (
                lastChange.title === currentPageTitle
                && currentLink !== null
                && lastChange.page.content !== lastChange.contentBefore[0]
            ) {
                changeCount--;
            }
        }
        return changeCount;
    };

    /**
     * 查找消歧义页面中的候选目标：取 #mw-content-text 内各无序列表项的首个链接。
     * @returns {jQuery} 候选链接集合。
     */
    const getDisamOptions = () => {
        const options = new Set();
        $("#mw-content-text")
            .find("ul li")
            .each(function () {
                const link = $(this)
                    .find("a")
                    .filter((_, el) => extractPageName($(el)))[0];
                // 用 Set 去重：嵌套列表里外层项与内层项会取到同一个链接，重复插入会出现两个标记
                if (link) {
                    options.add(link);
                }
            });
        return $(Array.from(options));
    };

    /**
     * 保存所有待处理的更改并关闭工具。
     */
    const saveAndEnd = () => {
        applyAllChanges();
        end();
    };

    /**
     * 结束工具并移除界面。
     */
    const end = () => {
        const currentToolUI = ui.display;
        choosing = false;
        running = false;
        activeSession = 0;
        startLink.removeClass("selected");
        $(".disamassist-optionmarker").remove();
        currentToolUI.fadeOut({
            complete: () => {
                currentToolUI.remove();
                if (editCount !== 0) {
                    togglePendingEditBox(true);
                }
            },
        });
    };

    /**
     * 显示错误信息。
     * @param {string} errorDescription 错误描述。
     */
    const error = (errorDescription) => {
        const errorBox = $("<div></div>").addClass("disamassist-box disamassist-errorbox");
        errorBox.text(`Error: ${errorDescription}`);
        errorBox.append(
            createButton(wgULS("跳过", "跳過"), () => {
                errorBox.fadeOut();
            }).addClass("disamassist-errorbutton"),
        );
        const uiIsInPlace = ui && $.contains(document.documentElement, ui.display[0]);
        const nextElement = uiIsInPlace ? ui.display : $("#mw-content-text");
        nextElement.before(errorBox);
        errorBox.hide().fadeIn();
    };

    /**
     * 修改链接，使其指向指定页面。
     * @param {string} text 页面完整维基文本。
     * @param {string} title 新的目标页面。
     * @param {Object} link 要修改的链接。
     * @param {boolean} [isRedirect] 当前页面是否为重定向页。
     * @returns {string} 修改后的页面文本。
     */
    const replaceLink = (text, title, link, isRedirect) => {
        let newContent;
        let anchor = "";
        const titleHashPos = title.indexOf("#");
        const titleWithoutAnchor = titleHashPos === -1 ? title : title.substring(0, titleHashPos);
        if (titleHashPos !== -1) {
            anchor = title.substring(titleHashPos);
        } else {
            const hashPos = link.title.indexOf("#");
            if (hashPos !== -1) {
                anchor = link.title.substring(hashPos);
            }
        }
        if (titleHashPos === -1 && isSamePage(title, link.description)) {
            newContent = link.description;
        } else if (isRedirect) {
            newContent = titleWithoutAnchor + anchor;
        } else {
            newContent = `${titleWithoutAnchor + anchor}|${link.description}`;
        }
        const linkStart = text.substring(0, link.start);
        const linkEnd = text.substring(link.end);
        return `${linkStart}[[${newContent}]]${linkEnd}`;
    };

    /**
     * 从页面文本中移除链接，但保留链接显示文本。
     * @param {string} text 页面维基文本。
     * @param {Object} link 要移除的链接。
     * @returns {string} 移除链接后的页面文本。
     */
    const removeLink = (text, link) => {
        const linkStart = text.substring(0, link.start);
        const linkEnd = text.substring(link.end);
        return linkStart + link.description + linkEnd;
    };

    /**
     * 从维基文本中提取链接。
     * @param {string} text 待读取的维基文本。
     * @param {number} lastIndex 搜索起始位置。
     * @param {number} [maxIndex] 搜索允许到达的最大位置。
     * @returns {?Object} 提取到的链接对象；找不到时返回 `null`。
     */
    const extractLink = (text, lastIndex, maxIndex) => {
        // 用平衡括号方法正确处理嵌套 [[...]] 结构，
        // 避免 [[File:...|说明[[目标]]]] 中内层链接被外层吞掉
        const startRe = /\[\[/g;
        startRe.lastIndex = lastIndex;
        const startMatch = startRe.exec(text);
        if (startMatch === null) {
            return null;
        }
        if (maxIndex !== undefined && startMatch.index >= maxIndex) {
            return null;
        }

        const start = startMatch.index;
        let i = start + 2;
        let depth = 1;
        let firstPipe = -1;

        // 扫描到匹配的 ]]，跟踪嵌套深度
        while (i < text.length && depth > 0) {
            if (text[i] === "[" && text[i + 1] === "[") {
                depth++;
                i += 2;
            } else if (text[i] === "]" && text[i + 1] === "]") {
                depth--;
                i += 2;
            } else if (text[i] === "|" && depth === 1 && firstPipe === -1) {
                firstPipe = i;
                i++;
            } else {
                i++;
            }
        }

        if (depth > 0) {
            // 没有匹配的 ]]
            return null;
        }

        const bracketEnd = i; // 闭合括号之后的位置
        let title, description;
        if (firstPipe >= 0) {
            title = text.substring(start + 2, firstPipe);
            description = text.substring(firstPipe + 1, bracketEnd - 2);
        } else {
            title = text.substring(start + 2, bracketEnd - 2);
            description = title;
        }

        return {
            start,
            end: bracketEnd,
            bracketEnd,
            title,
            description,
        };
    };

    /**
     * 从文本中查找指向消歧义目标的链接。
     * @param {string} text 页面维基文本。
     * @param {number} lastIndex 搜索起始位置。
     * @param {number} [maxIndex] 搜索允许到达的最大位置。
     * @returns {?Object} 找到的链接对象；找不到时返回 `null`。
     */
    const extractLinkToPage = (text, lastIndex, maxIndex) => {
        let link, title;
        let searchIndex = lastIndex;
        do {
            link = extractLink(text, searchIndex, maxIndex);
            if (link !== null) {
                title = getCanonicalTitle(link.title);

                // 外层链接是消歧义目标，直接返回
                if (isLinkToDisamTarget(title)) {
                    return link;
                }

                // 外层非目标，但 description 含嵌套链接，递归查找内层
                if (link.description && link.description.indexOf("[[") !== -1) {
                    const innerLink = extractLinkToPage(text, link.start + 2, link.bracketEnd - 2);
                    if (innerLink !== null) {
                        return innerLink;
                    }
                }

                searchIndex = link.end;
            }
        } while (link !== null);
        return null;
    };

    let variantLookupTable = {};

    const isLinkToDisamTarget = (title) => Object.hasOwn(variantLookupTable, title);

    /**
     * 建立语言变体查找表：把目标页面在各语言变体下的显示形式都登记为消歧义目标。
     * @param {string[]} destinations 目标页面列表。
     * @param {Function} callback 所有变体请求完成后的回调。
     */
    const buildVariantLookupTable = (destinations, callback, session) => {
        variantLookupTable = {};
        const uniqueDestinations = [...new Set(destinations)];
        for (const dest of uniqueDestinations) {
            variantLookupTable[dest] = true;
        }

        const variants = ["zh-hans", "zh-hant", "zh-cn", "zh-tw", "zh-hk"];
        const requests = uniqueDestinations.flatMap((dest) => variants.map((variant) => ({ dest, variant })));
        const totalRequests = requests.length;
        let completedRequests = 0;
        let nextRequest = 0;
        let activeRequests = 0;
        const maxConcurrentRequests = 4;

        if (totalRequests === 0) {
            callback();
            return;
        }

        const startNextRequests = () => {
            if (!isSessionActive(session)) {
                return;
            }
            while (activeRequests < maxConcurrentRequests && nextRequest < totalRequests) {
                const { dest, variant } = requests[nextRequest++];
                activeRequests++;
                api.post({
                    action: "parse",
                    text: dest,
                    prop: "text",
                    variant,
                    formatversion: 2,
                })
                    .done(({ parse }) => {
                        if (!isSessionActive(session)) {
                            return;
                        }
                        const convertedText = $(parse?.text ?? "")
                            .text()
                            .trim();
                        if (convertedText && !Object.hasOwn(variantLookupTable, convertedText)) {
                            variantLookupTable[convertedText] = true;
                        }
                    })
                    .always(() => {
                        activeRequests--;
                        completedRequests++;
                        if (completedRequests === totalRequests) {
                            if (isSessionActive(session)) {
                                callback();
                            }
                        } else {
                            startNextRequests();
                        }
                    });
            }
        };

        startNextRequests();
    };

    /**
     * 查找目标页面：强制同一页面时返回当前页面，否则返回从消歧义标题中提取的主题页面。
     * @returns {string} 目标页面标题。
     */
    const getTargetPage = () => {
        const title = wgPageName.replace(/_/g, " ");
        return forceSamePage ? title : removeDisam(title);
    };

    /**
     * 去掉页面标题末尾的“(消歧义页)”后缀，得到对应的主题条目标题。
     * @param {string} title 页面标题。
     * @returns {string} 去掉后缀后的标题；不含该后缀时原样返回。
     */
    const removeDisam = (title) => title.replace(/\(消歧义页\)$/, "");

    /**
     * 判断两个页面标题是否相同。
     * @param {string} title1 第一个页面标题。
     * @param {string} title2 第二个页面标题。
     * @returns {boolean} 两个标题是否相同。
     */
    const isSamePage = (title1, title2) => getCanonicalTitle(title1) === getCanonicalTitle(title2);

    /**
     * 返回页面标题的规范形式。
     * @param {string} title 页面标题。
     * @returns {string} 规范化后的页面标题。
     */
    const getCanonicalTitle = (title) => {
        let canonicalTitle = title;
        try {
            canonicalTitle = new mw.Title(title).getPrefixedText();
        } catch {
            // mw.Title seems to be buggy, and some valid titles are rejected
            // FIXME: This may cause false negatives
        }
        return canonicalTitle;
    };

    /**
     * 提取链接周围的上下文文本。
     * @param {string} text 页面文本。
     * @param {Object} link 链接对象。
     * @returns {string[]} 链接前、链接本身和链接后的上下文。
     */
    const extractContext = (text, link) => {
        const contextStart = link.start - cfg.radius;
        const contextEnd = link.end + cfg.radius;
        let contextPrev = text.substring(contextStart, link.start);
        if (contextStart > 0) {
            contextPrev = `…${contextPrev}`;
        }
        let contextNext = text.substring(link.end, contextEnd);
        if (contextEnd < text.length) {
            contextNext = `${contextNext}…`;
        }
        return [contextPrev, text.substring(link.start, link.end), contextNext];
    };

    /**
     * 从链接中提取带命名空间的页面名称。
     * @param {jQuery} link 页面链接。
     * @returns {?string} 页面名称；无法提取时返回 `null`。
     */
    const extractPageName = (link) => {
        let pageName = extractPageNameRaw(link);
        if (pageName) {
            const sectionPos = pageName.indexOf("#");
            let section = "";
            if (sectionPos !== -1) {
                section = pageName.substring(sectionPos);
                pageName = pageName.substring(0, sectionPos);
            }
            return getCanonicalTitle(pageName) + section;
        }
        return null;
    };

    /**
     * 按链接原始形式提取页面名称。
     * @param {jQuery} link 页面链接。
     * @returns {?string} 原始页面名称；无法提取时返回 `null`。
     */
    const extractPageNameRaw = (link) => {
        if (!link.hasClass("image")) {
            const href = link.attr("href");
            if (link.hasClass("new")) {
                // "Red" link
                if (href.indexOf(wgScript) === 0) {
                    return mw.util.getParamValue("title", href);
                }
            } else {
                const regex = wgArticlePath.replace("$1", "(.*)");
                const regexResult = RegExp(`^${regex}$`).exec(href);
                if ($.isArray(regexResult) && regexResult.length > 1) {
                    return decodeURIComponent(regexResult[1]);
                }
            }
        }
        return null;
    };

    /**
     * 将秒数格式化为 `HH:MM:SS` 或 `MM:SS`。
     * @param {number} totalSeconds 总秒数。
     * @returns {string} 格式化后的时间。
     */
    const secondsToHHMMSS = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const mmss = [Math.floor(totalSeconds % 3600 / 60), Math.floor(totalSeconds % 60)]
            .map((value) => String(value).padStart(2, "0"))
            .join(":");
        return hours >= 1 ? `${String(hours).padStart(2, "0")}:${mmss}` : mmss;
    };

    /**
     * 创建一个按钮。
     * @param {string} text 按钮显示文本。
     * @param {Function} onClick 点击处理函数。
     * @returns {jQuery} 创建的按钮元素。
     */
    const createButton = (text, onClick) => {
        const button = $("<input></input>", { type: "button", value: text });
        button.addClass("disamassist-button").click(onClick);
        return button;
    };

    /**
     * 沿重定向链解析最终页面。
     * @param {string} title 起始页面标题。
     * @param {Object[]} possibleRedirects 可能的重定向规则。
     * @returns {string} 重定向链末端的页面标题。
     */
    const resolveRedirect = (title, possibleRedirects) => {
        let appliedRedirect = true;
        const visitedPages = {};
        let currentPage = getCanonicalTitle(title);
        while (appliedRedirect) {
            appliedRedirect = false;
            for (const { from, to } of possibleRedirects) {
                if (from === currentPage) {
                    if (visitedPages[to]) {
                        // Redirect chain detected
                        return title;
                    }
                    visitedPages[currentPage] = true;
                    appliedRedirect = true;
                    currentPage = to;
                }
            }
        }
        // No redirect rules applied for an iteration of the outer loop:
        // no more redirects. We are done
        return currentPage;
    };

    /**
     * 获取目标页面的入链。
     * @param {string} page 目标页面标题。
     * @returns {jQuery.Promise} 成功时返回入链标题和可能的目标标题列表。
     */
    const getBacklinks = (page) => {
        const dfd = new $.Deferred();

        // 递归函数处理分页
        const fetchBacklinks = (page, continueParam) => {
            const params = {
                action: "query",
                list: "backlinks",
                bltitle: page,
                blredirect: true,
                bllimit: cfg.backlinkLimit,
                blnamespace: cfg.targetNamespaces.join("|"),
                formatversion: 2,
            };

            // 如果有continue参数，则添加到请求中
            if (continueParam) {
                params.blcontinue = continueParam.blcontinue;
                params.continue = continueParam.continue;
            }

            return api.post(params).then(({ query, "continue": continuation }) => {
                // 收集当前页的反向链接
                const backlinks = [];
                const linkTitles = [];

                for (const { title, redirlinks } of query.backlinks) {
                    backlinks.push(title);
                    if (redirlinks) {
                        linkTitles.push(title);
                        for (const { title: redirectTitle } of redirlinks) {
                            backlinks.push(redirectTitle);
                        }
                    }
                }

                // 检查是否有更多结果
                if (continuation?.blcontinue) {
                    // 递归获取下一页结果
                    // 合并结果
                    return fetchBacklinks(page, continuation).then((nextResult) => ({
                        backlinks: backlinks.concat(nextResult.backlinks),
                        linkTitles: linkTitles.concat(nextResult.linkTitles),
                    }));
                }
                // 没有更多结果，返回当前结果
                return { backlinks, linkTitles };
            });
        };

        // 开始获取反向链接
        fetchBacklinks(page)
            .done(({ backlinks, linkTitles }) => {
                dfd.resolve(backlinks, linkTitles);
            })
            .fail((code) => {
                dfd.reject(wgULS('无法获取反向链接: "$1".', '無法取得反向連結: "$1".').replace("$1", code));
            });

        return dfd.promise();
    };

    /**
     * 下载指定页面的重定向列表。
     * @param {string[]} pageTitles 页面标题列表。
     * @returns {jQuery.Promise} 成功时返回重定向规则列表。
     */
    const fetchRedirects = (pageTitles) => {
        const dfd = new $.Deferred();
        const batches = [];
        for (let i = 0; i < pageTitles.length; i += cfg.redirectTitleLimit) {
            batches.push(pageTitles.slice(i, i + cfg.redirectTitleLimit));
        }
        let allRedirects = [];
        const fetchNext = (index) => {
            if (index >= batches.length) {
                dfd.resolve(allRedirects);
                return;
            }
            api.post({
                action: "query",
                titles: batches[index].join("|"),
                redirects: true,
                formatversion: 2,
            })
                .done(({ query }) => {
                    allRedirects = allRedirects.concat(query.redirects ?? []);
                    fetchNext(index + 1);
                })
                .fail((code) => {
                    dfd.reject(wgULS('无法获取重定向："$1".', '無法取得重新導向："$1".').replace("$1", code));
                });
        };
        fetchNext(0);
        return dfd.promise();
    };

    /**
     * 获取指定页面的原始文本。
     * @param {string} title 页面标题。
     * @returns {jQuery.Promise} 成功时返回页面数据。
     */
    const loadPage = (title) => loadPagesBatch([title]).then((results) => results[title]);

    /**
     * 批量加载多个页面。
     * @param {string[]} pageTitles 页面标题列表。
     * @returns {jQuery.Promise} 成功时返回按标题索引的页面数据。
     */
    const loadPagesBatch = (pageTitles) => {
        const dfd = new $.Deferred();
        if (pageTitles.length === 0) {
            dfd.resolve({});
            return dfd.promise();
        }
        api.post({
            action: "query",
            titles: pageTitles.join("|"),
            prop: "revisions",
            rvprop: "timestamp|content",
            formatversion: 2,
        })
            .done(({ query }) => {
                const results = {};
                for (const { title, revisions, redirect, starttimestamp } of query.pages) {
                    const content = revisions ? revisions[0].content : "";
                    results[title] = {
                        redirect: !!redirect || /^\s*#(REDIRECT|重定向)\s*\[\[/i.test(content),
                        content,
                        baseTimeStamp: revisions ? revisions[0].timestamp : null,
                        startTimeStamp: starttimestamp,
                    };
                }
                dfd.resolve(results);
            })
            .fail((code) => {
                dfd.reject(
                    wgULS('无法加载 $1: "$2".', '無法載入 $1: "$2".')
                        .replace("$1", pageTitles.join(", "))
                        .replace("$2", code),
                );
            });
        return dfd.promise();
    };

    /**
     * 预取链接队列中的下一批页面，并写入页面缓存。
     * @param {Function} [callback] 预取成功或失败后的可选回调。
     */
    const prefetchNextBatch = (callback, session) => {
        if (!isSessionActive(session)) {
            return;
        }
        if (prefetchInProgress) {
            callback?.();
            return;
        }
        const batch = [];
        for (let i = 0; i < links.length && batch.length < cfg.queryTitleLimit; i++) {
            if (!Object.hasOwn(pageCache, links[i])) {
                batch.push(links[i]);
            }
        }
        if (batch.length === 0) {
            callback?.();
            return;
        }
        prefetchInProgress = true;
        loadPagesBatch(batch)
            .done((results) => {
                if (!isSessionActive(session)) {
                    return;
                }
                $.extend(pageCache, results);
                prefetchInProgress = false;
                callback?.();
            })
            .fail((description) => {
                if (!isSessionActive(session)) {
                    return;
                }
                prefetchInProgress = false;
                if (callback) {
                    error(description);
                    callback();
                } else {
                    console.warn("[DisamAssist] prefetch failed:", description);
                }
            });
    };

    /**
     * 注册页面更改，并按照编辑冷却时间延迟保存。
     * @param {...*} args 与 savePage 相同的参数。
     * @returns {jQuery.Promise} 表示保存结果的 jQuery Promise。
     */
    const saveWithCooldown = (...args) => {
        const deferred = new $.Deferred();
        pendingSaves.push({ args, dfd: deferred });
        if (!runningSaves) {
            checkAndSave();
        }
        return deferred.promise();
    };

    /**
     * 在满足编辑冷却时间后保存队列中的下一项更改。
     */
    const checkAndSave = () => {
        if (pendingSaves.length === 0) {
            runningSaves = false;
            return;
        }
        runningSaves = true;
        const millisSinceLast = new Date().getTime() - lastEditMillis;
        if (millisSinceLast < editCooldown * 1000) {
            setTimeout(checkAndSave, editCooldown * 1000 - millisSinceLast);
        } else {
            // The last edit started at least editCooldown seconds ago
            const save = pendingSaves.shift();
            savePage(...save.args)
                .done(() => {
                    checkAndSave();
                    save.dfd.resolve();
                })
                .fail((description) => {
                    checkAndSave();
                    save.dfd.reject(description);
                });
            // We'll use the time since the last edit started
            lastEditMillis = new Date().getTime();
        }
    };

    /**
     * 保存指定页面的更改；工具的编辑一律标记为小编辑 + 机器人编辑。
     * @param {string} title 页面标题。
     * @param {Object} page 页面数据。
     * @param {string} summary 编辑摘要。
     * @returns {jQuery.Promise} 表示保存结果的 jQuery Promise。
     */
    const savePage = (title, page, summary) => {
        const dfd = new $.Deferred();
        api.postWithToken("csrf", {
            action: "edit",
            title,
            text: page.content,
            basetimestamp: page.baseTimeStamp,
            starttimestamp: page.startTimeStamp,
            summary,
            watchlist: cfg.watch,
            minor: true,
            bot: true,
            tags: "Automation tool|DisamAssist",
            formatversion: 2,
        })
            .done(() => {
                dfd.resolve();
            })
            .fail((code) => {
                dfd.reject(
                    wgULS('无法提交编辑到 $1: "$2".', '無法提交編輯到 $1: "$2".')
                        .replace("$1", title)
                        .replace("$2", code),
                );
            });
        return dfd.promise();
    };

    install();
});
