import type { MoeUploadConfig, QueueItem } from "@/types";
import { parseFieldEntries } from "./validation";

// 空值字段所在整行剔除，再压缩多余空行
const renderTemplate = (template: string, values: Record<string, string>): string => {
    const rendered = template.replace(
        /\{\{\{([\w-]+)\}\}\}/g,
        (whole, key: string) => values[key]?.trim() || whole,
    );
    const lines = rendered
        .split("\n")
        .filter((line) => !/\{\{\{[\w-]+\}\}\}/.test(line))
        .map((line) => line.trimEnd());
    return lines
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};

const licenseTemplate = (licenseId: string, config: MoeUploadConfig): string =>
    config.licenses.find((license) => license.id === licenseId)?.template ?? "";

const sanitizeCategoryValue = (value: string): string =>
    value
        .replace(/[#<>[\]{}|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

// 分类行 = categoryPrefix 键存在字段逐值派生 + 用户所选分类，单行拼接，全空不追加
const buildDescription = (item: QueueItem, config: MoeUploadConfig): string => {
    const values: Record<string, string> = { ...item.meta };
    const license = licenseTemplate(item.licenseId, config);
    if (license) {
        values.license = license;
    }

    const body = renderTemplate(config.wikitextTemplate, values);
    const categories: string[] = [];
    for (const field of config.fields) {
        if (!Reflect.has(field, "categoryPrefix")) {
            continue;
        }
        const prefix = field.categoryPrefix ? `${field.categoryPrefix}:` : "";
        for (const entry of parseFieldEntries(field, item.meta[field.id])) {
            const value = sanitizeCategoryValue(entry);
            if (value) {
                categories.push(`[[Category:${prefix}${value}]]`);
            }
        }
    }
    for (const category of item.categories) {
        const value = category.trim();
        if (value) {
            categories.push(`[[Category:${value}]]`);
        }
    }
    if (categories.length === 0) {
        return body;
    }
    return `${body}\n${categories.join("")}`;
};

export { renderTemplate, licenseTemplate, buildDescription };
