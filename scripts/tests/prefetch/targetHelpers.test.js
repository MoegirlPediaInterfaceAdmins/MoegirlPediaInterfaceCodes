import { describe, expect, it } from "vitest";
import { buildJsDelivrUrl, isValidRepoFormat, transformFetchedCode } from "../../prefetch/targetHelpers.js";

describe("isValidRepoFormat", () => {
    it("owner/repository 形状合法", () => {
        expect(isValidRepoFormat("owner/repo")).toBe(true);
        expect(isValidRepoFormat("Owner_Name-1/Repo.name")).toBe(true);
    });

    it("多段斜杠不合法", () => {
        expect(isValidRepoFormat("a/b/c")).toBe(false);
        expect(isValidRepoFormat("a//b")).toBe(false);
    });

    it("任一段为空不合法", () => {
        expect(isValidRepoFormat("/repo")).toBe(false);
        expect(isValidRepoFormat("owner/")).toBe(false);
        expect(isValidRepoFormat("")).toBe(false);
    });

    it("含空白字符不合法", () => {
        expect(isValidRepoFormat("own er/repo")).toBe(false);
        expect(isValidRepoFormat("owner/re po")).toBe(false);
    });
});

describe("buildJsDelivrUrl", () => {
    it("带具体版本时拼入 @version", () => {
        expect(buildJsDelivrUrl("pack", "1.2.3", "dist/index.js").href).toBe("https://cdn.jsdelivr.net/npm/pack@1.2.3/dist/index.js");
    });

    it("版本为 dist-tag 时原样拼入", () => {
        expect(buildJsDelivrUrl("pack", "next", "dist/index.js").href).toBe("https://cdn.jsdelivr.net/npm/pack@next/dist/index.js");
    });

    it("版本缺省时取 latest（不带 @）", () => {
        expect(buildJsDelivrUrl("pack", undefined, "dist/index.js").href).toBe("https://cdn.jsdelivr.net/npm/pack/dist/index.js");
    });

    it("支持 scoped 包名", () => {
        expect(buildJsDelivrUrl("@scope/pack", "1.0.0", "lib/x.js").href).toBe("https://cdn.jsdelivr.net/npm/@scope/pack@1.0.0/lib/x.js");
    });
});

describe("transformFetchedCode", () => {
    it("删除三斜线引用行连同其换行", () => {
        expect(transformFetchedCode("const a = 1;\n/// <reference path=\"./x.d.ts\" />\nconst b = 2;", [])).toBe("const a = 1;\nconst b = 2;");
    });

    it("连续多个引用行一并删除", () => {
        expect(transformFetchedCode("head\n/// <reference a />\n/// <reference b />\ntail", [])).toBe("head\ntail");
    });

    it("引用指令大小写不敏感", () => {
        expect(transformFetchedCode("x\n/// <Reference types=\"node\" />\ny", [])).toBe("x\ny");
    });

    it("/// 后允许多个空格", () => {
        expect(transformFetchedCode("x\n///   <reference types=\"t\" />\ny", [])).toBe("x\ny");
    });

    it("输入开头的首行引用（前面无换行）同样被剥离", () => {
        expect(transformFetchedCode("/// <reference path=\"a.d.ts\" />\nexport {};", [])).toBe("export {};");
    });

    it("removeCode 片段全部出现都被删除", () => {
        expect(transformFetchedCode("[[x]][[y]]", ["[[", "]]"])).toBe("xy");
    });

    it("多个 removeCode 依次应用", () => {
        expect(transformFetchedCode("HEADER\nuseful code\nFOOTER", ["HEADER\n", "\nFOOTER"])).toBe("useful code");
    });

    it("removeCode 为空数组时仅剥离引用指令", () => {
        expect(transformFetchedCode("a\n/// <reference types=\"t\" />\nb", [])).toBe("a\nb");
    });

    it("不含引用指令与删除片段时原样返回", () => {
        expect(transformFetchedCode("plain code\n// normal comment", [])).toBe("plain code\n// normal comment");
    });
});
