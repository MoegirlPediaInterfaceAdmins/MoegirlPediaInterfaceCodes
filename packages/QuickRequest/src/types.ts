/**
 * 参数控件类型。
 * page / user 分别用标题、用户名联想输入框，multiline 用多行文本框，其余为单行文本框；
 * dropdown 用下拉框（选项经 options 提供，delete 的理由下拉用），checkbox 用复选框（值为 "1"/""）。
 */
type ParamType = "page" | "user" | "text" | "multiline" | "dropdown" | "checkbox";

/** 下拉选项；optgroup 形态渲染为分组标题。 */
type DropdownOption = { data: string; label: string } | { optgroup: string };

/** 发帖目标站点 id。 */
type SiteId = "zh" | "commons";

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
    /** 只读：值由入口预填或自动派生，不让用户改动（如封禁申诉的封禁信息），缺省可编辑 */
    readOnly?: boolean;
    /** 隐藏：字段不在表单渲染，值仍按预填/自动派生规则并入提交（move 的 original 用，对齐原生移动不显示源页面名） */
    hidden?: boolean;
    /** 字段说明，展示为标签旁的帮助图标；缺省不展示 */
    hint?: string;
    /** dropdown 的选项（动态来源在程序化表单的 buildParams 里现取；配置页类型暂不提供） */
    options?: DropdownOption[];
    /** 占位提示文本（text / multiline），缺省不展示 */
    placeholder?: string;
    /** 字段可见性：所引用参数的值等于 equals 时显示，否则隐藏（隐藏不参与校验，值仍传给 buildBody） */
    visibleIf?: { param: string; equals: string };
    /** 值持久化到 LocalObjectStorage（QuickRequest 键）而不进入正文；用于「按回车提交」等偏好 */
    storageKey?: string;
    /** 在此字段按回车即触发「预览」（表单内任一 storageKey 偏好开启时才生效） */
    enterSubmits?: boolean;
    /** 初始值，缺省为空 */
    "default"?: string;
}

/**
 * 模板调用拼装的输入：类型条目或其变体都满足此结构。
 */
interface TemplateSpec {
    /** 可传参的基模板页名 */
    template: string;
    /** 参数定义，可为空 */
    parameters?: RequestParam[];
    /** 固定参数：每次调用都带上、不在表单中展示（如 用户组=机器用户） */
    fixedParams?: Record<string, string>;
}

/** 单个申请类型变体（配置 JSON 里 variants 数组的一项，userGroup 用）。 */
interface TypeVariant extends TemplateSpec {
    /** 变体 id，类型内唯一 */
    id: string;
    /** 变体下拉框显示名，如「维护姬申请」 */
    label: string;
    /** 组约束：所列参数键至少填写一项，按变体自身参数过滤 */
    requireAnyOf?: string[];
}

/** 单个请求类型的内容配置（配置 JSON 里 types 下的一个条目）。 */
interface TypeConfig {
    /**
     * 可传参的基模板页名，如 Template:编辑请求。
     * 带 variants 的类型（userGroup）可省略——模板由各变体自带，此字段不再使用。
     */
    template?: string;
    /** 参数定义，可为空；带 variants 的类型不使用 */
    parameters?: RequestParam[];
    /**
     * 组约束：所列参数键至少填写一项。
     * edit 的 original / new 用它表达「仅删除 / 仅新增 / 修改」三态——
     * Template:编辑请求 仅在两字段全空时报错，二者各自都不是必填项。
     * 带 variants 的类型不使用（约束挂在变体上）。
     */
    requireAnyOf?: string[];
    /** 同型多模板变体（userGroup 的各申请类型）；存在时表单顶部出现变体下拉 */
    variants?: TypeVariant[];
    /** 固定参数：每次调用都带上、不在表单中展示（与变体的 fixedParams 同语义） */
    fixedParams?: Record<string, string>;
    /**
     * 发帖目标页；设置时优先于注册表 resolveTarget 的返回值。
     * vandalReport 的版面在其模板 doc 里标注「目前是」——版面可能迁移，故做成配置项；
     * 其余类型的目标页是稳定约定（本页讨论页、固定版面），留在注册表。
     */
    targetPage?: string;
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
    /** 当前页是否为重定向页（删除请求正文据此选择 NoRedirectLink） */
    isRedirect: boolean;
}

/**
 * 程序化表单：delete 这类不走配置页模板的类型由代码提供字段与正文。
 * 正文为手工拼装的非模板文本（可含 ~~~~ 签名），预览/发送与模板类型共用同一流程。
 */
