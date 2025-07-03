"use strict";
(async () => {
    if (mw.config.get("wgIsArticle") && mw.config.get("wgAction") === "view") {
        await libCachedCode.injectCachedCode("https://testingcf.jsdelivr.net/npm/wikiplus-highlight@latest", "script");
    }
})();
