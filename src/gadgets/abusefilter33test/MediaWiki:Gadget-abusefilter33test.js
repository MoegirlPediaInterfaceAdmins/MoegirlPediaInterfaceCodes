$(function(){
    if (!mw.config.get("wgUserGroups").includes("sysop")) {
        return;
    }
    if (mw.config.get("wgCanonicalSpecialPageName") !== "AbuseLog") {
        return;
    }
    mw.loader.load(mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?title=MediaWiki:Gadget-abusefilter33test.js/core.js&action=raw&ctype=text/javascript");
});