import { describe, expect, it } from "vitest";
import { resolveUIText } from "../src/uitext.ts";

// setup.ts 的 wgULS 直通桩返回第一个参数（简体），故对象形态在此断言 hans 侧；
// hant 侧的正确性由 site-lib 的 wgULS 运行时保证
describe("resolveUIText", () => {
    it("字符串原样返回（配置页简体直书仍可用）", () => {
        expect(resolveUIText("修改原因")).toBe("修改原因");
    });

    it("对象形态经 wgULS 解析，hant 缺省回落 hans", () => {
        expect(resolveUIText({ hans: "申请理由", hant: "申請理由" })).toBe("申请理由");
        expect(resolveUIText({ hans: "申请理由" })).toBe("申请理由");
    });
});
