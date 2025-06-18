"use strict";
(async () => {
    if (!["edit", "submit"].includes(mw.config.get("wgAction"))) {
        return;
    }
    await $.ready;

    const localObjectStorage = new LocalObjectStorage("wikieditor-highlight");
    let cm, state = localObjectStorage.getItem("wikieditor-codemirror", true);
    const $textarea = $("#wpTextbox1");
    const isAdvanced = ["loading", "loaded", "executing", "ready"].includes(mw.loader.getState("ext.wikiEditor"));
    const init = async () => {
        if (!window.CodeMirror6) {
            await libCachedCode.injectCachedCode("https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@latest/dist/wiki.min.js", "js");
        }
        cm = await window.CodeMirror6.fromTextArea($textarea[0]);
        $(".group-codeeditor-main").hide();
    };
    if (!isAdvanced) {
        init();
        return;
    }
    const btnHighlight = new OO.ui.ButtonWidget({
        classes: ["tool"], icon: "highlight", framed: false, title: "代码高亮开关",
    }).on("click", () => {
        (async () => {
            if (cm) {
                cm.toggle();
                $(".group-codeeditor-main").toggle();
            } else {
                await init();
            }
            btnHighlight.$element.remove();
            state = !state;
            localObjectStorage.setItem("wikieditor-codemirror", state);
        })();
    });
    $textarea.on("wikiEditor-toolbar-doneInitialSections", () => {
        btnHighlight.$element.appendTo("#wikiEditor-section-main > .group-insert");
    });
    const group = $("#wikiEditor-section-main > .group-insert")[0];
    if (group && !group.contains(btnHighlight.$element[0])) {
        btnHighlight.$element.appendTo(group);
    }
    if (mw.config.get("wgPageContentModel") !== "wikitext" && mw.user.options.get("usecodeeditor")) {
        state = false;
    }
    if (state) {
        await mw.loader.using(["ext.wikiEditor", "oojs-ui.styles.icons-interactions"]);
        await init();
        btnHighlight.$element.remove();
    }
})();
