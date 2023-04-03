"use strict";
(async () => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
        await sleep(100);
        if (!window.Wikiplus) {
            if (i++ % 20 === 0) {
                console.info("Wikiplus init running.");
            }
            continue;
        }
        if (window.Wikiplus.kotori && window.Wikiplus.kotori.inited) {
            console.info("Wikiplus init done.");
            await sleep(1000);
            if (!document.querySelector("#Wikiplus-Edit-TopBtn")) {
                console.info("Wikiplus init incomplete.");
                window.Wikiplus.initQuickEdit(); //加载快速编辑
                if (!window.Wikiplus.getSetting("disableEditEveryWhere")) {
                    window.Wikiplus.editEveryWhere(); //任意编辑
                }
            }
            return;
        }
        if (window.Wikiplus.kotori) {
            if (i++ % 20 === 0) {
                console.info("Wikiplus init still.");
            }
            continue;
        }
        if (window.Wikiplus.inValidNameSpaces.includes(mw.config.get("wgNamespaceNumber")) || !mw.config.get("wgIsArticle") || mw.config.get("wgAction") !== "view" || !mw.config.get("wgIsProbablyEditable") || !mw.config.get("wgUserGroups").includes("autoconfirmed") && !mw.config.get("wgUserGroups").includes("confirmed")) {
            console.info("Wikiplus init exit.");
            return;
        }
        console.info("Wikiplus init await.");
    }
})().then(() => { // [[User:GuoPC/js/WikiplusPageTool.js]]
    if (mw.config.get("skin") !== "moeskin" || $("#ca-edit").length === 0) {
        return;
    }
    const timer = setInterval(() => {
        if ($("#Wikiplus-Edit-TopBtn").length > 0) {
            clearInterval(timer);
            mw.hook("moeskin.pagetools").add(({ addPageToolsButton }) => {
                const $btn = addPageToolsButton('<span style="align-self:center;font:0.7em bold;">W+</span>', "快速编辑");
                $btn.attr("id", "ca-wikiplus").on("click", () => {
                    $("#Wikiplus-Edit-TopBtn").trigger("click");
                });
            });
            $(".page-tool-link#ca-wikiplus").insertAfter($(".page-tool-link#ca-edit"));
        } else {
            return;
        }
    }, 700);
});
