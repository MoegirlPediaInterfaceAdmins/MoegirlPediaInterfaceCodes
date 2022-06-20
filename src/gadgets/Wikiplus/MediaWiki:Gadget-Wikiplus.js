$.ajax({
    url: "https://wikiplus-app.com/Main.js?ver=20210321",
    dataType: "script",
    crossDomain: true,
    cache: true,
}).then(function() {
    console.info("Wikiplus load done.");
    var i = 0;
    var c = setInterval(function() {
        if (Wikiplus.kotori && Wikiplus.kotori.inited) {
            clearInterval(c);
            console.info("Wikiplus init done.");
            setTimeout(function() {
                if (!document.querySelector("#Wikiplus-Edit-TopBtn")) {
                    console.info("Wikiplus init incomplete.");
                    Wikiplus.initQuickEdit(); //加载快速编辑
                    if (!Wikiplus.getSetting('disableEditEveryWhere')) {
                        Wikiplus.editEveryWhere(); //任意编辑
                    }
                }
            }, 1000);
        } else if (Wikiplus.kotori && i++ % 20 === 0) {
            console.info("Wikiplus init still.");
        } else if (Wikiplus.inValidNameSpaces.includes(mw.config.get("wgNamespaceNumber")) || !mw.config.get("wgIsArticle") || mw.config.get("wgAction") !== "view" || !mw.config.get('wgIsProbablyEditable') || !mw.config.get('wgUserGroups').includes('autoconfirmed') && !mw.config.get('wgUserGroups').includes('confirmed')) {
            clearInterval(c);
            console.info("Wikiplus init exit.");
        } else {
            console.info("Wikiplus init await.");
        }
    }, 100);
});