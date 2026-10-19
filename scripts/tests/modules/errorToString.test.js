import { describe, expect, it } from "vitest";
import errorToString from "../../modules/errorToString.js";

describe("errorToString", () => {
    it("普通 Error 原样返回其 stack", () => {
        const error = new Error("boom");
        expect(errorToString(error)).toBe(error.stack);
    });

    it("额外自有属性以缩进 JSON 附加在 stack 之后", () => {
        const error = Object.assign(new Error("boom"), { code: 404, errno: -2 });
        expect(errorToString(error)).toBe(`${error.stack} {\n    "code": 404,\n    "errno": -2\n}`);
    });

    it("cause 为 Error 时递归展开其 stack", () => {
        const inner = new Error("inner");
        const outer = new Error("outer", { cause: inner });
        expect(errorToString(outer)).toBe(`${outer.stack} \n[cause] ${inner.stack}`);
    });

    it("多级 cause 逐层展开", () => {
        const base = new Error("base");
        const middle = new Error("middle", { cause: base });
        const top = new Error("top", { cause: middle });
        expect(errorToString(top)).toBe(`${top.stack} \n[cause] ${middle.stack} \n[cause] ${base.stack}`);
    });

    it("自有属性与 cause 并存时 JSON 附加在前、cause 展开在后", () => {
        const inner = new Error("inner");
        const error = Object.assign(new Error("outer", { cause: inner }), { code: 42 });
        expect(errorToString(error)).toBe(`${error.stack} {\n    "code": 42\n} \n[cause] ${inner.stack}`);
    });

    it("cause 为非 Error 时原样附加", () => {
        const error = new Error("outer", { cause: "plain text" });
        expect(errorToString(error)).toBe(`${error.stack} \n[cause] plain text`);
    });

    it("普通对象按 stack 与额外属性 JSON 处理", () => {
        expect(errorToString({ stack: "Error: like", extra: 1 })).toBe("Error: like {\n    \"extra\": 1\n}");
    });

    it("字符串输入在读取自有键时抛出 TypeError", () => {
        expect(() => errorToString("oops")).toThrow(TypeError);
    });
});
