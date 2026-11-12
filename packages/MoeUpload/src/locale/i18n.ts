import zhHansMessages from "../../i18n/zh-hans.json";
import zhHantMessages from "../../i18n/zh-hant.json";
import zhHkMessages from "../../i18n/zh-hk.json";
import zhTwMessages from "../../i18n/zh-tw.json";
import type { MessageKey } from "./types";

// 语种选择与取词；文案数据在仓库根目录的 i18n/*.json
type Locale = "zh-hans" | "zh-hant" | "zh-tw" | "zh-hk";

// 繁体叠加层：数组顺序即优先级（后者覆盖前者），基准简体始终在最底层
const TRADITIONAL_LAYERS: Record<
    Exclude<Locale, "zh-hans">,
    readonly Partial<Record<MessageKey, string>>[]
> = {
    "zh-hant": [zhHantMessages],
    "zh-tw": [zhHantMessages, zhTwMessages],
    "zh-hk": [zhHantMessages, zhHkMessages],
};

// 港澳（zh-mo）沿用香港用词，其余非繁体代码回退简体
const localeOf = (code: string): Locale => {
    const normalized = code.trim().toLowerCase().replaceAll("_", "-");
    if (normalized === "zh-hant" || normalized === "zh-tw" || normalized === "zh-hk") {
        return normalized;
    }
    if (normalized === "zh-mo") {
        return "zh-hk";
    }
    return "zh-hans";
};

// 基准简体打底，繁体叠加层逐层覆盖
const messagesFor = (locale: Locale): Record<MessageKey, string> => {
    const table: Record<string, string> = { ...zhHansMessages };
    if (locale !== "zh-hans") {
        for (const layer of TRADITIONAL_LAYERS[locale]) {
            Object.assign(table, layer);
        }
    }
    return table;
};

// wgUserLanguage 在页面生命周期内不变，模块加载时算一次
const activeMessages = messagesFor(localeOf(mw.config.get("wgUserLanguage", "zh-hans")));

// 取文案并替换 {name} 占位符
const t = (key: MessageKey, params?: Record<string, string | number>): string => {
    let text: string = activeMessages[key];
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.replaceAll(`{${name}}`, String(value));
        }
    }
    return text;
};

export { t };
