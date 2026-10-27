/**
 * 参数控件类型。
 * page / user 分别用标题、用户名联想输入框，multiline 用多行文本框，其余为单行文本框。
 */
type ParamType = "page" | "user" | "text" | "multiline";

/** 请求参数定义（对应配置 JSON 里的 parameters 数组项）。 */
interface RequestParam {
    /** 模板参数名；纯数字键（如 "1"）映射为模板位置参数，其余键映射为命名参数 */
    key: string;
    /** 界面上显示的字段名 */
    label: string;
    /** 控件类型，缺省为 text */
    type?: ParamType;
    /** 是否必填，缺省为 false */
    required?: boolean;
    /** 打开对话框时自动填入当前页面名，缺省不自动填充 */
    auto?: "currentPage";
    /** 初始值，缺省为空 */
    "default"?: string;
}

/** 单个请求类型的内容配置（配置 JSON 里 types 下的一个条目）。 */
interface TypeConfig {
    /** 可传参的基模板页名，如 Template:编辑请求 */
    template: string;
    /** 参数定义，可为空 */
    parameters?: RequestParam[];
    /**
     * 组约束：所列参数键至少填写一项。
     * edit 的 original / new 用它表达「仅删除 / 仅新增 / 修改」三态——
     * Template:编辑请求 仅在两字段全空时报错，二者各自都不是必填项。
     */
    requireAnyOf?: string[];
}

/** 站内配置页的结构。 */
interface QuickRequestConfig {
    /** 请求类型 id → 内容配置 */
    types: Record<string, TypeConfig>;
}

/**
 * 请求类型 id。阶段 1 实现 edit / editConversiontable / move / create；
 * 其余 id 已在注册表接口中预留，随阶段 2-5 的里程碑补齐对应定义与配置。
 */
type RequestTypeId
    = | "edit"
        | "editConversiontable"
        | "move"
        | "create"
        | "userGroup"
        | "banAppeal"
        | "delete"
        | "vandalReport"
        | "checkuserRecord"
        | "editTech";

/** 提交前的确认项（editRequestWarning 的方针修改提醒迁移至此）。 */
interface Warning {
    /** 确认对话框的标题 */
    title: string;
    /** 确认对话框的正文，纯文本或 jQuery 节点 */
    message: string | JQuery;
}

/** 打开对话框时收集的页面与用户上下文。 */
interface QuickRequestContext {
    /** 当前页面名（含命名空间，下划线形式） */
    pageName: string;
    /** 当前页面的讨论页名，无讨论页时为 false */
    talkPage: string | false;
    userName: string;
    /** 当前用户所属用户组，用于 warnings 的跳过名单 */
    userGroups: string[];
    /** 打开时刻；章节标题里的日期取自此刻 */
    now: Date;
}

/** 注册表中的请求类型定义：行为逻辑写在代码里，内容配置存放在站内配置页。 */
interface RequestTypeDefinition {
    id: RequestTypeId;
    /** 对话框标题 */
    label: string;
    /** 入口出现条件（自有入口用；经 libQuickRequest.open 调起的类型恒为 true） */
    availability: (ctx: QuickRequestContext) => boolean;
    /** 发帖目标页面；当前页面没有讨论页等场景返回 false */
    resolveTarget: (ctx: QuickRequestContext) => string | false;
    /** 新话题的章节标题，保持现有格式「<请求名> - <用户> - <YYYY.MM.DD>」以兼容版面存档流程 */
    sectionTitle: (ctx: QuickRequestContext) => string;
    /** 默认编辑摘要；空串表示不传 summary 参数，由服务端自动生成 */
    defaultSummary?: string;
    /** 提交前确认项；返回空数组表示直接提交 */
    warnings?: (ctx: QuickRequestContext) => Promise<Warning[]>;
}

/**
 * 用户侧全局自定义配置（window.QuickRequest）。
 * types 的条目结构与配置页 JSON 一致，按 id 覆盖预置条目——仅能覆盖既有 id：
 * 类型的行为定义（目标版面、章节标题、确认项）在代码注册表中，新增类型需随阶段 2-5
 * 的里程碑实现，纯配置追加新 id 无法被 open() 打开。
 */
interface QuickRequestGlobalConfig {
    types?: Record<string, unknown>;
}

declare global {
    interface Window {
        QuickRequest?: QuickRequestGlobalConfig;
        /** QuickRequest 暴露的全局入口，edit / pageInfo 等调用方经此发起请求 */
        libQuickRequest?: {
            /** 打开指定类型的请求对话框；preset 供删除请求等入口预填（阶段 4 起） */
            open: (type: RequestTypeId, preset?: Record<string, string>) => void;
        };
    }
}

/**
 * 配置预取结果。
 * 预取永不 reject —— 失败同样是一种结果，以便入口做同步判断。
 */
type ConfigResult = { ok: true; config: QuickRequestConfig } | { ok: false; message: string };

/** 主对话框的打开数据。 */
interface MainDialogData {
    definition: RequestTypeDefinition;
    context: QuickRequestContext;
    /** 配置的预取 promise（承诺不 reject） */
    configPromise: Promise<ConfigResult>;
    /** 请求打开预览对话框；主对话框保持开启，预览叠加其上 */
    onPreview: (data: PreviewDialogData) => void;
}

/** 预览对话框的打开数据。 */
interface PreviewDialogData {
    /** 对话框标题。OO.ui.Dialog 会读取打开数据里的 title 覆写静态标题。 */
    title: string;
    /** action=parse 渲染出的 HTML */
    previewHtml: string;
    /** 最终提交正文，已含 subst 改写 */
    submittedText: string;
    /** 发帖目标页面 */
    targetPage: string;
    /** 章节标题的惰性生成：在提交时调用，日期取提交时刻（预览停留跨午夜不会带前一天的日期发出） */
    getSectionTitle: () => string;
    /** 编辑摘要；空串表示不传，由服务端自动生成 */
    editSummary: string;
    /** 提交前确认项的惰性提供者；缺省表示该类型无需确认 */
    getWarnings?: () => Promise<Warning[]>;
}

/**
 * 主对话框在渲染预览之前能产出的部分。
 */
type PreviewSubmission = Omit<PreviewDialogData, "title" | "previewHtml" | "getWarnings">;

/**
 * 主对话框的关闭结果。
 * 「取消」按钮没有 action 名，由 OOUI 基类 close() 关闭且不带数据，故只列出两条会带 message 的失败路径：
 * configError 来自配置读取，formError 来自表单构建 —— 分开归因，避免控件报错被说成配置读取失败。
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

/** 发送结果。失败不抛错，以便「重试」；ambiguous 表示传输层失败——请求可能已提交，重试可能重复发帖。 */
type SendResult = { ok: true; newrevid: number | undefined } | { ok: false; code: string; detail: string; ambiguous: boolean };

export type {
    ConfigResult,
    MainDialogCloseResult,
    MainDialogData,
    MainDialogResult,
    ParamType,
    PreviewDialogCloseResult,
    PreviewDialogData,
    PreviewSubmission,
    QuickRequestConfig,
    QuickRequestContext,
    QuickRequestGlobalConfig,
    RequestParam,
    RequestTypeDefinition,
    RequestTypeId,
    SendResult,
    TypeConfig,
    Warning,
};
