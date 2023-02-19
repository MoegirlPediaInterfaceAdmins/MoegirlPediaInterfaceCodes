// <pre>
// [[User:GuoPC/js/WikiplusPageTool.js]]
"use strict";
$(() => {
    if (mw.config.get("skin") !== "moeskin" || $("#ca-edit").length === 0) {
        return;
    }
    const timer = setInterval(() => {
        if ($("#Wikiplus-Edit-TopBtn").length > 0) {
            clearInterval(timer);
            mw.hook("moeskin.pagetools").add(({ addPageToolsButton }) => {
                const $btn = addPageToolsButton('<span style="align-self:center;font:0.7em bold;">W+</span>', "快速编辑");
                $btn.attr("id", "ca-wikiplus").on("click", () => {
                    $("#Wikiplus-Edit-TopBtn").trigger("click");
                });
            });
            $(".page-tool-link#ca-wikiplus").insertAfter($(".page-tool-link#ca-edit"));
        } else {
            return;
        }
    }, 3000);
});
// </pre>
