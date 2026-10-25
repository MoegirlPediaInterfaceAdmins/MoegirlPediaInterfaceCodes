import { describe, expect, it } from "vitest";
import { stripCommentsAndNowiki } from "../src/wikitext/strip.ts";

describe("stripCommentsAndNowiki：HTML 注释", () => {
    it("成对注释整段剥除", () => {
        expect(stripCommentsAndNowiki("a<!-- x -->b")).toBe("ab");
    });

    it("第一个 --> 即结束，其余文本保留", () => {
        expect(stripCommentsAndNowiki("<!-- 外层 <!-- 内层 --> 正文 <!-- 尾部 --> end")).toBe(" 正文  end");
    });

    it("未闭合注释吞到文末", () => {
        expect(stripCommentsAndNowiki("正文 <!-- 隐藏到结尾 [[Category:X]]")).toBe("正文 ");
    });

    it("--!> 不结束注释（wikitext 层只有 --> 是结束符）", () => {
        expect(stripCommentsAndNowiki("<!-- a --!> [[Category:X]] --> 保留")).toBe(" 保留");
    });

    it("接缝拼出的新注释同样剥除", () => {
        expect(stripCommentsAndNowiki("<!<!-- A -->-- B -->")).toBe("");
    });

    it("文末未闭合的注释剥除", () => {
        expect(stripCommentsAndNowiki("x<!--")).toBe("x");
    });
});

describe("stripCommentsAndNowiki：nowiki", () => {
    it("剥除 nowiki 标签及内容", () => {
        expect(stripCommentsAndNowiki("a<nowiki>[[Category:No]]</nowiki>b")).toBe("ab");
    });

    it("注释内的 nowiki 随注释一并剥除", () => {
        expect(stripCommentsAndNowiki("a<!-- <nowiki>y</nowiki> -->b")).toBe("ab");
    });

    it("nowiki 内的注释也剥除", () => {
        expect(stripCommentsAndNowiki("a<nowiki>b<!-- c -->d</nowiki>e")).toBe("ae");
    });

    it("未闭合的 nowiki 不剥除", () => {
        expect(stripCommentsAndNowiki("<no<nowiki>x</nowiki>wiki>")).toBe("<nowiki>");
    });
});
