"use strict";
$.ajax({
    url: "https://wikiplus-app.com/Main.js?ver=20210321",
    dataType: "script",
    crossDomain: true,
    cache: true,
}).then(() => {
    console.info("Wikiplus load done.");
    let i = 0;
    const c = setInterval(() => {
        if (!window.Wikiplus) {
            console.info("Wikiplus init starting.");
        } else if (window.Wikiplus.kotori && window.Wikiplus.kotori.inited) {
            clearInterval(c);
            console.info("Wikiplus init done.");
            setTimeout(() => {
                if (!document.querySelector("#Wikiplus-Edit-TopBtn")) {
                    console.info("Wikiplus init incomplete.");
                    window.Wikiplus.initQuickEdit(); //加载快速编辑
                    if (!window.Wikiplus.getSetting("disableEditEveryWhere")) {
                        window.Wikiplus.editEveryWhere(); //任意编辑
                    }
                }
            }, 1000);
        } else if (window.Wikiplus.kotori && i++ % 20 === 0) {
            console.info("Wikiplus init still.");
        } else if (window.Wikiplus.inValidNameSpaces.includes(mw.config.get("wgNamespaceNumber")) || !mw.config.get("wgIsArticle") || mw.config.get("wgAction") !== "view" || !mw.config.get("wgIsProbablyEditable") || !mw.config.get("wgUserGroups").includes("autoconfirmed") && !mw.config.get("wgUserGroups").includes("confirmed")) {
            clearInterval(c);
            console.info("Wikiplus init exit.");
        } else {
            console.info("Wikiplus init await.");
        }
    }, 100);
});