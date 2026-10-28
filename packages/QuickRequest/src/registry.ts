import {
    CONVERSION_TABLE_PATTERN,
    OPERATIONS_BOARD,
    POLICY_CATEGORIES,
    RIGHTS_BOARD,
    titleSuffix,
    WARNING_SKIP_GROUPS,
} from "./constants.ts";
import type { QuickRequestContext, RequestTypeDefinition, RequestTypeId, Warning } from "./types.ts";

/**
 * 方针 / 指引修改提醒（editRequestWarning 的迁移）。
 * 旧实现按讨论页命名空间（namespaces: [5]）近似判断且静态提示；
 * 这里改为检查当前页（基页面）的分类是否属于方针 / 指引，命中且用户不在跳过名单时才提醒。
 * 分类读 mw.config 的 wgCategories（当前渲染页的可见分类，零请求）：两个方针分类页
 * 均未挂 __HIDDENCAT__（2026-10 实测），成员必为可见分类、必在其中；入口都在基页上，
 * 渲染页与 ctx.pageName 一致。
 * @param ctx 打开对话框时收集的上下文
 * @returns 确认项列表；无需提醒时为空数组
 */
const policyWarning = (ctx: QuickRequestContext): Promise<Warning[]> => {
    if (ctx.userGroups.some((group) => WARNING_SKIP_GROUPS.includes(group))) {
        return Promise.resolve([]);
    }
    const categories = mw.config.get("wgCategories");
    if (!POLICY_CATEGORIES.some((category) => categories.includes(category))) {
        return Promise.resolve([]);
    }
    const message = $("<div>").append(
        $("<p>").append(
            wgULS("进行", "進行"),
            $("<strong>").text(wgULS("实质性", "實質性")),
            wgULS("修改时，需要通过", "修改時，需要通過"),
            $("<a>", {
                href: "/萌娘百科:提案",
                text: wgULS("提案", "提案"),
            }).css("font-weight", "bold"),
            wgULS("或", "或"),
            $("<a>", {
                href: "/萌娘百科:快速提案",
                text: wgULS("快速提案", "快速提案"),
            }).css("font-weight", "bold"),
            wgULS("流程才可对方针和指引进行改动。", "流程才可對方針和指引進行改動。"),
        ),
        $("<p>").append(
            wgULS("在讨论页发起的编辑请求仅可用于修正错别字等", "在討論頁發起的編輯請求僅可用於修正錯別字等"),
            $("<strong>").text(wgULS("非实质性", "非實質性")),
            wgULS("修改。", "修改。"),
        ),
    );
    return Promise.resolve([{ title: wgULS("提醒", "提醒"), message }]);
};

/** 编辑请求：发到本页讨论页。editRequestWarning 的提醒随类型迁移至此。 */
const editDefinition: RequestTypeDefinition = {
    id: "edit",
    label: wgULS("编辑请求", "編輯請求"),
    availability: () => true,
    resolveTarget: (ctx) => ctx.talkPage,
    sectionTitle: (ctx) => `编辑请求${titleSuffix(ctx.userName, ctx.now)}`,
    warnings: policyWarning,
};

/** 转换表页面的编辑请求：目标与标题同 edit，内容模板不同（配置页单列 editConversiontable 条目）。 */
const editConversiontableDefinition: RequestTypeDefinition = {
    ...editDefinition,
    id: "editConversiontable",
    label: wgULS("编辑请求（转换表）", "編輯請求（轉換表）"),
};

/** 移动请求：发到操作申请版。 */
const moveDefinition: RequestTypeDefinition = {
    id: "move",
    label: wgULS("移动请求", "移動請求"),
    availability: () => true,
    resolveTarget: () => OPERATIONS_BOARD,
    sectionTitle: (ctx) => `移动请求${titleSuffix(ctx.userName, ctx.now)}`,
};

