import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, UploadWarnings, apiUpload } from "@/api/client";
import { finalizeUpload, stashBlob, stashUrl } from "@/api/upload";
import type { MoeUploadConfig } from "@/types";

// 请求字段不变量：finalize 必须带 filekey 且不带 file；每块必带 filename/filesize，
// 首块 offset=0 不带 filekey，续块带 filekey；传输层只重试 http，API 错误与中断立即冒泡。
vi.mock("@/api/client", () => ({
    ApiError: class ApiError extends Error {
        constructor(
            public code: string,
            public info: string,
        ) {
            super(`[${code}] ${info}`);
            this.name = "ApiError";
        }
    },
    UploadWarnings: class UploadWarnings extends Error {
        constructor(public warnings: Record<string, unknown>) {
            super("upload-warnings");
            this.name = "UploadWarnings";
        }
    },
    apiUpload: vi.fn<() => Promise<unknown>>(),
    apiPost: vi.fn<() => Promise<unknown>>(),
}));

const config = (overrides: Partial<MoeUploadConfig> = {}): MoeUploadConfig => ({
    fields: [],
    licenses: [],
    wikitextTemplate: "",
    comment: "测试上传",
    uploadTags: ["MoeUpload"],
    chunkSize: 10,
    stashThreshold: 5,
    concurrency: 1,
    maxBatch: 10,
    allowedExtensions: ["png"],
    ...overrides,
});

const fieldsOf = (index: number): Record<string, string> => {
    const call = vi.mocked(apiUpload).mock.calls[index];
    return call?.[0] ?? {};
};

const blobOf = (index: number): unknown => vi.mocked(apiUpload).mock.calls[index]?.[1];

const blobFieldOf = (index: number): unknown => vi.mocked(apiUpload).mock.calls[index]?.[2];

