import type { ApiUploadWarnings } from "types-mediawiki-response";
import { t } from "./i18n";
import type { MessageKey } from "./types";

// 警告键是服务端 warnings 的原始键（exists-* 为拍平后的子类型）
const WARNING_LABELS: Record<string, MessageKey> = {
    exists: "warning.exists",
    "exists-normalized": "warning.exists-normalized",
    "page-exists": "warning.page-exists",
    thumb: "warning.thumb",
    "thumb-name": "warning.thumb-name",
    "bad-prefix": "warning.bad-prefix",
    badfilename: "warning.badfilename",
    duplicate: "warning.duplicate",
    "duplicate-archive": "warning.duplicate-archive",
    "was-deleted": "warning.was-deleted",
    "empty-file": "warning.empty-file",
    "large-file": "warning.large-file",
    "filetype-unwanted-type": "warning.filetype-unwanted-type",
    nochange: "warning.nochange",
    duplicateversions: "warning.duplicateversions",
};

// 字符串、字符串数组与含 fileName|name|timestamp|value 的对象递归取明细；数字（计数）与 null 跳过
const warningDetails = (value: unknown): string[] => {
    if (typeof value === "string") {
        return value ? [value] : [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((item) => warningDetails(item));
    }
    // typeof null === 'object'，需显式排除
    if (value !== null && typeof value === "object") {
        const record = value as Record<string, unknown>;
        for (const key of ["fileName", "name", "timestamp", "value"]) {
            const details = warningDetails(record[key]);
            if (details.length > 0) {
                return details;
            }
        }
    }
    return [];
};

// 按键映射文案、值仅作明细；未知键归入「存在其他冲突」，恒返回非空列表
const describeWarnings = (warnings: ApiUploadWarnings): string[] => {
    const entries = Object.entries(warnings).map(([key, value]) => {
        const label = t(WARNING_LABELS[key] ?? "warning.other");
        const details = warningDetails(value);
        return details.length > 0 ? `${label}：${details.join("、")}` : label;
    });
    return entries.length > 0 ? entries : [t("warning.other")];
};

export { describeWarnings };
