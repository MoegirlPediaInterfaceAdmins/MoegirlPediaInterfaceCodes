import type { NotifyType } from "./types.ts";

type UlsFunction = (hans: string, hant?: string | null) => string;

const runtimeUls = (): UlsFunction | undefined => {
    const runtime = globalThis as typeof globalThis & { wgULS?: UlsFunction };
    return typeof runtime.wgULS === "function" ? runtime.wgULS : undefined;
};

const uls = (hans: string, hant?: string | null): string => {
    const convert = runtimeUls();
    return convert ? convert(hans, hant) : hans;
};

// 用 textContent 承载服务端文本，避免被当作 HTML。
const notifyText = (text: string, type: NotifyType = "info"): void => {
    const container = document.createElement("span");
    container.textContent = text;
    mw.notify(container, { type });
};

interface ApiErrorLike {
    error?: {
        code?: unknown;
        info?: unknown;
    } | null;
    message?: unknown;
    statusText?: unknown;
}

const formatApiError = (error: unknown): string => {
    if (typeof error === "string") {
        return error;
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "object" && error !== null) {
        const candidate = error as ApiErrorLike;
        const details = candidate.error;
        if (typeof details === "object" && details !== null) {
            if (typeof details.info === "string" && details.info.length > 0) {
                return details.info;
            }
            if (typeof details.code === "string" && details.code.length > 0) {
                return details.code;
            }
        }
        if (typeof candidate.message === "string" && candidate.message.length > 0) {
            return candidate.message;
        }
        if (typeof candidate.statusText === "string" && candidate.statusText.length > 0) {
            return candidate.statusText;
        }
        try {
            const serialized = JSON.stringify(error);
            if (typeof serialized === "string" && serialized.length > 0) {
                return serialized;
            }
        } catch {
        }
        return uls("未知错误", "未知錯誤");
    }
    if (typeof error === "number") {
        return `${error}`;
    }
    return uls("未知错误", "未知錯誤");
};

export { uls, notifyText, formatApiError };
