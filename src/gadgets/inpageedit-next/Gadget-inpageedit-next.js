"use strict";

window.RLQ ||= [];
window.RLQ.push([
    ["mediawiki.base", "mediawiki.notification"],
    () => {
        const isLoadedV2 = mw.loader.getState("ext.gadget.InPageEdit-v2") === "ready" || window.InPageEdit?.__loaded === true;
        if (isLoadedV2) {
            mw.notify("无法同时安装 InPageEdit v2 和 InPageEdit NEXT，请卸载其中之一。", {
                type: "warning",
            });
            return;
        }

        // InPageEdit NEXT
        document.body.append(
            Object.assign(document.createElement("script"), {
                src: "https://cdn.jsdelivr.net/npm/@inpageedit/core/dist/index.js",
                type: "module",
            }),
        );

        mw.hook("InPageEdit.ready").add((ctx) => {
            const wgPageName = mw.config.get("wgRelevantPageName");
            const wgRevisionId = mw.config.get("wgRevisionId");
            switch (mw.config.get("skin")) {
                case "vector-2022": {
                    $("#ca-edit").after(
                        $("<li>", {
                            id: "ca-quick-edit",
                            "class": "vector-tab-noicon mw-list-item",
                        }).append(
                            $("<a>", {
                                href: "javascript:void(0)",
                                text: typeof Wikiplus !== "undefined" ? "快速编辑(IPE)" : "快速编辑",
                            }).on("click", () => {
                                ctx.quickEdit({
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
                            ctx.quickEdit({
                                page: wgPageName,
                                revision: wgRevisionId || undefined,
                            });
                        });
                    });
                    $(".page-tool-link#ca-inpageedit").insertAfter($(".page-tool-link#ca-edit"));
                    break;
                }
            }
        });
    },
]);
