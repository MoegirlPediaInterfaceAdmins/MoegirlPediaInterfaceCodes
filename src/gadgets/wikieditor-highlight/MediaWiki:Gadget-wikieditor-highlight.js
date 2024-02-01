"use strict";
// 本页面大部分内容均直接或间接修改自[[MW:Extension:CodeMirror]]
(async () => {
    if (!["edit", "submit"].includes(mw.config.get("wgAction")) || mw.config.get("wgPageContentModel") !== "wikitext") {
        return;
    }
    await $.ready;

    const localObjectStorage = new LocalObjectStorage("wikieditor-highlight");
    let cm, state = localObjectStorage.getItem("wikieditor-codemirror", true);
    const $textarea = $("#wpTextbox1");
    const isAdvanced = ["loading", "loaded", "executing", "ready"].includes(mw.loader.getState("ext.wikiEditor"));
    const ns = mw.config.get("wgNamespaceNumber");
    const lang = ns === 274 ? "html" : "mediawiki";
    const init = async () => {
        if (!window.CodeMirror6) {
            await new Promise((resolve) => {
                const script = document.createElement("script");
                script.addEventListener("load", resolve);
                script.type = "module";
                script.src = "https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki/dist/mw.min.js";
                document.head.append(script);
            });
        }
        cm = await window.CodeMirror6.fromTextArea($textarea[0], lang);
        cm.prefer([
            "highlightSpecialChars",
            "highlightActiveLine",
            "bracketMatching",
            "closeBrackets",
            "allowMultipleSelections",
        ]);
        const [config] = await Promise.all([
            libCachedCode.getCachedCode("https://testingcf.jsdelivr.net/npm/wikiparser-node/config/moegirl.json"),
            cm.defaultLint(true, { include: [2, 10, 828].includes(ns) }),
        ]);
        try {
            window.wikiparse?.setConfig(JSON.parse(config));
        } catch (e) {
            console.error(e);
        }
    };
    if (!isAdvanced) {
        init();
        return;
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
    $textarea.on("wikiEditor-toolbar-doneInitialSections", () => {
        btn.$element.appendTo("#wikiEditor-section-main > .group-insert");
    });
    const group = $("#wikiEditor-section-main > .group-insert")[0];
    if (group && !group.contains(btn.$element[0])) {
        btn.$element.appendTo(group);
    }
    if (state) {
        await mw.loader.using("ext.wikiEditor");
        await init();
        btn.$element.addClass("tool-active");
    }
})();
