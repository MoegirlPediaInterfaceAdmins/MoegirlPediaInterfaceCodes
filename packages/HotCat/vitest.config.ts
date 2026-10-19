import { defineConfig } from "vitest/config";

export default defineConfig({
    // 默认缓存写进包内 node_modules/.vite；挪到 .cache/，包目录保持干净
    cacheDir: "../../.cache/vite/HotCat",
    test: {
        environment: "jsdom",
        // jsdom 站点地址，测试夹具里的 /wiki/... 链接按它解析成绝对 URL
        environmentOptions: { jsdom: { url: "https://zh.moegirl.org.cn/TestPage" } },
        // jsdom 站点地址。
        include: ["tests/**/*.test.ts"],
        // 注入 jQuery。
        setupFiles: ["tests/helpers/setup.ts"],
        // 每个测试文件的 vi.stubGlobal 在同一文件内手工复位，跨文件自动卸载
        unstubGlobals: true,
        coverage: {
            provider: "istanbul",
            // 覆盖范围。
            include: [
                "src/util/**/*.ts",
                "src/wikitext/**/*.ts",
                "src/config/**/*.ts",
                "src/api/suggestions.ts",
                "src/api/summary.ts",
                "src/api/page.ts",
                "src/ui/**/*.ts",
                "src/runtime.ts",
            ],
            exclude: ["src/**/*.d.ts"],
            reportsDirectory: "../../.cache/coverage/HotCat",
            // 不设阈值。
        },
    },
});
