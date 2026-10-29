import { fetchBlockInfoText } from "./blockInfo.ts";
import { BOARD_PREFIX, CHECKUSER_RECORD_PAGE, CHECKUSER_RECORD_TALK, RIGHTS_BOARD } from "./constants.ts";
import { toErrorMessage } from "./errors.ts";
import { buildContext, REQUEST_TYPES } from "./registry.ts";

/**
 * 权限变更版的「发起权限申请」入口（p-cactions，阶段 2）。
 * 现行申请按钮由页顶模板渲染（Module:权限申请按钮 生成 URL 预载链接），
 * 替换为 QuickRequest 需要站内配合，列入部署前置事项；在此之前本入口与其并存。
 * 可用性沿用 Widget:Applybutton 的守卫：已登录（gadget 的 rights: [edit] 已保证）
 * 且为自动确认用户——不满足时入口不出现。
 */
const mountUserGroupEntry = (): void => {
    if (mw.config.get("wgPageName") !== RIGHTS_BOARD) {
        return;
    }
    // 本包以 rights: [edit] 加载，执行到这里必为有名用户；available 的 autoconfirmed
    // 条件与现行申请按钮（Widget:Applybutton）的守卫一致
    const definition = REQUEST_TYPES.userGroup;
    if (!definition?.availability(buildContext((mw.config.get("wgUserName") as string | null | undefined) ?? ""))) {
        return;
    }
    const link = mw.util.addPortletLink("p-cactions", "#", wgULS("发起权限申请", "發起權限申請"), "ca-quickrequest-usergroup");
    if (!link) {
        return;
    }
    // window.libQuickRequest 在 index.ts 末尾才赋值，挂载早于赋值——到点击时才解引用
    $(link).on("click", (event) => {
        event.preventDefault();
        window.libQuickRequest?.open("userGroup");
    });
};

/**
 * 封禁提示屏上的「寻求帮助」入口（阶段 3）。
 * 提示屏由 MediaWiki:Blockedtext* 系列消息经 Template:BlockedUserHelp 服务端渲染，其中带
 * <div id="BlockedUserHelp">——div 出现在 DOM 中就是封禁提示屏的可靠信号，不必逐页查询封禁
 * 状态。封禁详情在点击入口时按现行 Widget:BlockedUserHelp 的同一条查询现查现拼，作为 preset
 * 预填进对话框的只读「封禁信息」字段。现行 Widget 注入的同名表单与本入口并存，替换需站内
 * 配合（去掉模板里的 {{#Widget:BlockedUserHelp}}），列入部署前置事项。
 */
const mountBanAppealEntry = (): void => {
    const $container = $("#BlockedUserHelp");
    if ($container.length === 0) {
        return;
    }
    const openBanAppeal = async (): Promise<void> => {
        try {
            const blockInfo = await fetchBlockInfoText();
            if (blockInfo === null) {
                // 提示屏渲染时在封禁中，点击时可能已期满——此时没有可申诉的封禁
                mw.notify(wgULS("您当前不在封禁中，无需申诉。", "您目前不在封鎖中，無需申訴。"));
                return;
            }
            window.libQuickRequest?.open("banAppeal", { 1: blockInfo });
        } catch (error) {
            mw.notify(wgULS(`查询封禁信息失败：${toErrorMessage(error)}`, `查詢封鎖資訊失敗：${toErrorMessage(error)}`), { type: "error" });
        }
    };
    const button = new OO.ui.ButtonWidget({ label: wgULS("寻求帮助", "尋求幫助"), flags: ["primary", "progressive"] });
    button.on("click", () => {
        void openBanAppeal();
    });
    $container.append(button.$element);
};

/**
 * 「提出删除请求」入口（阶段 4，沿用旧 Gadget-requestDeletion 的挂载与全部守卫）。
 * 挂在 p-cactions，zh 站与共享站相同；守卫：页面已存在（wgArticleId 非 0）且非特殊命名空间，
 * 讨论版各级版面自身、已挂 {{will2Be2Deleted}} 的页面不显示；巡查员/管理员默认不显示，
 * ?AnnTools-debug=requestDeletion（竖线分隔多值）调试开关保留。
 */
