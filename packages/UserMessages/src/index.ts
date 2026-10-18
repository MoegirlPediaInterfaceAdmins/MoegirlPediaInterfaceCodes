import { getSettledConfig, prefetchConfig } from "./config.ts";
import { ALLOWED_NAMESPACES, ALLOWED_SPECIAL_PAGES, CONFIG_PAGE, DIALOG_SIZE, REDIRECT_DELAY } from "./constants.ts";
import { MainDialog } from "./mainDialog.ts";
import { showError } from "./messageDialog.ts";
import { openWindow } from "./openWindow.ts";
import { gotoNewSection } from "./send.ts";
import { PreviewDialog } from "./previewDialog.ts";
import type { MainDialogCloseResult, MainDialogData, PreviewDialogCloseResult, PreviewDialogData } from "./types.ts";

(() => {
    const { wgNamespaceNumber, wgCanonicalSpecialPageName, wgRelevantUserName } = mw.config.get() as {
        wgNamespaceNumber: number;
        wgCanonicalSpecialPageName: string | false;
        wgRelevantUserName: string | undefined;
    };

    if (
        !ALLOWED_NAMESPACES.includes(wgNamespaceNumber)
        || wgNamespaceNumber === -1 && !ALLOWED_SPECIAL_PAGES.includes(wgCanonicalSpecialPageName || "")
        || !wgRelevantUserName
    ) {
        return;
    }

    const configPromise = prefetchConfig();

    /**
     * 拼出配置加载失败的原因说明。
     * @param reason 具体原因
     * @returns 完整说明
     */
    const describeConfigFailure = (reason: string): string => wgULS(`${CONFIG_PAGE} 读取或解析失败：${reason}`, `${CONFIG_PAGE} 讀取或解析失敗：${reason}`);

    /**
     * 在主对话框之上叠开预览对话框；主对话框保持开启。
     * 「返回」（或按 Esc）仅关掉预览，主对话框原样回到前台；
     * 发送成功则一并关掉主对话框，提示 REDIRECT_DELAY 后再跳到新章节。
     * @param data 预览数据
     * @param mainDialog 主对话框实例
     */
    const openPreview = (data: PreviewDialogData, mainDialog: MainDialog): void => {
        openWindow<PreviewDialogCloseResult>(new PreviewDialog({ size: DIALOG_SIZE }), data, (result) => {
            if (result?.action === "sent") {
                mainDialog.close();
                mw.notify(wgULS("发送成功，3 秒后跳转", "傳送成功，3 秒後跳轉"), { type: "success" });
                // 提示先露个脸，再离场：这一步是刻意延迟的，故此刻页面还能看见通知
                window.setTimeout(() => {
                    gotoNewSection(data.targetUser, result.anchor ?? "");
                }, REDIRECT_DELAY);
            }
        });
    };

    /** 打开主对话框。 */
    const openDialog = (): void => {
        const settledConfig = getSettledConfig();
        if (settledConfig && !settledConfig.ok) {
            void showError(wgULS("无法加载模板列表", "無法載入模板列表"), describeConfigFailure(settledConfig.message));
            return;
        }

        const mainDialog = new MainDialog({ size: DIALOG_SIZE });
        const data: MainDialogData = {
            targetUser: wgRelevantUserName,
            configPromise,
            onPreview: (previewData): void => {
                openPreview(previewData, mainDialog);
            },
        };
        openWindow<MainDialogCloseResult>(mainDialog, data, (result) => {
            if (result?.action === "configError") {
                void showError(wgULS("无法加载模板列表", "無法載入模板列表"), describeConfigFailure(result.message));
                return;
            }
            if (result?.action === "formError") {
                void showError(wgULS("界面构建失败", "介面建構失敗"), wgULS(`无法生成表单：${result.message}`, `無法產生表單：${result.message}`));
            }
        });
    };

    // 定义完处理函数再挂入口，避免监听器里出现前向引用
    const portletLink = mw.util.addPortletLink(
        "p-cactions",
        "#",
        wgULS("向用户发送提醒", "向使用者傳送提醒"),
        "p-usermessages",
        wgULS("向该用户发送提醒模板", "向該使用者傳送提醒模板"),
    );
    portletLink?.querySelector("a")?.addEventListener("click", (event) => {
        event.preventDefault();
        openDialog();
    });
})();
