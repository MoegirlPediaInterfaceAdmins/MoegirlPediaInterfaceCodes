import { describe, expect, it } from "vitest";
import diffArray from "../../modules/diffArray.js";

describe("diffArray", () => {
    it("内容一致（不计顺序）时返回 false", () => {
        expect(diffArray([1, 2, 3], [3, 2, 1])).toBe(false);
    });

    it("a 中存在 b 没有的元素时返回 true", () => {
        expect(diffArray([1, 2], [1])).toBe(true);
    });

    it("b 中存在 a 没有的元素时返回 true", () => {
        expect(diffArray([1], [1, 2])).toBe(true);
    });

    it("重复元素不影响相同判定", () => {
        expect(diffArray([1, 1, 2], [2, 1])).toBe(false);
    });

    it("两个空数组返回 false", () => {
        expect(diffArray([], [])).toBe(false);
    });

    it("一方为空数组且另一方非空时返回 true", () => {
        expect(diffArray([], [1])).toBe(true);
        expect(diffArray([1], [])).toBe(true);
    });
});
