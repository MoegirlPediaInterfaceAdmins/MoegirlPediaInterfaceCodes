import { describe, expect, it } from "vitest";
import fixZero from "../../modules/fixZero.js";

describe("fixZero", () => {
    it("个位数补齐前导零", () => {
        expect(fixZero(0)).toBe("00");
        expect(fixZero(5)).toBe("05");
        expect(fixZero(9)).toBe("09");
    });

    it("位数不足指定长度时按长度补齐", () => {
        expect(fixZero(7, 3)).toBe("007");
        expect(fixZero(42, 4)).toBe("0042");
    });

    it("已满足长度的值原样返回字符串", () => {
        expect(fixZero(10)).toBe("10");
        expect(fixZero(123, 2)).toBe("123");
    });

    it("字符串输入同样按长度补零", () => {
        expect(fixZero("3")).toBe("03");
        expect(fixZero("abc", 5)).toBe("00abc");
    });
});
