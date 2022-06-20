"use strict";
// <pre>
$(() => {
    const items = {
        "#t-upload": {
            "t-expandtemplates": `<li id="t-expandtemplates"><a href="${ mw.config.get("wgServer") }${mw.config.get("wgScriptPath") }/index.php?title=Special:%E5%B1%95%E5%BC%80%E6%A8%A1%E6%9D%BF&wpRemoveComments=1&wpInput={{${ mw.config.get("wgPageName") }}}">${ wgULS("展开模板","展開模板") }</a></li>`,
            "t-Prefixindex": `<li id="t-Prefixindex"><a href="${ mw.config.get("wgServer") }${mw.config.get("wgScriptPath") }/index.php?title=Special%3A前缀索引&prefix=${ mw.config.get("wgTitle") }&namespace=${ mw.config.get("wgNamespaceNumber") }">${ wgULS("前缀页面","按詞頭查詢頁面") }</a></li>`,
            "t-pagelog": `<li id="t-pagelog"><a href="${ mw.config.get("wgServer") }${mw.config.get("wgScriptPath") }/index.php?title=Special:%E6%97%A5%E5%BF%97&page=${ mw.config.get("wgPageName") }">${ wgULS("页面日志","頁面日誌") }</a></li>`,
            "t-replacetext": `<li id="t-replacetext" class="sysop-show"><a href="/Special:替换文本">${ wgULS("替换文本","取代文字") }</a></li>`,
        },
        "#n-recentchanges": {
            "n-log": `<li id="n-log"><a href="/Special:log" title="所有日志">${ wgULS("所有日志","所有日誌") }</a></li>`,
        },
    };
    for (const t in items) {
        const target = $(t);
        for (const i in items[t]) {
            if (!document.getElementById(i)) {
                target.after(items[t][i]);
            }
        }
    }
    mw.loader.addStyleTag("#t-expandtemplates, #t-userlog, .ns-2 #t-pagelog, .ns-3 #t-pagelog, .ns--1 #t-pagelog {display:none;}.ns-10 #t-expandtemplates, .ns-2 #t-userlog, .ns-3 #t-userlog {display:list-item!important;}");
    $("#t-log a").text( wgULS("用户日志","使用者日誌",null,null,"用戶日誌") );
});
// </pre>