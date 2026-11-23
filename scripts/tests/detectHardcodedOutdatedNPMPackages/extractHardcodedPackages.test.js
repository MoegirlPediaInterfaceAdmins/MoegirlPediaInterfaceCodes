import { describe, expect, it } from "vitest";
import extractHardcodedPackages from "../../detectHardcodedOutdatedNPMPackages/extractHardcodedPackages.js";

describe("extractHardcodedPackages", () => {
    it("提取 npm.elemecdn.com URL 中的包名与版本", () => {
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

    it("带构建元数据的完整版本一并捕获", () => {
        const content = "\"https://npm.elemecdn.com/foo@1.2.3-beta.1+build.5/dist/a.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["foo@1.2.3-beta.1+build.5"]);
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

    it("作用域包（@scope 形式）带版本时可匹配", () => {
        const content = "\"https://npm.elemecdn.com/@scope/pkg@1.0.0/dist/main.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["@scope/pkg@1.0.0"]);
    });

    it("作用域包无版本时返回 null", () => {
        const content = "\"https://cdn.jsdelivr.net/npm/@inpageedit/core/dist/index.js\"";
        expect(extractHardcodedPackages(content)).toBeNull();
    });

    it("无 CDN 域名引用时返回 null", () => {
        expect(extractHardcodedPackages("const url = \"https://example.com/foo@1.0.0\";")).toBeNull();
    });

    it("空字符串返回 null", () => {
        expect(extractHardcodedPackages("")).toBeNull();
    });

    it("jsDelivr testingcf 子域的固定版本引用可匹配", () => {
        const content = "await libCachedCode.injectCachedCode(\"https://testingcf.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js\", \"script\");";
        expect(extractHardcodedPackages(content)).toEqual(["echarts@5.5.1"]);
    });

    it("jsDelivr fastly 子域带深层路径的固定版本引用可匹配", () => {
        const content = "\"https://fastly.jsdelivr.net/npm/diff@7.0.0/dist/diff.min.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["diff@7.0.0"]);
    });

    it("jsDelivr cdn 子域的固定版本引用可匹配", () => {
        const content = "\"https://cdn.jsdelivr.net/npm/foo-bar@2.1.0/index.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["foo-bar@2.1.0"]);
    });

    it("jsDelivr 上的作用域包固定版本引用可匹配", () => {
        const content = "\"https://cdn.jsdelivr.net/npm/@scope/pkg@1.2.3/dist/index.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["@scope/pkg@1.2.3"]);
    });

    it("jsDelivr 的非 npm 路径（/gh/）不匹配", () => {
        const content = "\"https://cdn.jsdelivr.net/gh/user/repo@1.0.0/dist/file.js\"";
        expect(extractHardcodedPackages(content)).toBeNull();
    });

    it("协议相对写法（//host/...）同样可匹配", () => {
        const content = "await libCachedCode.injectCachedCode(\"//testingcf.jsdelivr.net/npm/wikiparser-node@2.0.0/dist/index.js\", \"script\");";
        expect(extractHardcodedPackages(content)).toEqual(["wikiparser-node@2.0.0"]);
    });

    it("unpkg.com 的固定版本引用可匹配", () => {
        const content = "\"https://unpkg.com/foo@3.4.5/dist/foo.min.js\"";
        expect(extractHardcodedPackages(content)).toEqual(["foo@3.4.5"]);
    });

    it("带 query string 的 URL 只解析路径部分", () => {
        const content = "\"https://cdn.jsdelivr.net/npm/foo@1.0.0/index.js?raw=1\"";
        expect(extractHardcodedPackages(content)).toEqual(["foo@1.0.0"]);
    });

    it("主机名伪装的 URL 不匹配", () => {
        expect(extractHardcodedPackages("\"https://jsdelivr.net.evil.example/npm/foo@1.0.0/index.js\"")).toBeNull();
        expect(extractHardcodedPackages("\"https://evil.example/jsdelivr.net/npm/foo@1.0.0/index.js\"")).toBeNull();
    });

    it("同一 pkg@version 出现在不同主机时只保留一条", () => {
        const content = [
            "\"https://npm.elemecdn.com/foo@1.0.0/a.js\"",
            "\"https://cdn.jsdelivr.net/npm/foo@1.0.0/a.js\"",
        ].join("\n");
        expect(extractHardcodedPackages(content)).toEqual(["foo@1.0.0"]);
    });

    it("同一包的不同固定版本分别保留", () => {
        const content = [
            "\"https://cdn.jsdelivr.net/npm/foo@1.0.0/a.js\"",
            "\"https://cdn.jsdelivr.net/npm/foo@2.0.0/a.js\"",
        ].join("\n");
        expect(extractHardcodedPackages(content)).toEqual(["foo@1.0.0", "foo@2.0.0"]);
    });

    it("tag 引用（@browser、@next）均不匹配", () => {
        expect(extractHardcodedPackages("\"//testingcf.jsdelivr.net/npm/wikiparser-node@browser\"")).toBeNull();
        expect(extractHardcodedPackages("\"https://cdn.jsdelivr.net/npm/foo@next/index.js\"")).toBeNull();
    });
});
