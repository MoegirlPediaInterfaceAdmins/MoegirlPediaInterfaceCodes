import type { TemplateParam } from "./types.ts";

/** 一个参数对应的控件、布局与定义。 */
interface ParamField {
    param: TemplateParam;
    widget: OO.ui.TextInputWidget;
    layout: OO.ui.FieldLayout<OO.ui.TextInputWidget>;
    /** 上一次的校验结果，用于只在有效性翻转时才改动 DOM */
    flagged: boolean;
}

/**
 * 按参数类型创建控件。
 * mw.widgets.TitleInputWidget / mw.widgets.UserInputWidget 与 MultilineTextInputWidget
 * 都继承自 TextInputWidget，因此统一以 TextInputWidget 返回，便于共用 getValue / setValidityFlag。
 * @param param 参数定义
 * @param $overlay 窗口的 overlay 节点，交给带弹出层的控件，避免菜单被窗口 body 裁剪
 * @returns 控件
 */
const createParamWidget = (param: TemplateParam, $overlay: JQuery): OO.ui.TextInputWidget => {
    const value = param.default ?? "";
    switch (param.type ?? "text") {
        case "page":
            return new mw.widgets.TitleInputWidget({ value, suggestions: true, $overlay });
        case "user":
            return new mw.widgets.UserInputWidget({ value, $overlay });
        case "multiline":
            return new OO.ui.MultilineTextInputWidget({ value, rows: 4, autosize: true, maxRows: 12 });
        default:
            return new OO.ui.TextInputWidget({ value });
    }
};

/**
 * 创建参数控件并包一层 FieldLayout，同时接上值变化回调。
 * @param param 参数定义
 * @param $overlay 窗口的 overlay 节点
 * @param onChange 值变化时的回调
 * @returns 参数控件、布局与校验状态
 */
const createParamField = (param: TemplateParam, $overlay: JQuery, onChange: () => void): ParamField => {
    const widget = createParamWidget(param, $overlay);
    widget.on("change", onChange);
    return {
        param,
        widget,
        layout: new OO.ui.FieldLayout(widget, { label: param.label, align: "top" }),
        flagged: false,
    };
};

/**
 * 读取各参数的当前值。
 * @param fields 参数控件列表
 * @returns 参数名 → 值
 */
const readValues = (fields: ParamField[]): Record<string, string> => Object.fromEntries(fields.map(({ param, widget }) => [param.key, widget.getValue()] as const));

/**
 * 校验必填项，就地更新控件的 validity 与错误文案。
 * 只在有效性翻转时才动 DOM —— 本函数每次输入都会跑，无脑重设会每键重建错误提示节点。
 * @param fields 参数控件列表
 * @returns 第一个非法字段；全部合法时为 null
 */
const validateFields = (fields: ParamField[]): ParamField | null => {
    let firstInvalid: ParamField | null = null;
    for (const field of fields) {
        const invalid = (field.param.required ?? false) && field.widget.getValue().trim() === "";
        if (invalid !== field.flagged) {
            field.flagged = invalid;
            field.widget.setValidityFlag(!invalid);
            field.layout.setErrors(invalid ? [wgULS(`${field.param.label}不能为空`, `${field.param.label}不能為空`)] : []);
        }
        if (invalid && !firstInvalid) {
            firstInvalid = field;
        }
    }
    return firstInvalid;
};

export { type ParamField, createParamField, readValues, validateFields };
