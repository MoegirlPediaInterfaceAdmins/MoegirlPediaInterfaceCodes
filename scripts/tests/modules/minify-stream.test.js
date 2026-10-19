import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { describe, expect, it } from "vitest";
import createMinifyStream from "../../modules/minify-stream.js";

/**
 * 把分块源文本经被测流压缩并收集完整输出。
 * @param {string[]} chunks 分块源文本
 * @param {object} [opts] 透传给被测流的 uglify 选项
 */
const minifyThrough = async (chunks, opts) => {
    const output = new PassThrough();
    const collected = [];
    output.on("data", (chunk) => collected.push(chunk.toString()));
    await pipeline(Readable.from(chunks), createMinifyStream(opts), output);
    return collected.join("");
};

describe("minify-stream", () => {
    // 期望值由 node -e 独立调用 uglify-js 压缩后写死，非由被测实现反推
    it("移除注释与空白并压缩参数名", async () => {
        expect(await minifyThrough(["function add(a, b) {", " return a + b; } // comment"])).toBe("function add(n,d){return n+d}");
    });

    it("选项透传给 uglify（mangle.toplevel）", async () => {
        expect(await minifyThrough(["var longVariableName = 42; console.log(longVariableName);"], { mangle: { toplevel: true } })).toBe("var o=42;console.log(o);");
    });

    it("空输入输出空字符串", async () => {
        expect(await minifyThrough([""])).toBe("");
    });

    it("非法 JS 源码时管道抛出解析错误", async () => {
        await expect(pipeline(Readable.from(["var 1 = ;"]), createMinifyStream(), new PassThrough())).rejects.toThrow("Name expected");
    });
});
