import { describe, expect, it } from "vitest";
import { parseDiffParam } from "../src/source";

describe("parseDiffParam", () => {
    it("无版本参数时返回 undefined", () => {
        expect(parseDiffParam("")).toBeUndefined();
        expect(parseDiffParam("?action=view")).toBeUndefined();
    });

    it("取 diff 参数", () => {
        expect(parseDiffParam("?diff=123")).toBe(123);
    });

    it("diff 缺失时回退到 oldid", () => {
        expect(parseDiffParam("?oldid=456")).toBe(456);
    });

    it("diff 与 oldid 并存时 diff 优先", () => {
        expect(parseDiffParam("?diff=123&oldid=456")).toBe(123);
    });

    it("非数字参数返回 undefined", () => {
        expect(parseDiffParam("?diff=abc")).toBeUndefined();
    });

    it('空字符串参数返回 undefined（+"" 得到 0 而不是 NaN，不能误传给 API）', () => {
        expect(parseDiffParam("?diff=")).toBeUndefined();
        expect(parseDiffParam("?oldid=")).toBeUndefined();
    });

    it("零与负数返回 undefined", () => {
        expect(parseDiffParam("?diff=0")).toBeUndefined();
        expect(parseDiffParam("?diff=-5")).toBeUndefined();
    });
});
