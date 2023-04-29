"use strict";
(async () => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
        await sleep(100);
        if (!window._WikiplusPages) {
            if (i++ % 20 === 0) {
                console.info("Wikiplus init running.");
            }
            continue;
        }
        console.info("Wikiplus init done.");
        break;
    }
    if (mw.config.get("skin") !== "moeskin" || !document.querySelector("#ca-edit")) {
        return;
    }
    let wikiplusEditTopBtn = document.querySelector("#Wikiplus-Edit-TopBtn");
    while (!wikiplusEditTopBtn) {
        await sleep(100);
        // eslint-disable-next-line require-atomic-updates
        wikiplusEditTopBtn = document.querySelector("#Wikiplus-Edit-TopBtn");
    }
    mw.hook("moeskin.pagetools").add(({ addPageToolsButton }) => {
        const $btn = addPageToolsButton('<span style="align-self:center;font:0.7em bold;">W+</span>', "快速编辑");
        $btn.attr("id", "ca-wikiplus").on("click", () => {
            wikiplusEditTopBtn.click();
        });
    });
    $(".page-tool-link#ca-wikiplus").insertAfter($(".page-tool-link#ca-edit"));
})();
