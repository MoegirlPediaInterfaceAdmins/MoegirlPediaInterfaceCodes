import { getApiForSite, isCurrentHost } from "./api.ts";
import { prefetchConfig } from "./config.ts";
import { CONFIG_PAGE, DIALOG_SIZE, REDIRECT_DELAY, SITE_ORIGINS } from "./constants.ts";
import { mountEntries } from "./entries.ts";
import { MainDialog } from "./mainDialog.ts";
import { showError } from "./messageDialog.ts";
import { openWindow } from "./openWindow.ts";
import { PreviewDialog } from "./previewDialog.ts";
import { buildContext, resolveRequestType } from "./registry.ts";
import { gotoNewSection } from "./send.ts";
import type {
    MainDialogCloseResult,
    MainDialogData,
    PreviewDialogCloseResult,
    PreviewDialogData,
    RequestTypeId,
} from "./types.ts";

// 自有入口（阶段 2 起）在此挂载；模块求值不发起任何 API 请求
mountEntries();

/**
 * 拼出配置加载失败的原因说明。
 * @param reason 具体原因
 * @returns 完整说明
 */
const describeConfigFailure = (reason: string): string => wgULS(`${CONFIG_PAGE} 读取或解析失败：${reason}`, `${CONFIG_PAGE} 讀取或解析失敗：${reason}`);

/**
 * 在主对话框之上叠开预览对话框；主对话框保持开启。
 * 「返回」（或按 Esc）仅关掉预览，主对话框原样回到前台；
 * 提交成功则一并关掉主对话框，提示 REDIRECT_DELAY 后再跳到新话题。
 * @param data 预览数据
 * @param mainDialog 主对话框实例
 */
const openPreview = (data: PreviewDialogData, mainDialog: MainDialog): void => {
    openWindow<PreviewDialogCloseResult>(new PreviewDialog({ size: DIALOG_SIZE }), data, (result) => {
        if (result?.action === "sent") {
            mainDialog.close();
            mw.notify(wgULS("提交成功，3 秒后跳转", "提交成功，3 秒後跳轉"), { type: "success" });
            // 提示先露个脸，再离场：这一步是刻意延迟的，故此刻页面还能看见通知；
            // 共享站发起的请求目标在主站，跳转 URL 需带站点基址
            window.setTimeout(() => {
                gotoNewSection(data.targetPage, result.anchor ?? "", data.targetBase);
            }, REDIRECT_DELAY);
        }
    });
};

/**
 * 打开指定类型的请求对话框。
 * preset 供入口预填参数：封禁申诉入口用它预填封禁信息，删除请求（阶段 4）用它预填页面名等。
 * @param type 请求类型 id；edit 在转换表页面上自动落到 editConversiontable
 * @param preset 预填值
 */
const open = (type: RequestTypeId, preset?: Record<string, string>): void => {
    const definition = resolveRequestType(type, mw.config.get("wgPageName"));
    if (!definition) {
        console.warn("[QuickRequest] 未知的请求类型", type);
        return;
    }

    // QuickRequest 以 rights: [edit] 加载，能执行到这里必为有名用户，无需再判 wgUserName
    const context = buildContext((mw.config.get("wgUserName") as string | null | undefined) ?? "");
    // 自有入口挂载前已查过 availability，这里是 open 层的兜底（如控制台直接调用）
    if (!definition.availability(context)) {
        mw.notify(wgULS("您暂不满足发起此请求的条件。", "您暫不滿足發起此請求的條件。"), { type: "warn" });
        return;
    }
    if (definition.resolveTarget(context) === false) {
        void showError(wgULS("无法发起请求", "無法發起請求"), wgULS("当前页面没有对应的讨论页。", "目前頁面沒有對應的討論頁。"));
        return;
    }

    // 目标站与对应 API/基址：delete 在共享站发起时目标为主站（经 ForeignApi），
    // 其余类型目标即当前站；程序化表单类型不经配置页，配置只对模板类型预取
    const site = definition.site ?? "zh";
    const mainDialog = new MainDialog({ size: DIALOG_SIZE });
    const data: MainDialogData = {
        definition,
        context,
        ...preset === undefined ? {} : { preset },
        ...definition.programmaticForm === undefined ? { configPromise: prefetchConfig() } : {},
        api: getApiForSite(site),
        targetBase: isCurrentHost(site) ? "" : SITE_ORIGINS[site],
        onPreview: (previewData): void => {
            openPreview(previewData, mainDialog);
        },
    };
    openWindow<MainDialogCloseResult>(mainDialog, data, (result) => {
        if (result?.action === "configError") {
            void showError(wgULS("无法加载请求配置", "無法載入請求組態"), describeConfigFailure(result.message));
            return;
        }
        if (result?.action === "formError") {
            void showError(wgULS("界面构建失败", "介面建構失敗"), wgULS(`无法生成表单：${result.message}`, `無法產生表單：${result.message}`));
        }
    });
};

// 全局入口：edit / pageInfo 等调用方（与 site-lib 暴露 window.libGetPageNames 的做法一致）
// 经此发起请求；加载方式见 README「全局入口」——受众相同的入口可用静态依赖，
// 全站加载的入口（pageInfo）应经 mw.loader.using 按需加载，避免把本包拉给匿名用户
window.libQuickRequest = { open };
