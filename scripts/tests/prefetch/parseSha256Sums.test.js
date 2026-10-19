import { describe, expect, it } from "vitest";
import parseSha256Sums from "../../prefetch/parseSha256Sums.js";

// sha256 of 空串，作固定的合法哈希样例
const h1 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const h2 = `0${"a".repeat(63)}`;

describe("parseSha256Sums", () => {
    it("解析 text 模式的标准行", () => {
        expect(parseSha256Sums(`${h1}  app.zip`, "app.zip")).toBe(h1);
    });

    it("解析 binary 模式（空格加星号分隔）的行", () => {
        expect(parseSha256Sums(`${h1} *app.zip`, "app.zip")).toBe(h1);
    });

    it("文件名含空格时整段匹配", () => {
        expect(parseSha256Sums(`${h1}  my app.zip`, "my app.zip")).toBe(h1);
    });

    it("多行文本中查找目标文件", () => {
        expect(parseSha256Sums(`${h1}  first.zip\n${h2}  second.zip\n`, "second.zip")).toBe(h2);
    });

    it("CRLF 行尾同样解析", () => {
        expect(parseSha256Sums(`${h1}  first.zip\r\n${h2}  second.zip\r\n`, "second.zip")).toBe(h2);
    });

    it("格式非法的行被跳过", () => {
        const sumsText = `deadbeef  short.zip\nno separator line\n${h1}  good.zip\n`;
        expect(parseSha256Sums(sumsText, "good.zip")).toBe(h1);
    });

    it("文件名须整段相等，前缀相近不误匹配", () => {
        expect(parseSha256Sums(`${h1}  app.js.map`, "app.js")).toBe(undefined);
    });

    it("文件无记录时返回 undefined", () => {
        expect(parseSha256Sums(`${h1}  app.zip`, "other.zip")).toBe(undefined);
    });

    it("空文本返回 undefined", () => {
        expect(parseSha256Sums("", "app.zip")).toBe(undefined);
    });
});
