import { HC } from "../config/hotcat.ts";
import { site, state } from "../runtime.ts";
import { make } from "../util/dom.ts";
import { CategoryEditor } from "./editor.ts";
import { initiateEdit, resolveMulti } from "../api/page.ts";
import { performChanges } from "../api/summary.ts";
import { alertError } from "./dialogs.ts";

/** 激活指定编辑器，停用其它。 */
const makeActive = (which: CategoryEditor): void => {
    if (which.is_active) {
        return;
    }
    for (let i = 0; i < state.editors.length; i++) {
        if (state.editors[i] !== which) {
            state.editors[i].inactivate();
        }
    }
    which.is_active = true;
    if (which.dab) {
        showDab(which);
    } else {
        const expectedInput = which.lastRealInput || which.lastInput || "";
        const actualValue = which.text.value || "";
        if (!expectedInput.length && actualValue.length || expectedInput.length && actualValue.indexOf(expectedInput)) {
            which.showsList = false;
            const v = actualValue.split("|");
            which.lastRealInput = which.lastInput = v[0];
            if (v.length > 1) {
                which.currentKey = v[1];
            }
            if (which.lastSelection) {
                which.lastSelection = {
                    start: v[0].length,
                    end: v[0].length,
                };
            }
        }
        if (which.showsList) {
            which.displayList();
        }
        if (which.lastSelection) {
            if (site.isWebkit) {
                const selection = which.lastSelection;
                window.setTimeout(() => {
                    which.setSelection(selection.start, selection.end);
                }, 1);
            } else {
                which.setSelection(which.lastSelection.start, which.lastSelection.end);
            }
        }
    }
};

/** 显示消歧义候选。 */
const showDab = (which: CategoryEditor): void => {
    if (!which.is_active) {
        makeActive(which);
    } else {
        which.showSuggestions(which.dab ?? null, false, null, null);
        which.dab = null;
    }
};

/** 多选提交。 */
const multiSubmit = (): void => {
    const toResolve: CategoryEditor[] = [];
    for (let i = 0; i < state.editors.length; i++) {
        if (state.editors[i].state === CategoryEditor.CHANGE_PENDING || state.editors[i].state === CategoryEditor.OPEN) {
            toResolve.push(state.editors[i]);
        }
    }
    if (!toResolve.length) {
        void initiateEdit((failure) => {
            performChanges(failure);
        }, (msg) => {
            alertError(msg);
        });
        return;
    }
    void resolveMulti(toResolve, (resolved) => {
        let firstDab: CategoryEditor | null = null;
        let dontChange = false;
        for (let i = 0; i < resolved.length; i++) {
            if (resolved[i].lastInput !== resolved[i].dabInput) {
                dontChange = true;
            } else {
                if (resolved[i].dab) {
                    if (!firstDab) {
                        firstDab = resolved[i];
                    }
                } else {
                    if (resolved[i].acceptCheck(true)) {
                        resolved[i].commit();
                    }
                }
            }
        }
        if (firstDab) {
            showDab(firstDab);
        } else if (!dontChange) {
            void initiateEdit((failure) => {
                performChanges(failure);
            }, (msg) => {
                alertError(msg);
            });
        }
    });
};

/** 创建保存按钮。 */
const setMultiInput = (): void => {
    if (state.commitButton || state.onUpload) {
        return;
    }
    const commitButton = make("input");
    commitButton.type = "button";
    commitButton.value = HC.messages.commit;
    commitButton.onclick = multiSubmit;
    state.commitButton = commitButton;
    if (state.multiSpan && state.multiSpan.parentNode) {
        state.multiSpan.parentNode.replaceChild(commitButton, state.multiSpan);
    } else {
        state.catLine?.appendChild(commitButton);
    }
};

/** 按改动情况启用保存按钮。 */
const checkMultiInput = (): void => {
    if (!state.commitButton) {
        return;
    }
    let hasChanges = false;
    for (let i = 0; i < state.editors.length; i++) {
        if (state.editors[i].state !== CategoryEditor.UNCHANGED) {
            hasChanges = true;
            break;
        }
    }
    state.commitButton.disabled = !hasChanges;
};

export { makeActive, showDab, multiSubmit, setMultiInput, checkMultiInput };
