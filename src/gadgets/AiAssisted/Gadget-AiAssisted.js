"use strict";
$(() => {
    const changeTag = "AI-assisted tool";
    const wikitextInputId = "wpAiAssisted";
    const visualEditorInputId = "veAiAssisted";

    // 整页重渲染（显示预览 / 显示更改 / 编辑冲突 / 过滤器拦截）会重建整个编辑表单，
    // 客户端注入的隐藏字段随之消失，因此勾选状态另存一份，重渲染后再恢复
    const wikitextStateKey = `AiAssisted-selection-${mw.config.get("wgPageName")}`;

    /**
     * 在逗号分隔的标签串中增删本小工具负责的标签，其余标签原样保留
     * @param {string | number | string[] | null | undefined} changeTags 现有的标签串，可为空
     * @param {boolean} selected 复选框是否勾选
     * @returns {string} 处理后的标签串
     */
    const mergeChangeTag = (changeTags, selected) => {
        const tags = `${changeTags ?? ""}`.split(",").map((tag) => tag.trim()).filter((tag) => tag !== "" && tag !== changeTag);
        if (selected) {
            tags.push(changeTag);
        }
        return tags.join(",");
    };

    /**
     * 创建一个与编辑页原生复选框风格一致的 OOUI 复选框
     * @param {string} inputId 复选框 `<input>` 的 id
     * @param {boolean} selected 初始勾选状态
     * @param {(selected: boolean) => void} onChange 勾选状态变化的回调
     * @returns {{ checkbox: OO.ui.CheckboxInputWidget, field: OO.ui.FieldLayout<OO.ui.CheckboxInputWidget> }} 复选框控件及承载它的 FieldLayout
     */
    const createCheckboxField = (inputId, selected, onChange) => {
        const checkbox = new OO.ui.CheckboxInputWidget({
            id: `${inputId}Widget`,
            inputId,
            selected,
        });
        checkbox.on("change", () => {
            onChange(checkbox.isSelected());
        });
        const field = new OO.ui.FieldLayout(checkbox, {
            align: "inline",
            label: wgULS("AI辅助编辑", "AI輔助編輯"),
            title: wgULS("本次编辑使用了人工智能工具进行辅助", "本次編輯使用了人工智能工具進行輔助"),
        });
        return { checkbox, field };
    };

    /**
     * 把复选框插到「小编辑」复选框之后，使两者处于同一行（找不到小编辑时追加到末尾）
     * @param {JQuery<HTMLElement>} $container 承载复选框的容器
     * @param {JQuery<HTMLElement>} $element 待插入的复选框
     * @param {string} minorEditSelector 小编辑复选框的选择器
     */
    const insertAfterMinorEditCheckbox = ($container, $element, minorEditSelector) => {
        const $minorEditField = $container.find(minorEditSelector).first().closest(".oo-ui-fieldLayout");
        if ($minorEditField[0]) {
            $minorEditField.after($element);
        } else {
            $container.append($element);
        }
    };

    // 2010 版 wikitext 编辑器（WikiEditor）
    let wikitextCheckbox = null;
    let wikitextField = null;

    /**
     * 取出暂存的勾选状态；`wgAction` 为 `edit` 表示新开一个编辑会话，此时清除暂存、不沿用上次的选择
     */
    const readStoredSelection = () => {
        if (mw.config.get("wgAction") !== "submit") {
            sessionStorage.removeItem(wikitextStateKey);
            return false;
        }
        return sessionStorage.getItem(wikitextStateKey) === "1";
    };

    /**
     * 暂存勾选状态，供整页重渲染后恢复
     */
    const storeSelection = (selected) => {
        sessionStorage.setItem(wikitextStateKey, selected ? "1" : "0");
    };

    /**
     * 取得承载标签的隐藏字段：WikiEditor 的编辑表单默认不输出该字段，需要自行创建
     * @returns {JQuery<HTMLElement> | null} 隐藏字段，找不到编辑表单时为 null
     */
    const getChangeTagsInput = () => {
        const $input = $('input[name="wpChangeTags"]').first();
        if ($input[0]) {
            return $input;
        }
        const $form = $("#editform").add($("#wpTextbox1").closest("form")).first();
        if (!$form[0]) {
            return null;
        }
        return $("<input>").attr({
            id: "wpChangeTags",
            name: "wpChangeTags",
            type: "hidden",
            value: "",
        }).appendTo($form);
    };

    /**
     * 在编辑表单中插入复选框；重复调用不会重复插入
     *
     * 整页重渲染后需要按暂存状态恢复勾选与隐藏字段的值，否则用户此前的选择会被静默丢弃
     */
    const setupWikitextCheckbox = () => {
        if (document.getElementById(wikitextInputId)) {
            return;
        }
        const selected = readStoredSelection();
        const $container = $(".editCheckboxes > .oo-ui-horizontalLayout").first();
        const $changeTags = getChangeTagsInput();
        if (!$container[0] || !$changeTags) {
            return;
        }
        $changeTags.val(mergeChangeTag($changeTags.val(), selected));
        if (wikitextField) {
            wikitextCheckbox.setSelected(selected);
        } else {
            const { checkbox, field } = createCheckboxField(wikitextInputId, selected, (isSelected) => {
                storeSelection(isSelected);
                const $input = getChangeTagsInput();
                if ($input) {
                    $input.val(mergeChangeTag($input.val(), isSelected));
                }
            });
            wikitextCheckbox = checkbox;
            wikitextField = field;
        }
        insertAfterMinorEditCheckbox($container, wikitextField.$element, '[name="wpMinoredit"]');
    };

    // 可视化编辑器与 2017 版 wikitext 编辑器（VisualEditor）
    // 已经补丁过 saveFields 的 target，避免反复包裹导致标签重复
    const patchedTargets = new WeakSet();
    let visualEditorField = null;
    let visualEditorCheckbox = null;
    let visualEditorSelected = false;

    /**
     * 取得当前的 VisualEditor 保存目标（即 `ve.init.target`）
     * @returns {object | null} 未加载 VisualEditor 时为 null
     */
    const getVisualEditorTarget = () => {
        const { ve } = window;
        return ve?.init?.target ?? ve?.init?.articleTarget ?? null;
    };

    /**
     * 把当前勾选状态同步给 VisualEditor
     */
    const syncVisualEditorChangeTag = () => {
        const target = getVisualEditorTarget();
        if (!target) {
            return;
        }
        if (typeof target.addSaveTag === "function" && typeof target.deleteSaveTag === "function") {
            if (visualEditorSelected) {
                target.addSaveTag(changeTag);
            } else {
                target.deleteSaveTag(changeTag);
            }
            return;
        }
        const { saveFields } = target;
        if (!saveFields) {
            return;
        }
        // 未勾选时不改动 VisualEditor 的保存参数
        if (!patchedTargets.has(target)) {
            if (!visualEditorSelected) {
                return;
            }
            const original = saveFields.wpChangeTags;
            saveFields.wpChangeTags = () => mergeChangeTag(typeof original === "function" ? original() : "", visualEditorSelected);
            patchedTargets.add(target);
        }
    };

    /**
     * 重置勾选状态；VisualEditor 每次（重新）激活都是一次全新的编辑，应默认不声明
     */
    const resetVisualEditorSelection = () => {
        visualEditorSelected = false;
        visualEditorCheckbox?.setSelected(false);
        const target = getVisualEditorTarget();
        if (target && typeof target.deleteSaveTag === "function") {
            target.deleteSaveTag(changeTag);
        }
    };

    /**
     * 在保存对话框中插入复选框；重复调用不会重复插入
     */
    const setupVisualEditorCheckbox = () => {
        const $container = $(".ve-ui-mwSaveDialog-checkboxes").first();
        if (!$container[0] || !getVisualEditorTarget() || $container.find(`#${visualEditorInputId}`)[0]) {
            return;
        }
        if (!visualEditorField) {
            const { checkbox, field } = createCheckboxField(visualEditorInputId, visualEditorSelected, (selected) => {
                visualEditorSelected = selected;
                syncVisualEditorChangeTag();
            });
            visualEditorCheckbox = checkbox;
            visualEditorField = field;
        }
        // 与小编辑复选框排在同一行（新建页面时不存在该复选框，直接追加）
        insertAfterMinorEditCheckbox($container, visualEditorField.$element, ".ve-ui-mwSaveDialog-field-wpMinoredit");
    };

    // 初始化
    if (["edit", "submit"].includes(mw.config.get("wgAction"))) {
        setupWikitextCheckbox();
        mw.hook("wikipage.editform").add(setupWikitextCheckbox);
    }
    mw.hook("ve.saveDialog.stateChanged").add(setupVisualEditorCheckbox);
    mw.hook("ve.activationComplete").add(resetVisualEditorSelection);
    mw.hook("ve.deactivationComplete").add(resetVisualEditorSelection);
});
