import type { RequestParam } from "./types.ts";

/** 参数控件：文本类输入框、下拉框或复选框。 */
type ParamWidget = OO.ui.TextInputWidget | OO.ui.DropdownInputWidget | OO.ui.CheckboxInputWidget;

/** 一个参数对应的控件、布局与定义。 */
interface ParamField {
    param: RequestParam;
    widget: ParamWidget;
    layout: OO.ui.FieldLayout<ParamWidget>;
    /** 控件当前值（复选框转 "1"/""，下拉未选为空字符串） */
    read: () => string;
    /** 文本类控件才有：就地标红 / 取消标红 */
    flagValidity: ((valid: boolean) => void) | undefined;
    /** 聚焦控件；无焦点能力的控件为 undefined */
    focus: (() => void) | undefined;
    /** 上一次的校验结果，用于只在有效性翻转时才改动 DOM */
    flagged: boolean;
    /** 当前是否因 visibleIf 隐藏；隐藏的字段不参与校验 */
    hidden: boolean;
}

/**
 * 按参数类型创建控件。
 * mw.widgets.TitleInputWidget / mw.widgets.UserInputWidget 与 MultilineTextInputWidget
 * 都继承自 TextInputWidget；下拉框（理由选择等动态选项）与复选框（批量提删等开关）
 * 是独立控件，经 ParamField.read 统一取值。
 * @param param 参数定义
 * @param $overlay 窗口的 overlay 节点，交给带弹出层的控件，避免菜单被窗口 body 裁剪
 * @returns 控件
 */
const createParamWidget = (param: RequestParam, $overlay: JQuery): ParamWidget => {
    const value = param.default ?? "";
    const placeholder = param.placeholder === undefined ? {} : { placeholder: param.placeholder };
    switch (param.type ?? "text") {
        case "page":
            return new mw.widgets.TitleInputWidget({ value, suggestions: true, $overlay });
        case "user":
            return new mw.widgets.UserInputWidget({ value, $overlay });
        case "multiline":
            return new OO.ui.MultilineTextInputWidget({ value, rows: 4, autosize: true, maxRows: 12, ...placeholder });
        case "dropdown":
            return new OO.ui.DropdownInputWidget({ options: param.options ?? [], $overlay });
        case "checkbox":
            return new OO.ui.CheckboxInputWidget({ selected: value === "1" });
        default:
            return new OO.ui.TextInputWidget({ value, ...placeholder });
    }
};

/**
 * 创建参数控件并包一层 FieldLayout，同时接上值变化与回车回调。
 * @param param 参数定义
 * @param $overlay 窗口的 overlay 节点
 * @param onChange 值变化时的回调
 * @param onEnter 在此字段按回车时的回调（仅 enterSubmits 的文本字段接通）
 * @returns 参数控件、布局与校验状态
 */
const createParamField = (param: RequestParam, $overlay: JQuery, onChange: () => void, onEnter?: () => void): ParamField => {
    const widget = createParamWidget(param, $overlay);
    // 只读由配置显式声明（如封禁申诉入口预填的封禁信息、移动请求的移动前标题）。
    // auto 只负责预填初始值，不意味着只读——移动请求的「移动后标题」预填当前页名后仍要允许改动。
    // 只读是文本类控件的能力，其余类型静默忽略
    if (widget instanceof OO.ui.TextInputWidget && param.readOnly === true) {
        widget.setReadOnly(true);
    }
    // 三类控件的 change/enter 回调形态一致，但联合类型上的 on 重载互不兼容，
    // 统一按文本框的事件签名连接（下拉与复选框的 on 接受同样的 (事件名, 回调)）
    const widgetEvents = widget as OO.ui.TextInputWidget;
    widgetEvents.on("change", onChange);
    if (onEnter !== undefined && param.enterSubmits === true && widget instanceof OO.ui.TextInputWidget) {
        widget.on("enter", onEnter);
    }
    return {
        param,
        widget,
        read: (): string => {
            if (widget instanceof OO.ui.CheckboxInputWidget) {
                return widget.isSelected() ? "1" : "";
            }
            return widget.getValue();
        },
        flagValidity: widget instanceof OO.ui.TextInputWidget
            ? (valid: boolean): void => {
                widget.setValidityFlag(valid);
            }
            : undefined,
        focus: widget instanceof OO.ui.TextInputWidget
            ? (): void => {
                widget.focus();
            }
            : undefined,
        layout: new OO.ui.FieldLayout(widget, {
            label: param.label,
            align: param.type === "checkbox" ? "inline" : "top",
            ...param.hint === undefined ? {} : { help: param.hint, helpInline: true },
        }),
        flagged: false,
        hidden: false,
    };
};

/**
 * 读取各参数的当前值。
 * @param fields 参数控件列表
 * @returns 参数名 → 值
 */
const readValues = (fields: ParamField[]): Record<string, string> => Object.fromEntries(fields.map(({ param, read }) => [param.key, read()] as const));

/**
 * 校验必填项，就地更新控件的 validity 与错误文案。
 * 只在有效性翻转时才动 DOM —— 本函数每次输入都会跑，无脑重设会每键重建错误提示节点。
 * 因 visibleIf 隐藏的字段跳过校验（此前若已标红，隐藏后在此清除）。
 * 组约束（requireAnyOf）不在此处：它不指向单个控件，由主对话框以整组提示的方式呈现。
 * @param fields 参数控件列表
 * @returns 第一个非法字段；全部合法时为 null
 */
const validateFields = (fields: ParamField[]): ParamField | null => {
    let firstInvalid: ParamField | null = null;
    for (const field of fields) {
        const invalid = !field.hidden && (field.param.required ?? false) && field.read().trim() === "";
        if (invalid !== field.flagged) {
            field.flagged = invalid;
            field.flagValidity?.(!invalid);
            field.layout.setErrors(invalid ? [wgULS(`${field.param.label}不能为空`, `${field.param.label}不能為空`)] : []);
        }
        if (invalid && !firstInvalid) {
            firstInvalid = field;
        }
    }
    return firstInvalid;
};

export { type ParamField, type ParamWidget, createParamField, readValues, validateFields };
