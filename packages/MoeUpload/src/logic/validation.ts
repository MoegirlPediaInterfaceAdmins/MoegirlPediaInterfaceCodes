import type { FieldSchema } from "@/types";

interface MetaViolation {
    /** field = 单字段必填；group = 组内至少一项 */
    kind: "field" | "group";
    labels: string[];
}

// 多值分隔符：中文顿号/逗号、英文逗号/分号
const MULTI_VALUE_SEPARATOR = /[，、;；,]/;

// tags 按分隔符拆分并剔除空白项；其余字段单值返回
const parseFieldEntries = (field: FieldSchema, raw: string | undefined): string[] => {
    const text = raw ?? "";
    if (field.type !== "tags") {
        return text.trim() ? [text.trim()] : [];
    }
    return text
        .split(MULTI_VALUE_SEPARATOR)
        .map((value) => value.trim())
        .filter(Boolean);
};

// 先查单字段 required，再查 requiredGroup（组内至少一项非空）
const findMetaViolation = (
    meta: Record<string, string>,
    fields: FieldSchema[],
): MetaViolation | null => {
    for (const field of fields) {
        if (field.required && parseFieldEntries(field, meta[field.id]).length === 0) {
            return { kind: "field", labels: [field.label] };
        }
    }
    const groups = new Map<string, string[]>();
    for (const field of fields) {
        if (!field.requiredGroup) {
            continue;
        }
        const labels = groups.get(field.requiredGroup) ?? [];
        labels.push(field.label);
        groups.set(field.requiredGroup, labels);
    }
    for (const [group, labels] of groups) {
        const satisfied = fields.some(
            (field) =>
                field.requiredGroup === group
                && parseFieldEntries(field, meta[field.id]).length > 0,
        );
        if (!satisfied) {
            return { kind: "group", labels };
        }
    }
    return null;
};

export { findMetaViolation, parseFieldEntries };
export type { MetaViolation };
