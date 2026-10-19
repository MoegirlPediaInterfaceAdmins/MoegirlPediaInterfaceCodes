import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import modulePath from "../../modules/modulePath.js";

describe("modulePath", () => {
    it("工作目录内的嵌套文件返回相对路径", () => {
        const url = pathToFileURL(path.resolve(process.cwd(), "scripts", "modules", "foo.js")).href;
        expect(modulePath({ url })).toBe(path.join("scripts", "modules", "foo.js"));
    });

    it("工作目录直接下级的文件返回文件名", () => {
        const url = pathToFileURL(path.resolve(process.cwd(), "foo.js")).href;
        expect(modulePath({ url })).toBe("foo.js");
    });

    it("工作目录之外的文件返回以 .. 开头的相对路径", () => {
        const url = pathToFileURL(path.resolve(process.cwd(), "..", "sibling.js")).href;
        expect(modulePath({ url })).toBe(path.join("..", "sibling.js"));
    });

    it("URL 中的百分号编码被还原为原始字符", () => {
        const url = pathToFileURL(path.resolve(process.cwd(), "a b.js")).href;
        expect(modulePath({ url })).toBe("a b.js");
    });
});
