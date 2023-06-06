"use strict";
(() => {
    const codeToUrl = (code) => {
        const blob = new Blob([code], { type: "text/plain" });
        return URL.createObjectURL(blob);
    };
    const getCachedCode = async (url) => {
        const cachedCode = localStorage.getItem(`AnnTools-libCachedCode:${url}`);
        if (cachedCode) {
            return cachedCode;
        }
        const freshCode = await (await fetch(url)).text();
        localStorage.setItem(`AnnTools-libCachedCode:${url}`, freshCode);
        return freshCode;
    };
    const getCachedCodeUrl = async (url) => codeToUrl(await getCachedCode(url));
    const injectCachedCode = async (url, _type) => {
        const type = _type.toLowerCase();
        if (["script", "javascript", "js"].includes(type)) {
            const script = document.createElement("script");
            script.src = await getCachedCodeUrl(url);
            return await new Promise((res) => {
                script.addEventListener("load", () => {
                    res();
                });
                document.head.append(script);
            });
        }
        if (["css", "style"].includes(type)) {
            mw.loader.addStyleTag(await getCachedCode(url));
            return;
        }
    };
    const batchInjectCachedCode = (urls, type) => Promise.all(urls.map((url) => injectCachedCode(url, type)));
    window.libCachedCode = {
        getCachedCode,
        getCachedCodeUrl,
        injectCachedCode,
        batchInjectCachedCode,
    };
})();
