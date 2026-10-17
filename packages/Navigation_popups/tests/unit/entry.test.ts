// entry 的守卫与启动时序：window.pg 判定与立即装配、ready/load 两条路径。
// entry 在 import 时即执行守卫逻辑，因此每个用例用 vi.resetModules +
// 动态 import 重新求值模块；boot 以 vi.mock 替身断言调用。
//
// entry 的 ready 回调现在还包含 hook 装配段（wikipage.content / Echo 浮层），
// 需要 mw.hook 存在。jQuery 对已 ready 状态下的 $(fn) 用 setTimeout 异步派发
// 回调，回调可能迟到下一用例——届时 mockMw 的 vi.stubGlobal 已被
// unstubGlobals 摘除，装配段就会撞上未定义的 mw（jQuery.Deferred exception）。
// 故此处用文件级常驻存根（非 vi.stubGlobal，不会被用例间清理）兜住装配段；
// hook 行为断言在 entry-hooks.test.ts。
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { bootMock, setupPopupsMock } = vi.hoisted(() => ({
    bootMock: vi.fn(),
    setupPopupsMock: vi.fn(),
}));

vi.mock("../../src/boot.ts", () => ({ boot: bootMock, setupPopups: setupPopupsMock }));

const fakeHook = {
    add: (): void => undefined,
    fire: (): void => undefined,
    remove: (): void => undefined,
};

const loadEntry = async (): Promise<void> => {
    vi.resetModules();
    await import("../../src/entry.ts");
};

// jsdom 的 document.readyState 是原型 getter，在实例上定义可写属性遮蔽之
const setReadyState = (state: string): void => {
    Reflect.defineProperty(document, "readyState", {
        get: () => state,
        configurable: true,
    });
};

const restoreReadyState = (): void => {
    // defineProperty 建立的实例属性 configurable，删除后回落到原型 getter
    Reflect.deleteProperty(document, "readyState");
};

beforeAll(() => {
    (globalThis as unknown as Record<string, unknown>).mw = { hook: () => fakeHook };
});

beforeEach(async () => {
    // $(fn) 的 ready 回调是异步排队的，上一用例的回调可能迟到至此；
    // 先排空微任务再清理，避免迟到的 boot() 污染下一用例的计数。
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
    $(window).off("load");
    bootMock.mockClear();
    setupPopupsMock.mockClear();
    Reflect.deleteProperty(window, "pg");
    restoreReadyState();
});

describe("entry 双载入守卫", () => {
    it("window.pg 为普通对象时判定已加载，不启动 boot", async () => {
        window.pg = { option: {} };
        await loadEntry();
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(bootMock).not.toHaveBeenCalled();
        // 已加载分支不覆盖已有标记
        expect(window.pg).toEqual({ option: {} });
    });

    it("window.pg 为元素节点时不算已加载，照常启动", async () => {
        window.pg = document.createElement("div");
        await loadEntry();
        await vi.waitFor(() => {
            expect(bootMock).toHaveBeenCalledOnce();
        });
    });

    it("守卫通过后立即装配 window.pg（不等 ready）", async () => {
        setReadyState("loading");
        await loadEntry();
        // loadEntry 内部 resetModules 重建模块图，之后动态 import 命中
        // entry 所用的同一 state 实例
        const { state } = await import("../../src/state.ts");
        // boot 尚未运行（等 load 事件），标记必须已同步生效
        expect(window.pg).toBe(state);
    });
});

describe("entry 启动时序", () => {
    it("readyState 已 complete 时 ready 回调内直接 boot", async () => {
        setReadyState("complete");
        await loadEntry();
        await vi.waitFor(() => {
            expect(bootMock).toHaveBeenCalledOnce();
        });
    });

    it("readyState 未 complete 时等 load 事件才 boot", async () => {
        setReadyState("loading");
        await loadEntry();
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(bootMock).not.toHaveBeenCalled();
        window.dispatchEvent(new Event("load"));
        await vi.waitFor(() => {
            expect(bootMock).toHaveBeenCalledOnce();
        });
    });
});
