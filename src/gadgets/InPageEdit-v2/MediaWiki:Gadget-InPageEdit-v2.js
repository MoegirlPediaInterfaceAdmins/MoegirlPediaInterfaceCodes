"use strict";
mw.loader.load("https://fastly.jsdelivr.net/npm/mediawiki-inpageedit");
if (mw.config.get("skin") === "vector") {
    mw.hook("InPageEdit").add((ctx) => {
        const InPageEdit = ctx.InPageEdit,
            _msg = ctx._msg,
            wgPageName = mw.config.get("wgRelevantPageName"),
            wgRevisionId = mw.config.get("wgRevisionId");
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
    });
}