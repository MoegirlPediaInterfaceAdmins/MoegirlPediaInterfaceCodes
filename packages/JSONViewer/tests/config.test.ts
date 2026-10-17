import { beforeEach, describe, expect, it, vi } from "vitest";

/** 每个用例前清掉 window 上的配置项并重置模块，使响应式访问器与快照各自独立 */
beforeEach(() => {
    vi.resetModules();
    Reflect.deleteProperty(window, "jsonViewerTheme");
    Reflect.deleteProperty(window, "jsonViewerDark");
});

describe("config store", () => {
    it("未设置时返回默认主题，dark 为 undefined", async () => {
        const { getConfig, initConfigStore } = await import("../src/config");
        initConfigStore();
        expect(getConfig().theme).toBe("vscode");
        expect(getConfig().dark).toBeUndefined();
    });

    it("安装访问器之前已有的赋值会被捕获为初值", async () => {
        const { getConfig, initConfigStore } = await import("../src/config");
        window.jsonViewerTheme = "atom";
        window.jsonViewerDark = true;
        initConfigStore();
        expect(getConfig().theme).toBe("atom");
        expect(getConfig().dark).toBe(true);
    });

    it("安装之后的赋值会更新快照并通知订阅者", async () => {
        const { getConfig, initConfigStore, subscribeConfig } = await import("../src/config");
        initConfigStore();
        const listener = vi.fn();
        const unsubscribe = subscribeConfig(listener);

        window.jsonViewerTheme = "github";
        expect(listener).toHaveBeenCalledTimes(1);
        expect(getConfig().theme).toBe("github");

        window.jsonViewerDark = true;
        expect(listener).toHaveBeenCalledTimes(2);
        expect(getConfig().dark).toBe(true);

        unsubscribe();
        window.jsonViewerTheme = "a11y";
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it("赋相同的值不触发通知", async () => {
        const { initConfigStore, subscribeConfig } = await import("../src/config");
        initConfigStore();
        window.jsonViewerTheme = "github";

        const listener = vi.fn();
        subscribeConfig(listener);
        window.jsonViewerTheme = "github";
        expect(listener).not.toHaveBeenCalled();
    });
});
