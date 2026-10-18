import { openWindow } from "./openWindow.ts";

/** 消息对话框的内容。 */
interface MessageSpec {
    title: string;
    /** 纯文本或 jQuery 节点 */
    message: string | JQuery;
}

/**
 * 打开一个消息对话框并等待关闭。
 * @param spec 消息内容
 * @param actions 底部动作
 * @returns 关闭时按下的动作名；按 Esc 关闭（无数据）统一归一化为 'close'
 */
const showMessage = (spec: MessageSpec, actions: OO.ui.ActionWidget.ConfigOptions[]): Promise<string> => new Promise((resolve) => {
    const data = { title: spec.title, message: spec.message, actions };
    openWindow(new OO.ui.MessageDialog(), data, (result) => {
        resolve(result?.action ?? "close");
    });
});

/**
 * 只带「关闭」按钮的错误提示，调用方无需等待。
 * @param title 标题
 * @param message 正文
 * @returns 提示流程结束后兑现
 */
const showError = async (title: string, message: string): Promise<void> => {
    try {
        await showMessage({ title, message }, [{ action: "close", label: wgULS("关闭", "關閉"), flags: ["safe"] }]);
    } catch (error) {
        // openWindow 仍可能同步抛错（如 OOUI 未就绪），兜住以免留下未处理的 rejection
        console.error("[UserMessages] 错误提示无法显示", error);
    }
};

/**
 * 发送失败时的「关闭 / 重试」对话框。
 * @param title 标题
 * @param message 正文
 * @returns 用户的选择
 */
const confirmRetry = async (title: string, message: string): Promise<"retry" | "close"> => {
    const action = await showMessage({ title, message }, [
        { action: "close", label: wgULS("关闭", "關閉"), flags: ["safe"] },
        { action: "retry", label: wgULS("重试", "重試"), flags: ["primary", "progressive"] },
    ]);
    return action === "retry" ? "retry" : "close";
};

export { confirmRetry, showError };
