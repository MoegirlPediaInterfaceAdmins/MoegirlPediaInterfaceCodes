import { fetchPageCategories } from "./api.ts";
import {
    CONVERSION_TABLE_PATTERN,
    OPERATIONS_BOARD,
    POLICY_CATEGORIES,
    titleSuffix,
    WARNING_SKIP_GROUPS,
} from "./constants.ts";
import type { QuickRequestContext, RequestTypeDefinition, RequestTypeId, Warning } from "./types.ts";

/**
 * 方针 / 指引修改提醒（editRequestWarning 的迁移）。
 * 旧实现按讨论页命名空间（namespaces: [5]）近似判断且静态提示；
 * 这里改为查询当前页（基页面）的分类是否属于方针 / 指引，命中且用户不在跳过名单时才提醒。
 * 分类查询失败按「非方针页」处理——提醒是附加确认，不应因此阻断提交流程。
 * @param ctx 打开对话框时收集的上下文
 * @returns 确认项列表；无需提醒时为空数组
 */
const policyWarning = async (ctx: QuickRequestContext): Promise<Warning[]> => {
    if (ctx.userGroups.some((group) => WARNING_SKIP_GROUPS.includes(group))) {
        return [];
    }
    let categories: Set<string>;
    try {
        categories = await fetchPageCategories(ctx.pageName);
    } catch (error) {
        console.warn("[QuickRequest] 读取页面分类失败，跳过方针提醒", error);
        return [];
    }
    if (!POLICY_CATEGORIES.some((category) => categories.has(category))) {
        return [];
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
    return [{ title: wgULS("提醒", "提醒"), message }];
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

/** 阶段 1 的请求类型注册表；userGroup / banAppeal / delete / vandalReport / checkuserRecord / editTech 随阶段 2-5 补齐。 */
const REQUEST_TYPES: Partial<Record<RequestTypeId, RequestTypeDefinition>> = {
    edit: editDefinition,
    editConversiontable: editConversiontableDefinition,
    move: moveDefinition,
    create: createDefinition,
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
