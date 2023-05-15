"use strict";
// 本页面大部分内容均直接或间接修改自[[MW:Extension:CodeMirror]]
(async () => {
    await $.ready;
    if (!["edit", "submit"].includes(mw.config.get("wgAction")) || mw.config.get("wgPageContentModel") !== "wikitext") { return; }

    let cm, $doc, state = JSON.parse(localStorage.getItem("wikieditor-codemirror"));
    const $textarea = $("#wpTextbox1");
    const isAdvanced = ["loading", "loaded", "executing", "ready"].includes(mw.loader.getState("ext.wikiEditor"));
    const ns = mw.config.get("wgNamespaceNumber");
    const init = async () => {
        await libCachedCode.injectCachedCode("https://npm.elemecdn.com/codemirror@5.65.1/lib/codemirror.css", "style");
        // 由于 unpkg 不提供 gh 镜像，故通过 [[MediaWiki:Gadget-wikieditor-highlight_codemirror-mediawiki.css]] 提供
        // mw.loader.load("//fastly.jsdelivr.net/gh/bhsd-harry/codemirror-mediawiki@1.1.6/mediawiki.min.css", "text/css");

        // 通过 [[MediaWiki:Gadget-wikieditor-highlight.css]] 提供
        /* mw.loader.addStyleTag("#wikiEditor-ui-toolbar .menu { position: relative; z-index: 5; }" +
            '.CodeMirror pre { font-family: Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace; }' +
            "#wpTextbox1 + .CodeMirror { font-size: 13px; line-height: 1.5; }" +
            ".CodeMirror-matchingbracket { box-shadow: 0 0 0 2px #9aef98; }" +
            ".CodeMirror-nonmatchingbracket { box-shadow: 0 0 0 2px #eace64; }",
        ); */
        const $search = $(".group-search a");

        // 通过下方代码和 [[MediaWiki:Gadget-wikieditor-highlight_codemirror-mediawiki.js]] 提供
        /* const getExt = $.get({
            dataType: "script", cache: true,
            url: "//fastly.jsdelivr.net/combine/npm/codemirror@5.65.1/lib/codemirror.min.js,npm/codemirror@5.65.1/addon/edit/matchbrackets.min.js,npm/wikiplus-highlight@2.22/matchtags.min.js",
        }).then(() => Promise.all([$.get({
            dataType: "script", cache: true,
            url: "//fastly.jsdelivr.net/gh/bhsd-harry/codemirror-mediawiki@1.1.6/mediawiki.min.js",
        })].concat(ns === 274 ? [$.get({
            dataType: "script", cache: true,
            url: "//fastly.jsdelivr.net/npm/codemirror@5.65.1/mode/javascript/javascript.min.js",
        }), $.get({
            dataType: "script", cache: true,
            url: "//fastly.jsdelivr.net/npm/codemirror@5.65.1/mode/css/css.min.js",
        })] : []))); */

        // 由于 unpkg 不提供 gh 镜像，故通过 [[MediaWiki:Gadget-wikieditor-highlight_CodeMirror.js]] 提供
        /* const getJSON = $.get({
            dataType: "json", cache: true,
            url: "//fastly.jsdelivr.net/gh/bhsd-harry/LLWiki@2.16/otherwiki/gadget-CodeMirror.json",
        }).then((config) => {
            if (ns === 274) {
                $.extend(config.tags, { script: true, style: true });
                $.extend(config.tagModes, { script: "javascript", style: "css" });
            }
            window.mwConfig = config;
        });
        await Promise.all([getJSON, getExt]); */
        await Promise.all([
            "https://npm.elemecdn.com/codemirror@5.65.1/lib/codemirror.js",
            "https://npm.elemecdn.com/codemirror@5.65.1/addon/edit/matchbrackets.js",
            "https://npm.elemecdn.com/wikiplus-highlight@2.22.5/matchtags.js",
        ].map((url) => libCachedCode.injectCachedCode(url, "script")));
        if (ns === 274) {
            await Promise.all([
                "https://npm.elemecdn.com/codemirror@5.65.1/mode/javascript/javascript.js",
                "https://npm.elemecdn.com/codemirror@5.65.1/mode/css/css.js",
            ].map((url) => libCachedCode.injectCachedCode(url, "script")));
        }
        if (isAdvanced) {
            cm = new CodeMirror($textarea.parent()[0], {
                mode: "text/mediawiki", mwConfig: window.mwConfig,
                lineWrapping: true, lineNumbers: true, readOnly: $textarea.prop("readonly"),
                matchBrackets: { bracketRegex: /[{}[\]]/ }, matchTags: true,
            });
        } else {
            cm = CodeMirror.fromTextArea($textarea[0], {
                mode: "text/mediawiki", mwConfig: window.mwConfig,
                lineWrapping: true, lineNumbers: true, readOnly: $textarea.prop("readonly"),
                matchBrackets: { bracketRegex: /[{}[\]]/ }, matchTags: true,
            });
            cm.setSize(null, $textarea.height());
        }
        mw.hook("wiki-codemirror").fire(cm);
        $doc = $(cm.getWrapperElement());
        $.valHooks.textarea = {
            get: (ele_1) => ele_1 === $textarea[0] && state ? cm.getValue() : ele_1.value,
            set: (ele_3, val) => { ele_3 === $textarea[0] && state ? cm.setValue(val) : ele_3.value = val; },
        };
        if (mw.loader.getState("jquery.ui.resizable") === "ready") { $doc.resizable({ handles: "s" }); }
        if ($search.length === 0) { return; }
        cm.addKeyMap({ "Ctrl-F": function () { $search.trigger("click"); }, "Cmd-F": function () { $search.trigger("click"); } });
    };
    if (state === null || !isAdvanced) { state = true; }
    if (!isAdvanced) {
        init();
        return;
    }
    const $form = $(document.editform);
    const btn = new OO.ui.ButtonWidget({ classes: ["tool"], icon: "highlight", framed: false, title: "代码高亮开关" }).on("click", () => {
        if (cm) {
            $doc.toggle();
            // eslint-disable-next-line no-use-before-define
            update();
            // eslint-disable-next-line no-use-before-define
        } else { initAndUpdate(); }
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
            if (options.startAndEnd) { return [caretPos, endPos]; }
            return caretPos;
        },
        scrollToCaretPosition: function () {
            cm.scrollIntoView();
            return this;
        },
    };
    const submit = () => { $textarea[0].value = cm.getValue(); };
    const shared = () => {
        btn.$element.toggleClass("tool-active");
        if (state) {
            cm.setValue($textarea[0].value);
            cm.setSize(null, $textarea.height());
        } else { $textarea[0].value = cm.getValue(); }
        $textarea.toggle();
        $form[state ? "on" : "off"]("submit", submit);
        if ($textarea.textSelection) {
            $textarea.textSelection(state ? "register" : "unregister", fn);
        }
    };
    const update = () => {
        state = !state;
        localStorage.setItem("wikieditor-codemirror", state);
        shared();
    };
    const initAndUpdate = () => { init().then(update); };
    const group = $("#wikiEditor-section-main > .group-insert")[0];
    $textarea.on("wikiEditor-toolbar-doneInitialSections", () => {
        btn.$element.appendTo("#wikiEditor-section-main > .group-insert");
    });
    if (group && !group.contains(btn.$element[0])) {
        $textarea.trigger("wikiEditor-toolbar-doneInitialSections");
    }
    if (state) { mw.loader.using("ext.wikiEditor").then(init).then(shared); }
})();
