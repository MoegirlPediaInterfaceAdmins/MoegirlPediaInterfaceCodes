import { describe, expect, it } from "vitest";
import sortModule, { sortWithLowerFirstCharacter, toLowerFirstCharacter } from "../../modules/sortWithLowerFirstCharacter.js";

describe("toLowerFirstCharacter", () => {
    it("首字符转小写其余保持原样", () => {
        expect(toLowerFirstCharacter("Name")).toBe("name");
        expect(toLowerFirstCharacter("ABC")).toBe("aBC");
    });

    it("首字符已是小写时不变", () => {
        expect(toLowerFirstCharacter("abc")).toBe("abc");
    });

    it("空字符串首字符不存在时抛出 TypeError", () => {
        expect(() => toLowerFirstCharacter("")).toThrow(TypeError);
    });
});

describe("sortWithLowerFirstCharacter", () => {
    it("大写开头不再排在小写前面", () => {
        expect(sortWithLowerFirstCharacter(["Zebra", "apple", "Bear"])).toEqual(["apple", "Bear", "Zebra"]);
    });

    it("同词大小写并存时按原有相对顺序聚集", () => {
        expect(sortWithLowerFirstCharacter(["beta", "Alpha", "alpha", "Beta"])).toEqual(["Alpha", "alpha", "beta", "Beta"]);
    });

    it("原地排序并返回同一数组", () => {
        const list = ["b", "A"];
        expect(sortWithLowerFirstCharacter(list)).toBe(list);
        expect(list).toEqual(["A", "b"]);
    });

    it("空数组返回空数组", () => {
        expect(sortWithLowerFirstCharacter([])).toEqual([]);
    });

    it("默认导出聚合同名两个函数", () => {
        expect(sortModule.toLowerFirstCharacter).toBe(toLowerFirstCharacter);
        expect(sortModule.sortWithLowerFirstCharacter).toBe(sortWithLowerFirstCharacter);
    });
});