interface ProgrammaticForm {
    /** 构建参数定义；可异步（动态下拉选项拉取、权限判断决定字段是否提供） */
    buildParams: (ctx: QuickRequestContext) => Promise<RequestParam[]>;
    /** 组约束，语义同 TypeConfig.requireAnyOf（delete 的 reason/detail 至少一项） */
    requireAnyOf?: string[];
    /** 由表单值构建正文；类型特有校验（批量清单解析等）以抛错表达，由主对话框呈现 */
    buildBody: (values: Record<string, string>, ctx: QuickRequestContext) => Promise<string>;
    /** 章节标题；按表单值区分（delete 的单页/批量标题不同），日期取调用时刻 */
    buildSectionTitle: (values: Record<string, string>, ctx: QuickRequestContext) => string;
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
    /**
     * 新话题的章节标题，保持「<请求名> - <用户> - <YYYY.MM.DD>」格式以兼容版面存档流程。
     * postMode 为 append 的类型不发 sectiontitle（标题由模板正文在存盘替换时生成），省略此字段。
     */
    sectionTitle?: (ctx: QuickRequestContext) => string;
    /**
     * 发帖方式：addtopic（缺省，DT 新话题，带 sectiontitle）或
     * append（action=edit 追加正文——正文以 `== 标题 ==` 开头，标题由模板生成，
     * 加 topic 标题会造成重复；userGroup 等申请类模板属此类）。
     */
    postMode?: "addtopic" | "append";
    /**
     * append 模式下是否允许创建目标页，缺省不允许（nocreate）。
     * banAppeal 的目标是本人讨论页，新用户可能还没有讨论页——现行 section=new
     * 流程遇到这种情况会直接建页，allowCreate 与之对齐。
     */
    allowCreate?: boolean;
    /** 默认编辑摘要；空串表示不传 summary 参数，由服务端自动生成 */
    defaultSummary?: string;
    /** 提交前确认项；返回空数组表示直接提交 */
    warnings?: (ctx: QuickRequestContext) => Promise<Warning[]>;
    /**
     * 发帖目标站点，缺省按当前站。与当前站不同时，预览解析与发帖经 mw.ForeignApi
     * 在目标站执行（delete 在共享站发起时目标为主站 zh）。
     */
    site?: SiteId;
    /** 程序化表单（delete 用）：不走路由配置页模板的字段与正文由代码提供 */
    programmaticForm?: ProgrammaticForm;
    /**
     * 提交前的类型级校验：返回错误文案时拦下预览并提示，返回 null 放行。
     * 字段级必填与组约束之外、依赖跨字段组合的检查放这里（move 的「移动到自身」）。
     */
    validate?: (values: Record<string, string>, ctx: QuickRequestContext) => string | null;
}

declare global {
    interface Window {
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
    /** 入口预填值（参数键 → 值），如封禁申诉入口预填的封禁信息；无预填时省略 */
    preset?: Record<string, string>;
    /** 配置的预取 promise（承诺不 reject）；程序化表单类型不经配置页，省略 */
    configPromise?: Promise<ConfigResult>;
    /** 预览解析所用 API（目标站 API；delete 在共享站发起时为到主站的 ForeignApi） */
    api: mw.Api;
    /** 发帖目标站的站点基址；目标即当前站时为空串（跳转 URL 用） */
    targetBase: string;
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
    /**
     * 章节标题的惰性生成：在提交时调用，日期取提交时刻（预览停留跨午夜不会带前一天的日期发出）。
     * postMode 为 append 时无此字段——标题由模板正文在存盘替换时生成。
     */
    getSectionTitle?: () => string;
    /** 发帖方式，缺省 addtopic；语义见 RequestTypeDefinition.postMode */
    postMode?: "addtopic" | "append";
    /** append 模式下是否允许创建目标页；语义见 RequestTypeDefinition.allowCreate */
    allowCreate?: boolean;
    /** 发帖所用 API（目标站 API；delete 在共享站发起时为到主站的 ForeignApi） */
    api: mw.Api;
    /** 发帖目标站的站点基址；目标即当前站时为空串（成功后跳转 URL 用） */
    targetBase: string;
    /** 编辑摘要；空串表示不传，由服务端自动生成 */
    editSummary: string;
    /** 提交前确认项的惰性提供者；缺省表示该类型无需确认 */
    getWarnings?: () => Promise<Warning[]>;
}

/**
 * 主对话框在渲染预览之前能产出的部分。
 * api 与 targetBase 由主对话框按目标站补齐（描述的是发送路径，不属于表单产物）。
 */
type PreviewSubmission = Omit<PreviewDialogData, "title" | "previewHtml" | "getWarnings" | "api" | "targetBase">;
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
    DropdownOption,
    MainDialogCloseResult,
    MainDialogData,
    MainDialogResult,
    ParamType,
    PreviewDialogCloseResult,
    PreviewDialogData,
    PreviewSubmission,
    ProgrammaticForm,
    QuickRequestConfig,
    QuickRequestContext,
    RequestParam,
    RequestTypeDefinition,
    RequestTypeId,
    SendResult,
    SiteId,
    TemplateSpec,
    TypeConfig,
    TypeVariant,
    Warning,
};
