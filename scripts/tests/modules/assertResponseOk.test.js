import { describe, expect, it } from "vitest";
import assertResponseOk from "../../modules/assertResponseOk.js";

describe("assertResponseOk", () => {
    it("ok 为真时正常返回不抛错", async () => {
        const response = { ok: true, status: 200, statusText: "OK", text: () => "body" };
        await expect(assertResponseOk(response, "[Gadget-x] fetch")).resolves.toBeUndefined();
    });

    it("ok 为假时抛出带前缀、状态码与状态文本的错误", async () => {
        const response = { ok: false, status: 404, statusText: "Not Found", text: () => "" };
        await expect(assertResponseOk(response, "[Gadget-x] Failed to fetch")).rejects.toThrow("[Gadget-x] Failed to fetch: 404 Not Found");
    });

    it("抛出错误的 cause 为响应正文", async () => {
        const response = { ok: false, status: 500, statusText: "Internal Server Error", text: () => "server exploded" };
        const error = await assertResponseOk(response, "label").catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.cause).toBe("server exploded");
    });
});
