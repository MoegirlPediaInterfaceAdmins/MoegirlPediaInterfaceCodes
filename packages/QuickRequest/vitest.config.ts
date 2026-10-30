import { defineConfig } from "vitest/config";

export default defineConfig({
    // 默认缓存写进包内 node_modules/.vite；挪到 .cache/，包目录保持干净
    cacheDir: "../../.cache/vite/QuickRequest",
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        // 在一切 import 之前注入 wgULS 直通实现（见 tests/setup.ts）
        setupFiles: ["tests/setup.ts"],
        coverage: {
            // istanbul（AST 插桩）而非 v8，与另外四个包一致。
            provider: "istanbul",
            // 只测纯逻辑模块（wikitext / config / blockInfo / deleteContent / registry / uitext）；其余模块要 OOUI / mw.Api 运行时，暂不纳入统计。
            include: ["src/wikitext.ts", "src/config.ts", "src/blockInfo.ts", "src/deleteContent.ts", "src/registry.ts", "src/uitext.ts"],
            // 报告写到 .cache/（已 gitignore），避免 packages 下的 HTML 报告被仓库 lint 扫到
            reportsDirectory: "../../.cache/coverage/QuickRequest",
            // 不设阈值门禁（与 UserMessages 一致）。
        },
    },
});
