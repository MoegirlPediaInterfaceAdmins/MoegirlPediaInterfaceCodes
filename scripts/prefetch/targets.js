"use strict";
/**
 * @type {{ name: string, url: string, file: string, appendCode?: string }[]}
 */
module.exports = [
    {
        name: "wikiplus-highlight",
        url: "https://cdn.jsdelivr.net/npm/wikiplus-highlight/main.js",
        file: "src/gadgets/wikiplus-highlight/MediaWiki:Gadget-wikiplus-highlight.js",
    },
    {
        name: "luxon",
        url: "https://cdn.jsdelivr.net/npm/luxon@3/build/global/luxon.min.js",
        file: "src/gadgets/luxon/MediaWiki:Gadget-luxon.js",
        appendCode: "window.luxon = luxon;",
    },
    /* {
        name: "InPageEdit-v2",
        url: "https://cdn.jsdelivr.net/npm/mediawiki-inpageedit/dist/InPageEdit.js",
        file: "src/gadgets/InPageEdit-v2/MediaWiki:Gadget-InPageEdit-v2.js",
    }, */
    {
        name: "libJSON5",
        url: "https://cdn.jsdelivr.net/npm/json5@2/dist/index.js",
        file: "src/gadgets/libJSON5/MediaWiki:Gadget-libJSON5.js",
    },
];
