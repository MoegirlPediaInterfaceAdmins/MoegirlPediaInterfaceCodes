"use strict";
$(() => {
    // 临时修复svg缩略图损坏
    /**
     * @type { HTMLImageElement[] }
     */
    const svgs = Array.from(document.querySelectorAll('img[src$=".svg.png"], img[data-lazy-src$=".svg.png"]'));
    for (const img of svgs) {
        try {
            const src = img.src || img.dataset.lazySrc;
            const url = new URL(src);
            if (url.hostname !== "img.moegirl.org.cn") {
                continue;
            }
            img.src = src.replace("/thumb/", "/").replace(/\.svg\/[^/]+\.svg\.png$/, ".svg");
            img.removeAttribute("srcset");
            img.removeAttribute("data-lazy-src");
            img.removeAttribute("data-lazy-srcset");
            img.removeAttribute("data-lazy-state");
            img.classList.remove("lazyload");
            img.after(img.cloneNode(true));
            img.remove();
        } catch { }
    }
});
