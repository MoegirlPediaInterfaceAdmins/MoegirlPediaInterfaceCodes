import { HC } from "../../config/hotcat.ts";
import { state } from "../../runtime.ts";
import { make } from "../../util/dom.ts";
import { evtKill, BS, DEL, DOWN, ESC, IME, PGDOWN, PGUP, RET, SPACE, TAB, UP } from "../../util/events.ts";
import { makeActive } from "../multi.ts";
import { suggestionConfigs } from "../../api/suggestions.ts";
import type { CategoryEditor } from "../editor.ts";

/** 构建编辑器内联表单并挂到 editor 上。 */
const buildForm = (editor: CategoryEditor): HTMLFormElement => {
    const form = make("form");
    form.method = "POST";
    form.onsubmit = editor.accept.bind(editor);
    editor.form = form;
    const text = make("input");
    text.type = "text";
    text.size = HC.editbox_width;
    if (!state.noSuggestions) {
        text.onkeyup = (evt) => {
            const key = evt.keyCode || 0;
            if (editor.ime && editor.lastKey === IME && !editor.usesComposition && (key === TAB || key === RET || key === ESC || key === SPACE)) {
                editor.ime = false;
            }
            if (editor.ime) {
                return true;
            }
            if (key === UP || key === DOWN || key === PGUP || key === PGDOWN) {
                if (editor.keyCount === 0) {
                    return editor.processKey(evt);
                }
            } else {
                if (key === ESC && editor.lastKey !== IME) {
                    if (!editor.resetKeySelection()) {
                        editor.cancel();
                        return;
                    }
                }
                editor.invokeSuggestions(key === BS || key === DEL || key === ESC);
            }
            return true;
        };
        text.onkeydown = (evt) => {
            const key = evt.keyCode || 0;
            editor.lastKey = key;
            editor.keyCount = 0;
            if (!editor.ime && key === IME && !editor.usesComposition) {
                editor.ime = true;
            } else if (editor.ime && key !== IME && !(key >= 16 && key <= 20 || key >= 91 && key <= 93 || key === 144)) {
                editor.ime = false;
            }
            if (editor.ime) {
                return true;
            }
            if (key === RET) {
                return editor.accept(evt);
            }
            return key === ESC ? evtKill(evt) : true;
        };
        text.onkeypress = (evt) => {
            editor.keyCount = (editor.keyCount || 0) + 1;
            return editor.processKey(evt);
        };
        $(text).on("focus", () => {
            makeActive(editor);
        });
        $(text).on("blur", editor.saveView.bind(editor));
        $(text).on("compositionstart", () => {
            editor.lastKey = IME;
            editor.usesComposition = true;
            editor.ime = true;
        });
        $(text).on("compositionend", () => {
            editor.lastKey = IME;
            editor.usesComposition = true;
            editor.ime = false;
        });
        $(text).on("textInput", () => {
            editor.ime = false;
            editor.invokeSuggestions(false);
        });
        $(text).on("blur", () => {
            editor.usesComposition = false;
            editor.ime = false;
        });
    }
    editor.text = text;
    editor.icon = make("img");
    editor.icon.width = 20;
    let list: HTMLSelectElement | null = null;
    if (!state.noSuggestions) {
        list = make("select");
        list.onclick = () => {
            if (editor.highlightSuggestion(0)) {
                editor.textchange(false, true);
            }
        };
        list.ondblclick = (e) => {
            if (editor.highlightSuggestion(0)) {
                editor.accept(e);
            }
        };
        list.onchange = () => {
            editor.highlightSuggestion(0);
            editor.text.focus();
        };
        list.onkeyup = (evt) => {
            if (evt.keyCode === ESC) {
                editor.resetKeySelection();
                editor.text.focus();
                window.setTimeout(() => {
                    editor.textchange(true);
                }, HC.suggest_delay);
            } else if (evt.keyCode === RET) {
                editor.accept(evt);
            }
        };
        if (!HC.fixed_search) {
            const engineSelector = make("select");
            for (const key in suggestionConfigs) {
                if (suggestionConfigs[key].show) {
                    const opt = make("option");
                    opt.value = key;
                    if (key === editor.engine) {
                        opt.selected = true;
                    }
                    opt.appendChild(make(suggestionConfigs[key].name, true));
                    engineSelector.appendChild(opt);
                }
            }
            engineSelector.onchange = () => {
                editor.engine = editor.engineSelector?.options[editor.engineSelector.selectedIndex].value ?? editor.engine;
                editor.text.focus();
                editor.textchange(true, true);
            };
            editor.engineSelector = engineSelector;
        }
    }
    editor.list = list;
    const button_label = (id: string, defaultText: string): string => {
        let label: Node | null = null;
        if (state.onUpload && window.UFUI !== undefined && window.UIElements !== undefined && window.UFUI.getLabel instanceof Function) {
            try {
                label = window.UFUI.getLabel(id, true);
                while (label && label.nodeType !== 3) {
                    label = label.firstChild;
                }
            } catch {
                label = null;
            }
        }
        if (!label || !(label as Text).data) {
            return defaultText;
        }
        return (label as Text).data;
    };
    const OK = make("input");
    OK.type = "button";
    OK.value = button_label("wpOkUploadLbl", HC.messages.ok);
    OK.onclick = editor.accept.bind(editor);
    editor.ok = OK;
    const cancel = make("input");
    cancel.type = "button";
    cancel.value = button_label("wpCancelUploadLbl", HC.messages.cancel);
    cancel.onclick = editor.cancel.bind(editor);
    editor.cancelButton = cancel;
    const span = make("span");
    span.className = "hotcatinput";
    span.style.position = "relative";
    span.appendChild(text);
    span.appendChild(make("\u00A0", true));
    span.style.whiteSpace = "nowrap";
    if (list) {
        span.appendChild(list);
    }
    if (editor.engineSelector) {
        span.appendChild(editor.engineSelector);
    }
    if (!state.noSuggestions) {
        span.appendChild(editor.icon);
    }
    span.appendChild(OK);
    span.appendChild(cancel);
    form.appendChild(span);
    form.style.display = "none";
    editor.span.appendChild(form);
    return form;
};

export { buildForm };
