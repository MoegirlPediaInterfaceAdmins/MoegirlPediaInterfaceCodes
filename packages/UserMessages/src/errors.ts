/**
 * 把任意抛出的值转成可读文案。
 * @param error 被抛出的值
 * @returns 可读文案
 */
const toErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

/** API 的 reject 载荷。bc 信封为 error.info，modern 信封为 errors[0].info。 */
interface ApiRejectPayload {
    error?: {
        info?: string;
    };
    errors?: {
        info?: string;
    }[];
}

/** 已知错误码 → 中文说明。 */
const ERROR_MESSAGES: Record<string, string> = {
    badtoken: wgULS("登录令牌已失效，请刷新页面后重试。", "登入權杖已失效，請重新整理頁面後再試。"),
    assertnameduserfailed: wgULS("当前登录状态已失效（可能已在别处退出登录），请刷新页面后重新登录。", "目前登入狀態已失效（可能已在別處登出），請重新整理頁面後重新登入。"),
    ratelimited: wgULS("操作过于频繁，已被限流，请稍后再试。", "操作過於頻繁，已受到頻率限制，請稍後再試。"),
    permissiondenied: wgULS("权限不足，无法编辑该讨论页。", "權限不足，無法編輯該討論頁。"),
    blocked: wgULS("您当前的账号或 IP 已被封禁，无法编辑。", "您目前的帳號或 IP 已被封鎖，無法編輯。"),
    spamdetected: wgULS("内容被滥用过滤器判定为垃圾信息，已被拒绝。", "內容被濫用過濾器判定為垃圾資訊，已被拒絕。"),
    articleexists: wgULS("目标页面已存在，无法新建。", "目標頁面已存在，無法建立。"),
    readonly: wgULS("本站当前处于只读状态，暂时无法编辑。", "本站目前處於唯讀狀態，暫時無法編輯。"),
};

/**
 * 从 API 的 reject 载荷里取出服务端给的 info 文案。
 * @param result reject 的第二个参数
 * @returns 服务端 info 文案；取不到时为空串
 */
const extractInfo = (result?: ApiRejectPayload | null): string => {
    if (typeof result !== "object" || result === null) {
        return "";
    }
    return result.error?.info ?? result.errors?.[0]?.info ?? "";
};

/**
 * 把 API 错误码翻译成中文说明。
 * @param code 错误码，来自 postWithToken 的多参 reject 的第一个参数
 * @param result reject 的第二个参数，形如 { error: { code, info } }
 * @returns 中文说明
 */
const describeSendError = (code: string, result?: ApiRejectPayload | null): string => {
    const info = extractInfo(result);
    // 用 hasOwn 而非直接下标：code 来自服务端，直接取值会命中原型链上的键（如 toString）
    const known = Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : undefined;
    if (known) {
        return info ? `${known}（${info}）` : known;
    }
    if (code.startsWith("abusefilter")) {
        return wgULS(`被滥用过滤器阻止（${code}）${info ? `：${info}` : ""}`, `被濫用過濾器阻止（${code}）${info ? `：${info}` : ""}`);
    }
    return wgULS(`发送失败（${code}）${info ? `：${info}` : ""}`, `傳送失敗（${code}）${info ? `：${info}` : ""}`);
};

export { type ApiRejectPayload, describeSendError, toErrorMessage };
