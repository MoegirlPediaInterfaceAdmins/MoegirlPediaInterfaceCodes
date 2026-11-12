import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, UploadWarnings } from "@/api/client";
import { finalizeUpload, stashBlob, stashUrl } from "@/api/upload";
import { runCheck, runPool, runStash, runSubmit } from "@/state/pipeline";
import { DEFAULT_CONFIG } from "../src/config/defaults";
import type { QueueItem } from "../src/types";

vi.mock("@/api/upload", () => ({
    stashBlob: vi.fn<() => Promise<unknown>>(),
    stashUrl: vi.fn<() => Promise<unknown>>(),
    finalizeUpload: vi.fn<() => Promise<unknown>>(),
}));

const makeItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
    id: "item-1",
    kind: "file",
    file: new File(["x"], "a.png", { type: "image/png" }),
    name: "a.png",
    size: 1,
    status: "pending",
    ignoreWarnings: false,
    meta: { work: "影之诗WB", author: "", source: "", description: "" },
    licenseId: "Copyright",
    categories: [],
    ...overrides,
});

const recorder = () => {
    const patches: Partial<QueueItem>[] = [];
    const patch = (update: Partial<QueueItem>): void => {
        patches.push(update);
    };
    return { patches, patch };
};

const lastPatch = (patches: Partial<QueueItem>[]): Partial<QueueItem> =>
    patches[patches.length - 1] ?? {};

const abortError = (): Error => Object.assign(new Error("aborted"), { name: "AbortError" });

beforeEach(() => {
    vi.resetAllMocks();
});

describe("runCheck · 元数据校验", () => {
    it("通过校验置 ready，且不发起任何网络请求", async () => {
        const { patches, patch } = recorder();
        const ok = await runCheck(makeItem(), DEFAULT_CONFIG, patch);

        expect(ok).toBe(true);
        expect(lastPatch(patches).status).toBe("ready");
        // 成功路径必须清掉上轮失败留下的 error，否则卡片会带着旧红字进入下一次上传
        expect(lastPatch(patches).error).toBeUndefined();
        expect(stashBlob).not.toHaveBeenCalled();
        expect(stashUrl).not.toHaveBeenCalled();
        expect(finalizeUpload).not.toHaveBeenCalled();
    });

    it("重试时（条目带旧 error）成功置 ready 并清空错误文案", async () => {
        const { patches, patch } = recorder();
        const ok = await runCheck(
            makeItem({ status: "failed", error: "旧错误" }),
            DEFAULT_CONFIG,
            patch,
        );

        expect(ok).toBe(true);
        expect(lastPatch(patches).status).toBe("ready");
        expect(lastPatch(patches).error).toBeUndefined();
    });

    it("必填组缺失时置 failed 并说明缺失栏目", async () => {
        const { patches, patch } = recorder();
        const ok = await runCheck(
            makeItem({ meta: { work: "", author: "", source: "", description: "" } }),
            DEFAULT_CONFIG,
            patch,
        );

        expect(ok).toBe(false);
        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("至少");
    });
});

