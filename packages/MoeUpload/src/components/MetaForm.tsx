import { Dropdown, FieldLayout, MultilineTextInput, TagMultiselect, TextInput } from "ooui-react";
import type { SelectOptionProps } from "ooui-react";
import React, { useMemo } from "react";
import { t } from "@/locale";
import { parseFieldEntries } from "@/logic/validation";
import type { FieldSchema, MoeUploadConfig, QueueItem } from "@/types";
import { CategorySelect } from "./widgets/CategorySelect";
import { TitleInput } from "./widgets/TitleInput";

interface MetaFormProps {
    item: QueueItem;
    config: MoeUploadConfig;
    onMeta: (fieldId: string, value: string) => void;
    onLicense: (licenseId: string) => void;
    onCategories: (categories: string[]) => void;
}

// schema 驱动：字段由 config.fields 渲染，许可与分类固定追加
const MetaForm = ({ item, config, onMeta, onLicense, onCategories }: MetaFormProps) => {
    // 许可按 group 聚合为下拉分组（对应站点 MediaWiki:Licenses 的一级条目）
    const licenseOptions = useMemo<SelectOptionProps[]>(() => {
        const options: SelectOptionProps[] = [];
        let lastGroup: string | undefined;
        for (const license of config.licenses) {
            if (license.group && license.group !== lastGroup) {
                options.push({ children: license.group });
                lastGroup = license.group;
            } else if (!license.group) {
                lastGroup = undefined;
            }
            options.push({ value: license.id, children: license.label });
        }
        return options;
    }, [config.licenses]);

    return (
        <div className="moeupload-metaform">
            {config.fields.map((field) =>
                <FieldLayout
                    key={field.id}
                    label={field.required || field.requiredGroup ? `${field.label} *` : field.label}
                    align="top"
                    className="moeupload-metaform__field"
                >
                    <FieldControl field={field} value={item.meta[field.id] ?? ""} onMeta={onMeta} />
                </FieldLayout>,
            )}
            <FieldLayout
                label={t("license.label")}
                align="top"
                className="moeupload-metaform__field"
            >
                <Dropdown
                    value={item.licenseId}
                    onChange={(value) => { onLicense(String(value)); }}
                    options={licenseOptions}
                />
            </FieldLayout>
            <FieldLayout
                label={t("categories.label")}
                align="top"
                className="moeupload-metaform__field"
            >
                <CategorySelect value={item.categories} onChange={onCategories} />
            </FieldLayout>
        </div>
    );
};

const FieldControl = ({
    field,
    value,
    onMeta,
}: {
    field: FieldSchema;
    value: string;
    onMeta: (fieldId: string, value: string) => void;
}) => {
    if (field.type === "textarea") {
        return (
            <MultilineTextInput
                value={value}
                onChange={(next) => { onMeta(field.id, next); }}
                placeholder={field.placeholder}
                rows={3}
                autosize
                required={field.required}
            />
        );
    }
    if (field.type === "select") {
        return (
            <Dropdown
                value={value}
                onChange={(next) => { onMeta(field.id, String(next)); }}
                options={(field.options ?? []).map((option) => ({
                    value: option.value,
                    children: option.label,
                }))}
            />
        );
    }
    if (field.type === "tags") {
        const entries = parseFieldEntries(field, value);
        const change = (next: string[]) => { onMeta(field.id, next.join("、")); };
        return field.suggest
            ? <CategorySelect value={entries} onChange={change} placeholder={field.placeholder} />
            : <TagMultiselect
                value={entries}
                onChange={(next) => { change(next.map(String)); }}
                allowArbitrary
                placeholder={field.placeholder}
            />
        ;
    }
    if (field.type === "category") {
        return (
            <TitleInput
                value={value}
                onChange={(next) => { onMeta(field.id, next); }}
                placeholder={field.placeholder}
                namespace={14}
            />
        );
    }
    return (
        <TextInput
            value={value}
            onChange={(next) => { onMeta(field.id, next); }}
            placeholder={field.placeholder}
            maxLength={500}
            required={field.required}
        />
    );
};

export { MetaForm };
