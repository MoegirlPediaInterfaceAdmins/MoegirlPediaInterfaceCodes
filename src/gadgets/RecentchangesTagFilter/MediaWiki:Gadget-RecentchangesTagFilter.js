"use strict";
if (mw.config.get("wgCanonicalSpecialPageName") === "Recentchanges" && mw.config.get("wgUserGroups").includes("autoconfirmed")) {
    mw.loader.load(mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?title=User:AnnAngela/js/RecentchangesTagFilter.js&action=raw&ctype=text/javascript");
}