beforeEach(() => {
    vi.resetAllMocks();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("stashBlob · 整文件暂存", () => {
    it("只带 filename 与 file 字段，不带 filesize/offset/filekey", async () => {
        vi.mocked(apiUpload).mockResolvedValue({ upload: { result: "Success", filekey: "K1" } });
        const file = new Blob([new Uint8Array(4)]);

        const filekey = await stashBlob(file, "a.png", config({ stashThreshold: 1024 }));

        expect(filekey).toBe("K1");
        expect(fieldsOf(0)).toEqual({
            action: "upload",
            stash: "1",
            filename: "a.png",
            token: "auto",
        });
        expect(blobOf(0)).toBe(file);
        expect(blobFieldOf(0)).toBe("file");
    });
});

describe("stashBlob · 分块暂存", () => {
    it("每块都带 filename/filesize/offset，首块 offset=0 且不带 filekey，续传块带 filekey", async () => {
        vi.mocked(apiUpload)
            .mockResolvedValueOnce({ upload: { result: "Continue", filekey: "K1", offset: 10 } })
            .mockResolvedValueOnce({ upload: { result: "Continue", filekey: "K1", offset: 20 } })
            .mockResolvedValueOnce({ upload: { result: "Success", filekey: "K2" } });
        const file = new Blob([new Uint8Array(25)]);

        const filekey = await stashBlob(file, "big.png", config());

        expect(filekey).toBe("K2");
        expect(vi.mocked(apiUpload)).toHaveBeenCalledTimes(3);

        expect(fieldsOf(0)).toMatchObject({
            stash: "1",
            filename: "big.png",
            filesize: "25",
            offset: "0",
        });
        expect(fieldsOf(0).filekey).toBeUndefined();

        expect(fieldsOf(1)).toMatchObject({
            filename: "big.png",
            filesize: "25",
            offset: "10",
            filekey: "K1",
        });
        expect(fieldsOf(2)).toMatchObject({
            filename: "big.png",
            filesize: "25",
            offset: "20",
            filekey: "K1",
        });

        for (const index of [0, 1, 2]) {
            expect(blobFieldOf(index)).toBe("chunk");
        }
    });

    it("响应缺少 filekey 时抛错（避免后续用空 key 提交）", async () => {
        vi.mocked(apiUpload).mockResolvedValue({ upload: { result: "Continue", offset: 10 } });
        const file = new Blob([new Uint8Array(25)]);

        await expect(stashBlob(file, "big.png", config())).rejects.toThrow(/filekey/);
    });
});

describe("stashByChunks · 传输层重试", () => {
    it("网络错误（code=http）重试一次后继续，且重发同一份字段与字节", async () => {
        vi.useFakeTimers();
        vi.mocked(apiUpload)
            .mockRejectedValueOnce(new ApiError("http", "网络请求失败"))
            .mockResolvedValueOnce({ upload: { result: "Continue", filekey: "K1", offset: 10 } })
            .mockResolvedValueOnce({ upload: { result: "Success", filekey: "K2" } });
        const file = new Blob([new Uint8Array(15)]);

        const pending = stashBlob(file, "big.png", config());
        await vi.advanceTimersByTimeAsync(1000);

        await expect(pending).resolves.toBe("K2");
        expect(vi.mocked(apiUpload)).toHaveBeenCalledTimes(3);
        expect(fieldsOf(0)).toEqual(fieldsOf(1));
    });

    it("只重试一次：连续两次网络错误即失败", async () => {
        vi.useFakeTimers();
        vi.mocked(apiUpload).mockRejectedValue(new ApiError("http", "网络请求失败"));
        const file = new Blob([new Uint8Array(15)]);

        const pending = stashBlob(file, "big.png", config()).catch((error: unknown) => error);
        await vi.advanceTimersByTimeAsync(1000);
        const error = await pending;

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe("http");
        expect(vi.mocked(apiUpload)).toHaveBeenCalledTimes(2);
    });

    it("API 错误（如 invalid-chunk）不重试", async () => {
        vi.mocked(apiUpload).mockRejectedValueOnce(new ApiError("invalid-chunk", "分块累计超长"));
        const file = new Blob([new Uint8Array(15)]);

        await expect(stashBlob(file, "big.png", config())).rejects.toThrow(/invalid-chunk/);
        expect(vi.mocked(apiUpload)).toHaveBeenCalledTimes(1);
    });

    it("中断不重试（否则取消会变成「等一秒再传」）", async () => {
        const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
        vi.mocked(apiUpload).mockRejectedValueOnce(aborted);
        const file = new Blob([new Uint8Array(15)]);

        await expect(stashBlob(file, "big.png", config())).rejects.toBe(aborted);
        expect(vi.mocked(apiUpload)).toHaveBeenCalledTimes(1);
    });
});

describe("stashUrl · URL 暂存", () => {
    it("带 url 与 filename，且不传二进制", async () => {
        vi.mocked(apiUpload).mockResolvedValue({ upload: { result: "Success", filekey: "U1" } });

        const filekey = await stashUrl("https://example.com/a.png", "a.png");

        expect(filekey).toBe("U1");
        expect(fieldsOf(0)).toEqual({
            action: "upload",
            stash: "1",
            url: "https://example.com/a.png",
            filename: "a.png",
            token: "auto",
        });
        expect(blobOf(0)).toBeUndefined();
    });
});

describe("finalizeUpload · 最终提交", () => {
    it("必须带 filekey（缺失会被服务端以 missingparam 拒绝）", async () => {
        vi.mocked(apiUpload).mockResolvedValue({
            upload: { result: "Success", filename: "a.png", imageinfo: { descriptionurl: "/x" } },
        });

        const result = await finalizeUpload({
            filekey: "K1",
            filename: "a.png",
            text: "== 摘要 ==",
            comment: "使用MoeUpload上传",
            tags: ["MoeUpload"],
            ignoreWarnings: false,
        });

        expect(result).toEqual({ title: "a.png", descriptionurl: "/x" });
        expect(fieldsOf(0)).toEqual({
            action: "upload",
            filename: "a.png",
            comment: "使用MoeUpload上传",
            token: "auto",
            filekey: "K1",
            text: "== 摘要 ==",
            tags: "MoeUpload",
        });
        expect(blobOf(0)).toBeUndefined();
    });

    it("无 filekey 时不带该字段，且 text 缺省、无变更标签时也不带", async () => {
        vi.mocked(apiUpload).mockResolvedValue({
            upload: { result: "Success", filename: "a.png" },
        });

        await finalizeUpload({
            filename: "a.png",
            comment: "使用MoeUpload上传",
            ignoreWarnings: false,
        });

        const fields = fieldsOf(0);
        expect(fields.filekey).toBeUndefined();
        expect(fields.text).toBeUndefined();
        expect(fields.tags).toBeUndefined();
        expect(fields.ignorewarnings).toBeUndefined();
    });

    it("ignoreWarnings 为真时带 ignorewarnings=1", async () => {
        vi.mocked(apiUpload).mockResolvedValue({
            upload: { result: "Success", filename: "a.png" },
        });

        await finalizeUpload({
            filekey: "K1",
            filename: "a.png",
            comment: "使用MoeUpload上传",
            ignoreWarnings: true,
        });

        expect(fieldsOf(0).ignorewarnings).toBe("1");
    });

    it("服务端返回 warnings 时抛 UploadWarnings 并保留 filekey 语义（不改写字段）", async () => {
        vi.mocked(apiUpload).mockResolvedValue({
            upload: { result: "Warning", warnings: { exists: "a.png" } },
        });

        await expect(
            finalizeUpload({
                filekey: "K1",
                filename: "a.png",
                comment: "使用MoeUpload上传",
                ignoreWarnings: false,
            }),
        ).rejects.toBeInstanceOf(UploadWarnings);
    });

    it("result 非 Success 时抛 ApiError", async () => {
        vi.mocked(apiUpload).mockResolvedValue({ upload: { result: "Continue" } });

        await expect(
            finalizeUpload({
                filekey: "K1",
                filename: "a.png",
                comment: "使用MoeUpload上传",
                ignoreWarnings: false,
            }),
        ).rejects.toBeInstanceOf(ApiError);
    });
});
