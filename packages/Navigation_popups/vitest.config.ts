import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
        // popupStrings 等模块在顶层求值翻译表，wgULS 必须先于任何 src 模块
        // 的 import 存在，因此用 setupFiles（先于测试文件的 import 执行）。
        setupFiles: ["tests/helpers/setup.ts"],
        // tests/helpers/mockMw.ts 用 vi.stubGlobal 挂 mw，测试文件间自动卸载
        unstubGlobals: true,
        coverage: {
            // istanbul（AST 插桩）而非 v8：v8 对 typeof 收窄等形态会产生空
            // location 的合成边（永不计数），istanbul 的分支语义精确
            provider: "istanbul",
            include: ["src/**/*.ts"],
            // ambient 类型声明无可执行代码；SCSS 不经 vitest 转译
            exclude: ["src/types/**"],
            // 四项 100% 常开（.zcode/rewrite-plan.md §6）：不可测的防御
            // 分支按「不过度防御」原则删除，而不是写 coverage ignore。
            thresholds: {
                lines: 100,
                branches: 100,
                functions: 100,
                statements: 100,
            },
        },
    },
});
