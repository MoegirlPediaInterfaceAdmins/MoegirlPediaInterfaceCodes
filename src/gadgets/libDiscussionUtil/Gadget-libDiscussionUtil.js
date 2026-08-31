"use strict";
window.libDiscussionUtil = {
    getDiscussionHeader: (filterClassess = []) => [...document.querySelectorAll("#mw-content-text > .mw-parser-output > h2, #mw-content-text > .mw-parser-output > .discussionContainer > h2, #mw-content-text > .mw-parser-output > .mw-heading2")].map((ele) => {
        const self = $(ele);
        const content = self.nextUntil("h2, .mw-heading2").not("h2, .mw-heading2");
        for (const filterClass of filterClassess) {
            if (content.hasClass(filterClass)) {
                return null;
            }
        }
        const sectionTitle = self.find(".mw-headline, h2[data-mw-thread-id]").attr("id");
        return { self, sectionTitle };
    }).filter((n) => n !== null),
    /**
     * DiscussionTools 在发布回复、添加话题等操作后会将 `.mw-parser-output` 整体替换，
     * 一次性注入的元素与事件随之丢失，替换完成后它会触发 `wikipage.content` 钩子。
     * 借助该钩子重跑注入逻辑以恢复被移除的元素。
     *
     * 刻意丢弃钩子传入的 `$content` 参数：它可能是回复预览区等子容器，
     * 重跑时应始终按顶层选择器全页扫描；`callback` 自身需保证可重入（幂等）。
     *
     * @param {() => void} callback
     */
    onContentChange: (callback) => {
        mw.hook("wikipage.content").add(() => callback());
    },
};
