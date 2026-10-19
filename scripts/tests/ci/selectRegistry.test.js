import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "acorn";

// selectRegistry.js 由 package.json 的 ci 脚本在「rm -rdf node_modules 之后、npm ci 之前」运行，
// 届时 node_modules 不存在，任何非 node: 内置的静态 import 都会在模块加载阶段以
// ERR_MODULE_NOT_FOUND 崩溃（曾因 modules/console.js 顶层导入 @actions/core 而崩，
// 见 dependabot PR #1138 的 CI 记录；此前 lock 文件未变使 node_modules 缓存一直命中、
// npm run ci 实际未被执行，掩盖了该问题）。
// 本测试静态解析源码守住「只允许 node: 内置模块」的约束（同 hooks/、v8r 的零依赖约定），
// 新增裸包名 import 或对 modules/ 的相对引用都会使本测试变红。
const collectStaticImportSpecifiers = (code) => {
    const ast = parse(code, { ecmaVersion: "latest", sourceType: "module" });
    const specifiers = [];
    for (const node of ast.body) {
        const { type, source } = node;
        if (type === "ImportDeclaration" || type === "ExportAllDeclaration" || type === "ExportNamedDeclaration" && source) {
            specifiers.push(source.value);
        }
    }
    return specifiers;
};

describe("selectRegistry 的零依赖约束", () => {
    it("静态 import 仅允许 node: 内置模块", async () => {
        const code = await readFile(new URL("../../ci/selectRegistry.js", import.meta.url), "utf8");
        const specifiers = collectStaticImportSpecifiers(code);
        // 防止文件 import 被清空后约束检查空洞通过
        expect(specifiers.length).toBeGreaterThan(0);
        const offenders = specifiers.filter((specifier) => !specifier.startsWith("node:"));
        expect(offenders).toEqual([]);
    });
});
