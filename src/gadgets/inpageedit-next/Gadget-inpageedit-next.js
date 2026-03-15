"use strict";

(() => {
    const isLoadedV2 = mw.loader.getState("ext.gadget.InPageEdit-v2") === "ready" || window.InPageEdit?.__loaded === true;
    if (isLoadedV2) {
        mw.notify("无法同时安装 InPageEdit v2 和 InPageEdit NEXT，请卸载其中之一。", {
            type: "warn",
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
})();

// Plugin: Skin Edit Button
mw.hook("InPageEdit.ready").add((ipe) => {
    ipe.plugin({
        name: "skin-edit-button",
        inject: ["quickEdit", "wiki", "currentPage"],
        apply: (ctx) => {
            // Constants
            const title = ctx.currentPage.wikiTitle;
            const revisionId = +ctx.currentPage.params.get("oldid") || undefined;
            /** @type {HTMLElement} */
            let editButton;
            // Clean up on dispose
            ctx.on("dispose", () => {
                if (editButton) {
                    editButton.remove();
                }
            });

            // Utils
            const QuickEditSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-pencil-bolt ipe-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path><path d="M13.5 6.5l4 4"></path><path d="M19 16l-2 3h4l-2 3"></path></svg>';
            /** @type {(ev: Event) => void} */
            const openEditor = (ev) => {
                ev.preventDefault();
                ctx.quickEdit.showModal({
                    title: title.toString(),
                    revision: revisionId,
                });
            };

            // This page is not editable
            if (title.getNamespaceId() < 0 || !ctx.wiki.hasRight("edit")) {
                ctx.scope.dispose();
                return;
            }

            const isVector2022 = document.body.classList.contains("skin-vector-2022");
            const isMoeSkin = document.body.classList.contains("skin-moeskin");
            if (isVector2022) {
                const caEdit = document.getElementById("ca-edit");
                if (caEdit) {
                    editButton = document.createElement("li");
                    editButton.id = "ca-quick-edit";
                    editButton.className = "vector-tab-noicon mw-list-item";

                    const link = document.createElement("a");
                    link.href = "#";
                    link.innerHTML = `编辑 ${QuickEditSvg}`;
                    link.addEventListener("click", openEditor);

                    editButton.appendChild(link);
                    caEdit.insertAdjacentElement("beforebegin", editButton);
                }
            } else if (isMoeSkin) {
                /** @type {HTMLAnchorElement} */
                const caEdit = document.querySelector(".page-tool-link#ca-edit");
                if (caEdit) {
                    // @ts-ignore caEdit is HTMLAnchorElement
                    editButton = caEdit.cloneNode(true);
                    editButton.id = "ca-inpageedit";
                    editButton.setAttribute("href", "#");
                    editButton.addEventListener("click", openEditor);
                    editButton.querySelector(".moe-icon").innerHTML = QuickEditSvg.replace("ipe-icon", "");
                    editButton.querySelector(".tooltip").textContent = "使用 IPE 编辑";

                    caEdit.insertAdjacentElement("afterend", editButton);
                }
            }
        },
    });
});
