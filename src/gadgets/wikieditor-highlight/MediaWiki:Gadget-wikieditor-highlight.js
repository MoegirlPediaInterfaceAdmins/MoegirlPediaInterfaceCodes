// From [[Special:固定链接/5338321]] and [[Special:固定链接/5337466]]
/* global CodeMirror */
// 本页面大部分内容均直接或间接修改自[[MW:Extension:CodeMirror]]
"use strict";
var __awaiter = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
        });
    }
    return new(P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1) throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [0];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [6, e];
            y = 0;
        } finally {
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
$(function() {
    return (function() {
        return __awaiter(void 0, void 0, void 0, function() {
            var cm, $doc, state, $textarea, isAdvanced, ns, init, $form, btn, fn, submit, shared, update, initAndUpdate, group;
            return __generator(this, function(_a) {
                switch (_a.label) {
                    case 0:
                        if (!["edit", "submit"].includes(mw.config.get("wgAction")) ||
                            mw.config.get("wgPageContentModel") !== "wikitext") {
                            return [2 /*return*/ ];
                        }
                        state = JSON.parse(localStorage.getItem("wikieditor-codemirror"));
                        $textarea = $("#wpTextbox1");
                        isAdvanced = ["loading", "loaded", "executing", "ready"].includes(mw.loader.getState("ext.wikiEditor"));
                        ns = mw.config.get("wgNamespaceNumber");
                        init = function() {
                            return __awaiter(void 0, void 0, void 0, function() {
                                var $search, addon, config;
                                return __generator(this, function(_a) {
                                    switch (_a.label) {
                                        case 0:
                                            mw.loader.load("//fastly.jsdelivr.net/npm/codemirror@5.65.1/lib/codemirror.min.css", "text/css");
                                            mw.loader.load("//fastly.jsdelivr.net/gh/bhsd-harry/codemirror-mediawiki@1.1.1/mediawiki.min.css", "text/css");
                                            mw.loader.addStyleTag("\n#wikiEditor-ui-toolbar .menu {\n    position: relative;\n    z-index: 5;\n}\n\n.CodeMirror pre {\n    font-family: Monaco, Menlo, \"Ubuntu Mono\", Consolas, \"source-code-pro\", monospace;\n}\n\n.skin-vector #wpTextbox1:not([readonly])+.CodeMirror {\n    font-size: 13px;\n    line-height: 1.5;\n}\n\n#wpTextbox1[readonly]+.CodeMirror,\n.skin-minerva #wpTextbox1+.CodeMirror {\n    font-size: 16px;\n    line-height: 1.2;\n    border: 1px solid #c8ccd1;\n}\n\n.cm-matchingbracket,\n.cm-nonmatchingbracket {\n    margin: -1px;\n    border: 1px solid #c0c0c0;\n}\n\n.cm-matchingbracket {\n    background-color: #0b04;\n}\n\n.cm-nonmatchingbracket {\n    background-color: #ec14;\n}\n            ");
                                            $search = $(".group-search a");
                                            addon = function() {
                                                var Pos = CodeMirror.Pos,
                                                    defaults = {
                                                        bracketRegex: /[{}[\]]/,
                                                        maxScanLineLength: 3000,
                                                        maxScanLines: 100,
                                                        afterCursor: false,
                                                        strict: false,
                                                        maxHighlightLineLength: 1000,
                                                        highlightNonMatching: true,
                                                    };
                                                var matching = {
                                                    "[": "]>",
                                                    "]": "[<",
                                                    "{": "}>",
                                                    "}": "{<",
                                                };
                                                var pair = {
                                                    "[": /[[\]]/,
                                                    "]": /[[\]]/,
                                                    "{": /[{}]/,
                                                    "}": /[{}]/,
                                                };
                                                var bracketRegex = function(config) {
                                                    return config && config.bracketRegex;
                                                };
                                                var scanForBracket = function(cm, where, dir, style, config) {
                                                    var maxScanLen = config && config.maxScanLineLength;
                                                    var maxScanLines = config && config.maxScanLines;
                                                    var stack = [];
                                                    var re = bracketRegex(config);
                                                    var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lineCount()) : Math.max(-1, where.line - maxScanLines);
                                                    var lineNo = where.line;
                                                    for (; lineNo !== lineEnd; lineNo += dir) {
                                                        var line = cm.getLine(lineNo);
                                                        if (!line || line.length > maxScanLen) {
                                                            continue;
                                                        }
                                                        var end = dir > 0 ? line.length : -1;
                                                        var pos = dir > 0 ? 0 : line.length - 1;
                                                        if (lineNo === where.line) {
                                                            pos = where.ch - (dir < 0 ? 1 : 0);
                                                        }
                                                        for (; pos !== end; pos += dir) {
                                                            var ch = line.charAt(pos);
                                                            if (re.test(ch) && (style === undefined ||
                                                                    (cm.getTokenTypeAt(Pos(lineNo, pos + 1)) || "") === (style || ""))) {
                                                                var match = matching[ch];
                                                                if (match && match.charAt(1) === ">" === dir > 0) {
                                                                    stack.push(ch);
                                                                } else if (stack.length === 0) {
                                                                    return {
                                                                        pos: Pos(lineNo, pos),
                                                                        ch: ch,
                                                                    };
                                                                } else {
                                                                    stack.pop();
                                                                }
                                                            }
                                                        }
                                                    }
                                                    return lineNo - dir === (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
                                                };
                                                var findMatchingBracket = function(cm, where, config) {
                                                    var line = cm.getLine(where.line);
                                                    var re = bracketRegex(config);
                                                    var afterCursor = config && config.afterCursor;
                                                    var pos = !afterCursor && where.ch > 0 ? where.ch - 1 : where.ch;
                                                    var key = line.charAt(pos);
                                                    var match = re.test(key) && matching[key];
                                                    if (!match) {
                                                        return null;
                                                    }
                                                    var dir = match.charAt(1) === ">" ? 1 : -1;
                                                    if (config && config.strict && dir > 0 !== (pos === where.ch)) {
                                                        return null;
                                                    }
                                                    var newConfig = Object.assign({}, config, {
                                                        bracketRegex: pair[key],
                                                    });
                                                    var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));
                                                    var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style, newConfig);
                                                    if (found === null) {
                                                        return null;
                                                    }
                                                    return {
                                                        from: Pos(where.line, pos),
                                                        to: found && found.pos,
                                                        match: found && found.ch === match.charAt(0),
                                                        forward: dir > 0,
                                                    };
                                                };
                                                var markChar = function(cm, pos, style) {
                                                    return cm.markText(pos, Pos(pos.line, pos.ch + 1), {
                                                        className: style,
                                                    });
                                                };
                                                var matchBrackets = function(cm, autoclear, _config) {
                                                    var config = _config || cm.state.matchBrackets;
                                                    var maxHighlightLen = config && config.maxHighlightLineLength;
                                                    var highlightNonMatching = config && config.highlightNonMatching;
                                                    var marks = [];
                                                    cm.listSelections().forEach(function(range) {
                                                        var match = range.empty() && findMatchingBracket(cm, range.head, config);
                                                        if (match && (match.match || highlightNonMatching) &&
                                                            cm.getLine(match.from.line).length <= maxHighlightLen) {
                                                            var style = match.match ? "cm-matchingbracket" : "cm-nonmatchingbracket";
                                                            marks.push(markChar(cm, match.from, style));
                                                            if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen) {
                                                                marks.push(markChar(cm, match.to, style));
                                                            }
                                                        }
                                                    });
                                                    if (marks.length) {
                                                        var clear = function() {
                                                            cm.operation(function() {
                                                                marks.forEach(function(mark) {
                                                                    mark.clear();
                                                                });
                                                            });
                                                        };
                                                        if (autoclear) {
                                                            setTimeout(clear, 800);
                                                        } else {
                                                            return clear;
                                                        }
                                                    }
                                                };
                                                var doMatchBrackets = function(cm) {
                                                    cm.operation(function() {
                                                        if (cm.state.matchBrackets.currentlyHighlighted) {
                                                            cm.state.matchBrackets.currentlyHighlighted();
                                                            cm.state.matchBrackets.currentlyHighlighted = null;
                                                        }
                                                        cm.state.matchBrackets.currentlyHighlighted = matchBrackets(cm, false);
                                                    });
                                                };
                                                var clearHighlighted = function(cm) {
                                                    if (cm.state.matchBrackets && cm.state.matchBrackets.currentlyHighlighted) {
                                                        cm.state.matchBrackets.currentlyHighlighted();
                                                        cm.state.matchBrackets.currentlyHighlighted = null;
                                                    }
                                                };
                                                CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
                                                    if (old && old !== CodeMirror.Init) {
                                                        cm.off("cursorActivity", doMatchBrackets);
                                                        cm.off("focus", doMatchBrackets);
                                                        cm.off("blur", clearHighlighted);
                                                        clearHighlighted(cm);
                                                    }
                                                    if (val) {
                                                        cm.state.matchBrackets = $.extend({}, defaults, typeof val === "object" ? val : {});
                                                        cm.on("cursorActivity", doMatchBrackets);
                                                        cm.on("focus", doMatchBrackets);
                                                        cm.on("blur", clearHighlighted);
                                                    }
                                                });
                                                CodeMirror.defineExtension("matchBrackets", function(config) {
                                                    matchBrackets(CodeMirror, true, config);
                                                });
                                            };
                                            return [4 /*yield*/ , $.get({
                                                dataType: "script",
                                                cache: true,
                                                url: "//fastly.jsdelivr.net/npm/codemirror@5.65.1/lib/codemirror.min.js",
                                            })];
                                        case 1:
                                            _a.sent();
                                            addon();
                                            return [4 /*yield*/ , $.get({
                                                dataType: "script",
                                                cache: true,
                                                url: "//fastly.jsdelivr.net/gh/bhsd-harry/codemirror-mediawiki@1.1.1/mediawiki.min.js",
                                            })];
                                        case 2:
                                            _a.sent();
                                            if (!(ns === 274)) return [3 /*break*/ , 4];
                                            return [4 /*yield*/ , Promise.all([
                                                $.get({
                                                    dataType: "script",
                                                    cache: true,
                                                    url: "//fastly.jsdelivr.net/npm/codemirror@5.65.1/mode/javascript/javascript.min.js",
                                                }), $.get({
                                                    dataType: "script",
                                                    cache: true,
                                                    url: "//fastly.jsdelivr.net/npm/codemirror@5.65.1/mode/css/css.min.js",
                                                }),
                                            ])];
                                        case 3:
                                            _a.sent();
                                            _a.label = 4;
                                        case 4:
                                            return [4 /*yield*/ , $.get({
                                                dataType: "json",
                                                cache: true,
                                                url: "//fastly.jsdelivr.net/gh/bhsd-harry/LLWiki@2.16/otherwiki/gadget-CodeMirror.json",
                                            })];
                                        case 5:
                                            config = _a.sent();
                                            if (ns === 274) {
                                                $.extend(config.tags, {
                                                    script: true,
                                                    style: true,
                                                });
                                                $.extend(config.tagModes, {
                                                    script: "javascript",
                                                    style: "css",
                                                });
                                            }
                                            window.mwConfig = config;
                                            if (isAdvanced) {
                                                cm = new CodeMirror($textarea.parent()[0], {
                                                    mode: "text/mediawiki",
                                                    mwConfig: window.mwConfig,
                                                    lineWrapping: true,
                                                    lineNumbers: true,
                                                    readOnly: $textarea.prop("readonly"),
                                                    matchBrackets: true,
                                                });
                                            } else {
                                                cm = CodeMirror.fromTextArea($textarea[0], {
                                                    mode: "text/mediawiki",
                                                    mwConfig: window.mwConfig,
                                                    lineWrapping: true,
                                                    lineNumbers: true,
                                                    readOnly: $textarea.prop("readonly"),
                                                    matchBrackets: true,
                                                });
                                                cm.setSize(null, $textarea.height());
                                            }
                                            mw.hook("wiki-codemirror").fire(cm);
                                            $doc = $(cm.getWrapperElement());
                                            $.valHooks.textarea = {
                                                get: function(ele) {
                                                    return ele === $textarea[0] && state ? cm.getValue() : ele.value;
                                                },
                                                set: function(ele, val) {
                                                    ele === $textarea[0] && state ? cm.setValue(val) : ele.value = val;
                                                },
                                            };
                                            if (mw.loader.getState("jquery.ui.resizable") === "ready") {
                                                $doc.resizable({
                                                    handles: "s",
                                                });
                                            }
                                            if ($search.length === 0) {
                                                return [2 /*return*/ ];
                                            }
                                            cm.addKeyMap({
                                                "Ctrl-F": function() {
                                                    $search.trigger("click");
                                                },
                                                "Cmd-F": function() {
                                                    $search.trigger("click");
                                                },
                                            });
                                            return [2 /*return*/ ];
                                    }
                                });
                            });
                        };
                        if (state === null || state === undefined || !isAdvanced) {
                            state = true;
                        }
                        if (!isAdvanced) {
                            init();
                            return [2 /*return*/ ];
                        }
                        $form = $(document.editform);
                        btn = new OO.ui.ButtonWidget({
                            classes: ["tool"],
                            icon: "highlight",
                            framed: false,
                            title: "代码高亮开关",
                        }).on("click", function() {
                            if (cm) {
                                $doc.toggle();
                                update();
                            } else {
                                initAndUpdate();
                            }
                        });
                        fn = {
                            getSelection: function() {
                                return cm.getSelection();
                            },
                            setSelection: function(options) {
                                cm.setSelection(cm.posFromIndex(options.start), cm.posFromIndex(options.end));
                                cm.focus();
                                return this;
                            },
                            getCaretPosition: function(options) {
                                var caretPos = cm.indexFromPos(cm.getCursor("from")),
                                    endPos = cm.indexFromPos(cm.getCursor("to"));
                                if (options.startAndEnd) {
                                    return [caretPos, endPos];
                                }
                                return caretPos;
                            },
                            scrollToCaretPosition: function() {
                                cm.scrollIntoView();
                                return this;
                            },
                        };
                        submit = function() {
                            $textarea[0].value = cm.getValue();
                        };
                        shared = function() {
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
                        update = function() {
                            state = !state;
                            localStorage.setItem("wikieditor-codemirror", state);
                            shared();
                        };
                        initAndUpdate = function() {
                            return __awaiter(void 0, void 0, void 0, function() {
                                return __generator(this, function(_a) {
                                    switch (_a.label) {
                                        case 0:
                                            return [4 /*yield*/ , init()];
                                        case 1:
                                            _a.sent();
                                            update();
                                            return [2 /*return*/ ];
                                    }
                                });
                            });
                        };
                        group = $("#wikiEditor-section-main > .group-insert")[0];
                        $textarea.on("wikiEditor-toolbar-doneInitialSections", function() {
                            btn.$element.appendTo("#wikiEditor-section-main > .group-insert");
                        });
                        if (group && !group.contains(btn.$element[0])) {
                            $textarea.trigger("wikiEditor-toolbar-doneInitialSections");
                        }
                        if (!state) return [3 /*break*/ , 3];
                        return [4 /*yield*/ , mw.loader.using("ext.wikiEditor")];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/ , init()];
                    case 2:
                        _a.sent();
                        shared();
                        _a.label = 3;
                    case 3:
                        return [2 /*return*/ ];
                }
            });
        });
    })();
});