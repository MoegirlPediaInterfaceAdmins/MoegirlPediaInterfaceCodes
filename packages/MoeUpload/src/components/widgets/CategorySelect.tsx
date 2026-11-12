import { TagMultiselect } from "ooui-react";
import React, { useEffect, useRef, useState } from "react";
import { getUploadApi } from "@/api/client";
import { t } from "@/locale";

interface CategorySelectProps {
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
    placeholder?: string;
}

/** 挂载状态：pending = 等待 API 实例，widget = 站点联想组件已就位，fallback = 降级为标签输入 */
type MountMode = "pending" | "widget" | "fallback";

// 分类联想 widget 生命周期：new → setValue → appendChild → on('change') → destroy；
// 依赖由宿主 Gadget 预加载，值是不带 Category: 前缀的分类名数组（站内不存在的分类也可添加），构造失败降级为自由标签输入
const CategorySelect = ({ value, onChange, disabled, placeholder }: CategorySelectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<mw.widgets.CategoryMultiselectWidget | null>(null);
    const [mode, setMode] = useState<MountMode>("pending");
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const valueRef = useRef(value);
    valueRef.current = value;
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
    const effectivePlaceholder = placeholder ?? t("categories.hint");
    // widget 最近一次外抛的值：store 回流同一值时不回写，避免 setValue 回环与光标跳动
    const lastEmitted = useRef<string[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const mount = async (): Promise<void> => {
            try {
                const api = await getUploadApi();
                if (cancelled || !containerRef.current) {
                    return;
                }
                const widget = new mw.widgets.CategoryMultiselectWidget({
                    placeholder: effectivePlaceholder,
                    api,
                });
                widget.setValue(valueRef.current);
                widget.on("change", () => {
                    const next = normalizeCategories(widget.getValue());
                    lastEmitted.current = next;
                    onChangeRef.current(next);
                });
                containerRef.current.appendChild(widget.$element[0]);
                widgetRef.current = widget;
                if (disabledRef.current) {
                    widget.setDisabled(true);
                }
                setMode("widget");
            } catch {
                if (!cancelled) {
                    setMode("fallback");
                }
            }
        };
        void mount();
        return () => {
            cancelled = true;
            widgetRef.current?.destroy?.();
            widgetRef.current = null;
        };
    }, []);

    useEffect(() => {
        const widget = widgetRef.current;
        if (!widget) {
            return;
        }
        const current = normalizeCategories(widget.getValue());
        if (sameValues(current, value)) {
            return;
        }
        if (lastEmitted.current && sameValues(lastEmitted.current, value)) {
            return;
        }
        widget.setValue(value);
    }, [value]);

    useEffect(() => {
        widgetRef.current?.setDisabled(!!disabled);
    }, [disabled]);

    return (
        <div ref={containerRef} className="moeupload-categoryselect">
            {mode === "fallback"
                ? <TagMultiselect
                    value={value}
                    onChange={(next) => { onChange(next.map(String)); }}
                    allowArbitrary
                    disabled={disabled}
                    placeholder={effectivePlaceholder}
                />
                : null}
        </div>
    );
};

// 兼容字符串数组与 {data} 对象数组，去掉 Category:/分类: 前缀
const normalizeCategories = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .map((item) => {
            if (typeof item === "string") {
                return item;
            }
            const data = (item as { data?: unknown } | null)?.data;
            return typeof data === "string" ? data : "";
        })
        .map((name) => name.replace(/^\s*(?:category|分类)\s*:/i, "").trim())
        .filter(Boolean);
};

const sameValues = (left: string[], right: string[]): boolean =>
    left.length === right.length && left.every((item, index) => item === right[index]);

export { CategorySelect };
