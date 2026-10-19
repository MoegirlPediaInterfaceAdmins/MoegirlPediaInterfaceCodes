import { describe, expect, it } from "vitest";
import buildInputCode from "../../browserify/buildInputCode.js";

describe("buildInputCode", () => {
    it("未指定导出形式时用默认导入并挂载", () => {
        expect(buildInputCode({ module: "libFoo", entry: "libFoo" })).toBe([
            "import m from \"libFoo\";",
            "global[\"libFoo\"] = m;",
        ].join("\n"));
    });

    it("exportValues 非空时用命名导入并挂载对象字面量", () => {
        expect(buildInputCode({ module: "libBar", entry: "libBar", exportValues: ["a", "b"] })).toBe([
            "import { a, b } from \"libBar\";",
            "global[\"libBar\"] = { a, b };",
        ].join("\n"));
    });

    it("namespaceImport 时用 * as m 导入并挂载命名空间本身", () => {
        expect(buildInputCode({ module: "libBaz", entry: "libBaz", namespaceImport: true })).toBe([
            "import * as m from \"libBaz\";",
            "global[\"libBaz\"] = m;",
        ].join("\n"));
    });

    it("namespaceImport 优先于 exportValues", () => {
        expect(buildInputCode({ module: "libQux", entry: "libQux", exportValues: ["a"], namespaceImport: true })).toBe([
            "import * as m from \"libQux\";",
            "global[\"libQux\"] = m;",
        ].join("\n"));
    });

    it("exportValues 为空数组时回退默认导入", () => {
        expect(buildInputCode({ module: "libFoo", entry: "libFoo", exportValues: [] })).toBe([
            "import m from \"libFoo\";",
            "global[\"libFoo\"] = m;",
        ].join("\n"));
    });

    it("module 与 entry 含特殊路径段时原样嵌入", () => {
        expect(buildInputCode({ module: "@scope/pkg/dist/main.js", entry: "pkg.main" })).toBe([
            "import m from \"@scope/pkg/dist/main.js\";",
            "global[\"pkg.main\"] = m;",
        ].join("\n"));
    });
});
