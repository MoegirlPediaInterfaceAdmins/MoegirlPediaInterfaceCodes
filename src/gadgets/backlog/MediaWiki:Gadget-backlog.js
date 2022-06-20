"use strict";
if (
    (mw.config.get("wgUserGroups").includes("sysop") || mw.config.get("wgUserGroups").includes("patroller")) &&
    mw.config.get("wgArticleId") === 38120 &&
    document.querySelector("#__anntools__inject__")
) {
    mw.loader.load(mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?title=MediaWiki:Gadget-backlog.js/core.js&action=raw&ctype=text/javascript");
}