"use strict";
// <pre>
$(() => {
    const toc = $("#toc, #mw-content-text > .mw-parser-output > .toc").first();
    if (toc[0] && mw.config.exists("wgFlowThreadConfig")) { //同时存在Flowthread评论栏和目录的页面，在目录添加Flowthread评论栏链接
        toc.find("li.toclevel-1:last-child").after(`<li class="toclevel-1"><a href="#flowthread"><span class="tocnumber">${ +toc.find("li.toclevel-1 span.tocnumber:last-child").text() + 1 }</span> <span class="toctext">${ wgUVS("评论区", "評論區") }</span></a></li>`);
    }
});
// </pre>