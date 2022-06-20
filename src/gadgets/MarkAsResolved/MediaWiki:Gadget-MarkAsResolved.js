var wgUserGroups = mw.config.get("wgUserGroups");
if (/^萌娘百科_talk:讨论版\/[^\/]+$/.test(mw.config.get("wgPageName")) && (wgUserGroups.includes("sysop") || wgUserGroups.includes("patroller"))) {
    mw.loader.load(mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?title=MediaWiki:Gadget-MarkAsResolved.js/core.js&action=raw&ctype=text/javascript");
}