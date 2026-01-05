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
    /* 函数执行体 */
    await $.ready;
    // 滚动公告
    startScroll();
    autoScroll();
})();
