import { describe, expect, it } from "vitest";
import options from "../../minification/options.js";

describe("minification options", () => {
    it("顶层结构恰为 ecma / compress / mangle / format 四节", () => {
        expect(Object.keys(options).sort()).toEqual(["compress", "ecma", "format", "mangle"]);
    });

    it("顶层 ecma 固定为 2020", () => {
        expect(options.ecma).toBe(2020);
    });

    it("compress 关键压缩参数", () => {
        expect(options.compress.passes).toBe(3);
        expect(options.compress.drop_console).toBe(false);
        expect(options.compress.drop_debugger).toBe(true);
        expect(options.compress.module).toBe(false);
        expect(options.compress.toplevel).toBe(false);
        expect(options.compress.top_retain).toBeNull();
        expect(options.compress.pure_funcs).toEqual([]);
        expect(options.compress.pure_getters).toBe("strict");
        expect(options.compress.unsafe).toBe(false);
        expect(options.compress.ecma).toBe(2020);
    });

    it("compress 保留名称类开关全部开启", () => {
        expect(options.compress.keep_classnames).toBe(true);
        expect(options.compress.keep_fargs).toBe(true);
        expect(options.compress.keep_fnames).toBe(true);
        expect(options.compress.keep_infinity).toBe(true);
    });

    it("mangle 关键混淆参数", () => {
        expect(options.mangle.eval).toBe(false);
        expect(options.mangle.module).toBe(false);
        expect(options.mangle.keep_classnames).toBe(true);
        expect(options.mangle.keep_fnames).toBe(true);
    });

    it("mangle.properties 完整结构", () => {
        expect(options.mangle.properties).toStrictEqual({
            builtins: false,
            // eslint-disable-next-line camelcase -- Terser options use snake_case
            keep_quoted: false,
            undeclared: false,
            regex: /^$/,
        });
    });

    it("mangle.properties.regex 是仅匹配空串的正则", () => {
        expect(options.mangle.properties.regex).toBeInstanceOf(RegExp);
        expect(options.mangle.properties.regex.source).toBe("^$");
    });

    it("format 关键格式化参数", () => {
        expect(options.format.comments).toBe("some");
        expect(options.format.ecma).toBe(2020);
        expect(options.format.indent_level).toBe(4);
        expect(options.format.indent_start).toBe(0);
        expect(options.format.max_line_len).toBe(1024 * 10);
        expect(options.format.preamble).toBeNull();
        expect(options.format.quote_keys).toBe(false);
        expect(options.format.quote_style).toBe(0);
        expect(options.format.semicolons).toBe(true);
        expect(options.format.ascii_only).toBe(false);
        expect(options.format.beautify).toBe(false);
    });
});
