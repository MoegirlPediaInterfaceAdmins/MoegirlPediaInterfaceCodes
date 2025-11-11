"use strict";

window.RLQ ||= [];
window.RLQ.push([
    ["mediawiki.base", "mediawiki.notification"],
    () => {
        const isLoadedNext = mw.loader.getState("ext.gadget.inpageedit-next") === "ready" || window[Symbol.for("InPageEdit#autoload")] !== void 0;
        if (isLoadedNext) {
            mw.notify("无法同时安装 InPageEdit v2 和 InPageEdit NEXT，请卸载其中之一。", {
                type: "warning",
            });
            return;
        }
        mw.loader.load("https://testingcf.jsdelivr.net/npm/mediawiki-inpageedit@latest");
    },
]);

mw.hook("InPageEdit").add((ctx) => {
    const InPageEdit = ctx.InPageEdit,
        _msg = ctx._msg,
        wgPageName = mw.config.get("wgRelevantPageName"),
        wgRevisionId = mw.config.get("wgRevisionId");
    switch (mw.config.get("skin")) {
        case "vector-2022": {
            $("#ca-edit").after(
                $("<li>", {
                    id: "ca-quick-edit",
                    "class": "vector-tab-noicon mw-list-item",
                }).append(
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
            );
            break;
        }
        case "moeskin":
        default: {
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
    }
    $(".mw-history-compareselectedversions button").addClass("cdx-button");
});