describe("runStash · 暂存", () => {
    it("本地文件暂存成功置 staged 并返回 filekey", async () => {
        vi.mocked(stashBlob).mockResolvedValue("fk-1");
        const { patches, patch } = recorder();
        const filekey = await runStash(
            makeItem(),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(filekey).toBe("fk-1");
        expect(lastPatch(patches).status).toBe("staged");
        expect(lastPatch(patches).filekey).toBe("fk-1");
    });

    it("stash 阶段命中审核扩展同样置 queued 终态", async () => {
        vi.mocked(stashBlob).mockRejectedValue(
            new ApiError("moderation-image-queued", "模拟：文件已进入审核队列"),
        );
        const { patches, patch } = recorder();
        const filekey = await runStash(
            makeItem(),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(filekey).toBeNull();
        expect(lastPatch(patches).status).toBe("queued");
    });

    it("URL 条目走 stashUrl", async () => {
        vi.mocked(stashUrl).mockResolvedValue("fk-url");
        const { patch } = recorder();
        const filekey = await runStash(
            makeItem({ kind: "url", url: "https://example.com/a.png", file: undefined }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(filekey).toBe("fk-url");
        expect(stashUrl).toHaveBeenCalledTimes(1);
        expect(stashBlob).not.toHaveBeenCalled();
    });

    it("中断回退 ready 且不置 failed", async () => {
        vi.mocked(stashBlob).mockRejectedValue(abortError());
        const { patches, patch } = recorder();
        const filekey = await runStash(
            makeItem(),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(filekey).toBeNull();
        expect(lastPatch(patches).status).toBe("ready");
    });

    it("失败置 failed 并带错误文案", async () => {
        vi.mocked(stashBlob).mockRejectedValue(new Error("boom"));
        const { patches, patch } = recorder();
        const filekey = await runStash(
            makeItem(),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(filekey).toBeNull();
        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("boom");
    });
});

describe("runSubmit · 提交与冲突", () => {
    it("提交成功置 done 并写入结果", async () => {
        vi.mocked(finalizeUpload).mockResolvedValue({
            title: "File:a.png",
            descriptionurl: "/File:a.png",
        });
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1" }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(lastPatch(patches).status).toBe("done");
        expect(lastPatch(patches).result?.title).toBe("File:a.png");
    });

    it("服务器 warnings 置 failed 并以红色文字展示警告（filekey 保留供重试/覆盖）", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(
            new UploadWarnings({ duplicate: ["File:已有.png"] }),
        );
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1" }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("内容与已有文件重复");
        expect(Reflect.has(lastPatch(patches), "filekey")).toBe(false);
    });

    it("审核扩展接管：moderation-image-queued 置 queued 终态并清 filekey", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(
            new ApiError("moderation-image-queued", "模拟：文件已进入审核队列"),
        );
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1" }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(lastPatch(patches).status).toBe("queued");
        expect(lastPatch(patches).filekey).toBeUndefined();
    });

    it("reupload 条目提交不带 text（保留原描述页）", async () => {
        vi.mocked(finalizeUpload).mockResolvedValue({ title: "File:a.png" });
        const { patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1", reupload: true }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledWith(
            expect.objectContaining({ filekey: "fk-1", text: undefined }),
        );
    });

    it("runCheck 对 reupload 条目短路（元数据不提交，校验无意义）", async () => {
        const { patches, patch } = recorder();
        const ok = await runCheck(
            makeItem({
                reupload: true,
                meta: { work: "", author: "", source: "", description: "" },
            }),
            DEFAULT_CONFIG,
            patch,
        );

        expect(ok).toBe(true);
        expect(lastPatch(patches).status).toBe("ready");
        expect(stashBlob).not.toHaveBeenCalled();
    });

    it("reupload 目标已存在：首次不带 ignorewarnings，纯存在性警告时自动重提并置 done", async () => {
        vi.mocked(finalizeUpload)
            .mockRejectedValueOnce(new UploadWarnings({ exists: "File:a.png" }))
            .mockResolvedValueOnce({ title: "File:a.png", descriptionurl: "/File:a.png" });
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1", reupload: true }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledTimes(2);
        expect(vi.mocked(finalizeUpload)).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ filekey: "fk-1", text: undefined, ignoreWarnings: false }),
        );
        // 警告不消费暂存：重提复用同一 filekey，这次带 ignorewarnings（不再让用户点「覆盖上传」）
        expect(vi.mocked(finalizeUpload)).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ filekey: "fk-1", text: undefined, ignoreWarnings: true }),
        );
        expect(lastPatch(patches).status).toBe("done");
        expect(lastPatch(patches).result?.title).toBe("File:a.png");
    });

    it("exists-normalized 与 page-exists 同样视为覆盖上传的必然警告", async () => {
        vi.mocked(finalizeUpload)
            .mockRejectedValueOnce(
                new UploadWarnings({
                    "exists-normalized": "File:a.png",
                    "page-exists": "File:a.png",
                }),
            )
            .mockResolvedValueOnce({ title: "File:a.png" });
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1", reupload: true }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledTimes(2);
        expect(lastPatch(patches).status).toBe("done");
    });

    it("存在性警告与其他警告并存：不重提，只展示其他警告", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(
            new UploadWarnings({ exists: "File:a.png", duplicate: ["File:b.png"] }),
        );
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1", reupload: true }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledTimes(1);
        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("内容与已有文件重复");
        expect(lastPatch(patches).error).not.toContain("同名文件已存在");
    });

    it("reupload 只有非存在性警告时不重提", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(
            new UploadWarnings({ duplicate: ["File:b.png"] }),
        );
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1", reupload: true }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledTimes(1);
        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("内容与已有文件重复");
    });

    it("非 reupload 条目的 exists 警告仍按失败处理（不自动覆盖）", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(
            new UploadWarnings({ exists: "File:a.png" }),
        );
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1" }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledTimes(1);
        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("同名文件已存在");
    });

    it("已显式覆盖上传（ignoreWarnings）时不再重提", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(
            new UploadWarnings({ exists: "File:a.png" }),
        );
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1", reupload: true, ignoreWarnings: true }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledWith(
            expect.objectContaining({ ignoreWarnings: true }),
        );
        // 异常路径（服务端未按 ignorewarnings 覆盖）原样展示，不静默吞掉
        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("同名文件已存在");
    });

    it("重提失败时按普通失败处理", async () => {
        vi.mocked(finalizeUpload)
            .mockRejectedValueOnce(new UploadWarnings({ exists: "File:a.png" }))
            .mockRejectedValueOnce(new ApiError("abusefilter", "被过滤器拦截"));
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1", reupload: true }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledTimes(2);
        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("被过滤器拦截");
    });

    it("ignoreWarnings 透传到 finalizeUpload（覆盖上传链路）", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(
            new UploadWarnings({ duplicate: ["File:已有.png"] }),
        );
        const { patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1", ignoreWarnings: true }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(vi.mocked(finalizeUpload)).toHaveBeenCalledWith(
            expect.objectContaining({ ignoreWarnings: true }),
        );
    });

    it("stash 类错误但无 filekey 时按普通失败处理", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(new ApiError("stashfailed", "filekey 失效"));
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "submitting" }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("filekey 失效");
    });

    it("暂存失效清 filekey 回 ready，重试即重走完整管线", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(new ApiError("stashfailed", "filekey 失效"));
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1" }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(lastPatch(patches).status).toBe("ready");
        expect(lastPatch(patches).filekey).toBeUndefined();
    });

    it("中断回退 staged（filekey 保留）", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(abortError());
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "submitting", filekey: "fk-1" }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(lastPatch(patches).status).toBe("staged");
    });

    it("普通失败置 failed 并带错误文案", async () => {
        vi.mocked(finalizeUpload).mockRejectedValue(new ApiError("abusefilter", "被过滤器拦截"));
        const { patches, patch } = recorder();
        await runSubmit(
            makeItem({ status: "staged", filekey: "fk-1" }),
            DEFAULT_CONFIG,
            patch,
            new AbortController().signal,
        );

        expect(lastPatch(patches).status).toBe("failed");
        expect(lastPatch(patches).error).toContain("被过滤器拦截");
    });
});