/** 创建请求：发到操作申请版。 */
const createDefinition: RequestTypeDefinition = {
    id: "create",
    label: wgULS("创建请求", "建立請求"),
    availability: () => true,
    resolveTarget: () => OPERATIONS_BOARD,
    sectionTitle: (ctx) => `创建请求${titleSuffix(ctx.userName, ctx.now)}`,
};

/**
 * 用户组申请/提名（阶段 2）：发到权限变更版。
 * 申请族模板（Template:权限申请/*）的正文以 `== X申请 - User:{{subst:REVISIONUSER}} ==`
 * 开头——章节标题由模板在存盘替换时生成，addtopic 的 sectiontitle 会再叠一层标题造成重复，
 * 故走 append 追加：不加标题行，与现行入口 `section=new&nosummary=1`（隐藏标题框、
 * 只追加预载正文）的保存结果一致，也不提供 sectionTitle。
 * 具体申请类型（维护姬/管理员/机器人/通用等 14 个变体，映射 7 个基模板）在配置页的
 * variants 里；站内无辞职模板（辞职历来是自由发帖），本类型只覆盖申请/提名。
 */
const userGroupDefinition: RequestTypeDefinition = {
    id: "userGroup",
    label: wgULS("权限申请", "權限申請"),
    // 与现行申请按钮（Widget:Applybutton）的守卫一致：仅自动确认用户可用
    availability: (ctx) => ctx.userGroups.includes("autoconfirmed"),
    resolveTarget: () => RIGHTS_BOARD,
    postMode: "append",
};

/**
 * 封禁申诉（阶段 3）：发到本人讨论页。
 * Template:BlockedUserHelp/request 的正文以 `== 用户被封禁而寻求帮助 ==` 开头——章节标题
 * 由模板在存盘替换时生成，与权限申请族相同，走 append 追加、不提供 sectionTitle（见 §2 的
 * 标题机制说明）。封禁信息由入口查询 blockinfo 后经 preset 预填（blockInfo.ts）。
 * availability 恒真：入口只在封禁提示屏（#BlockedUserHelp div 由服务端渲染）挂载，
 * 封禁状态在点击入口时复核，这里没有可同步判断的条件。
 */
const banAppealDefinition: RequestTypeDefinition = {
    id: "banAppeal",
    label: wgULS("封禁申诉", "封鎖申訴"),
    availability: () => true,
    resolveTarget: (ctx) => `User_talk:${ctx.userName}`,
    postMode: "append",
    allowCreate: true,
};

/** 阶段 1-3 的请求类型注册表；delete / vandalReport / checkuserRecord / editTech 随阶段 4-5 补齐。 */
const REQUEST_TYPES: Partial<Record<RequestTypeId, RequestTypeDefinition>> = {
    edit: editDefinition,
    editConversiontable: editConversiontableDefinition,
    move: moveDefinition,
    create: createDefinition,
    userGroup: userGroupDefinition,
    banAppeal: banAppealDefinition,
};

/**
 * 解析请求类型：edit 在转换表页面上自动落到 editConversiontable——
 * site-lib 旧函数 wgGetEditRequestPreload 的特例判断迁移至此，调用方无需感知。
 * @param id 入口请求的类型 id
 * @param pageName 当前页面名
 * @returns 类型定义；id 未注册时为 undefined
 */
const resolveRequestType = (id: RequestTypeId, pageName: string): RequestTypeDefinition | undefined => {
    if (id === "edit" && CONVERSION_TABLE_PATTERN.test(pageName)) {
        return REQUEST_TYPES.editConversiontable;
    }
    return REQUEST_TYPES[id];
};

/**
 * 收集打开对话框所需的页面与用户上下文。
 * @param userName 当前登录用户名（入口已做登录守卫）
 * @returns 上下文
 */
const buildContext = (userName: string): QuickRequestContext => ({
    pageName: mw.config.get("wgPageName"),
    talkPage: libGetPageNames().talkPage,
    userName,
    userGroups: mw.config.get("wgUserGroups") ?? [],
    now: new Date(),
});

export { buildContext, REQUEST_TYPES, resolveRequestType };
