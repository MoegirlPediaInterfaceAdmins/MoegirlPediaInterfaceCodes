import type { CategoryEditor } from "../editor.ts";

/** 设置输入框选区；输入框为空时不操作。 */
const setSelectionRange = (editor: CategoryEditor, from: number, to: number): void => {
    if (!editor.text.value) {
        return;
    }
    editor.text.setSelectionRange(from, to);
};

/** 读取输入框选区。 */
const getSelectionRange = (editor: CategoryEditor): { start: number; end: number } => {
    if (!editor.text.value) {
        return {
            start: 0,
            end: 0,
        };
    }
    const from = editor.text.selectionStart ?? 0;
    return {
        start: from,
        end: editor.text.selectionEnd ?? from,
    };
};

export { setSelectionRange, getSelectionRange };
