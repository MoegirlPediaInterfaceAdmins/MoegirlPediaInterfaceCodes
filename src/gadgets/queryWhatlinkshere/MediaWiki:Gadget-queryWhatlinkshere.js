// <pre>
"use strict";
var target = mw.config.get("wgRelevantPageName");
if (mw.config.get("wgCanonicalSpecialPageName") === "Whatlinkshere" && typeof target === "string" && target.length > 0) {
    mw.loader.load(mw.config.get("wgServer") + mw.config.get("wgScriptPath") + '/index.php?title=MediaWiki:Gadget-queryWhatlinkshere.js/core.js&action=raw&ctype=text/javascript');
}
// </pre>