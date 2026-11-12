import { describe, expect, it } from "vitest";
import { isImageUrl } from "@/logic/preview";

describe("isImageUrl", () => {
    it("常见图片扩展名返回 true", () => {
        expect(isImageUrl("https://example.com/a.jpg")).toBe(true);
        expect(isImageUrl("https://example.com/a.jpeg")).toBe(true);
        expect(isImageUrl("https://example.com/a.png")).toBe(true);
        expect(isImageUrl("https://example.com/a.gif")).toBe(true);
        expect(isImageUrl("https://example.com/a.webp")).toBe(true);
        expect(isImageUrl("https://example.com/a.svg")).toBe(true);
    });

    it("扩展名大小写不敏感", () => {
        expect(isImageUrl("https://example.com/A.JPG")).toBe(true);
        expect(isImageUrl("https://example.com/A.WebP")).toBe(true);
    });

    it("忽略 query 与 hash", () => {
        expect(isImageUrl("https://example.com/a.jpg?token=abc&x=1")).toBe(true);
        expect(isImageUrl("https://example.com/a.png#page")).toBe(true);
    });

    it("百分号编码路径只看末尾扩展名", () => {
        expect(
            isImageUrl(
                "https://storage.moegirl.org.cn/moegirl/commons/0/0a/%E5%BD%B1%E4%B9%8B%E8%AF%97WB_CCA_20260929_chs_05.jpg",
            ),
        ).toBe(true);
    });

    it("非图片扩展名返回 false", () => {
        expect(isImageUrl("https://example.com/a.pdf")).toBe(false);
        expect(isImageUrl("https://example.com/a.zip")).toBe(false);
        expect(isImageUrl("https://example.com/a.mp4")).toBe(false);
    });

    it("无扩展名或路径无点返回 false", () => {
        expect(isImageUrl("https://example.com/a")).toBe(false);
        expect(isImageUrl("https://example.com/dir/subdir")).toBe(false);
        expect(isImageUrl("https://example.com/")).toBe(false);
    });

    it("多级路径只取最后一段", () => {
        expect(isImageUrl("https://example.com/images/2024/photo.jpg")).toBe(true);
        expect(isImageUrl("https://example.com/images.jpg/readme")).toBe(false);
    });

    it("非法 URL 返回 false", () => {
        expect(isImageUrl("")).toBe(false);
        expect(isImageUrl("not a url")).toBe(false);
    });

    it("非 http(s) 协议返回 false", () => {
        expect(isImageUrl("ftp://example.com/a.jpg")).toBe(false);
        expect(isImageUrl("data:image/png;base64,AAAA")).toBe(false);
    });
});
