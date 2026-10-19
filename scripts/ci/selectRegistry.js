import fs from "node:fs";
import path from "node:path";
import console from "node:console";

// 本脚本由 package.json 的 ci 脚本调用，运行于 node_modules 被删除之后、npm ci 安装完成之前，
// 届时任何第三方包都不可用，故必须零第三方依赖、不得引用 scripts/modules/ 下的任何文件
// （同 hooks/、v8r 的零依赖约定，由 scripts/tests/ci/selectRegistry.test.js 静态守护）。
// 曾因引用的 modules/console.js 顶层导入 @actions/core 而在 CI 全新环境崩溃；此前 lock 文件
// 未变使 node_modules 缓存一直命中、npm run ci 实际未被执行，该问题被掩盖至 PR #1138 才暴露。
const info = (...args) => console.info(`[${new Date().toISOString()}]`, ...args);
const split = (length = 137) => console.info("=".repeat(length));
info("Initialization done.");

// 指针文件：把测速选出的 registry 落盘到已 gitignore 的 .cache/（沿用本仓库指针文件惯例），
// 供 package.json 的 ci 脚本读取后传给 `npm ci --registry=<registry> --replace-registry-host=always`，
// 由 npm 在安装时把 package-lock.json 各 resolved 的 registry host 原地替换为该源。
// 全程不读取、不修改 lock 文件，因此无需备份与恢复。
const registryPointerFile = path.join(".cache", "ci-registry");

const registries = [
    "https://registry.npmjs.org/",
    "https://registry.npmmirror.com/",
];
const targetPath = "index.json";

// 与 modules/testLatency.js 同语义的精简版：每源并发测 5 次 HEAD、单次 3 秒超时、
// 取成功请求的最小值，全部失败计为 Number.MAX_SAFE_INTEGER（排序垫底）；
// DEBUG_MODE 的逐次明细因零依赖约束省略，失败情形由垫底值在最终输出中体现。
const testLatency = async (urls, times = 5, timeout = 3000) => {
    info("[testLatency]", "urls:", urls);
    info("[testLatency]", "times:", times);
    info("[testLatency]", "timeout:", timeout);
    const latency = await Promise.all(urls.map(async (url) => {
        const result = await Promise.allSettled(Array.from({ length: times }, async () => {
            const controller = new AbortController();
            const timeoutRef = setTimeout(() => controller.abort(), timeout);
            const start = process.hrtime.bigint();
            try {
                await fetch(url, { method: "HEAD", signal: controller.signal });
            } finally {
                clearTimeout(timeoutRef);
            }
            return Number(process.hrtime.bigint() - start) / 10 ** 6;
        }));
        return [url, result.reduce((p, { status, value }) => status === "fulfilled" ? Math.min(p, value) : p, Number.MAX_SAFE_INTEGER)];
    }));
    info("[testLatency]", "latency:", latency);
    return latency;
};

const latency = await testLatency(registries.map((base) => `${base}${targetPath}`));
const targetRegistry = latency.sort(([, a], [, b]) => a - b)[0][0].replace(targetPath, "");
info("targetRegistry:", targetRegistry);
await fs.promises.mkdir(".cache", { recursive: true });
await fs.promises.writeFile(registryPointerFile, targetRegistry, "utf8");
info("registry pointer written:", registryPointerFile);
info("Done.");
split();
