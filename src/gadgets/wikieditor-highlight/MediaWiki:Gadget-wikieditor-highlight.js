"use strict";
// 本页面大部分内容均直接或间接修改自[[MW:Extension:CodeMirror]]
(async () => {
    if (!["edit", "submit"].includes(mw.config.get("wgAction")) || mw.config.get("wgPageContentModel") !== "wikitext") {
        return;
    }
    await $.ready;

    const localObjectStorage = new LocalObjectStorage("wikieditor-highlight");
    let cm, state = localObjectStorage.getItem("wikieditor-codemirror", false);
    const $textarea = $("#wpTextbox1");
    const isAdvanced = ["loading", "loaded", "executing", "ready"].includes(mw.loader.getState("ext.wikiEditor"));
    const lang = mw.config.get("wgNamespaceNumber") === 274 ? "html" : "mediawiki";
    const init = async () => {
        await import("https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@2.1.2/mw/dist/base.min.js");
        cm = await CodeMirror.fromTextArea($textarea[0], lang);
        cm.defaultLint(true);
        cm.prefer([
            "highlightSpecialChars",
            "highlightActiveLine",
            "highlightWhitespace",
            "bracketMatching",
            "closeBrackets",
        ]);
    };
    if (!isAdvanced) {
        init();
        return;
    } else if (state === null || !isAdvanced) {
        state = true;
    }
    const btn = new OO.ui.ButtonWidget({
        classes: ["tool"], icon: "highlight", framed: false, title: "代码高亮开关",
    }).on("click", async () => {
        if (cm) {
            cm.toggle();
        } else {
            await init();
        }
        btn.$element.toggleClass("tool-active");
        state = !state;
        localObjectStorage.setItem("wikieditor-codemirror", state);
    });
    const group = $("#wikiEditor-section-main > .group-insert")[0];
    $textarea.on("wikiEditor-toolbar-doneInitialSections", () => {
        btn.$element.appendTo("#wikiEditor-section-main > .group-insert");
    });
    if (group && !group.contains(btn.$element[0])) {
        $textarea.trigger("wikiEditor-toolbar-doneInitialSections");
    }
    if (state) {
        await mw.loader.using("ext.wikiEditor");
        await init();
        btn.$element.addClass("tool-active");
    }
})();
