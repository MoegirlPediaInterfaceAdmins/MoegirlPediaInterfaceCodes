"use strict";
/**
 * @type {{ url: string, file: string}[]}
 */
module.exports = [
    {
        name: "wikiplus-highlight",
        url: "https://cdn.jsdelivr.net/npm/wikiplus-highlight",
        file: "src/gadgets/wikiplus-highlight/MediaWiki:Gadget-wikiplus-highlight.js",
    },
    /* {
        name: "InPageEdit-v2",
        url: "https://cdn.jsdelivr.net/npm/mediawiki-inpageedit",
        file: "src/gadgets/InPageEdit-v2/MediaWiki:Gadget-InPageEdit-v2.js",
    }, */
    {
        name: "jquery.ui-js",
        url: "https://zh.wikipedia.org/w/load.php?debug=true&lang=zh-cn&modules=jquery.ui&skin=vector&only=scripts",
        file: "src/gadgets/jquery.ui/MediaWiki:Gadget-jquery.ui.js",
    },
    {
        name: "jquery.ui-css",
        url: "https://zh.wikipedia.org/w/load.php?debug=true&lang=zh-cn&modules=jquery.ui&skin=vector&only=styles",
        file: "src/gadgets/jquery.ui/MediaWiki:Gadget-jquery.ui.css",
    },
];