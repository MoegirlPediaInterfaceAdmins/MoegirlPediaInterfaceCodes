"use strict";
(() => {
    const localObjectStorage = new LocalObjectStorage("AnnTools-libCachedCode", { expires: [30, "days"] });
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
        // 读写必须使用同一个键，否则缓存永不命中（此前读 getItem(url)、写 setItem(前缀 + url)，
        // 键名不一致导致 30 天缓存实际从未生效，每次都重新从 CDN 拉取）
        const key = `AnnTools-libCachedCode:${url}`;
        let { code } = localObjectStorage.getItem(key) || {}; // 读取缓存
        if (typeof code !== "string") { // 如无则获取数据
            code = await (await fetch(url)).text();
        }
        localObjectStorage.setItem(key, { code }); // 设置缓存
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
    window.libCachedCode = {
        getCachedCode,
        getCachedCodeUrl,
        injectCachedCode,
        batchInjectCachedCode,
    };
})();
