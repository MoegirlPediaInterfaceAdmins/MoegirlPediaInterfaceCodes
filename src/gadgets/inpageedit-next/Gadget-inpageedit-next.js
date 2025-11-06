"use strict";

window.RLQ ||= [];
window.RLQ.push([
    ["mediawiki.base", "mediawiki.notification"],
    () => {
        const isLoadedV2 = mw.loader.getState("ext.gadget.InPageEdit-v2") === "ready" || window.InPageEdit?.__loaded === true;
        if (isLoadedV2) {
            mw.notify("无法同时安装 InPageEdit v2 和 InPageEdit NEXT，请卸载其中之一。", {
                type: "warning",
            });
            return;
        }

        // InPageEdit NEXT
        document.body.append(
            Object.assign(document.createElement("script"), {
                src: "https://cdn.jsdelivr.net/npm/@inpageedit/core/dist/index.js",
                type: "module",
            }),
        );
    },
]);
