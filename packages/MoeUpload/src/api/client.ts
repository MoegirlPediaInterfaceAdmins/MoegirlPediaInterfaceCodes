import type {
    ApiBcErrorResponse,
    ApiModernErrorResponse,
    ApiQueryResponse,
    ApiSiteGeneral,
    ApiUploadWarnings,
    ApiUserInfo,
} from "types-mediawiki-response";
import { t } from "@/locale";
import type { Session } from "@/types";

class ApiError extends Error {
    constructor(
        public code: string,
        public info: string,
    ) {
        super(`[${code}] ${info}`);
        this.name = "ApiError";
    }
}

/** 提交返回的 upload warnings（非硬错误，需用户决策） */
class UploadWarnings extends Error {
    constructor(public warnings: ApiUploadWarnings) {
        super("upload-warnings");
        this.name = "UploadWarnings";
    }
}

const createAbortError = (): Error => Object.assign(new Error("aborted"), { name: "AbortError" });

const isAbortError = (error: unknown): boolean =>
    error instanceof Error && error.name === "AbortError";

const errText = (error: unknown): string => {
    if (error instanceof ApiError) {
        return error.info;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};

/** local = 宿主站；foreign = 跨站上传到目标站 */
type UploadTarget = { kind: "local" } | { kind: "foreign"; apiUrl: string };

let uploadTarget: UploadTarget = { kind: "local" };

const targetKey = (target: UploadTarget): string =>
    target.kind === "local" ? "local" : `foreign:${target.apiUrl}`;

// 注册上传目标；同一目标重复注册幂等（保留已缓存 API 实例）
const setUploadTarget = (target: UploadTarget): void => {
    if (targetKey(uploadTarget) === targetKey(target)) {
        return;
    }
    uploadTarget = target;
    // 目标切换必须丢弃旧单例（旧实例内嵌旧站的脚本路径与 token）
    apiInstance = null;
};

let apiInstance: Promise<mw.Api> | null = null;

// 依赖模块由宿主 Gadget 预加载，这里只负责按上传目标构造实例
const createUploadApi = (): mw.Api =>
    uploadTarget.kind === "foreign"
        ? new mw.ForeignApi(uploadTarget.apiUrl, { anonymous: false })
        : new mw.Api();

const getUploadApi = (): Promise<mw.Api> => {
    apiInstance ??= Promise.resolve()
        .then(createUploadApi)
        .catch((error: unknown) => {
            // 构造失败不缓存，下一次请求可重试
            apiInstance = null;
            throw error;
        });
    return apiInstance;
};

interface CallOptions {
    signal?: AbortSignal;
}

// 传输错误恒为 ('http', { xhr, textStatus, exception })；中断时 exception 为 'abort'
const toApiError = (code: string, result: unknown): Error => {
    if (code === "http") {
        const detail = (result ?? {}) as {
            textStatus?: string;
            exception?: string;
            xhr?: { status?: number };
        };
        if (detail.textStatus === "abort" || detail.exception === "abort") {
            return createAbortError();
        }
        return new ApiError(
            "http",
            detail.xhr?.status
                ? t("error.http", { status: detail.xhr.status })
                : t("error.network"),
        );
    }
    // 两种 errorformat：bc 在 error.info，现代格式在 errors[] 的 text/html；字符串入参兜底
    const shaped = (result ?? {}) as Partial<ApiBcErrorResponse & ApiModernErrorResponse>;
    const modern = shaped.errors?.[0];
    const info
        = typeof result === "string" && result
            ? result
            : shaped.error?.info ?? modern?.text ?? modern?.html ?? t("error.unknownApi");
    return new ApiError(code, info);
};

// abort 必须调用在原始 promise 上（.then 派生会丢失）；错误拒绝多参，经 .fail 取回（.then 只透传首参）
const runApi = async <T>(request: mw.Api.AbortablePromise, signal?: AbortSignal): Promise<T> => {
    const onAbort = (): void => { request.abort(); };
    if (signal) {
        if (signal.aborted) {
            onAbort();
        } else {
            signal.addEventListener("abort", onAbort, { once: true });
        }
    }
    return new Promise<T>((resolve, reject) => {
        const settle = (code: unknown, result: unknown): void => {
            signal?.removeEventListener("abort", onAbort);
            reject(toApiError(String(code), result));
        };
        request
            .done((json) => {
                signal?.removeEventListener("abort", onAbort);
                resolve(json as T);
            })
            .fail(settle);
    });
};

// token 注入与 badtoken 单次重试由 mw.Api 托管；token 传 'auto' 即交其注入
const apiPost = async <T = unknown>(
    params: Record<string, string>,
    options: CallOptions = {},
): Promise<T> => {
    const api = await getUploadApi();
    const fields: Record<string, string> = { ...params, format: "json", formatversion: "2" };
    if (fields.token === "auto") {
        Reflect.deleteProperty(fields, "token");
    }
    return runApi<T>(api.postWithEditToken(fields), options.signal);
};

// contentType 取 multipart 时 mw.Api 会把参数构建为 FormData（File 值成为二进制表单字段）
const apiUpload = async <T = unknown>(
    fields: Record<string, string>,
    blob: Blob | undefined,
    blobField: "file" | "chunk",
    options: CallOptions = {},
): Promise<T> => {
    const api = await getUploadApi();
    const params: Record<string, string | File> = { ...fields, format: "json", formatversion: "2" };
    if (params.token === "auto") {
        Reflect.deleteProperty(params, "token");
    }
    // 跨站写请求自动加 assert=user（会话失效由服务端明确拒绝）；读请求（会话探测）不加
    if (uploadTarget.kind === "foreign" && params.assert === undefined) {
        params.assert = "user";
    }
    if (blob) {
        // mw.Api 参数类型只声明 File；分块切片是 Blob，包一层 File（引用同一份字节）
        params[blobField] = blob instanceof File ? blob : new File([blob], "blob");
    }
    return runApi<T>(
        api.postWithEditToken(params, { contentType: "multipart/form-data" }),
        options.signal,
    );
};

const fetchSession = async (options: CallOptions = {}): Promise<Session> => {
    const json = await apiPost<ApiQueryResponse>(
        { action: "query", meta: "siteinfo|userinfo", siprop: "general", uiprop: "rights" },
        options,
    );
    // 类型只描述服务端契约；服务端与 mock 仍可能缺项，用 Partial + 默认值兜底
    const general: Partial<ApiSiteGeneral> = json?.query?.general ?? {};
    const userinfo: Partial<ApiUserInfo> = json?.query?.userinfo ?? {};
    const rights: string[] = Array.isArray(userinfo.rights) ? userinfo.rights : [];
    const maxUploadSize = Number(general.maxuploadsize ?? 0);
    return {
        canUpload: rights.includes("upload"),
        canUploadByUrl: rights.includes("upload_by_url"),
        maxUploadSize: Number.isFinite(maxUploadSize) && maxUploadSize > 0 ? maxUploadSize : 0,
    };
};

export {
    ApiError,
    UploadWarnings,
    createAbortError,
    isAbortError,
    errText,
    apiPost,
    apiUpload,
    fetchSession,
    getUploadApi,
    setUploadTarget,
};
