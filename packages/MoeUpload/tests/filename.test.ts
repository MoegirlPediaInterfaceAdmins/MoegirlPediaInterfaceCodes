import { describe, expect, it } from "vitest";
import {
    dedupeFilename,
    findProhibitedExtension,
    sanitizeFilename,
    stripFilePrefix,
} from "../src/logic/filename";

describe("sanitizeFilename", () => {
    it("剥离 File: 前缀", () => {
        expect(sanitizeFilename("File:foo.png")).toBe("Foo.png");
        expect(sanitizeFilename("file:bar.jpg")).toBe("Bar.jpg");
    });

    it("剥离中文 File 命名空间别名（含全角冒号）", () => {
        expect(sanitizeFilename("文件:示例.png")).toBe("示例.png");
        expect(sanitizeFilename("檔案：示例.png")).toBe("示例.png");
        expect(sanitizeFilename("File：示例.png")).toBe("示例.png");
        expect(sanitizeFilename("档案 : 示例.png")).toBe("示例.png");
    });

    it("首字母大写：对齐 MediaWiki 对 NS_FILE 的 ucfirst", () => {
        expect(sanitizeFilename("abc.png")).toBe("Abc.png");
        expect(sanitizeFilename("文件:abc.png")).toBe("Abc.png");
        expect(sanitizeFilename("示例.png")).toBe("示例.png");
        expect(sanitizeFilename("100%.png")).toBe("100%.png");
    });

    it("清洗 MediaWiki 额外拒绝的 %XX / &…; / ~~~", () => {
        // 这三类都在 $wgLegalTitleChars 里，本地不清洗会先传完字节再收到 illegal-filename；清洗顺序固定且必须幂等
        expect(sanitizeFilename("a%20b.png")).toBe("A b.png");
        expect(sanitizeFilename("a&nbsp;b.png")).toBe("A b.png");
        expect(sanitizeFilename("a&amp;b.png")).toBe("A b.png");
        expect(sanitizeFilename("a~~~b.png")).toBe("A b.png");
    });

    it("不误伤单独的 % 与 &", () => {
        expect(sanitizeFilename("100%.png")).toBe("100%.png");
        expect(sanitizeFilename("A&B.png")).toBe("A&B.png");
        expect(sanitizeFilename("a~~b.png")).toBe("A~~b.png");
    });

    it("替换非法字符并压缩空白", () => {
        expect(sanitizeFilename("a#b<c>[d]{e}|f.jpg")).toBe("A b c d e f.jpg");
        expect(sanitizeFilename("  多  空格   名.png ")).toBe("多 空格 名.png");
    });

    it("去掉开头的点号", () => {
        expect(sanitizeFilename(".hidden.png")).toBe("Hidden.png");
    });

    it("极端输入清洗后返回空字符串", () => {
        expect(sanitizeFilename("")).toBe("");
        expect(sanitizeFilename("   ")).toBe("");
        expect(sanitizeFilename("\t\n")).toBe("");
        expect(sanitizeFilename("###")).toBe("");
        expect(sanitizeFilename("#<>[]{}|")).toBe("");
        expect(sanitizeFilename(String.raw`:;/\?`)).toBe("");
        expect(sanitizeFilename("...")).toBe("");
        expect(sanitizeFilename(".....")).toBe("");
        expect(sanitizeFilename("File:")).toBe("");
        expect(sanitizeFilename("文件：")).toBe("");
        expect(sanitizeFilename("%20%20")).toBe("");
        expect(sanitizeFilename("%20%2F%3A")).toBe("");
        expect(sanitizeFilename("&nbsp;")).toBe("");
        expect(sanitizeFilename("&amp;&lt;&gt;")).toBe("");
        expect(sanitizeFilename("~~~")).toBe("");
        expect(sanitizeFilename("~~~~~~")).toBe("");
        expect(sanitizeFilename("###%20&nbsp;~~~")).toBe("");
        expect(sanitizeFilename("%20&nbsp;~~~###")).toBe("");
        expect(sanitizeFilename("#<>%2F&amp;~~~")).toBe("");
        expect(sanitizeFilename("File:###")).toBe("");
        expect(sanitizeFilename("文件：%20")).toBe("");
        expect(sanitizeFilename("File:%20%20")).toBe("");
    });

    it("仅扩展名的输入（清洗后仅剩扩展名）", () => {
        expect(sanitizeFilename("###.png")).toBe("Png");
        expect(sanitizeFilename("&nbsp;.jpg")).toBe("Jpg");
        expect(sanitizeFilename("~~~.gif")).toBe("Gif");
    });

    it("超长名称按字节截断且保留扩展名", () => {
        const long = `${"测".repeat(300)}.png`;
        const result = sanitizeFilename(long);
        expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(240);
        // 服务端按扩展名判定文件类型，截断进扩展名会让合法文件被拒绝
        expect(result.endsWith(".png")).toBe(true);
        expect(result).not.toBe(long);
    });

    it("无扩展名的超长名称直接按字节截断", () => {
        const result = sanitizeFilename("测".repeat(300));
        expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(240);
        expect(result).not.toContain(".");
    });

    it("UTF-8 多字节字符边界截断（3字节字符）", () => {
        const aligned = `${"测".repeat(80)}.png`;
        const result1 = sanitizeFilename(aligned);
        expect(new TextEncoder().encode(result1).length).toBeLessThanOrEqual(240);
        expect(result1.endsWith(".png")).toBe(true);

        const overAligned = `${"测".repeat(81)}.png`;
        const result2 = sanitizeFilename(overAligned);
        expect(new TextEncoder().encode(result2).length).toBeLessThanOrEqual(240);
        expect(result2.endsWith(".png")).toBe(true);
        expect(result2).not.toContain("\ufffd");
    });

    it("UTF-8 多字节字符边界截断（4字节 emoji）", () => {
        const emoji = `${"😀".repeat(60)}.png`;
        const result = sanitizeFilename(emoji);
        expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(240);
        expect(result.endsWith(".png")).toBe(true);
        expect(result).not.toContain("\ufffd");

        const mixed = `${"A测😀".repeat(40)}.png`;
        const result2 = sanitizeFilename(mixed);
        expect(new TextEncoder().encode(result2).length).toBeLessThanOrEqual(240);
        expect(result2.endsWith(".png")).toBe(true);
        expect(result2).not.toContain("\ufffd");
    });

    it("数字字符引用：&#65; 由 # / ; 规则清理，&65; 按实体规则清理", () => {
        expect(sanitizeFilename("a&65;b.png")).toBe("A b.png");
        expect(sanitizeFilename("a&#65;b.png")).toBe("A& 65 b.png");
    });

    it("幂等：TitleInput 失焦回写与 store 比对依赖二次清洗结果不变", () => {
        const samples = [
            "  多  空格   名.png ",
            "a%20b.png",
            "a&nbsp;b.png",
            "a~~~b.png",
            "文件: Foo #1.png",
            ".hidden.png",
            "a#b<c>[d]{e}|f.jpg",
            `${"测".repeat(300)}.png`,
        ];
        for (const sample of samples) {
            const once = sanitizeFilename(sample);
            expect(sanitizeFilename(once)).toBe(once);
        }
    });
});

