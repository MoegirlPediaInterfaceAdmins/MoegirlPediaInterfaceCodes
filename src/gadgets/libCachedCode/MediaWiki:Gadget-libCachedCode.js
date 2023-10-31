"use strict";
(() => {
    const localObjectStorage = new LocalObjectStorage("AnnTools-libCachedCode");
    for (const i of Object.keys(localStorage)) { // 移除旧版本缓存
        if (i.startsWith("AnnTools-libCachedCode")) {
            localStorage.removeItem(i);
        }
    }
    const codeToUrl = (code) => {
        const blob = new Blob([code], { type: "text/plain" });
        return URL.createObjectURL(blob);
    };
    const getCachedCode = async (url) => {
        let { code } = localObjectStorage.getItem(`${url}`) || {}; // 读取缓存
        if (!code) { // 如无则获取数据
            code = await (await fetch(url)).text();
        }
        localObjectStorage.setItem(`AnnTools-libCachedCode:${url}`, { code, timestamp: Date.now() }); // 设置缓存
        return code;
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
    // 移除过期缓存（30 天内无使用）
    const expired = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const k of localObjectStorage._getAllKeys()) {
        if (localObjectStorage.getItem(k).timestamp < expired) {
            localObjectStorage.removeItem(k);
        }
    }
    window.libCachedCode = {
        getCachedCode,
        getCachedCodeUrl,
        injectCachedCode,
        batchInjectCachedCode,
    };
})();
