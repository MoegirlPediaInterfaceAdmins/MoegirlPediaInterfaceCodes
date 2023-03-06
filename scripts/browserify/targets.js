
/**
 * @file 在这里添加lib之前记得先`npm i`安装一下，否则会报错“找不到库”
 */
/**
 * @type {{ module: string; entry: string; gadget: { name: string, fileName: string }; exportValues?: string[], removePlugins?: string[], prependCode?: string }[]}
 */
export default [
    {
        module: "cron",
        entry: "Cron",
        gadget: {
            name: "cron",
            fileName: "MediaWiki:Gadget-cron.js",
        },
        prependCode: "const require = () => window.luxon;", // 避免出现无法加载 luxon 的问题
    },
    {
        module: "async-lock",
        entry: "AsyncLock",
        gadget: {
            name: "libAsyncLock",
            fileName: "MediaWiki:Gadget-libAsyncLock.js",
        },
    },
    {
        module: "hash-wasm",
        entry: "hashwasm",
        gadget: {
            name: "libHashwasm",
            fileName: "MediaWiki:Gadget-libHashwasm.js",
        },
        exportValues: [
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
        gadget: {
            name: "libip",
            fileName: "MediaWiki:Gadget-libip.js",
        },
    },
];
