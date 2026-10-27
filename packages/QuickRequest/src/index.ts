import { getSettledConfig, prefetchConfig } from "./config.ts";
import { CONFIG_PAGE, DIALOG_SIZE, REDIRECT_DELAY } from "./constants.ts";
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
            // 提示先露个脸，再离场：这一步是刻意延迟的，故此刻页面还能看见通知
            window.setTimeout(() => {
                gotoNewSection(data.targetPage, result.anchor ?? "");
            }, REDIRECT_DELAY);
        }
    });
};

/**
 * 打开指定类型的请求对话框。
 * preset 供删除请求等入口预填（阶段 4 起）；阶段 1 的四类请求均由用户当场填写。
 * @param type 请求类型 id；edit 在转换表页面上自动落到 editConversiontable
 * @param preset 预填值
 */
const open = (type: RequestTypeId, preset?: Record<string, string>): void => {
    void preset;

    const userName = mw.config.get("wgUserName");
    if (!userName) {
        mw.notify(wgULS("请先登录后再使用快速申请小工具。", "請先登入後再使用快速申請小工具。"), { type: "warn" });
        return;
    }

    const definition = resolveRequestType(type, mw.config.get("wgPageName"));
    if (!definition) {
        console.warn("[QuickRequest] 未知的请求类型", type);
        return;
    }

    const context = buildContext(userName);
    if (definition.resolveTarget(context) === false) {
        void showError(wgULS("无法发起请求", "無法發起請求"), wgULS("当前页面没有对应的讨论页。", "目前頁面沒有對應的討論頁。"));
        return;
    }

    const configPromise = prefetchConfig();
    const settled = getSettledConfig();
    if (settled && !settled.ok) {
        void showError(wgULS("无法加载请求配置", "無法載入請求設定"), describeConfigFailure(settled.message));
        return;
    }

    const mainDialog = new MainDialog({ size: DIALOG_SIZE });
    const data: MainDialogData = {
        definition,
        context,
        configPromise,
        onPreview: (previewData): void => {
            openPreview(previewData, mainDialog);
        },
    };
    openWindow<MainDialogCloseResult>(mainDialog, data, (result) => {
        if (result?.action === "configError") {
            void showError(wgULS("无法加载请求配置", "無法載入請求設定"), describeConfigFailure(result.message));
            return;
        }
        if (result?.action === "formError") {
            void showError(wgULS("界面构建失败", "介面建構失敗"), wgULS(`无法生成表单：${result.message}`, `無法產生表單：${result.message}`));
        }
    });
};

// 全局入口：edit / pageInfo 等调用方（与 site-lib 暴露 window.libGetPageNames 的做法一致）
// 经此发起请求；调用方须以 ext.gadget.QuickRequest 依赖保证加载顺序
window.libQuickRequest = { open };
