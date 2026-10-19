import { describe, expect, it } from "vitest";
import extractHardcodedPackages from "../../detectHardcodedOutdatedNPMPackages/extractHardcodedPackages.js";

describe("extractHardcodedPackages", () => {
    it("提取 CDN URL 中的包名与版本", () => {
        const content = "await libCachedCode.injectCachedCode(\"https://npm.elemecdn.com/wikiplus-core@4.0.11/dist/Main.js\", \"script\");";
        expect(extractHardcodedPackages(content)).toEqual(["wikiplus-core@4.0.11"]);
    });

    it("多个不同包按出现顺序全部提取", () => {
        const content = [
            "\"https://npm.elemecdn.com/codemirror@5.65.1/lib/codemirror.js\"",
            "\"https://npm.elemecdn.com/wikiplus-core@4.0.11/dist/Main.js\"",
        ].join("\n");
        expect(extractHardcodedPackages(content)).toEqual(["codemirror@5.65.1", "wikiplus-core@4.0.11"]);
    });

    it("同一包重复出现时去重且保持首次出现顺序", () => {
        const content = [
            "\"https://npm.elemecdn.com/foo@1.0.0/a.js\"",
            "\"https://npm.elemecdn.com/bar@2.0.0/b.js\"",
            "\"https://npm.elemecdn.com/foo@1.0.0/a.js\"",
        ].join("\n");
        expect(extractHardcodedPackages(content)).toEqual(["foo@1.0.0", "bar@2.0.0"]);
    });

    it("v 前缀版本号原样保留", () => {
        const content = "\"https://npm.elemecdn.com/codemirror@v5.65.1/lib/codemirror.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["codemirror@v5.65.1"]);
    });

    it("版本号后的连字符预发布后缀一并捕获", () => {
        const content = "\"https://npm.elemecdn.com/foo@1.2.3-beta/dist/a.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["foo@1.2.3-beta"]);
    });

    it("只有主版本号的单段版本也能匹配", () => {
        const content = "\"https://npm.elemecdn.com/jquery@3/dist/jquery.min.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["jquery@3"]);
    });

    it("版本位于 URL 末尾（无尾随路径）时完整捕获", () => {
        const content = "https://npm.elemecdn.com/opencc-js@1.0.5";
        expect(extractHardcodedPackages(content)).toEqual(["opencc-js@1.0.5"]);
    });

    it("版本后紧跟收尾引号时引号不进入捕获（否则下游 semver.compare 解析失败）", () => {
        const content = "\"https://npm.elemecdn.com/opencc-js@1.0.5\"";
        expect(extractHardcodedPackages(content)).toEqual(["opencc-js@1.0.5"]);
    });

    it("单引号包裹的 URL 同样不把引号捕获进版本", () => {
        const content = "'https://npm.elemecdn.com/opencc-js@1.0.5'";
        expect(extractHardcodedPackages(content)).toEqual(["opencc-js@1.0.5"]);
    });

    it("latest 等非数字版本不匹配返回 null", () => {
        const content = "await libCachedCode.injectCachedCode(\"https://npm.elemecdn.com/wikiplus-core@latest\", \"script\");";
        expect(extractHardcodedPackages(content)).toBeNull();
    });

    it("作用域包名（@scope 形式）不匹配返回 null", () => {
        const content = "\"https://npm.elemecdn.com/@scope/pkg@1.0.0/dist/main.js\"";
        expect(extractHardcodedPackages(content)).toBeNull();
    });

    it("无 CDN 域名引用时返回 null", () => {
        expect(extractHardcodedPackages("const url = \"https://example.com/foo@1.0.0\";")).toBeNull();
    });

    it("空字符串返回 null", () => {
        expect(extractHardcodedPackages("")).toBeNull();
    });
});
