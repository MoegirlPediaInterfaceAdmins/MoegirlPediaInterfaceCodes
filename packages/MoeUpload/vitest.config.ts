import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    // 默认缓存写进包内 node_modules/.vite；挪到 .cache/，包目录保持干净
    cacheDir: "../../.cache/vite/MoeUpload",
    resolve: {
        // 与 packages/tsconfig.json 的 paths 和构建脚本的 alias 保持一致
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/setup.ts"],
        coverage: {
            provider: "istanbul",
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts"],
            // 报告写到 .cache/（已 gitignore），避免 packages 下的 HTML 报告被仓库 lint 扫到
            reportsDirectory: "../../.cache/coverage/MoeUpload",
            // 不设阈值门禁（与 JSONViewer 一致）。
        },
    },
});
