"use strict";
if (["Recentchanges", "Watchlist"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
    mw.loader.load(`${mw.config.get("wgServer") + mw.config.get("wgScriptPath") }/index.php?title=MediaWiki:Gadget-patrolPlus.js/core.js&action=raw&ctype=text/javascript`);
}