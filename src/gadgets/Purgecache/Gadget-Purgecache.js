"use strict";
// <pre>
$(() => {
    /**
     * 由于moeskin需要两个按钮，用函数来生成
     * @param {string} buttonText 按钮文本
     * @param {string} purgingText 清除中文本
     * @param {string} succesText 清除成功文本
     * @param {string} failText 清除失败文本
     * @returns {JQuery<HTMLElement>}
    */
    if (!mw.config.get("wgIsArticle") || mw.config.get("wgPageName") === "Mainpage") {
        return;
    }
    const $purgeButton = (
        buttonText = wgULS("清除页面缓存", "清除頁面快取"),
        purgingText = wgULS("正在清除缓存", "正在清除快取"),
        succesText = wgULS("清除缓存成功！", "清除快取成功！"),
        failText = wgULS("清除缓存失败，点击可重试", "清除快取失敗，點選可重試", null, null, "清除快取失敗，點擊可重試"),
    ) => {
        const $statusNode = $('<span class="n-button__content" />').text(buttonText);
        const $containerNode = $('<a class="n-button purgecache" />').append($statusNode);
        let runningStatus = false;

        $containerNode.on("click", async () => {
            if (runningStatus) {
                return;
            }
            $statusNode.text(purgingText);
            $statusNode.prepend('<img src="https://storage.moegirl.org.cn/moegirl/commons/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;">');
            runningStatus = true;
            const api = new mw.Api(),
                opt = {
                    action: "purge",
                    format: "json",
                    forcelinkupdate: true,
                    titles: mw.config.get("wgPageName"),
                };
            try {
                await api.post(opt);
                $statusNode.text(succesText);
                setTimeout(() => location.reload(location, true), 200);
            } catch {
                $statusNode.text(failText);
                // eslint-disable-next-line require-atomic-updates
                runningStatus = false;
                setTimeout(() => {
                    if (!runningStatus) {
                        $statusNode.text(buttonText);
                    }
                }, 5000);
            }
        });
        return $containerNode;
    };

    switch (mw.config.get("skin")) {
        case "vector-2022":
            $("#p-cactions ul").append($('<li class="mw-list-item mw-list-item-js" id="pt-purge" />').append($purgeButton()));
            break;
        case "moeskin":
        default:
            $("#moe-article-header-top .right-block.flex").prepend(
                $('<div class="flex" id="p-purge-cache"></div>').append($purgeButton().append(
                    '<div aria-hidden="true" class="n-base-wave"></div>',
                    '<div aria-hidden="true" class="n-button__border"></div>',
                    '<div aria-hidden="true" class="n-button__state-border"></div>',
                )));
            $("#mobile-page-actions .mobile-edit-button").append(
                $purgeButton(wgULS("清除缓存", "清除快取"), wgULS("正在清除", "正在清除"), wgULS("清除成功！", "清除成功！"), wgULS("清除失败，点击可重试", "清除失敗，點選可重試", null, null, "清除失敗，點擊可重試"))
                    .append('<div aria-hidden="true" class="n-base-wave"></div>'),
            );
    }
});
// </pre>
