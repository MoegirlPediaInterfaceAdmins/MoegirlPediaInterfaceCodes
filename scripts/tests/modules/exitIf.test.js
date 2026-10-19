import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import exitIf from "../../modules/exitIf.js";

// exitIf 打印消息走 modules/console.js 的带时间戳前缀代理，
// 代理在调用时才取 global console 上的方法，因此对 console.info 打 spy 可以拦截到最终调用
const ISO_PREFIX = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00\]$/;

describe("exitIf", () => {
    let exitSpy;
    let infoSpy;

    beforeEach(() => {
        exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined);
        infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
        // process.exit 保持 mock 会让同进程后续测试直接"退出"；console.info 保持 mock 会吞掉所有输出
        exitSpy.mockRestore();
        infoSpy.mockRestore();
    });

    it("条件为真时打印消息并以退出码 0 结束进程", () => {
        exitIf(true, "守卫消息");

        expect(exitSpy).toHaveBeenCalledTimes(1);
        expect(exitSpy).toHaveBeenCalledWith(0);
        expect(infoSpy).toHaveBeenCalledTimes(1);
        // 首参是代理自动添加的 [ISO 时间戳] 前缀（vitest 配置固定 TZ=UTC），次参才是原消息
        expect(infoSpy.mock.calls[0][0]).toMatch(ISO_PREFIX);
        expect(infoSpy.mock.calls[0][1]).toBe("守卫消息");
    });

    it("任意真值（非空字符串）同样触发退出", () => {
        exitIf("truthy", "守卫消息");

        expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it("条件为假时不打印消息也不退出", () => {
        exitIf(false, "不应出现");

        expect(exitSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
    });
});
