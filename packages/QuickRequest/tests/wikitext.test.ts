import { describe, expect, it } from "vitest";
import type { TypeConfig } from "../src/types.ts";
import { buildSubmitText, buildTemplateWikitext, extractLeadingHeading, toSubst } from "../src/wikitext.ts";

const editType: TypeConfig = {
    template: "Template:编辑请求",
    requireAnyOf: ["original", "new"],
    parameters: [
        { key: "original", label: "需要删除/修改的旧内容", type: "multiline" },
        { key: "new", label: "需要新增/修改后的内容", type: "multiline" },
        { key: "reason", label: "修改原因", type: "text" },
    ],
};

describe("buildTemplateWikitext", () => {
    it("按参数定义顺序拼接，空值整段省略", () => {
        expect(buildTemplateWikitext(editType, { original: "旧", "new": "", reason: "原因" })).toBe("{{Template:编辑请求|original=旧|reason=原因}}");
    });

    it("全部为空时只输出模板调用骨架", () => {
        expect(buildTemplateWikitext(editType, {})).toBe("{{Template:编辑请求}}");
    });

    it("值里不存在的参数键不会混入", () => {
        expect(buildTemplateWikitext(editType, { original: "旧", other: "多余" })).toBe("{{Template:编辑请求|original=旧}}");
    });

    it("没有参数定义时只输出模板名", () => {
        expect(buildTemplateWikitext({ template: "Template:X" }, { 1: "a" })).toBe("{{Template:X}}");
    });
});

describe("toSubst", () => {
    it("只改写字符串开头的模板调用", () => {
        expect(toSubst("{{T|1=a}}")).toBe("{{subst:T|1=a}}");
    });

    it("不在开头的模板调用保持原样", () => {
        expect(toSubst("前言{{T}}")).toBe("前言{{T}}");
    });
});

describe("buildSubmitText", () => {
    it("施加 subst 改写且不追加签名（签名由模板的 sign 参数缺省值完成）", () => {
        expect(buildSubmitText("{{Template:编辑请求|original=旧}}")).toBe("{{subst:Template:编辑请求|original=旧}}");
    });
});

describe("extractLeadingHeading", () => {
    it("剥离正文开头的二级标题并给出标题与剩余正文", () => {
        expect(extractLeadingHeading("== 管理员申请 - User:Example ==\n正文第一行\n正文第二行")).toEqual({
            title: "管理员申请 - User:Example",
            body: "正文第一行\n正文第二行",
        });
    });

    it("标题两侧的空白被剥掉", () => {
        expect(extractLeadingHeading("==  空白  ==\n正文")).toEqual({ title: "空白", body: "正文" });
    });

    it("开头不是二级标题时返回 null", () => {
        expect(extractLeadingHeading("正文\n== 不是开头 ==")).toBeNull();
    });

    it("三级及更深的标题不视为章节标题", () => {
        expect(extractLeadingHeading("=== 三级 ===\n正文")).toBeNull();
    });
});
