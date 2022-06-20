"use strict";
var target = (document.querySelector('[name="target"]') || {}).value;
if (mw.config.get("wgCanonicalSpecialPageName") === "Contributions" && typeof target === "string" && target.length > 0) {
    mw.loader.load(`${mw.config.get("wgServer") + mw.config.get("wgScriptPath") }/index.php?title=MediaWiki:Gadget-queryContributions.js/core.js&action=raw&ctype=text/javascript`);
}