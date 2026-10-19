import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// debugLog 在模块求值时对 env 做一次性快照，顶层静态 import 会在 env 设定前就固化，
// 因此全部用例通过 vi.resetModules() + 动态 import 获取新模块实例
const importDebugLog = () => import("../../modules/debugLog.js");

// 与 modules/console.js 的时间戳前缀一致；vitest 配置固定 TZ=UTC
const ISO_PREFIX = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00\]$/;

describe("debugLog", () => {
    beforeEach(() => {
        // 实现是「任一变量为字符串 "true" 即启用」；先把两个开关都压到关闭基线，
        // 防止宿主继承的值（如 Actions debug 模式重跑会设 ACTIONS_RUNNER_DEBUG）让用例结论翻转
        vi.stubEnv("DEBUG_MODE", "");
        vi.stubEnv("ACTIONS_RUNNER_DEBUG", "");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        // 再清一次模块缓存：本文件大量动态 import，避免带 env 快照的实例泄漏给后续测试文件
        vi.resetModules();
    });

    describe("debugLoggingEnabled 的 env 快照", () => {
        it("import 前 DEBUG_MODE=true，快照为真", async () => {
            vi.resetModules();
            vi.stubEnv("DEBUG_MODE", "true");

            const { debugLoggingEnabled } = await importDebugLog();
            expect(debugLoggingEnabled).toBe(true);
        });

        it("import 前 ACTIONS_RUNNER_DEBUG=true，同样为真", async () => {
            vi.resetModules();
            vi.stubEnv("ACTIONS_RUNNER_DEBUG", "true");

            const { debugLoggingEnabled } = await importDebugLog();
            expect(debugLoggingEnabled).toBe(true);
        });

        it("开关取值不是字符串 true 时为假", async () => {
            vi.resetModules();
            vi.stubEnv("DEBUG_MODE", "false");
            vi.stubEnv("ACTIONS_RUNNER_DEBUG", "1");

            const { debugLoggingEnabled } = await importDebugLog();
            expect(debugLoggingEnabled).toBe(false);
        });

        it("import 后再改 env，已固化的快照值不随动", async () => {
            vi.resetModules();
            vi.stubEnv("DEBUG_MODE", "false");
            const mod = await importDebugLog();
            expect(mod.debugLoggingEnabled).toBe(false);

            // 模块内常量在求值时定格，之后打开开关不会让它重新求值
            vi.stubEnv("DEBUG_MODE", "true");
            expect(mod.debugLoggingEnabled).toBe(false);
        });

        it("default 导出与具名导出指向同一组值", async () => {
            vi.resetModules();
            const mod = await importDebugLog();

            expect(mod.default.debugLoggingEnabled).toBe(mod.debugLoggingEnabled);
            expect(mod.default.debugConsole).toBe(mod.debugConsole);
        });
    });

    describe("debugConsole", () => {
        it("开关关闭时 prefixable 方法为 no-op，不触达底层 console", async () => {
            vi.resetModules();
            vi.stubEnv("DEBUG_MODE", "false");
            const { debugConsole } = await importDebugLog();

            const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
            debugConsole.log("不应输出");
            expect(logSpy).not.toHaveBeenCalled();
        });

        it("开关开启时 prefixable 方法转发到带时间戳前缀的底层 console", async () => {
            vi.resetModules();
            vi.stubEnv("DEBUG_MODE", "true");
            const { debugConsole } = await importDebugLog();

            const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
            debugConsole.info("调试消息");
            // 首参是代理自动添加的 [ISO 时间戳] 前缀，次参才是原消息
            expect(infoSpy).toHaveBeenCalledTimes(1);
            expect(infoSpy.mock.calls[0][0]).toMatch(ISO_PREFIX);
            expect(infoSpy.mock.calls[0][1]).toBe("调试消息");
        });

        it("非 prefixable 成员不受开关影响，原样透传底层方法", async () => {
            vi.resetModules();
            vi.stubEnv("DEBUG_MODE", "false");
            const { debugConsole } = await importDebugLog();

            // count 不在 console.js 的 prefixable 列表中：即使开关关闭也直接返回底层方法而非 no-op
            expect(debugConsole.count).toBe(console.count);
        });
    });
});
