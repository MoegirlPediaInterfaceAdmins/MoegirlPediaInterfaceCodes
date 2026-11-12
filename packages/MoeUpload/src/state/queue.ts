import { DEFAULT_LICENSE_ID } from "@/config/defaults";
import { t } from "@/locale";
import { dedupeFilename, sanitizeFilename, stripFilePrefix } from "@/logic/filename";
import type { MoeUploadConfig, QueueItem } from "@/types";

interface QueueState {
    items: QueueItem[];
}

type QueueAction
    = | { type: "add"; items: QueueItem[] }
        | { type: "patch"; id: string; patch: Partial<QueueItem> }
        | { type: "remove"; id: string }
        | { type: "rename"; id: string; name: string }
        | { type: "setMeta"; id: string; fieldId: string; value: string }
        | { type: "applyToAll"; sourceId: string }
        | { type: "clearDone" }
        | { type: "clearAll" };

interface MakeItemOptions {
    id: string;
    kind: "file" | "url";
    file?: File;
    url?: string;
    /** 原始名称（含扩展名，不含 File: 前缀） */
    rawName: string;
    config: MoeUploadConfig;
    /** 已被占用的名字（用于批内去重） */
    takenNames: Set<string>;
    /** reupload 目标条目：文件名锁定、不带 text；调用方传空 takenNames 跳过批内去重 */
    reupload?: boolean;
}

const queueReducer = (state: QueueState, action: QueueAction): QueueState => {
    switch (action.type) {
        case "add":
            return { items: [...state.items, ...action.items] };

        case "patch":
            return {
                items: state.items.map((item) =>
                    item.id === action.id ? { ...item, ...action.patch } : item,
                ),
            };

        case "remove":
            return { items: state.items.filter((item) => item.id !== action.id) };

        case "rename":
            return {
                items: state.items.map((item) =>
                    item.id === action.id && !item.reupload
                        ? { ...item, name: sanitizeFilename(action.name) }
                        : item,
                ),
            };

        case "setMeta":
            return {
                items: state.items.map((item) =>
                    item.id === action.id
                        ? { ...item, meta: { ...item.meta, [action.fieldId]: action.value } }
                        : item,
                ),
            };

        case "applyToAll": {
            const source = state.items.find((item) => item.id === action.sourceId);
            if (!source) {
                return state;
            }
            return {
                items: state.items.map((item) =>
                    item.id !== action.sourceId && isActiveStatus(item.status)
                        ? {
                            ...item,
                            meta: { ...source.meta },
                            licenseId: source.licenseId,
                            categories: [...source.categories],
                        }
                        : item,
                ),
            };
        }

        case "clearDone":
            return { items: state.items.filter((item) => !isFinalStatus(item.status)) };

        case "clearAll":
            return { items: [] };

        default:
            return state;
    }
};

const isActiveStatus = (status: QueueItem["status"]): boolean => !isFinalStatus(status);

const isFinalStatus = (status: QueueItem["status"]): boolean =>
    status === "done" || status === "queued";

const makeItem = (options: MakeItemOptions): QueueItem => {
    const name = dedupeFilename(sanitizeFilename(options.rawName) || t("item.unnamed"), (candidate) =>
        options.takenNames.has(candidate),
    );
    options.takenNames.add(name);

    const meta: Record<string, string> = {};
    for (const field of options.config.fields) {
        meta[field.id] = field.defaultValue ?? "";
    }

    return {
        id: options.id,
        kind: options.kind,
        file: options.file,
        url: options.url,
        name,
        size: options.file?.size ?? 0,
        thumbUrl: createThumbUrl(options.file),
        status: "pending",
        reupload: options.reupload,
        ignoreWarnings: false,
        meta,
        licenseId: defaultLicenseId(options.config),
        categories: [],
    };
};

// 缩略图 objectURL 归条目所有，调用方在移除条目/卸载时 revoke
const createThumbUrl = (file?: File): string | undefined => {
    if (!file?.type.startsWith("image/")) {
        return undefined;
    }
    if (typeof URL?.createObjectURL !== "function") {
        return undefined;
    }
    try {
        return URL.createObjectURL(file);
    } catch {
        return undefined;
    }
};

const defaultLicenseId = (config: MoeUploadConfig): string =>
    config.licenses.find((l) => l.id === DEFAULT_LICENSE_ID)?.id ?? config.licenses[0]?.id ?? "";

const rawNameFromFile = (file: File): string => stripFilePrefix(file.name);

const rawNameFromUrl = (url: string): string => {
    try {
        const parsed = new URL(url);
        const last = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
        return decodeURIComponent(last);
    } catch {
        return "";
    }
};

const takenNames = (items: QueueItem[]): Set<string> => new Set(items.map((item) => item.name));

export type { QueueState, QueueAction, MakeItemOptions };
export { queueReducer, isFinalStatus, makeItem, rawNameFromFile, rawNameFromUrl, takenNames };
