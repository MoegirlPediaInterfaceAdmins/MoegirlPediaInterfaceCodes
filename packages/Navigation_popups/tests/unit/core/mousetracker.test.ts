// Mousetracker：DOM0 接管 document.onmousemove、坐标记录（x/y/lastHook_*）、
// 400ms 兜底轮询、移动阈值过滤与 dirty 污染传播。行为基准 =
// legacy selpop.ts 的 Mousetracker（commit 02c8dec，上游 navpopup.js）。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Mousetracker } from "../../../src/core/mousetracker.ts";

describe("Mousetracker", () => {
    let tracker: Mousetracker;

    beforeEach(() => {
        vi.useFakeTimers();
        tracker = new Mousetracker();
    });

    afterEach(() => {
        // enable() 接管的 DOM0 handler 与 interval 在用例间复位
        tracker.disable();
        document.onmousemove = null;
        vi.useRealTimers();
    });

    it("初始状态：400ms 轮询、dirty 待清、未激活", () => {
        expect(tracker.loopDelay).toBe(400);
        expect(tracker.timer).toBeNull();
        expect(tracker.active).toBe(false);
        expect(tracker.dirty).toBe(true);
        expect(tracker.hooks).toEqual([]);
        expect(tracker.x).toBeUndefined();
        expect(tracker.y).toBeUndefined();
        expect(tracker.lastHook_x).toBeUndefined();
        expect(tracker.lastHook_y).toBeUndefined();
        expect(tracker.savedHandler).toBeUndefined();
    });

    describe("runHooks", () => {
        it("无 hook 时直接返回", () => {
            expect(() => {
                tracker.runHooks();
            }).not.toThrow();
        });

        it("hook 收到当前坐标 (x, y)", () => {
            const hook = vi.fn(() => false as const);
            tracker.addHook(hook);
            tracker.x = 3;
            tracker.y = 4;
            tracker.runHooks();
            expect(hook).toHaveBeenCalledWith(3, 4);
        });

        it("返回 true 的 hook 被注销，返回 false 的保留", () => {
            const once = vi.fn(() => true);
            const keep = vi.fn(() => false);
            tracker.addHook(once);
            tracker.addHook(keep);
            tracker.runHooks();
            expect(once).toHaveBeenCalledTimes(1);
            expect(keep).toHaveBeenCalledTimes(1);
            tracker.runHooks();
            expect(once).toHaveBeenCalledTimes(1);
            expect(keep).toHaveBeenCalledTimes(2);
        });

        it("多个 hook 同时返回 true 时一并注销", () => {
            const a = vi.fn(() => true);
            const b = vi.fn(() => true);
            const keep = vi.fn(() => undefined);
            tracker.addHook(a);
            tracker.addHook(b);
            tracker.addHook(keep);
            tracker.runHooks();
            expect(tracker.hooks).toEqual([keep]);
        });
    });

    describe("setPosition 与移动阈值过滤", () => {
        it("dirty 置位时清脏并跳过 hooks（拖拽后的污染传播）", () => {
            tracker.dirty = true;
            const hook = vi.fn(() => false);
            tracker.addHook(hook);
            tracker.setPosition(1, 2);
            expect(tracker.x).toBe(1);
            expect(tracker.y).toBe(2);
            expect(tracker.dirty).toBe(false);
            expect(hook).not.toHaveBeenCalled();
        });

        it("hooks 为空时同样清脏早退（lastHook 不初始化）", () => {
            tracker.dirty = false;
            tracker.setPosition(5, 6);
            expect(tracker.dirty).toBe(false);
            expect(tracker.lastHook_x).toBeUndefined();
        });

        it("首次有效移动以 -100 引导值触发 hooks", () => {
            tracker.dirty = false;
            const hook = vi.fn(() => false);
            tracker.addHook(hook);
            tracker.setPosition(10, 10);
            // (lastHook_x-10)*(lastHook_y-10) = (-110)*(-110)，绝对值远大于阈值 1
            expect(hook).toHaveBeenCalledWith(10, 10);
            expect(tracker.lastHook_x).toBe(10);
            expect(tracker.lastHook_y).toBe(10);
        });

        it("同一位置重复上报不触发 hooks", () => {
            tracker.dirty = false;
            const hook = vi.fn(() => false);
            tracker.addHook(hook);
            tracker.setPosition(10, 10);
            tracker.setPosition(10, 10);
            expect(hook).toHaveBeenCalledTimes(1);
        });

        it("单轴 2px、另一轴 0 的微动（乘积 0）不触发且不更新 lastHook", () => {
            tracker.dirty = false;
            tracker.addHook(vi.fn(() => false));
            tracker.setPosition(10, 10);
            tracker.setPosition(12, 10);
            // (10-12)*(10-10) = 0，未过阈值：lastHook 保持在 (10,10)
            expect(tracker.lastHook_x).toBe(10);
            expect(tracker.lastHook_y).toBe(10);
        });

        it("负乘积取绝对值后过阈值即触发（一轴正一轴负）", () => {
            tracker.dirty = false;
            const hook = vi.fn(() => false);
            tracker.addHook(hook);
            tracker.setPosition(10, 10);
            // (10-30)*(10-5) = -100 → |diff| = 100 > 1
            tracker.setPosition(30, 5);
            expect(hook).toHaveBeenCalledTimes(2);
        });
    });

    describe("track", () => {
        it("无事件且 window.event 未定义时不做任何事", () => {
            expect(Reflect.get(window, "event")).toBeUndefined();
            tracker.track();
            expect(tracker.x).toBeUndefined();
        });

        it("pageX 路径：直接采用页面坐标", () => {
            tracker.track(new MouseEvent("mousemove", { clientX: 15, clientY: 25 }));
            expect(tracker.x).toBe(15);
            expect(tracker.y).toBe(25);
        });

        it("pageX 为 0 时回落 clientX 并叠加文档滚动偏移", () => {
            document.documentElement.scrollLeft = 40;
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 7;
            // jsdom 中 pageX 恒等于 clientX，clientX=0 即走 clientX 回落分支
            tracker.track(new MouseEvent("mousemove", { clientX: 0, clientY: 20 }));
            expect(tracker.x).toBe(40);
            expect(tracker.y).toBe(27);
        });

        it("滚动偏移全为 0 时末级 || 0 兜底", () => {
            document.documentElement.scrollLeft = 0;
            document.documentElement.scrollTop = 0;
            document.body.scrollLeft = 0;
            document.body.scrollTop = 0;
            tracker.track(new MouseEvent("mousemove", { clientX: 0, clientY: 3 }));
            expect(tracker.x).toBe(0);
            expect(tracker.y).toBe(3);
        });

        it("事件无任何坐标信息时直接返回", () => {
            tracker.x = 99;
            tracker.track({} as MouseEvent);
            expect(tracker.x).toBe(99);
        });

        it("enable 后由 DOM0 派发的 mousemove 驱动 track", () => {
            tracker.enable();
            const handler = document.onmousemove;
            expect(handler).toBeTypeOf("function");
            document.dispatchEvent(new MouseEvent("mousemove", { clientX: 9, clientY: 9 }));
            expect(tracker.x).toBe(9);
            expect(tracker.y).toBe(9);
        });
    });

    describe("enable / disable", () => {
        it("enable 接管 document.onmousemove 并启动 400ms 轮询", () => {
            const prior = () => "prior";
            document.onmousemove = prior;
            tracker.enable();
            expect(tracker.active).toBe(true);
            expect(tracker.savedHandler).toBe(prior);
            expect(document.onmousemove).not.toBe(prior);

            const hook = vi.fn(() => false);
            tracker.addHook(hook);
            tracker.x = 1;
            tracker.y = 2;
            // 鼠标静止（无 mousemove）时轮询兜底跑 hooks
            vi.advanceTimersByTime(400);
            expect(hook).toHaveBeenCalledWith(1, 2);
        });

        it("已激活时 enable 不重复接管", () => {
            const prior = () => "prior";
            document.onmousemove = prior;
            tracker.enable();
            const taken = document.onmousemove;
            tracker.enable();
            expect(document.onmousemove).toBe(taken);
            expect(tracker.savedHandler).toBe(prior);
        });

        it("loopDelay 为 0 时不启动轮询定时器", () => {
            tracker.loopDelay = 0;
            tracker.enable();
            expect(tracker.timer).toBeNull();
            const hook = vi.fn(() => false);
            tracker.addHook(hook);
            vi.advanceTimersByTime(10000);
            expect(hook).not.toHaveBeenCalled();
        });

        it("disable 恢复先前保存的函数 handler 并清掉轮询", () => {
            const prior = () => "prior";
            document.onmousemove = prior;
            tracker.enable();
            const hook = vi.fn(() => false);
            tracker.addHook(hook);
            tracker.disable();
            expect(tracker.active).toBe(false);
            expect(document.onmousemove).toBe(prior);
            vi.advanceTimersByTime(4000);
            expect(hook).not.toHaveBeenCalled();
        });

        it("无既有 handler 时 disable 走 delete 分支（handler 留存是浏览器/上游既定行为）", () => {
            // 现代浏览器与 jsdom 的 on* 都存活于原型，Reflect.deleteProperty
            // 移不掉已设置的 handler——legacy 的“半心半意”保存/恢复即此行为
            document.onmousemove = null;
            tracker.enable();
            tracker.disable();
            expect(tracker.active).toBe(false);
            expect(document.onmousemove).toBeTypeOf("function");
        });

        it("未激活时 disable 是无操作", () => {
            expect(() => {
                tracker.disable();
            }).not.toThrow();
            expect(tracker.active).toBe(false);
        });
    });
});
