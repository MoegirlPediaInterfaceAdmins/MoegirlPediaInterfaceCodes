import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    DEFAULT_PANEL_HEIGHT,
    HEIGHT_STORAGE_KEY,
    PREFS_STORAGE_KEY,
} from "../src/constants.ts";
import {
    DEFAULT_PREFS,
    loadPanelHeight,
    loadPrefs,
    sanitizePrefs,
    savePanelHeight,
    savePrefs,
} from "../src/prefs.ts";
import type { CatALotPrefs } from "../src/types.ts";
import { installMw } from "./helpers/mw.ts";

beforeEach(() => {
    installMw();
});

afterEach(() => {
    Reflect.deleteProperty(window, "CatALotPrefs");
});

describe("DEFAULT_PREFS", () => {
    it("默认值与迁移前一致", () => {
        expect(DEFAULT_PREFS).toEqual({
            watchlist: "preferences",
            minor: false,
            editpages: true,
            subcatcount: 50,
            position: "bottom-right",
        });
    });
});

describe("sanitizePrefs", () => {
    it("完整合法输入原样保留，未知字段丢弃", () => {
        const prefs = sanitizePrefs({
            watchlist: "watch",
            minor: true,
            editpages: false,
            subcatcount: 120,
            position: "bottom-left",
            unknown: "drop-me",
        });
        expect(prefs).toEqual({
            watchlist: "watch",
            minor: true,
            editpages: false,
            subcatcount: 120,
            position: "bottom-left",
        });
        expect(Object.hasOwn(prefs, "unknown")).toBe(false);
    });

    it("非对象或损坏输入回退默认值", () => {
        expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
        expect(sanitizePrefs(undefined)).toEqual(DEFAULT_PREFS);
        expect(sanitizePrefs("not-json")).toEqual(DEFAULT_PREFS);
        expect(sanitizePrefs(42)).toEqual(DEFAULT_PREFS);
        expect(sanitizePrefs([])).toEqual(DEFAULT_PREFS);
    });

    it("watchlist 只允许四个合法值", () => {
        for (const option of ["preferences", "nochange", "watch", "unwatch"] as const) {
            expect(sanitizePrefs({ watchlist: option }).watchlist).toBe(option);
        }
        expect(sanitizePrefs({ watchlist: "always" }).watchlist).toBe("preferences");
        expect(sanitizePrefs({ watchlist: null }).watchlist).toBe("preferences");
    });

    it("minor / editpages 只接受严格 boolean", () => {
        expect(sanitizePrefs({ minor: "true", editpages: 0 })).toEqual({
            ...DEFAULT_PREFS,
            minor: false,
            editpages: true,
        });
        expect(sanitizePrefs({ minor: true, editpages: false })).toEqual({
            ...DEFAULT_PREFS,
            minor: true,
            editpages: false,
        });
    });

    it("subcatcount 只接受 1..500 的整数，数字字符串按数字处理", () => {
        expect(sanitizePrefs({ subcatcount: 1 }).subcatcount).toBe(1);
        expect(sanitizePrefs({ subcatcount: 500 }).subcatcount).toBe(500);
        expect(sanitizePrefs({ subcatcount: "120" }).subcatcount).toBe(120);
        expect(sanitizePrefs({ subcatcount: 0 }).subcatcount).toBe(50);
        expect(sanitizePrefs({ subcatcount: 501 }).subcatcount).toBe(50);
        expect(sanitizePrefs({ subcatcount: 10.5 }).subcatcount).toBe(50);
        expect(sanitizePrefs({ subcatcount: "abc" }).subcatcount).toBe(50);
        expect(sanitizePrefs({ subcatcount: " " }).subcatcount).toBe(50);
    });

    it("position 只接受两个合法值，其余回退右下角", () => {
        expect(sanitizePrefs({ position: "bottom-right" }).position).toBe("bottom-right");
        expect(sanitizePrefs({ position: "bottom-left" }).position).toBe("bottom-left");
        expect(sanitizePrefs({ position: "left" }).position).toBe("bottom-right");
        expect(sanitizePrefs({ position: "top-left" }).position).toBe("bottom-right");
        expect(sanitizePrefs({ position: "bottom-left " }).position).toBe("bottom-right");
        expect(sanitizePrefs({ position: "" }).position).toBe("bottom-right");
        expect(sanitizePrefs({ position: null }).position).toBe("bottom-right");
        expect(sanitizePrefs({ position: 42 }).position).toBe("bottom-right");
    });
});

