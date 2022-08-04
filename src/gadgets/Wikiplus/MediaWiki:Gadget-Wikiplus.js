"use strict";
(async () => {
    await $.ajax({
        url: "https://wikiplus-app.com/Main.js?ver=20210321",
        dataType: "script",
        crossDomain: true,
        cache: true,
    });
    console.info("Wikiplus load done.");
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
        await sleep(100);
        if (!window.Wikiplus) {
            console.info("Wikiplus init running.");
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
        if (window.Wikiplus.kotori && i++ % 20 === 0) {
            console.info("Wikiplus init still.");
            continue;
        }
        if (window.Wikiplus.inValidNameSpaces.includes(mw.config.get("wgNamespaceNumber")) || !mw.config.get("wgIsArticle") || mw.config.get("wgAction") !== "view" || !mw.config.get("wgIsProbablyEditable") || !mw.config.get("wgUserGroups").includes("autoconfirmed") && !mw.config.get("wgUserGroups").includes("confirmed")) {
            console.info("Wikiplus init exit.");
            return;
        }
        console.info("Wikiplus init await.");
    }
})();