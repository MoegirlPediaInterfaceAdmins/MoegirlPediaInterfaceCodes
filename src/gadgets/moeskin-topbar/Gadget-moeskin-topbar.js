/* eslint-disable promise/catch-or-return */
"use strict";
Promise.all(
    ["moeskin.instance", "moeskin.stores"].map((name) => new Promise(mw.hook(name).add)),
).then((payload) => {
    const skin = payload[0];
    const stores = payload[1];
    const { topbar } = stores.useNavigationStore(skin.pinia);
    topbar[0].children = [
        ...topbar[0].children,
        {
            href: "/Special:最新页面",
            text: wgULS("最新页面", "最新頁面"),
        },
        {
            href: "/Special:日志",
            text: wgULS("所有日志", "所有日誌"),
        },
        {
            href: "/Category:积压工作",
            text: wgULS("积压工作", "積壓工作"),
        },
    ];
});
