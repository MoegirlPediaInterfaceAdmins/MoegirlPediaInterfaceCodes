import { describe, expect, it } from "vitest";
import type { TemplateEntry } from "../src/types.ts";
import { buildPresetWikitext, buildSubmitText, stripNoInclude, toSubst } from "../src/wikitext.ts";

const template: TemplateEntry = {
    title: "可收录页面打回",
    template: "Template:UserMessages/MovedToUserSubpage",
    summary: "页面打回通知",
    parameters: [
        { key: "1", label: "页面名", type: "page", required: true },
        { key: "2", label: "原因", type: "multiline", required: true },
        { key: "3", label: "备注" },
    ],
};

describe("buildPresetWikitext", () => {
    it("按参数定义顺序拼接，空值整段省略", () => {
        expect(buildPresetWikitext(template, { 1: "Foo", 2: "原因", 3: "" })).toBe("{{Template:UserMessages/MovedToUserSubpage|1=Foo|2=原因}}");
    });

    it("没有参数定义时只输出模板名", () => {
        expect(buildPresetWikitext({ title: "欢迎", template: "Template:X", summary: "" }, {})).toBe("{{Template:X}}");
    });

    it("值里不存在的参数键不会混入", () => {
        expect(buildPresetWikitext(template, { 1: "Foo", 9: "多余" })).toBe("{{Template:UserMessages/MovedToUserSubpage|1=Foo}}");
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

describe("stripNoInclude", () => {
    it("去掉 noinclude 块与 includeonly 标签", () => {
        expect(stripNoInclude("<noinclude>[[Category:X]]</noinclude>{{T}}<includeonly>正文</includeonly>")).toBe("{{T}}正文");
    });

    it("跨行 noinclude 与大小写混写都能处理", () => {
        expect(stripNoInclude("<NOINCLUDE>\n说明\n</noinclude>\n{{T}}\n")).toBe("{{T}}");
    });

    it("只剩空白时返回空串", () => {
        expect(stripNoInclude("<noinclude>x</noinclude>  \n")).toBe("");
    });
});

describe("buildSubmitText", () => {
    it("预置模板加 subst 前缀并把签名缀在末尾", () => {
        expect(buildSubmitText("{{T}}", false, " ——~~~~")).toBe("{{subst:T}} ——~~~~");
    });

    it("自定义内容不加 subst，签名照旧", () => {
        expect(buildSubmitText("正文", true, " ——~~~~")).toBe("正文 ——~~~~");
    });

    it("签名为空串时只用正文", () => {
        expect(buildSubmitText("{{T}}", false, "")).toBe("{{subst:T}}");
    });
});
