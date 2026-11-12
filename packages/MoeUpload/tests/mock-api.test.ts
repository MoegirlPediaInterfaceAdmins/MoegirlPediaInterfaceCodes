import { describe, expect, it } from "vitest";
import { handle } from "../mock/api-server";

type Json = Record<string, any>;

const upload = (params: Record<string, string>): Promise<Json> =>
    Promise.resolve(
        handle({ action: "upload", token: "MOCK_CSRF_TOKEN", ...params }),
    );

// mock 的参数校验必须与真实 API 一致，否则真站的协议缺陷会在本地回归里被掩盖
describe("mock Action API · 上传参数校验对齐源码", () => {
    it("finalize 缺 filekey/file/url → missingparam", async () => {
        const json = await upload({ filename: "a.png" });
        expect(json.error?.code).toBe("missingparam");
    });

    it("缺 filename → missingparam", async () => {
        const json = await upload({ file: "__blob__:a.png:10" });
        expect(json.error?.code).toBe("missingparam");
    });

    it("首块分块：缺 offset=0 → filekeyneeded；缺 filesize → invalid-chunk", async () => {
        const noOffset = await upload({
            chunk: "__blob__:blob:10",
            filename: "a.png",
            filesize: "25",
        });
        expect(noOffset.error?.code).toBe("filekeyneeded");

        const noFileSize = await upload({
            chunk: "__blob__:blob:10",
            filename: "a.png",
            offset: "0",
        });
        expect(noFileSize.error?.code).toBe("invalid-chunk");
    });

    it("续传块不带 filekey（offset≠0）→ filekeyneeded", async () => {
        const json = await upload({
            chunk: "__blob__:blob:10",
            filename: "a.png",
            filesize: "25",
            offset: "10",
        });
        expect(json.error?.code).toBe("filekeyneeded");
    });

    it("续传块缺 filename → missingparam", async () => {
        const first = await upload({
            stash: "1",
            chunk: "__blob__:blob:10",
            filename: "big.png",
            filesize: "25",
            offset: "0",
        });
        const json = await upload({
            stash: "1",
            chunk: "__blob__:blob:10",
            filekey: first.upload.filekey,
            filesize: "25",
            offset: "10",
        });
        expect(json.error?.code).toBe("missingparam");
    });

    it("完整分块链路：Continue 带 offset，拼接后换发新 key，finalize 可用该 key", async () => {
        const first = await upload({
            stash: "1",
            chunk: "__blob__:blob:10",
            filename: "big.png",
            filesize: "25",
            offset: "0",
        });
        expect(first.upload).toMatchObject({ result: "Continue", offset: 10 });
        const firstKey = first.upload.filekey as string;

        const second = await upload({
            stash: "1",
            chunk: "__blob__:blob:15",
            filename: "big.png",
            filesize: "25",
            offset: "10",
            filekey: firstKey,
        });
        expect(second.upload.result).toBe("Success");
        expect(second.upload.filekey).not.toBe(firstKey);

        const done = await upload({
            filename: "big.png",
            comment: "使用MoeUpload上传",
            filekey: second.upload.filekey,
        });
        expect(done.upload.result).toBe("Success");
    });

    it("finalize 用未知/过期 filekey → stashnosuchfilekey", async () => {
        const json = await upload({ filename: "a.png", filekey: "nope" });
        expect(json.error?.code).toBe("stashnosuchfilekey");
    });

    it("警告响应不消费暂存：同一 filekey 可再次 finalize（覆盖上传回归）", async () => {
        const stash = await upload({
            stash: "1",
            filename: "警告测试.png",
            file: "__blob__:警告测试.png:10",
        });
        const filekey = stash.upload.filekey as string;

        const warned = await upload({ filename: "警告测试.png", filekey });
        expect(warned.upload.result).toBe("Warning");
        expect(warned.upload.warnings).toMatchObject({ exists: "已存在的图片.png" });

        const overwritten = await upload({
            filename: "警告测试.png",
            filekey,
            ignorewarnings: "1",
        });
        expect(overwritten.upload.result).toBe("Success");
    });
});
