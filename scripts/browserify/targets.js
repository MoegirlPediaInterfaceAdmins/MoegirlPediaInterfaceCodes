"use strict";
/**
 * @file 在这里添加lib之前记得先`npm i`安装一下，否则会报错“找不到库”
 */
/**
 * @type {{ module: string; entry: string; file: string; exports?: string[], removePlugins?: string[], prependCode?: string }[]}
 */
module.exports = [
    {
        module: "cron",
        entry: "Cron",
        file: "src/gadgets/cron/MediaWiki:Gadget-cron.js",
        prependCode: "const require = () => window.luxon;", // 避免出现无法加载 luxon 的问题
    },
    {
        module: "async-lock",
        entry: "AsyncLock",
        file: "src/gadgets/libAsyncLock/MediaWiki:Gadget-libAsyncLock.js",
    },
    {
        module: "hash-wasm",
        entry: "hashwasm",
        file: "src/gadgets/libHashwasm/MediaWiki:Gadget-libHashwasm.js",
        exports: [
            "createMD5",
            "createSHA1",
            "createSHA224",
            "createSHA256",
            "createSHA3",
            "createSHA384",
            "createSHA512",
            "createSM3",
            "md5",
            "sha1",
            "sha224",
            "sha256",
            "sha3",
            "sha384",
            "sha512",
            "sm3",
        ],
    },
    {
        module: "ip",
        entry: "libip",
        file: "src/gadgets/libip/MediaWiki:Gadget-libip.js",
    },
    {
        module: "localforage",
        entry: "localforage",
        file: "src/gadgets/localforage/MediaWiki:Gadget-localforage.js",
    },
];