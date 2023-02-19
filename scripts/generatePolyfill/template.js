/* eslint-env browser */
"use strict";
(() => {
    const script = document.createElement("script");
    script.src = "https://polyfill.io/v3/polyfill.js?ua=$$$UA$$$&features=$$$FEATURES$$$";
    script.async = true;
    const polyfillPromise = new Promise((res) => {
        script.addEventListener("load", () => res(), {
            once: true,
        });
        script.addEventListener("error", () => res(), {
            once: true,
        });
    });
    Object.defineProperty(window, "polyfillPromise", {
        configurable: false,
        enumerable: true,
        writable: false,
        value: polyfillPromise,
    });
})();
