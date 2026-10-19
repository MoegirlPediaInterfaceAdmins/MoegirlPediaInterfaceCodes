import { describe, expect, it, vi } from "vitest";
import prefixedConsole, { dump, originalConsole, prefixable, split } from "../../modules/console.js";
import { endGroup, startGroup } from "@actions/core";

// mock 掉 @actions/core：dump 的分组命令在非 Actions 环境会向 stdout 打印命令文本，且需断言其调用与顺序
vi.mock("@actions/core", () => ({
    startGroup: vi.fn(),
    endGroup: vi.fn(),
}));

// vitest 配置已固定 TZ=UTC，故偏移段恒为 +00:00
const TIMESTAMP = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00\]$/;

describe("prefixedConsole", () => {
    it("五个 prefixable 方法调用时首参为 ISO 时间戳前缀", () => {
        const methods = ["log", "warn", "debug", "info", "error"];
        const spies = methods.map((method) => vi.spyOn(originalConsole, method).mockImplementation(() => {}));
        try {
            for (const method of methods) {
                prefixedConsole[method]("message");
            }
            for (const spy of spies) {
                expect(spy).toHaveBeenCalledTimes(1);
                expect(spy.mock.calls[0][0]).toMatch(TIMESTAMP);
                expect(spy.mock.calls[0][1]).toBe("message");
            }
        } finally {
            for (const spy of spies) {
                spy.mockRestore();
            }
        }
    });

    it("时间戳之后的参数原样透传", () => {
        const spy = vi.spyOn(originalConsole, "log").mockImplementation(() => {});
        try {
            prefixedConsole.log("a", "b", 3);
            expect(spy.mock.calls[0].slice(1)).toEqual(["a", "b", 3]);
        } finally {
            spy.mockRestore();
        }
    });

    it("非 prefixable 方法不添加前缀", () => {
        const spy = vi.spyOn(originalConsole, "table").mockImplementation(() => {});
        try {
            prefixedConsole.table({ a: 1 });
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy.mock.calls[0]).toEqual([{ a: 1 }]);
        } finally {
            spy.mockRestore();
        }
    });

    it("prefixable 恰为五个方法名", () => {
        expect(prefixable).toEqual(["log", "warn", "debug", "info", "error"]);
    });

    it("split 默认输出 137 个等号且不加前缀", () => {
        const spy = vi.spyOn(originalConsole, "info").mockImplementation(() => {});
        try {
            split();
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy.mock.calls[0]).toEqual(["=".repeat(137)]);
        } finally {
            spy.mockRestore();
        }
    });

    it("split 可指定等号数量", () => {
        const spy = vi.spyOn(originalConsole, "info").mockImplementation(() => {});
        try {
            split(5);
            expect(spy.mock.calls[0]).toEqual(["====="]);
        } finally {
            spy.mockRestore();
        }
    });

    it("dump 按 startGroup、带前缀 info、endGroup 的顺序输出", () => {
        const info = vi.spyOn(originalConsole, "info").mockImplementation(() => {});
        try {
            dump("title:", { a: 1 });
            expect(startGroup).toHaveBeenCalledTimes(1);
            expect(startGroup).toHaveBeenCalledWith("title:");
            expect(info).toHaveBeenCalledTimes(1);
            expect(info.mock.calls[0][0]).toMatch(TIMESTAMP);
            expect(info.mock.calls[0][1]).toEqual({ a: 1 });
            expect(endGroup).toHaveBeenCalledTimes(1);
            expect(startGroup.mock.invocationCallOrder[0]).toBeLessThan(info.mock.invocationCallOrder[0]);
            expect(info.mock.invocationCallOrder[0]).toBeLessThan(endGroup.mock.invocationCallOrder[0]);
        } finally {
            info.mockRestore();
            startGroup.mockClear();
            endGroup.mockClear();
        }
    });
});
