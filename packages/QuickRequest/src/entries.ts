import { fetchBlockInfoText } from "./blockInfo.ts";
import { RIGHTS_BOARD } from "./constants.ts";
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
 * QuickRequest 自有入口的挂载器列表（权限变更版「发起权限申请」、封禁提示屏「寻求帮助」）。
 * 删除请求（阶段 4）、反破坏举报与用户查核记录（阶段 5）按里程碑在此追加。
 */
const entryMounters: (() => void)[] = [mountUserGroupEntry, mountBanAppealEntry];

/**
 * 挂载全部自有入口。index 在模块求值时调用一次。
 */
const mountEntries = (): void => {
    for (const mount of entryMounters) {
        mount();
    }
};

export { mountEntries };
