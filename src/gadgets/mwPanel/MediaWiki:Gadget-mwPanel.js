"use strict";
// <pre>
$(() => {
    const wgPageName = mw.config.get("wgRelevantPageName");
    const items = {
        "#t-upload": {
            "t-expandtemplates": `<li id="t-expandtemplates"><a href="/Special:展开模板?wpRemoveComments=1&wpInput={{${wgPageName}}}">${ wgULS("展开模板","展開模板") }</a></li>`,
            "t-prefixindex": `<li id="t-prefixindex"><a href="/Special:前缀索引?prefix=${wgPageName}">${ wgULS("前缀页面","按詞頭查詢頁面") }</a></li>`,
            "t-pagelog": `<li id="t-pagelog"><a href="/Special:日志?page=${wgPageName}">${ wgULS("页面日志","頁面日誌") }</a></li>`,
            "t-replacetext": `<li id="t-replacetext" class="sysop-show"><a href="/Special:替换文本">${ wgULS("替换文本","取代文字") }</a></li>`,
        },
        "#n-recentchanges": {
            "n-log": `<li id="n-log"><a href="/Special:日志" title="所有日志">${ wgULS("所有日志","所有日誌") }</a></li>`,
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
