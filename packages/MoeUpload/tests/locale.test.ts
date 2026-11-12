import { afterEach, describe, expect, it, vi } from "vitest";
import type { MessageKey } from "@/locale";
import zhHansMessages from "../i18n/zh-hans.json";
import zhHantMessages from "../i18n/zh-hant.json";
import zhHkMessages from "../i18n/zh-hk.json";
import zhTwMessages from "../i18n/zh-tw.json";

// 硬约束：繁体叠加层只列与上一级译文确实不同的条目，靠逐层回退取原文

const HANS: Record<string, string> = zhHansMessages;
const HANT: Record<string, string> = zhHantMessages;

const VARIANTS: Record<string, { table: Record<string, string>; parent: Record<string, string> }>
    = {
        "zh-hant": { table: HANT, parent: HANS },
        "zh-tw": { table: zhTwMessages, parent: HANT },
        "zh-hk": { table: zhHkMessages, parent: HANT },
    };

const placeholders = (text: string): string[] => (text.match(/\{[a-zA-Z]+\}/g) ?? []).sort();

const loadWithLanguage = async (lang: string) => {
    vi.resetModules();
    vi.stubGlobal("mw", {
        config: { get: (key: string) => key === "wgUserLanguage" ? lang : undefined },
    });
    return import("@/locale");
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
});

describe("语种文件 · 只列与上一级不同的条目", () => {
    for (const [locale, { table, parent }] of Object.entries(VARIANTS)) {
        it(`${locale} 的键都存在于基准表（JSON 无编译期键校验）`, () => {
            // JSON 没有编译期键校验，多写的键会变成取不到的死条目，在这里拦下拼错的键名
            const unknown = Object.keys(table).filter((key) => !Reflect.has(HANS, key));
            expect(unknown).toEqual([]);
        });

        it(`${locale} 的每个条目都不是上一级译文的复制`, () => {
            const same = Object.entries(table)
                .filter(([key, value]) => value === parent[key])
                .map(([key]) => key);
            expect(same).toEqual([]);
        });

        it(`${locale} 没有与简体相同的条目`, () => {
            const same = Object.entries(table)
                .filter(([key, value]) => value === HANS[key])
                .map(([key]) => key);
            expect(same).toEqual([]);
        });

        it(`${locale} 的占位符与简体逐键一致`, () => {
            const mismatched = Object.entries(table)
                .filter(
                    ([key, value]) =>
                        placeholders(value).join("|") !== placeholders(HANS[key] ?? "").join("|"),
                )
                .map(([key]) => key);
            expect(mismatched).toEqual([]);
        });
    }
});

describe("语种选择 · 按 wgUserLanguage 逐层回退", () => {
    it("zh-hant 取通用繁体", async () => {
        const { t } = await loadWithLanguage("zh-hant");
        expect(t("dialog.close")).toBe("關閉");
        expect(t("error.network")).toBe("網絡請求失敗");
        expect(t("toolbar.clearAll")).toBe("清空隊列");
    });

    it("zh-tw 先套通用繁体、再套台湾用词", async () => {
        const { t } = await loadWithLanguage("zh-tw");
        expect(t("dialog.close")).toBe("關閉");
        expect(t("error.network")).toBe("網路請求失敗");
        expect(t("toolbar.clearAll")).toBe("清空佇列");
        expect(t("item.view")).toBe("檢視檔案頁面");
    });

    it("zh-hk 用香港的「上載」", async () => {
        const { t } = await loadWithLanguage("zh-hk");
        expect(t("item.upload")).toBe("上載");
        expect(t("status.uploading")).toBe("上載中…");
        expect(t("toolbar.clearAll")).toBe("清空隊列");
    });

    it("zh-mo 落到香港用词", async () => {
        const { t } = await loadWithLanguage("zh_mo");
        expect(t("item.upload")).toBe("上載");
    });

    it("zh-cn / zh-sg / 非中文界面回退简体", async () => {
        for (const lang of ["zh-hans", "zh-cn", "zh-sg", "en", ""]) {
            const { t } = await loadWithLanguage(lang);
            expect(t("item.upload")).toBe("上传");
            expect(t("error.network")).toBe("网络请求失败");
        }
    });

    it("字形相同的条目在任何语种下都保持原文", async () => {
        for (const lang of ["zh-hant", "zh-tw", "zh-hk"]) {
            const { t } = await loadWithLanguage(lang);
            expect(t("item.cancel")).toBe("取消");
            expect(t("item.remove")).toBe("移除");
            expect(t("status.done")).toBe("已完成");
        }
    });
});

describe("语种生效表 · 与简体逐条比对", () => {
    // 字形相同的条目按规则省略，这份名单即「刻意未添加」的完整清单，多一个少一个都说明译文被误加或误删
    const IDENTICAL: MessageKey[] = [
        "dialog.trigger",
        "error.http",
        "toolbar.clearDone",
        "item.collapse",
        "item.cancel",
        "item.submit",
        "item.remove",
        "status.submitting",
        "status.done",
    ];

    for (const lang of ["zh-hant", "zh-tw", "zh-hk"]) {
        it(`${lang} 的每个键都齐全，且只有字形相同的条目与简体一致`, async () => {
            const { t } = await loadWithLanguage(lang);
            const keys = Object.keys(HANS) as MessageKey[];
            const missing = keys.filter((key) => !t(key));
            const sameAsHans = keys.filter((key) => t(key) === HANS[key]).sort();
            expect({ missing, sameAsHans }).toEqual({
                missing: [],
                sameAsHans: [...IDENTICAL].sort(),
            });
        });
    }
});
