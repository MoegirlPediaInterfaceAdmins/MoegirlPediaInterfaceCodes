import { afterEach, describe, expect, it, vi } from "vitest";
import { isDarkTheme } from "../src/theme";

/** 以指定 skin 桩掉 mw 全局（theme 惰性读取，桩只影响本次调用） */
const stubSkin = (skin: string): void => {
    vi.stubGlobal("mw", { config: { get: () => skin } });
};

/** 桩掉操作系统的深浅色偏好查询（jsdom 不实现 window.matchMedia） */
const stubPrefersDark = (matches: boolean): void => {
    vi.stubGlobal("matchMedia", () => ({ matches }));
};

afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("color-mode");
    document.documentElement.classList.remove("skin-theme-clientpref-night", "skin-theme-clientpref-os", "skin-theme-clientpref-day");
});

describe("isDarkTheme", () => {
    it("moeskin 依据 color-mode 属性判断", () => {
        stubSkin("moeskin");
        document.documentElement.setAttribute("color-mode", "dark");
        expect(isDarkTheme()).toBe(true);
        document.documentElement.setAttribute("color-mode", "light");
        expect(isDarkTheme()).toBe(false);
    });

    it("非 moeskin 依据 skin-theme-clientpref-night 类判断", () => {
        stubSkin("vector-2022");
        document.documentElement.classList.add("skin-theme-clientpref-night");
        expect(isDarkTheme()).toBe(true);
        document.documentElement.classList.remove("skin-theme-clientpref-night");
        expect(isDarkTheme()).toBe(false);
    });

    it("跟随系统一档按操作系统的深浅色偏好判断", () => {
        stubSkin("vector-2022");
        document.documentElement.classList.add("skin-theme-clientpref-os");
        stubPrefersDark(true);
        expect(isDarkTheme()).toBe(true);
        stubPrefersDark(false);
        expect(isDarkTheme()).toBe(false);
    });

    it("固定浅色一档不受操作系统深色的影响", () => {
        stubSkin("vector-2022");
        document.documentElement.classList.add("skin-theme-clientpref-day");
        stubPrefersDark(true);
        expect(isDarkTheme()).toBe(false);
    });
});
