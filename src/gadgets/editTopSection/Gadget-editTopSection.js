"use strict";
// <pre>
$(() => {
    if ($(".mw-editsection")[0] && !$("#template-documentation, .template-documentation")[0]) {
        switch (mw.config.get("skin")) {
            case "vector-2022":
                $("#ca-edit").after(`<li id="ca-editTopSection" class="vector-tab-noicon mw-list-item"><a href="${$("#ca-edit a").attr("href")}&section=0" title="编辑本页序言">${wgULS("编辑序言", "編輯序言")}</a></li>`);
                break;
            case "moeskin":
            default:
                mw.hook("moeskin.pagetools").add(({ addPageToolsButton }) => {
                    const $btn = addPageToolsButton("<span style=\"align-self:center;\">序</span>", wgULS("编辑序言", "編輯序言"));
                    $btn.attr({
                        id: "ca-editTopSection",
                        href: `${$("a.page-tool-link#ca-edit").attr("href")}&section=0`,
                    });
                });
                $(".page-tool-link#ca-editTopSection").insertAfter($(".page-tool-link#ca-edit"));
                break;
        }
    }
});
// </pre>
