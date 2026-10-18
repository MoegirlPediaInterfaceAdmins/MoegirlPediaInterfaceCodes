import { defineConfig } from "vitest/config";

export default defineConfig({
    // 默认缓存写进包内 node_modules/.vite；挪到 .cache/，包目录保持干净
    cacheDir: "../../.cache/vite/UserMessages",
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            // istanbul（AST 插桩）而非 v8，与另外两个包一致。
            provider: "istanbul",
            // 目前只测 wikitext 的纯字符串变换；其余模块要 OOUI / mw.Api 运行时，暂不纳入统计。
            include: ["src/wikitext.ts"],
            // 报告写到 .cache/（已 gitignore），避免 packages 下的 HTML 报告被仓库 lint 扫到
            reportsDirectory: "../../.cache/coverage/UserMessages",
            // 不设阈值门禁（与 JSONViewer 一致）。
        },
    },
});
