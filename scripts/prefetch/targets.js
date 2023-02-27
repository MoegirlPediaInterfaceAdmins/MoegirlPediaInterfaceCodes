"use strict";
/**
 * @type {{ type: "npm", gadget: { name: string, fileName: string }, distFilePath: string, version?: string, appendCode?: string, }[]}
 */
module.exports = [
    {
        type: "npm",
        gadget: {
            name: "wikiplus-highlight",
            fileName: "MediaWiki:Gadget-wikiplus-highlight.js",
        },
        distFilePath: "main.js",
    },
    {
        type: "npm",
        gadget: {
            name: "luxon",
            fileName: "MediaWiki:Gadget-luxon.js",
        },
        distFilePath: "global/luxon.min.js",
        version: "3",
        appendCode: "window.luxon = luxon;",
    },
    /* {
        type: "npm",
        gadget: {
            name: "InPageEdit-v2",
            fileName: "MediaWiki:Gadget-InPageEdit-v2.js",
        },
        distFilePath: "dist/InPageEdit.js",
    }, */
    {
        type: "npm",
        gadget: {
            name: "libJSON5",
            fileName: "MediaWiki:Gadget-libJSON5.js",
        },
        distFilePath: "dist/index.js",
        version: "2",
    },
    {
        type: "npm",
        gadget: {
            name: "localforage",
            fileName: "MediaWiki:Gadget-localforage.js",
        },
        distFilePath: "dist/index.js",
        version: "1",
    },
];
