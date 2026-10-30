import { getApi, isZhHost } from "./api.ts";
import {
    CHECKUSER_RECORD_TALK,
    CONVERSION_TABLE_PATTERN,
    OPERATIONS_BOARD,
    POLICY_CATEGORIES,
    RIGHTS_BOARD,
    titleSuffix,
    VANDAL_BOARD,
    WARNING_SKIP_GROUPS,
} from "./constants.ts";
import { buildDeleteBody, buildDeleteParams, buildDeleteSectionTitle } from "./deleteContent.ts";
import type { QuickRequestContext, RequestTypeDefinition, RequestTypeId, Warning } from "./types.ts";

/**
 * 方针 / 指引修改提醒（editRequestWarning 的迁移）。
 * 分类读 mw.config 的 wgCategories（当前渲染页的可见分类）：两个方针分类页
 * 均未挂 __HIDDENCAT__（2026-10 实测），成员必为可见分类、必在其中。
 * 例外：Gadget-edit 的入口在编辑视图上，而 action=edit 不渲染页面、wgCategories
 * 为空——此时回退为按标题查分类（clcategories 只列方针/指引两项，轻查询），
 * 查询失败按未命中处理（宁可少提醒，不因辅助信息阻塞发帖）。
 * @param ctx 打开对话框时收集的上下文
 * @returns 确认项列表；无需提醒时为空数组
 */