const mountDeleteEntry = (): void => {
    const { wgArticleId, wgPageName, wgNamespaceNumber, wgUserGroups } = mw.config.get(["wgArticleId", "wgPageName", "wgNamespaceNumber", "wgUserGroups"]);
    const debug = (new URL(location.href).searchParams.get("AnnTools-debug") ?? "").split("|").includes("requestDeletion");
    const groups = wgUserGroups ?? [];
    if (
        wgArticleId === 0
        || wgNamespaceNumber < 0
        || wgPageName.startsWith(BOARD_PREFIX)
        || $(".will2Be2Deleted").length > 0
        || (groups.includes("patroller") || groups.includes("sysop")) && !debug
    ) {
        return;
    }
    const link = mw.util.addPortletLink("p-cactions", "#", wgULS("提出删除请求", "提出刪除請求"), "ca-quickrequest-delete", wgULS("向讨论版提出删除请求", "向討論版提出刪除請求"));
    if (!link) {
        return;
    }
    $(link).on("click", (event) => {
        event.preventDefault();
        window.libQuickRequest?.open("delete");
    });
};

/**
 * 「反破坏举报申请」入口（阶段 5）：挂在用户页与用户讨论页的 p-cactions。
 * 可见性为巡查员/管理员（Abuse 认定按反破坏方针在维护组内讨论，提请属巡查/维护动作）；
 * 被举报者按页面的相关用户（wgRelevantUserName——用户子页面亦指向页面主人）预填为
 * 位置参数 1，可改填（如举报相关分身）。实际发帖版面以配置页 targetPage 为准。
 */
const mountVandalReportEntry = (): void => {
    const { wgNamespaceNumber, wgRelevantUserName } = mw.config.get(["wgNamespaceNumber", "wgRelevantUserName"]);
    if (wgNamespaceNumber !== 2 && wgNamespaceNumber !== 3) {
        return;
    }
    const definition = REQUEST_TYPES.vandalReport;
    if (!definition?.availability(buildContext((mw.config.get("wgUserName") as string | null | undefined) ?? ""))) {
        return;
    }
    const link = mw.util.addPortletLink("p-cactions", "#", wgULS("反破坏举报申请", "反破壞舉報申請"), "ca-quickrequest-vandal-report", wgULS("提请将此用户列入破坏者列表", "提請將此使用者列入破壞者列表"));
    if (!link) {
        return;
    }
    $(link).on("click", (event) => {
        event.preventDefault();
        window.libQuickRequest?.open("vandalReport", typeof wgRelevantUserName === "string" ? { 1: wgRelevantUserName } : undefined);
    });
};

/**
 * 「新增查核记录」入口（阶段 5）：挂在用户查核记录页及其讨论页的 p-cactions，
 * 仅查核员可见（记录由执行查核的查核员发起增补，经讨论页的编辑请求落盘）。
 * 目标页固定为讨论页（resolveTarget），与挂载页面无关——在记录页上点击同样发到讨论页。
 */
const mountCheckuserRecordEntry = (): void => {
    const { wgPageName } = mw.config.get(["wgPageName"]);
    if (wgPageName !== CHECKUSER_RECORD_PAGE && wgPageName !== CHECKUSER_RECORD_TALK) {
        return;
    }
    const definition = REQUEST_TYPES.checkuserRecord;
    if (!definition?.availability(buildContext((mw.config.get("wgUserName") as string | null | undefined) ?? ""))) {
        return;
    }
    const link = mw.util.addPortletLink("p-cactions", "#", wgULS("新增查核记录", "新增查核記錄"), "ca-quickrequest-checkuser-record", wgULS("在用户查核记录版面发起新增记录请求", "在用戶查核記錄版面發起新增記錄請求"));
    if (!link) {
        return;
    }
    $(link).on("click", (event) => {
        event.preventDefault();
        window.libQuickRequest?.open("checkuserRecord");
    });
};

/**
 * QuickRequest 自有入口的挂载器列表（权限变更版「发起权限申请」、封禁提示屏「寻求帮助」、
 * 「提出删除请求」、用户页「反破坏举报申请」、查核记录页「新增查核记录」）。
 */
const entryMounters: (() => void)[] = [mountUserGroupEntry, mountBanAppealEntry, mountDeleteEntry, mountVandalReportEntry, mountCheckuserRecordEntry];

/**
 * 挂载全部自有入口。index 在模块求值时调用一次。
 */
const mountEntries = (): void => {
    for (const mount of entryMounters) {
        mount();
    }
};

export { mountEntries };