describe("loadPrefs", () => {
    it("无存储时返回默认值", () => {
        expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    });

    it("读取 localStorage 并校验", () => {
        installMw({
            storage: {
                [PREFS_STORAGE_KEY]: JSON.stringify({
                    watchlist: "unwatch",
                    minor: true,
                    editpages: false,
                    subcatcount: 200,
                    position: "bottom-left",
                }),
            },
        });
        expect(loadPrefs()).toEqual({
            watchlist: "unwatch",
            minor: true,
            editpages: false,
            subcatcount: 200,
            position: "bottom-left",
        });
    });

    it("损坏 JSON 或非对象 JSON 回退默认值", () => {
        installMw({ storage: { [PREFS_STORAGE_KEY]: "{broken" } });
        expect(loadPrefs()).toEqual(DEFAULT_PREFS);
        installMw({ storage: { [PREFS_STORAGE_KEY]: "42" } });
        expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    });

    it("window.CatALotPrefs 覆盖 localStorage 并同样经过校验", () => {
        installMw({
            storage: {
                [PREFS_STORAGE_KEY]: JSON.stringify({ ...DEFAULT_PREFS, subcatcount: 120, position: "bottom-left" }),
            },
        });
        window.CatALotPrefs = {
            watchlist: "nochange",
            minor: true,
            editpages: false,
            subcatcount: 999,
            position: "left",
        };
        expect(loadPrefs()).toEqual({
            watchlist: "nochange",
            minor: true,
            editpages: false,
            // 999 越界，回退默认值而不是沿用存储中的 120
            subcatcount: 50,
            // "left" 非法，同样回退默认值而不是沿用存储中的 bottom-left
            position: "bottom-right",
        });
    });

    it("window.CatALotPrefs 非对象时忽略", () => {
        (window as unknown as { CatALotPrefs: unknown }).CatALotPrefs = "bad";
        expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    });
});

describe("savePrefs", () => {
    it("写入前再做一次校验并序列化", () => {
        const { storage } = installMw();
        const prefs: CatALotPrefs = {
            watchlist: "watch",
            minor: true,
            editpages: false,
            subcatcount: 88,
            position: "bottom-left",
        };
        savePrefs(prefs);
        const saved = storage.get(PREFS_STORAGE_KEY);
        expect(saved).toBe(JSON.stringify(prefs));
    });

    it("storage 抛错时静默失败", () => {
        const { mw } = installMw();
        mw.storage.set.mockImplementation(() => {
            throw new Error("storage disabled");
        });
        expect(() => {
            savePrefs(DEFAULT_PREFS);
        }).not.toThrow();
    });
});

describe("面板高度", () => {
    it("无存储或非数字时返回默认高度", () => {
        expect(loadPanelHeight()).toBe(DEFAULT_PANEL_HEIGHT);
        installMw({ storage: { [HEIGHT_STORAGE_KEY]: "not-a-number" } });
        expect(loadPanelHeight()).toBe(DEFAULT_PANEL_HEIGHT);
        installMw({ storage: { [HEIGHT_STORAGE_KEY]: "" } });
        expect(loadPanelHeight()).toBe(DEFAULT_PANEL_HEIGHT);
    });

    it("高度收敛到 260..760", () => {
        installMw({ storage: { [HEIGHT_STORAGE_KEY]: "300" } });
        expect(loadPanelHeight()).toBe(300);
        installMw({ storage: { [HEIGHT_STORAGE_KEY]: "100" } });
        expect(loadPanelHeight()).toBe(260);
        installMw({ storage: { [HEIGHT_STORAGE_KEY]: "900" } });
        expect(loadPanelHeight()).toBe(760);
    });

    it("保存时同样收敛并写成字符串", () => {
        const { storage } = installMw();
        savePanelHeight(300);
        expect(storage.get(HEIGHT_STORAGE_KEY)).toBe("300");
        savePanelHeight(100);
        expect(storage.get(HEIGHT_STORAGE_KEY)).toBe("260");
        savePanelHeight(1000);
        expect(storage.get(HEIGHT_STORAGE_KEY)).toBe("760");
        savePanelHeight(Number.NaN);
        expect(storage.get(HEIGHT_STORAGE_KEY)).toBe(String(DEFAULT_PANEL_HEIGHT));
    });
});
