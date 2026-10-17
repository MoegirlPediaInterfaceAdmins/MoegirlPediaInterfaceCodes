import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
        coverage: {
            // istanbul（AST 插桩）而非 v8：与 Navigation_popups 一致；
            // 本包源码尚未全覆盖，暂不设阈值门禁。
            provider: "istanbul",
            include: ["src/**/*.ts"],
            // ambient 类型声明无可执行代码
            exclude: ["src/env.d.ts"],
        },
    },
});