const policyWarning = async (ctx: QuickRequestContext): Promise<Warning[]> => {
    if (ctx.userGroups.some((group) => WARNING_SKIP_GROUPS.includes(group))) {
        return [];
    }
    let hit = POLICY_CATEGORIES.some((category) => mw.config.get("wgCategories").includes(category));
    if (!hit && mw.config.get("wgAction") === "edit") {
        try {
            const res = await getApi().post({
                action: "query",
                titles: ctx.pageName,
                prop: "categories",
                clcategories: POLICY_CATEGORIES.join("|"),
                formatversion: 2,
            }) as { query?: { pages?: { categories?: unknown[] }[] } };
            hit = (res.query?.pages?.[0]?.categories?.length ?? 0) > 0;
        } catch (error) {
            console.warn("[QuickRequest] 编辑视图回退查询页面分类失败", error);
        }
    }
    if (!hit) {
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

/**
 * 判断两个页面名是否指同一页面：下划线与空格互通、仅首字母大小写不同视为相同
 * （MediaWiki 标题首字母大小写不敏感）。「移动到自身」校验用。
 * @param a 页面名一
 * @param b 页面名二
 */
const isSamePageTitle = (a: string, b: string): boolean => {
    const normalize = (title: string): string => {
        const spaced = title.replace(/_/g, " ").trim();
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    };
    return normalize(a) === normalize(b);
};

/** 移动请求：发到操作申请版。 */
const moveDefinition: RequestTypeDefinition = {
    id: "move",
    label: wgULS("移动请求", "移動請求"),
    availability: () => true,
    resolveTarget: () => OPERATIONS_BOARD,
    sectionTitle: (ctx) => `移动请求${titleSuffix(ctx.userName, ctx.now)}`,
    // 新标题与当前页面名相同即移动到自身，原生移动同样不允许
    validate: (values, ctx) => isSamePageTitle(values.new, ctx.pageName)
        ? wgULS("新标题与当前页面名相同，无需移动。", "新標題與目前頁面名稱相同，無需移動。")
        : null,
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
 * 无自有入口：现行申请按钮（Widget:Applybutton）的替换由站内直接调用
 * window.libQuickRequest 实现（部署前置事项），守卫与其一致（自动确认用户）。
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

/**
 * 删除请求（阶段 4，requestDeletion 并入）：发到操作申请版，共享站发起时目标站为主站
 * （site: "zh"——预览、发帖、锚点回读与跳转全部经 mw.ForeignApi / 站点基址指向主站）。
 * 正文为手工拼装的纯文本（非模板调用），走程序化表单：字段（理由下拉/详情/批量）与
 * 正文/标题构建在 deleteContent.ts，拼装格式与旧 Gadget-requestDeletion 逐字一致。
 * 入口沿用旧工具的 p-cactions「提出删除请求」与全部守卫（见 entries.ts）。
 */
const deleteDefinition: RequestTypeDefinition = {
    id: "delete",
    label: wgULS("请求删除", "請求刪除"),
    availability: () => true,
    resolveTarget: () => OPERATIONS_BOARD,
    site: "zh",
    programmaticForm: {
        buildParams: buildDeleteParams,
        requireAnyOf: ["reason", "detail"],
        buildBody: buildDeleteBody,
        buildSectionTitle: (values, ctx) => buildDeleteSectionTitle(values, ctx, isZhHost() ? "zh" : "commons"),
    },
};

/**
 * 反破坏举报申请（阶段 5）：发到长期破坏者版面，收位置参数 1=被举报者用户名、2=理由。
 * 模板正文以 `==提请将[[User:…]]列入破坏者列表==` 开头（2026-10 实测模板源码）——标题由
 * 模板在存盘替换时生成，与申请族相同，走 append、不提供 sectionTitle。版面在模板 doc
 * 标注「目前是」，实际目标以配置页 targetPage 优先（mainDialog），resolveTarget 的返回值
 * 仅作配置缺省时的回退。可见性对齐版面自身的编辑保护（autoconfirmed）——提请环节没有
 * 用户组限制（反破坏方针限制的是 Abuse 的认定环节）；本类型无自有入口，open 层守卫
 * 是站内挂载之外的兜底。
 */
const vandalReportDefinition: RequestTypeDefinition = {
    id: "vandalReport",
    label: wgULS("反破坏举报申请", "反破壞舉報申請"),
    availability: (ctx) => ctx.userGroups.includes("autoconfirmed"),
    resolveTarget: () => VANDAL_BOARD,
    postMode: "append",
};

/**
 * 用户查核记录（阶段 5）：查核员把新增记录以编辑请求发到记录页的讨论页
 * （记录页自身受 patrolleredit 保护，讨论页无保护；真实话题均在讨论页，2026-10 核实）。
 * 模板正文以 `== 新增查核记录 - {{subst:REVISIONUSER}} - {{subst:LOCALYEAR}}.… ==` 开头
 * ——标题含 subst 魔法字、存盘时才替换，客户端拼不出，走 append、不提供 sectionTitle。
 * 受众为查核员（记录由执行查核的查核员发起增补）；无自有入口，站内挂载方经
 * window.libQuickRequest 调起，open 层守卫作兜底。
 */
const checkuserRecordDefinition: RequestTypeDefinition = {
    id: "checkuserRecord",
    label: wgULS("新增查核记录", "新增查核記錄"),
    availability: (ctx) => ctx.userGroups.includes("checkuser"),
    resolveTarget: () => CHECKUSER_RECORD_TALK,
    postMode: "append",
};

/**
 * 技术编辑请求（阶段 5）：面向 JS/CSS/JSON/模板页面的编辑请求，发到本页讨论页。
 * 模板正文不带章节标题（区别于其余编辑请求族变体），走 addtopic；章节标题沿用
 * 版面既有的「编辑请求 - 用户 - 日期」——两个真实用例（CSS 页讨论页，2026-10）均如此，
 * 与 edit 同格式。入口由 pageInfo 在技术页面条件下追加（见 Gadget-pageInfo.js）。
 */
const editTechDefinition: RequestTypeDefinition = {
    ...editDefinition,
    id: "editTech",
    label: wgULS("技术编辑请求", "技術編輯請求"),
};

/** 请求类型注册表（阶段 1-5 全量）。 */
const REQUEST_TYPES: Partial<Record<RequestTypeId, RequestTypeDefinition>> = {
    edit: editDefinition,
    editConversiontable: editConversiontableDefinition,
    move: moveDefinition,
    create: createDefinition,
    userGroup: userGroupDefinition,
    banAppeal: banAppealDefinition,
    "delete": deleteDefinition,
    vandalReport: vandalReportDefinition,
    checkuserRecord: checkuserRecordDefinition,
    editTech: editTechDefinition,
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
    isRedirect: mw.config.get("wgIsRedirect"),
});

export { buildContext, REQUEST_TYPES, resolveRequestType };
