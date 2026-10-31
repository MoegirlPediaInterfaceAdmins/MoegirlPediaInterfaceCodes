import { defineConfig } from "vitest/config";

export default defineConfig({
    // 默认缓存写进包内 node_modules/.vite；挪到 .cache/，包目录保持干净
    cacheDir: "../../.cache/vite/Watermark",
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            // istanbul（AST 插桩）而非 v8，与另外两个包一致。
            // 入口 index.ts 依赖 mw / jQuery / DOM 运行时，暂不纳入统计；
            // 可测的场景判定全部在 conditions.ts。
            provider: "istanbul",
            include: ["src/conditions.ts"],
            // 报告写到 .cache/（已 gitignore），避免 packages 下的 HTML 报告被仓库 lint 扫到
            reportsDirectory: "../../.cache/coverage/Watermark",
            // 不设阈值门禁（与 UserMessages / JSONViewer 一致）。
        },
    },
});
