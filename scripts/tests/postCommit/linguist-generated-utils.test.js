import { describe, expect, it } from "vitest";
import { buildManagedLines, compareByCodePoint, stripManagedBlocks } from "../../postCommit/linguist-generated-utils.js";

// 围栏字面量与 .gitattributes 中已落盘的保持一致，改动会导致旧围栏无法被识别。
const START = "# >>> managed by scripts/postCommit/linguist-generated.js >>>";
const END = "# <<< managed <<<";

describe("stripManagedBlocks", () => {
    it("剥离单个生成段，两侧手工内容之间留一空行", () => {
        const gitattributes = `*.js text\n${START}\n# From js\na.js linguist-generated=true\n${END}\n*.md text`;
        expect(stripManagedBlocks(gitattributes)).toBe("*.js text\n\n*.md text");
    });

    it("剥离多个生成段", () => {
        const gitattributes = `m0\n${START}\n# From a\na.js linguist-generated=true\n${END}\nm1\n${START}\n# From b\nb.js linguist-generated=true\n${END}\nm2`;
        expect(stripManagedBlocks(gitattributes)).toBe("m0\n\nm1\n\nm2");
    });

    it("仅隔一个换行的相邻生成段都被剥离", () => {
        const gitattributes = `${START}\n# From a\na.js linguist-generated=true\n${END}\n${START}\n# From b\nb.js linguist-generated=true\n${END}`;
        expect(stripManagedBlocks(gitattributes)).toBe("");
    });

    it("剥离位于文件开头的生成段", () => {
        const gitattributes = `${START}\n# From js\nx.js linguist-generated=true\n${END}\nm`;
        expect(stripManagedBlocks(gitattributes)).toBe("m");
    });

    it("围栏内零行内容时同样剥离", () => {
        expect(stripManagedBlocks(`m\n${START}\n${END}\nm`)).toBe("m\n\nm");
    });

    it("未闭合的起始围栏连同其后内容按手工内容保留", () => {
        const gitattributes = `m\n${START}\ncontent\nm2`;
        expect(stripManagedBlocks(gitattributes)).toBe(gitattributes);
    });

    it("遇到新的起始围栏即停止匹配，只剥离闭合的那一段", () => {
        const gitattributes = `${START}\nA\n${START}\nB\n${END}`;
        expect(stripManagedBlocks(gitattributes)).toBe(`${START}\nA`);
    });

    it("不含围栏的文本 trim 后原样返回", () => {
        expect(stripManagedBlocks("  *.js text\n*.md text  ")).toBe("*.js text\n*.md text");
    });
});

describe("compareByCodePoint", () => {
    it("相等时返回 0", () => {
        expect(compareByCodePoint("a", "a")).toBe(0);
    });

    it("大写排在小写前", () => {
        expect(compareByCodePoint("Z", "a")).toBe(-1);
        expect(compareByCodePoint("a", "Z")).toBe(1);
    });

    it("前缀相同者短的在前", () => {
        expect(compareByCodePoint("ab", "abc")).toBe(-1);
        expect(compareByCodePoint("abc", "ab")).toBe(1);
    });

    it("空字符串排在任何非空字符串前", () => {
        expect(compareByCodePoint("", "a")).toBe(-1);
    });

    it("排序结果与 locale 无关（大写整体在小写前）", () => {
        expect(["b", "Z", "A"].sort(compareByCodePoint)).toEqual(["A", "Z", "b"]);
    });

    it("非 BMP 字符作为整体参与排序", () => {
        expect(["😀", "𐀀", "b"].sort(compareByCodePoint)).toEqual(["b", "𐀀", "😀"]);
    });
});

describe("buildManagedLines", () => {
    it("按环境变量名与段内路径排序并生成规则行", () => {
        const { managedLines, cssFiles, foldersForCodeQL } = buildManagedLines({
            "linguist-generated-mw": JSON.stringify(["Mw/z.css", "Mw/a.css"]),
            "linguist-generated-js": JSON.stringify(["Js/c.js"]),
        }, []);
        expect(managedLines).toEqual([
            "# From js",
            "Js/c.js linguist-generated=true",
            "",
            "# From mw",
            "Mw/a.css linguist-generated=true",
            "Mw/z.css linguist-generated=true",
        ]);
        expect(cssFiles).toEqual(["dist/**/*.css", "Mw/a.css", "Mw/z.css"]);
        expect(Array.from(foldersForCodeQL)).toEqual(["Js", "Mw"]);
    });

    it("收集来源目录时取路径的 dirname", () => {
        const { cssFiles, foldersForCodeQL } = buildManagedLines({
            "linguist-generated-pkg": JSON.stringify(["a/b/c/d.css"]),
        }, []);
        expect(Array.from(foldersForCodeQL)).toEqual(["a/b/c"]);
        expect(cssFiles).toEqual(["dist/**/*.css", "a/b/c/d.css"]);
    });

    it("排除清单内的来源仍生成规则但不收集 CodeQL 目录", () => {
        const { managedLines, foldersForCodeQL } = buildManagedLines({
            "linguist-generated-mw": JSON.stringify(["Mw/a.css"]),
        }, ["mw"]);
        expect(managedLines).toEqual(["# From mw", "Mw/a.css linguist-generated=true"]);
        expect(foldersForCodeQL.size).toBe(0);
    });

    it("值非数组或空数组时跳过该来源", () => {
        const { managedLines, cssFiles, foldersForCodeQL } = buildManagedLines({
            "linguist-generated-bad": JSON.stringify("text"),
            "linguist-generated-empty": JSON.stringify([]),
        }, []);
        expect(managedLines).toEqual([]);
        expect(cssFiles).toEqual(["dist/**/*.css"]);
        expect(foldersForCodeQL.size).toBe(0);
    });

    it("无 linguist-generated- 前缀的环境变量被忽略", () => {
        const { managedLines, cssFiles, foldersForCodeQL } = buildManagedLines({
            PATH: "x",
            other: JSON.stringify(["a.js"]),
        }, []);
        expect(managedLines).toEqual([]);
        expect(cssFiles).toEqual(["dist/**/*.css"]);
        expect(foldersForCodeQL.size).toBe(0);
    });

    it("值不是合法 JSON 时抛出 SyntaxError", () => {
        expect(() => buildManagedLines({ "linguist-generated-x": "{bad" }, [])).toThrow(SyntaxError);
    });
});
