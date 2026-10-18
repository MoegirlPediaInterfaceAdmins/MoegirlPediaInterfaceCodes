/**
 * 参数控件类型。
 * page / user 分别用标题、用户名联想输入框，multiline 用多行文本框，其余为单行文本框。
 */
type ParamType = "page" | "user" | "text" | "multiline";

/** 模板参数定义（对应配置 JSON 里的 parameters 数组项）。 */
interface TemplateParam {
    /** 模板参数名，如 "1" */
    key: string;
    /** 界面上显示的字段名 */
    label: string;
    /** 控件类型，缺省为 text */
    type?: ParamType;
    /** 是否必填，缺省为 false */
    required?: boolean;
    /** 初始值，缺省为空 */
    "default"?: string;
}

/** 单个模板定义。 */
interface TemplateEntry {
    /** 下拉里显示的模板名 */
    title: string;
    /** 模板页名，如 Template:UserMessages/Welcome */
    template: string;
    /** 选中该模板时自动填入的编辑摘要 */
    summary: string;
    /** 参数定义，可为空 */
    parameters?: TemplateParam[];
}

/** 站内配置页的结构。 */
interface UserMessagesConfig {
    templates: TemplateEntry[];
}

/**
 * 用户侧全局自定义配置（window.UserMessages）。
 * templates 的条目 schema 与配置页 JSON 完全一致；
 * 两项均可选，未提供时分别沿用配置页内容与源码里的签名默认值。
 */
interface UserMessagesGlobalConfig {
    /** 追加在预置模板之后的自定义模板 */
    templates?: TemplateEntry[];
    /** 追加到正文末尾的签名，缺省用 constants 里的默认值 */
    signatureSuffix?: string;
}

declare global {
    interface Window {
        UserMessages?: UserMessagesGlobalConfig;
    }
}

/**
 * 配置预取结果。
 * 预取永不 reject —— 失败同样是一种结果，以便入口做同步判断。
 */
type ConfigResult = { ok: true; config: UserMessagesConfig } | { ok: false; message: string };

/** 主对话框的打开数据。 */
interface MainDialogData {
    /** 目标用户（取自 wgRelevantUserName，只读） */
    targetUser: string;
    /** 模板配置的预取 promise */
    configPromise: Promise<ConfigResult>;
    /** 请求打开预览对话框；主对话框保持开启，预览叠加其上 */
    onPreview: (data: PreviewDialogData) => void;
}

/** 预览对话框的打开数据。 */
interface PreviewDialogData {
    /** 对话框标题。OO.ui.Dialog 会读取打开数据里的 title 覆写静态标题。 */
    title: string;
    /** 目标用户 */
    targetUser: string;
    /** action=parse 渲染出的 HTML */
    previewHtml: string;
    /** 最终提交正文，已含 subst 改写与签名 */
    submittedText: string;
    /** 编辑摘要 */
    editSummary: string;
}

/** 主对话框在渲染预览之前能产出的部分。 */
type PreviewSubmission = Omit<PreviewDialogData, "title" | "previewHtml"> & { templateTitle: string };

/**
 * 主对话框的关闭结果。
 * 「取消」按钮没有 action 名，由 OOUI 基类 close() 关闭且不带数据，故只列出两条会带 message 的失败路径：
 * configError 来自模板配置，formError 来自表单构建 —— 分开归因，避免控件报错被说成配置读取失败。
 */
type MainDialogResult
    = | { action: "configError"; message: string }
        | { action: "formError"; message: string }
        | undefined;

/** 主对话框关闭时实际带出的数据：失败路径一定带 message。 */
type MainDialogCloseResult = NonNullable<MainDialogResult>;

/** 预览对话框的关闭数据：发送成功时附带回读到的章节锚点。 */
interface PreviewDialogCloseResult {
    action?: string;
    anchor?: string;
}

/** 发送结果。失败不抛错，以便「重试」。 */
type SendResult = { ok: true; newrevid: number | undefined } | { ok: false; code: string; detail: string };

export type {
    ConfigResult,
    MainDialogCloseResult,
    MainDialogData,
    MainDialogResult,
    ParamType,
    PreviewDialogCloseResult,
    PreviewDialogData,
    PreviewSubmission,
    SendResult,
    TemplateEntry,
    TemplateParam,
    UserMessagesConfig,
    UserMessagesGlobalConfig,
};
