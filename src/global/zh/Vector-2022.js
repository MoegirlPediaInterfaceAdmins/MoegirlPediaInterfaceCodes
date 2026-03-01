// <nowiki>
/* 这里的任何JavaScript将在 vector 皮肤加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:Vector.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0 中国大陆
 */
"use strict";
(async () => {
    /* 函数定义体 */
    /* 滚动公告 */
    const startScroll = () => {
        $(".vector-sitenotice-container > #siteNotice .scrollDiv:not(.scrolling), #moe-sitenotice-container > .moe-sitenotice .scrollDiv:not(.scrolling)").addClass("scrolling").each((_, ele) => {
            const self = $(ele);
            self.children().each((_, child) => {
                if (child.innerHTML.trim() === "") {
                    child.remove();
                }
            });
            const children = self.children();
            if (children.length === 0) {
                return;
            }
            const firstChild = children.first();
            const firstChildHeight = firstChild.outerHeight();
            self.height(firstChildHeight);
            children.slice(1).css("top", `${Math.ceil(firstChildHeight)}px`);
            firstChild.css("top", "0");
        });
    };
    const autoScroll = () => {
        setInterval(() => {
            if (!document.hidden) {
                $(".vector-sitenotice-container > #siteNotice .scrollDiv.scrolling, #moe-sitenotice-container > .moe-sitenotice .scrollDiv.scrolling").each((_, ele) => {
                    const self = $(ele);
                    if (self.css("font-weight") === "700") {
                        return;
                    }
                    const children = self.children();
                    const all = self.add(children);
                    if (children.length === 1) {
                        return;
                    }
                    const firstChild = children.first();
                    const firstChildHeight = firstChild.outerHeight();
                    const secondChild = firstChild.next();
                    const secondChildHeight = secondChild.outerHeight();
                    const otherChild = children.slice(2);
                    let maxHeight = Math.max(firstChildHeight, secondChildHeight);
                    otherChild.each((_, child) => {
                        maxHeight = Math.max(maxHeight, $(child).outerHeight());
                    });
                    all.addClass("animation");
                    self.height(maxHeight);
                    firstChild.css("top", `-${firstChildHeight}px`);
                    secondChild.css("top", `${(maxHeight - secondChildHeight) / 2}px`);
                    otherChild.css("top", `${Math.ceil(maxHeight)}px`);
                    setTimeout(() => {
                        all.removeClass("animation");
                        firstChild.appendTo(self).css("top", Math.ceil(maxHeight));
                    }, 400);
                });
            }
        }, 5000);
    };
    /**
     * 处理黑幕点击事件，防止误触
     * 如果首次点击黑幕，不要触发内部的链接跳转等事件
     * 再次点击同一个黑幕里的元素，才会触发事件
     */
    const setupHeimuClickListener = () => {
        /** @type {HTMLElement|null} */
        let lastClickedHeimu = null;
        document.querySelector("#mw-content-text")?.addEventListener("click", (e) => {
            if (e.pointerType !== "touch") {
                lastClickedHeimu = null;
                return;
            }
            // 小工具"黑幕半隐"启用时正常跳转
            if (document.body.closest(".heimu_toggle_on")) {
                return;
            }
            /** @type {HTMLElement} */
            const target = e.target;
            const currentHeimu = target.closest(".heimu, .colormu, .heimu-like");
            if (currentHeimu) {
                // 这个元素是黑幕
                // 但不是上次点击的黑幕，所以阻止默认行为
                if (lastClickedHeimu !== currentHeimu) {
                    e.preventDefault();
                }
                // 记录最后点击的黑幕
                lastClickedHeimu = currentHeimu;
            } else {
                // 这个元素不是黑幕，重置状态
                lastClickedHeimu = null;
            }
        });
    };
    /* 函数执行体 */
    await $.ready;
    // 滚动公告
    startScroll();
    autoScroll();
    setupHeimuClickListener();
})();
