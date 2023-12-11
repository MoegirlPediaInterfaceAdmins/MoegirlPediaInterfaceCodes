"use strict";
// 本页面大部分内容均直接或间接修改自[[MW:Extension:CodeMirror]]
(async () => {
    await $.ready;
    if (!["edit", "submit"].includes(mw.config.get("wgAction")) || mw.config.get("wgPageContentModel") !== "wikitext") {
        return;
    }

    const localObjectStorage = new LocalObjectStorage("wikieditor-highlight");
    let cm, $doc, state = localObjectStorage.getItem("wikieditor-codemirror", false);
    const $textarea = $("#wpTextbox1");
    const isAdvanced = ["loading", "loaded", "executing", "ready"].includes(mw.loader.getState("ext.wikiEditor"));
    const ns = mw.config.get("wgNamespaceNumber");
    const init = async () => {
        const $search = $(".group-search a");
        await libCachedCode.batchInjectCachedCode([
            "https://npm.elemecdn.com/codemirror@5.65.1/lib/codemirror.css",
            "https://npm.elemecdn.com/@bhsd/codemirror-mediawiki@1.1.12/mediawiki.css",
        ], "style");
        await libCachedCode.batchInjectCachedCode([
            "https://npm.elemecdn.com/codemirror@5.65.1/lib/codemirror.js",
            // "https://npm.elemecdn.com/codemirror@5.65.1/addon/edit/matchbrackets.js",
            // "https://npm.elemecdn.com/wikiplus-highlight@2.60.3/matchtags.js",
        ], "script");
        await libCachedCode.batchInjectCachedCode([
            "https://npm.elemecdn.com/@bhsd/codemirror-mediawiki@1.1.12/mediawiki.js",
            ...ns === 274 ? [
                "https://npm.elemecdn.com/codemirror@5.65.1/mode/javascript/javascript.js",
                "https://npm.elemecdn.com/codemirror@5.65.1/mode/css/css.js",
            ] : [],
        ], "script");
        const mwConfig = JSON.parse(await libCachedCode.getCachedCode("https://npm.elemecdn.com/@bhsd/codemirror-mediawiki@1.1.12/config.json"));
        if (ns === 274) {
            $.extend(mwConfig.tags, {
                script: true, style: true,
            });
            $.extend(mwConfig.tagModes, {
                script: "javascript", style: "css",
            });
        }
        if (isAdvanced) {
            cm = new CodeMirror($textarea.parent()[0], {
                mode: "text/mediawiki", mwConfig,
                lineWrapping: true, lineNumbers: true, readOnly: $textarea.prop("readonly"),
                matchBrackets: {
                    bracketRegex: /[{}[\]]/,
                }, matchTags: true,
            });
        } else {
            cm = CodeMirror.fromTextArea($textarea[0], {
                mode: "text/mediawiki", mwConfig,
                lineWrapping: true, lineNumbers: true, readOnly: $textarea.prop("readonly"),
                matchBrackets: {
                    bracketRegex: /[{}[\]]/,
                }, matchTags: true,
            });
            cm.setSize(null, $textarea.height());
        }
        mw.hook("wiki-codemirror").fire(cm);
        $doc = $(cm.getWrapperElement());
        $.valHooks.textarea = {
            get: (ele_1) => ele_1 === $textarea[0] && state ? cm.getValue() : ele_1.value,
            set: (ele_3, val) => {
                ele_3 === $textarea[0] && state ? cm.setValue(val) : ele_3.value = val;
            },
        };
        if (mw.loader.getState("jquery.ui.resizable") === "ready") {
            $doc.resizable({
                handles: "s",
            });
        }
        if ($search.length === 0) {
            return;
        }
        cm.addKeyMap({
            "Ctrl-F": () => {
                $search.trigger("click");
            },
            "Cmd-F": () => {
                $search.trigger("click");
            },
        });
    };
    if (state === null || !isAdvanced) {
        state = true;
    }
    if (!isAdvanced) {
        init();
        return;
    }
    const $form = $(document.editform);
    const btn = new OO.ui.ButtonWidget({
        classes: ["tool"], icon: "highlight", framed: false, title: "代码高亮开关",
    }).on("click", () => {
        if (cm) {
            $doc.toggle();
            // eslint-disable-next-line no-use-before-define
            update();
        } else {
            // eslint-disable-next-line no-use-before-define
            initAndUpdate();
        }
    });
    const fn = {
        getSelection: () => cm.getSelection(),
        setSelection: function (options) {
            cm.setSelection(cm.posFromIndex(options.start), cm.posFromIndex(options.end));
            cm.focus();
            return this;
        },
        getCaretPosition: (options) => {
            const caretPos = cm.indexFromPos(cm.getCursor("from")),
                endPos = cm.indexFromPos(cm.getCursor("to"));
            if (options.startAndEnd) {
                return [caretPos, endPos];
            }
            return caretPos;
        },
        scrollToCaretPosition: function () {
            cm.scrollIntoView();
            return this;
        },
    };
    const submit = () => {
        $textarea[0].value = cm.getValue();
    };
    const shared = () => {
        btn.$element.toggleClass("tool-active");
        if (state) {
            cm.setValue($textarea[0].value);
            cm.setSize(null, $textarea.height());
        } else {
            $textarea[0].value = cm.getValue();
        }
        $textarea.toggle();
        $form[state ? "on" : "off"]("submit", submit);
        if ($textarea.textSelection) {
            $textarea.textSelection(state ? "register" : "unregister", fn);
        }
    };
    const update = () => {
        state = !state;
        localObjectStorage.setItem("wikieditor-codemirror", state);
        shared();
    };
    const initAndUpdate = () => {
        init().then(update);
    };
    const group = $("#wikiEditor-section-main > .group-insert")[0];
    $textarea.on("wikiEditor-toolbar-doneInitialSections", () => {
        btn.$element.appendTo("#wikiEditor-section-main > .group-insert");
    });
    if (group && !group.contains(btn.$element[0])) {
        $textarea.trigger("wikiEditor-toolbar-doneInitialSections");
    }
    if (state) {
        mw.loader.using("ext.wikiEditor").then(init).then(shared);
    }
})();
