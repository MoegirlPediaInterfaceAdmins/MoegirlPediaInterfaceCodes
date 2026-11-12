import type { ApiUploadResponse } from "types-mediawiki-response";
import { t } from "@/locale";
import type { MoeUploadConfig } from "@/types";
import { ApiError, UploadWarnings, apiUpload, createAbortError } from "./client";

interface AbortOptions {
    signal?: AbortSignal;
}

const CHUNK_RETRIES = 1;
const CHUNK_RETRY_DELAY = 1000;

// 可中断的延时：期间收到中断信号立即以 AbortError 拒绝（否则取消要白等一个间隔）
const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }
        let timer: ReturnType<typeof setTimeout>;
        const onAbort = (): void => {
            clearTimeout(timer);
            reject(createAbortError());
        };
        timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal?.addEventListener("abort", onAbort, { once: true });
    });

// 只重试传输层错误（'http'）；API 错误码重发同样的字节无意义
const isRetryableChunkError = (error: unknown): boolean =>
    error instanceof ApiError && error.code === "http";

// 分块请求带一次传输层重试；中断必须立刻冒泡，否则取消会变成等一秒再继续传
const uploadChunkWithRetry = async <T>(
    fields: Record<string, string>,
    blob: Blob,
    options: AbortOptions,
): Promise<T> => {
    for (let attempt = 0; ; attempt++) {
        try {
            return await apiUpload<T>(fields, blob, "chunk", options);
        } catch (error) {
            if (attempt >= CHUNK_RETRIES || !isRetryableChunkError(error)) {
                throw error;
            }
            await delay(CHUNK_RETRY_DELAY, options.signal);
        }
    }
};

interface FinalizeParams {
    filekey?: string;
    filename: string;
    /** 描述页 wikitext；「上传新版本」不传 */
    text?: string;
    comment: string;
    tags?: string[];
    ignoreWarnings: boolean;
    signal?: AbortSignal;
}

interface FinalizeResult {
    title: string;
    descriptionurl?: string;
}

// 不超过阈值时单请求暂存：只带 filename 与 file（filesize/offset 仅分块需要）
const stashBlob = async (
    file: Blob,
    filename: string,
    config: MoeUploadConfig,
    options: AbortOptions = {},
): Promise<string> => {
    if (file.size > config.stashThreshold) {
        return stashByChunks(file, filename, config, options);
    }
    const json = await apiUpload<ApiUploadResponse>(
        { action: "upload", stash: "1", filename, token: "auto" },
        file,
        "file",
        options,
    );
    return extractFilekey(json);
};

// 每个分块都带 filename + filesize（缺失分别 missingparam / 按 0 参与偏移比较）
// offset 为当前块起始字节，首块必须显式 0（服务端严格 !== 0）
// filekey 自第二块起携带；Continue 响应带 offset，拼接完成的 Success 换新 key 且不带 offset
const stashByChunks = async (
    file: Blob,
    filename: string,
    config: MoeUploadConfig,
    options: AbortOptions = {},
): Promise<string> => {
    const total = file.size;
    const chunkSize = config.chunkSize;
    // 服务器 offset 必须单调前进，循环次数有硬上限，防止异常响应导致死循环
    const maxChunks = Math.ceil(total / chunkSize) + 2;
    let filekey = "";
    let offset = 0;
    let chunks = 0;

    while (offset < total) {
        if (++chunks > maxChunks) {
            throw new ApiError("stash", t("error.stashOffset"));
        }
        const end = Math.min(offset + chunkSize, total);
        const fields: Record<string, string> = {
            action: "upload",
            stash: "1",
            filename,
            filesize: String(total),
            offset: String(offset),
            token: "auto",
        };
        if (filekey) {
            fields.filekey = filekey;
        }

        const json = await uploadChunkWithRetry<ApiUploadResponse>(
            fields,
            file.slice(offset, end),
            options,
        );
        filekey = extractFilekey(json, chunks > 1);
        const upload: Partial<ApiUploadResponse["upload"]> = json?.upload ?? {};
        const nextOffset = typeof upload.offset === "number" ? upload.offset : end;
        if (nextOffset <= offset && nextOffset < total) {
            throw new ApiError("stash", t("error.stashOffset"));
        }
        offset = nextOffset;
        if (upload.result === "Success" && offset >= total) {
            break;
        }
    }
    return filekey;
};

// URL 暂存（服务器拉取，不可分块）
const stashUrl = async (
    url: string,
    filename: string,
    options: AbortOptions = {},
): Promise<string> => {
    const json = await apiUpload<ApiUploadResponse>(
        { action: "upload", stash: "1", url, filename, token: "auto" },
        undefined,
        "file",
        options,
    );
    return extractFilekey(json);
};

const extractFilekey = (json: ApiUploadResponse, chunked = false): string => {
    const upload: Partial<ApiUploadResponse["upload"]> = json?.upload ?? {};
    if (!upload.filekey) {
        throw new ApiError("stash", t(chunked ? "error.chunkNoFilekey" : "error.stashNoFilekey"));
    }
    return upload.filekey;
};

const finalizeUpload = async (params: FinalizeParams): Promise<FinalizeResult> => {
    const fields: Record<string, string> = {
        action: "upload",
        filename: params.filename,
        comment: params.comment,
        token: "auto",
    };
    // 暂存内容凭证：filekey / file / url 缺一即被服务端以 missingparam 拒绝
    if (params.filekey) {
        fields.filekey = params.filekey;
    }
    if (params.text) {
        fields.text = params.text;
    }
    // ignorewarnings=1 时服务端直接覆盖，不返回 warnings
    if (params.ignoreWarnings) {
        fields.ignorewarnings = "1";
    }
    if (params.tags && params.tags.length > 0) {
        fields.tags = params.tags.join("|");
    }

    const json = await apiUpload<ApiUploadResponse>(fields, undefined, "file", {
        signal: params.signal,
    });
    const upload: Partial<ApiUploadResponse["upload"]> = json?.upload ?? {};
    if (upload.warnings && Object.keys(upload.warnings).length > 0 && !params.ignoreWarnings) {
        throw new UploadWarnings(upload.warnings);
    }
    if (upload.result !== "Success") {
        throw new ApiError("upload", t("error.uploadNotSuccess", { result: upload.result ?? "-" }));
    }
    return {
        title: typeof upload.filename === "string" ? upload.filename : params.filename,
        descriptionurl: upload.imageinfo?.descriptionurl,
    };
};

export type { FinalizeParams, FinalizeResult };
export { stashBlob, stashUrl, finalizeUpload };