// runPool 是分块与批次的共用并发池：并发数不得超过上限，worker 抛错必须整体拒绝
describe("runPool · 并发池", () => {
    it("空任务列表立即完成", async () => {
        const worker = vi.fn<(index: number) => Promise<void>>();
        await runPool(0, 2, worker);
        expect(worker).not.toHaveBeenCalled();
    });

    it("concurrency=1 串行执行", async () => {
        const order: number[] = [];
        const worker = async (index: number) => {
            order.push(index);
            await new Promise((resolve) => setTimeout(resolve, 10));
        };
        await runPool(3, 1, worker);
        expect(order).toEqual([0, 1, 2]);
    });

    it("concurrency > count 时不开空 worker", async () => {
        const worker = vi.fn<(index: number) => Promise<void>>().mockResolvedValue(undefined);
        await runPool(2, 10, worker);
        expect(worker).toHaveBeenCalledTimes(2);
        expect(worker).toHaveBeenCalledWith(0);
        expect(worker).toHaveBeenCalledWith(1);
    });

    it("并发执行：concurrency=2 处理 5 个任务", async () => {
        const started: number[] = [];
        const finished: number[] = [];
        let peak = 0;
        let running = 0;
        const worker = async (index: number) => {
            started.push(index);
            running += 1;
            peak = Math.max(peak, running);
            await new Promise((resolve) => setTimeout(resolve, 20));
            running -= 1;
            finished.push(index);
        };

        await runPool(5, 2, worker);

        expect(started.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
        expect(finished.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
        expect(peak).toBe(2);
    });

    it("worker 抛错时以该错误拒绝（同 runner 后续任务不再取）", async () => {
        const started: number[] = [];
        const worker = async (index: number) => {
            started.push(index);
            if (index === 1) {
                throw new Error("task 1 failed");
            }
        };

        await expect(runPool(3, 1, worker)).rejects.toThrow("task 1 failed");
        expect(started).toEqual([0, 1]);
    });

    it("concurrency=0 被钳制到最小值 1", async () => {
        const worker = vi.fn<(index: number) => Promise<void>>().mockResolvedValue(undefined);
        await runPool(3, 0, worker);
        expect(worker).toHaveBeenCalledTimes(3);
    });
});
