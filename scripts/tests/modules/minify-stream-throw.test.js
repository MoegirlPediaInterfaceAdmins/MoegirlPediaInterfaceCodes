import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { describe, expect, it, vi } from "vitest";

// uglify.minify 对绝大多数非法输入返回 { error } 字段（已由 minify-stream.test.js 覆盖），
// 但内部缺陷或病态输入（如深嵌套导致的 RangeError）会直接抛异常；concat 回调在流上下文中
// 同步执行，抛出即未捕获异常，必须转为流的 error 事件。模块级 mock 会影响真实压缩用例，故独立成文件
const minifyMock = vi.hoisted(() => ({}));
vi.mock("uglify-js", () => {
    minifyMock.fn = vi.fn(() => {
        throw new Error("boom from uglify");
    });
    return { "default": { minify: minifyMock.fn } };
});

import createMinifyStream from "../../modules/minify-stream.js";

describe("minify-stream 异常路径", () => {
    it("uglify.minify 直接抛异常时以流错误传出，而非未捕获异常", async () => {
        await expect(pipeline(Readable.from(["var x;"]), createMinifyStream(), new PassThrough())).rejects.toThrow("boom from uglify");
    });
});
