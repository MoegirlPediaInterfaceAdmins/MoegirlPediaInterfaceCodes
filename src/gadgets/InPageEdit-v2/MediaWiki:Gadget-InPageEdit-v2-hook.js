"use strict";
mw.hook("InPageEdit").add((ctx) => {
    const InPageEdit = ctx.InPageEdit,
        _msg = ctx._msg,
        wgPageName = mw.config.get("wgRelevantPageName"),
        wgRevisionId = mw.config.get("wgRevisionId");
    switch (mw.config.get("skin")) {
        case "vector":
            $("#ca-edit").after(
                $("<li>", {
                    id: "ca-quick-edit",
                    "class": "collapsible",
                }).append(
                    $("<span>").append(
                        $("<a>", {
                            href: "javascript:void(0)",
                            text: typeof Wikiplus !== "undefined" ? `${_msg("quick-edit")}(IPE)` : _msg("quick-edit"),
                        }).on("click", () => {
                            InPageEdit.quickEdit({
                                page: wgPageName,
                                revision: wgRevisionId || undefined,
                            });
                        }),
                    ),
                ),
            );
            break;
        case "moeskin":
        default:
            mw.hook("moeskin.pagetools").add(({ addPageToolsButton }) => {
                const $btn = addPageToolsButton('<span style="align-self:center;font:0.7em bold;">IPE</span>', "快速编辑");
                $btn.attr({
                    id: "ca-inpageedit",
                    href: "javascript:void(0)",
                }).on("click", () => {
                    InPageEdit.quickEdit({
                        page: wgPageName,
                        revision: wgRevisionId || undefined,
                    });
                });
            });
            $(".page-tool-link#ca-inpageedit").insertAfter($(".page-tool-link#ca-edit"));
            break;
    }
});
