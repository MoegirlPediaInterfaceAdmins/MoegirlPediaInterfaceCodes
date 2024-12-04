"use strict";
// 本页面大部分内容均直接或间接修改自[[MW:Extension:CodeMirror]]
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
    const btn = new OO.ui.ButtonWidget({
        classes: ["tool"], icon: "highlight", framed: false, title: "代码高亮开关",
    }).on("click", async () => {
        if (cm) {
            cm.toggle();
            $(".group-codeeditor-main").toggle();
            btn2.$element.toggle();
        } else {
            await init();
            btn.$element.after(btn2.$element);
        }
        btn.$element.toggleClass("tool-active");
        state = !state;
        localObjectStorage.setItem("wikieditor-codemirror", state);
    });
    const btn2 = new OO.ui.ButtonWidget({
        classes: ["tool"], icon: "settings", framed: false, title: "代码高亮设置",
    }).on("click", async () => {
        $("#cm-settings").trigger("click");
    });
    $textarea.on("wikiEditor-toolbar-doneInitialSections", () => {
        btn.$element.appendTo("#wikiEditor-section-main > .group-insert");
    });
    const group = $("#wikiEditor-section-main > .group-insert")[0];
    if (group && !group.contains(btn.$element[0])) {
        btn.$element.appendTo(group);
    }
    if (mw.config.get("wgPageContentModel") !== "wikitext" && mw.user.options.get("usecodeeditor")) {
        state = false;
    }
    if (state) {
        await mw.loader.using(["ext.wikiEditor", "oojs-ui.styles.icons-interactions"]);
        await init();
        btn.$element.addClass("tool-active");
        btn.$element.after(btn2.$element);
    }
})();
