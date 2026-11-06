import { fetchBlockInfoText } from "./blockInfo.ts";
import { BOARD_PREFIX } from "./constants.ts";
import { toErrorMessage } from "./errors.ts";

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

/** MoeSkin 页面工具列按钮的图标：tabler 官方 outline trash 图标（report 等 gadget 同样内联 tabler SVG）。 */
const TRASH_ICON = "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 7l16 0' /><path d='M10 11l0 6' /><path d='M14 11l0 6' /><path d='M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12' /><path d='M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3' /></svg>";

/**
 * 「提出删除请求」入口（阶段 4，沿用旧 Gadget-requestDeletion 的全部守卫）。
 * MoeSkin 下挂皮肤提供的页面工具列（moeskin.pagetools 扩展点，与 report / shortlink /
 * InPageEdit-v2 的用法一致；旧工具在 MoeSkin 下同样挂 p-cactions，没有专门处理），
 * 其余皮肤沿用旧工具的 p-cactions，zh 站与共享站相同。守卫：页面已存在（wgArticleId 非 0）
 * 且非特殊命名空间，讨论版各级版面自身、已挂 {{will2Be2Deleted}} 的页面不显示；
 * 巡查员/管理员默认不显示，?AnnTools-debug=requestDeletion（竖线分隔多值）调试开关保留。
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
    const openDelete = (event: JQuery.TriggeredEvent): void => {
        event.preventDefault();
        window.libQuickRequest?.open("delete");
    };
    if (mw.config.get("skin") === "moeskin") {
        // mw.hook 会记住最近一次触发：皮肤先于本模块就绪时，add 进来的回调立即执行
        mw.hook("moeskin.pagetools").add(({ addPageToolsButton }: MoeSkinPageTools) => {
            const $button = addPageToolsButton(TRASH_ICON, wgULS("提出删除请求", "提出刪除請求"), "extra");
            $button.attr({ id: "ca-quickrequest-delete", href: "#" }).on("click", openDelete);
        });
        return;
    }
    const link = mw.util.addPortletLink("p-cactions", "#", wgULS("提出删除请求", "提出刪除請求"), "ca-quickrequest-delete", wgULS("向讨论版提出删除请求", "向討論版提出刪除請求"));
    if (!link) {
        return;
    }
    $(link).on("click", openDelete);
};

/**
 * QuickRequest 自有入口的挂载器列表（封禁提示屏「寻求帮助」、「提出删除请求」）。
 * 权限申请（userGroup）、反破坏举报（vandalReport）、新增查核记录（checkuserRecord）
 * 不设侧边栏入口：这三类的可见性属站内挂载决策，由 Widget/模板直接调用
 * window.libQuickRequest.open(...) 实现各自的入口（部署前置事项，与配置页同批）；
 * open 层仍保有各自的 availability 守卫。
 */
const entryMounters: (() => void)[] = [mountBanAppealEntry, mountDeleteEntry];

/**
 * 挂载全部自有入口。index 在模块求值时调用一次。
 */
const mountEntries = (): void => {
    for (const mount of entryMounters) {
        mount();
    }
};

export { mountEntries };
