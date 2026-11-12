import type { ApiUploadWarnings } from "types-mediawiki-response";
import { ApiError, errText, isAbortError } from "@/api/client";
import { finalizeUpload, stashBlob, stashUrl } from "@/api/upload";
import { describeWarnings, t } from "@/locale";
import { findMetaViolation } from "@/logic/validation";
import { buildDescription } from "@/logic/wikitext";
import type { MoeUploadConfig, QueueItem } from "@/types";

type Patch = (patch: Partial<QueueItem>) => void;

// 状态机：pending→checking→ready→uploading→staged→submitting→done/queued/failed
// 仅本地元数据必填校验；冲突不在客户端预查，交给服务端 warnings
const runCheck = async (
    item: QueueItem,
    config: MoeUploadConfig,
    patch: Patch,
): Promise<boolean> => {
    if (item.reupload) {
        // reupload 条目不提交元数据（保留原描述页），必填校验无意义
        patch({ status: "ready" });
        return true;
    }
    patch({ status: "checking", error: undefined });
    const violation = findMetaViolation(item.meta, config.fields);
    if (violation) {
        const message
            = violation.kind === "field"
                ? t("error.fieldRequired", { field: violation.labels[0] ?? "" })
                : t("error.fieldGroupRequired", { fields: violation.labels.join("」「") });
        patch({ status: "failed", error: message });
        return false;
    }
    patch({ status: "ready" });
    return true;
};

// 暂存成功置 staged 并返回 filekey；中断回 ready、审核入队 queued、其余 failed
const runStash = async (
    item: QueueItem,
    config: MoeUploadConfig,
    patch: Patch,
    signal: AbortSignal,
): Promise<string | null> => {
    patch({ status: "uploading", error: undefined });
    try {
        const filekey
            = item.kind === "file" && item.file
                ? await stashBlob(item.file, item.name, config, { signal })
                : await stashUrl(item.url ?? "", item.name, { signal });
        patch({ status: "staged", filekey });
        return filekey;
    } catch (error) {
        if (isAbortError(error)) {
            patch({ status: "ready" });
        } else if (isModerationQueued(error)) {
            patch({ status: "queued", filekey: undefined });
        } else {
            patch({ status: "failed", error: errText(error) });
        }
        return null;
    }
};

const runSubmit = async (
    item: QueueItem,
    config: MoeUploadConfig,
    patch: Patch,
    signal: AbortSignal,
): Promise<void> => {
    patch({ status: "submitting", error: undefined });
    try {
        // reupload 不带 text：描述页保留由 recordUpload3() 的 exists 分支决定，省略 text 不影响
        const text = item.reupload ? undefined : buildDescription(item, config);
        const result = await finalizeUpload({
            filekey: item.filekey,
            filename: item.name,
            text,
            comment: config.comment,
            tags: config.uploadTags,
            ignoreWarnings: item.ignoreWarnings,
            signal,
        });
        patch({ status: "done", result });
    } catch (error) {
        if (isAbortError(error)) {
            patch({ status: item.filekey ? "staged" : "ready" });
        } else if (isUploadWarnings(error)) {
            // warnings 落条目红字展示且保留 filekey（改名重试/覆盖上传无需重传）
            patch({
                status: "failed",
                error: describeWarnings(error.warnings).join("；"),
            });
        } else if (isModerationQueued(error)) {
            // 审核入队：置 queued 终态并清 filekey，防止重复提交
            patch({ status: "queued", filekey: undefined });
        } else if (isStashInvalid(error) && item.filekey) {
            // 暂存失效：清 filekey 回 ready，重试重走完整管线
            patch({ filekey: undefined, status: "ready" });
        } else {
            patch({ status: "failed", error: errText(error) });
        }
    }
};

// 暂存失效类错误码：stashnosuchfilekey / stashfailed / invalid-file-key
const isStashInvalid = (error: unknown): boolean =>
    error instanceof ApiError && /stash|file-?key/i.test(error.code);

const isModerationQueued = (error: unknown): boolean =>
    error instanceof ApiError && error.code === "moderation-image-queued";

const isUploadWarnings = (
    error: unknown,
): error is { name: "UploadWarnings"; warnings: ApiUploadWarnings } =>
    error instanceof Error && error.name === "UploadWarnings" && Reflect.has(error, "warnings");

const runPool = async (
    count: number,
    concurrency: number,
    worker: (index: number) => Promise<void>,
): Promise<void> => {
    let next = 0;
    const runnerCount = Math.min(Math.max(1, concurrency), Math.max(1, count));
    const runners = Array.from({ length: runnerCount }, async () => {
        while (true) {
            const index = next++;
            if (index >= count) {
                return;
            }
            await worker(index);
        }
    });
    await Promise.all(runners);
};

export { runCheck, runStash, runSubmit, runPool };
