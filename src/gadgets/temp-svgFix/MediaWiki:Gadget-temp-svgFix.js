"use strict";
$(() => {
    // 临时修复svg缩略图损坏
    /**
     * @type { NodeListOf<HTMLImageElement> }
     */
    const svgs = document.querySelectorAll('img[src$=".svg.png"]');
    for (const img of svgs) {
        try {
            const url = new mw.Uri(img.src);
            if (url.host !== "img.moegirl.org.cn") {
                continue;
            }
            img.src = img.src.replace("/thumb/", "/").replace(/\.svg\/[^/]+\.svg\.png$/, ".svg");
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
