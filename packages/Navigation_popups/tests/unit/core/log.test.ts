// log 模块：log/errlog 的 window.popupDebug 门控（legacy globals.ts 语义照搬）。
import { afterEach, describe, expect, it, vi } from "vitest";
import { errlog, log } from "../../../src/core/log.ts";

afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, "popupDebug");
});

describe("log/errlog 调试门", () => {
    it("popupDebug 开时 log 经 console.log 原样转发多参", () => {
        window.popupDebug = true;
        const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
        log("a", 1, { b: 2 });
        expect(spy).toHaveBeenCalledExactlyOnceWith("a", 1, { b: 2 });
    });

    it("popupDebug 开时 errlog 经 console.error 原样转发多参", () => {
        window.popupDebug = true;
        const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const err = new Error("x");
        errlog("boom", err);
        expect(spy).toHaveBeenCalledExactlyOnceWith("boom", err);
    });

    it("popupDebug 关（默认）时静默", () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        log("a");
        errlog("b");
        expect(logSpy).not.toHaveBeenCalled();
        expect(errSpy).not.toHaveBeenCalled();
    });
});