describe("dedupeFilename", () => {
    it("无冲突时保留原名", () => {
        expect(dedupeFilename("foo.jpg", () => false)).toBe("foo.jpg");
    });

    it("冲突时追加序号", () => {
        const taken = new Set(["foo.jpg", "foo (2).jpg"]);
        expect(dedupeFilename("foo.jpg", (name) => taken.has(name))).toBe("foo (3).jpg");
    });

    it("无扩展名也能去重", () => {
        const taken = new Set(["foo"]);
        expect(dedupeFilename("foo", (name) => taken.has(name))).toBe("foo (2)");
    });

    it("连续占用上千个序号时不溢出、不跳号", () => {
        const taken = new Set<string>(["foo.jpg"]);
        for (let i = 2; i <= 1000; i++) {
            taken.add(`foo (${i}).jpg`);
        }
        expect(dedupeFilename("foo.jpg", (name) => taken.has(name))).toBe("foo (1001).jpg");
    });
});

describe("stripFilePrefix", () => {
    it("stripFilePrefix 只去前缀不清洗", () => {
        expect(stripFilePrefix("File:a#b.png")).toBe("a#b.png");
        expect(stripFilePrefix("文件:a#b.png")).toBe("a#b.png");
    });
});

// 禁用扩展名按点全拆、每段都算；禁用集与 allowedExtensions 是两套规则（URL 上传放行后交服务端 filetype-banned 兜底）
describe("findProhibitedExtension", () => {
    it("命中任意一段伪扩展名", () => {
        expect(findProhibitedExtension("evil.php.png")).toBe("php");
        expect(findProhibitedExtension("evil.PHP.png")).toBe("php");
        expect(findProhibitedExtension("a.png.exe.bak")).toBe("exe");
        expect(findProhibitedExtension("File:a.php.png")).toBe("php");
        expect(findProhibitedExtension("a.js")).toBe("js");
    });

    it("正常文件名与无点文件名不误判", () => {
        expect(findProhibitedExtension("normal.png")).toBeNull();
        expect(findProhibitedExtension("foo.xyz")).toBeNull();
        expect(findProhibitedExtension("php")).toBeNull();
        expect(findProhibitedExtension("php.png")).toBeNull();
    });

    it("白名单外的普通扩展名不误判（禁用集只覆盖默认 $wgProhibitedFileExtensions）", () => {
        for (const name of ["a.pdf", "a.docx", "a.zip", "a.tar.gz", "a.webp", "a.ogg", "a.mp4"]) {
            expect(findProhibitedExtension(name)).toBeNull();
        }
    });

    it("所有默认禁用扩展名都命中（含大小写混写）", () => {
        const prohibited = [
            "html",
            "htm",
            "js",
            "jsb",
            "mhtml",
            "mht",
            "xhtml",
            "xht",
            "php",
            "phtml",
            "php3",
            "php4",
            "php5",
            "phps",
            "phar",
            "shtml",
            "jhtml",
            "pl",
            "py",
            "cgi",
            "exe",
            "scr",
            "dll",
            "msi",
            "vbs",
            "bat",
            "com",
            "pif",
            "cmd",
            "vxd",
            "cpl",
            "xml",
        ];
        for (const ext of prohibited) {
            expect(findProhibitedExtension(`file.${ext}`)).toBe(ext);
            expect(findProhibitedExtension(`FILE.${ext.toUpperCase()}`)).toBe(ext);
            expect(findProhibitedExtension(`file.${ext}.png`)).toBe(ext);
        }
    });
});
