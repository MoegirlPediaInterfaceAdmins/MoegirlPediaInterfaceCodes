import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { pipeFiltered, resolveForceColor } from "../../v8r/childOutput.js";

// 用 PassThrough 模拟子进程 stdout：手动分块写入，收集目标流收到的内容
const collectPiped = async (chunks) => {
    const readable = new PassThrough();
    const written = [];
    pipeFiltered(readable, { write: (chunk) => written.push(chunk) });
    // pipeFiltered 注册的 end 监听先于此回调执行，resolve 时残留输出已刷入 written
    const ended = new Promise((resolve) => {
        readable.on("end", resolve);
    });
    for (const chunk of chunks) {
        readable.write(chunk);
    }
    readable.end();
    await ended;
    return written;
};

describe("resolveForceColor", () => {
    it("色深 1 映射为 \"0\"", () => {
        expect(resolveForceColor({ getColorDepth: () => 1 }, {})).toBe("0");
    });

    it("色深 4 映射为 \"1\"", () => {
        expect(resolveForceColor({ getColorDepth: () => 4 }, {})).toBe("1");
    });

    it("色深 8 映射为 \"2\"", () => {
        expect(resolveForceColor({ getColorDepth: () => 8 }, {})).toBe("2");
    });

    it("色深 24 映射为 \"3\"", () => {
        expect(resolveForceColor({ getColorDepth: () => 24 }, {})).toBe("3");
    });

    it("色深取值不在映射表内时回落为 \"0\"", () => {
        expect(resolveForceColor({ getColorDepth: () => 16 }, {})).toBe("0");
    });

    it("getColorDepth 优先于环境变量", () => {
        expect(resolveForceColor({ getColorDepth: () => 24 }, { FORCE_COLOR: "1" })).toBe("3");
    });

    it("无 getColorDepth 时合法的 FORCE_COLOR 原样透传", () => {
        for (const value of ["1", "2", "3"]) {
            expect(resolveForceColor({}, { FORCE_COLOR: value })).toBe(value);
        }
    });

    it("无 getColorDepth 且 FORCE_COLOR 非法或缺失时回落为 \"0\"", () => {
        expect(resolveForceColor({}, { FORCE_COLOR: "true" })).toBe("0");
        expect(resolveForceColor({}, { FORCE_COLOR: "0" })).toBe("0");
        expect(resolveForceColor({}, {})).toBe("0");
    });
});

describe("pipeFiltered", () => {
    it("完整行逐行转发并补上换行", async () => {
        expect(await collectPiped(["a\nb\n"])).toEqual(["a\n", "b\n"]);
    });

    it("空行同样转发", async () => {
        expect(await collectPiped(["\n\n"])).toEqual(["\n", "\n"]);
    });

    it("两种噪音行都被过滤", async () => {
        expect(await collectPiped(["Searching for schema in .v8rrc.yaml ...\nok\nFound schema in .v8rrc.yaml ...\n"])).toEqual(["ok\n"]);
    });

    it("跨 chunk 的不完整行被拼接", async () => {
        expect(await collectPiped(["par", "tial\n"])).toEqual(["partial\n"]);
    });

    it("中间 chunk 不以换行结尾时留待下一批数据", async () => {
        expect(await collectPiped(["a\npar", "tial\nb\n"])).toEqual(["a\n", "partial\n", "b\n"]);
    });

    it("end 时无换行的残留行原样输出", async () => {
        expect(await collectPiped(["partial"])).toEqual(["partial"]);
    });

    it("end 时的残留为噪音行则丢弃", async () => {
        expect(await collectPiped(["Searching for schema in .v8rrc.yaml ..."])).toEqual([]);
    });

    it("无任何数据时无输出", async () => {
        expect(await collectPiped([])).toEqual([]);
    });
});
