import { defineConfig } from "vitest/config";

export default defineConfig({
    // 缓存收进根 .cache/（与 packages/UserMessages 的做法一致），该目录已被
    // .gitignore 忽略且被 CI 的 actions/cache 缓存，与 eslint 的缓存路径互不冲突。
    cacheDir: ".cache/vite/scripts",
    test: {
        environment: "node",
        // vitest 5 起默认即 true（每个测试前 vi.clearAllMocks()，只清调用历史不动实现）；
        // 显式声明以固化该语义，防止未来升级改变默认或误关导致测试变得顺序敏感
        clearMocks: true,
        // include 设置即覆盖默认匹配模式；默认模式会递归扫到 packages/ 的测试，
        // 而那些测试依赖各自 vitest.config.ts 的 jsdom / setupFiles，不能在本配置下运行，
        // 故必须显式限定为 scripts/tests/。
        include: ["scripts/tests/**/*.test.js"],
        env: {
            // toLocalTimeZoneStrings 的实现基于 Date 本地分量与 getTimezoneOffset，
            // 固定 UTC 使期望值可预先确定（CI runner 本就是 UTC，此举让本地开发与 CI 一致）。
            TZ: "UTC",
        },
    },
});
