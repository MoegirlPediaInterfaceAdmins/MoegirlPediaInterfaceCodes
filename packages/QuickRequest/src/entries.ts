import { RIGHTS_BOARD } from "./constants.ts";
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
    const userName = mw.config.get("wgUserName");
    if (!userName) {
        return;
    }
    const definition = REQUEST_TYPES.userGroup;
    if (!definition?.availability(buildContext(userName))) {
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
 * QuickRequest 自有入口的挂载器列表（权限变更版「发起权限申请」等）。
 * 封禁申诉（阶段 3）、删除请求（阶段 4）、反破坏举报与用户查核记录（阶段 5）按里程碑在此追加。
 */
const entryMounters: (() => void)[] = [mountUserGroupEntry];

/**
 * 挂载全部自有入口。index 在模块求值时调用一次。
 */
const mountEntries = (): void => {
    for (const mount of entryMounters) {
        mount();
    }
};

export { mountEntries };
