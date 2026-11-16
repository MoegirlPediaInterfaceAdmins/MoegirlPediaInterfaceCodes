import { defineConfig } from "vitest/config";

const config = defineConfig({
    cacheDir: "../../.cache/vite/Cat-a-lot",
    test: {
        environment: "jsdom",
        environmentOptions: { jsdom: { url: "https://zh.moegirl.org.cn/Category:Test" } },
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/helpers/setup.ts"],
        unstubGlobals: true,
        coverage: {
            provider: "istanbul",
            include: ["src/**/*.ts"],
            exclude: [
                "src/**/*.d.ts",
                "src/index.ts",
                "src/app.ts",
                "src/runtime.ts",
            ],
            reportsDirectory: "../../.cache/coverage/Cat-a-lot",
        },
    },
});

export default config;
