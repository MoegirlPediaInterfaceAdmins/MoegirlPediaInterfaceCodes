import { TextInput } from "ooui-react";
import React, { useEffect, useRef, useState } from "react";
import { getUploadApi } from "@/api/client";
import { t } from "@/locale";
import { sanitizeFilename } from "@/logic/filename";

interface TitleInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    namespace?: number;
}

/** 挂载状态：pending = 等待 API 实例，widget = 站点联想组件已就位，fallback = 降级为普通输入框 */
type MountMode = "pending" | "widget" | "fallback";

// 站点联想 widget 生命周期：new → appendChild → on('change') → destroy；依赖由宿主 Gadget 预加载，构造失败降级为普通输入
const TitleInput = ({ value, onChange, disabled, placeholder, namespace = 6 }: TitleInputProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<mw.widgets.TitleInputWidget | null>(null);
    const [mode, setMode] = useState<MountMode>("pending");
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const valueRef = useRef(value);
    valueRef.current = value;
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
    const effectivePlaceholder = placeholder ?? t("item.name");

    useEffect(() => {
        let cancelled = false;
        let blurHost: Element | null = null;
        let onInputBlur: (() => void) | null = null;
        const mount = async (): Promise<void> => {
            try {
                const api = await getUploadApi();
                if (cancelled || !containerRef.current) {
                    return;
                }
                const widget = new mw.widgets.TitleInputWidget({
                    namespace,
                    relative: true,
                    showImages: namespace === 6,
                    placeholder: effectivePlaceholder,
                    value: valueRef.current,
                    api,
                });
                widget.on("change", () => {
                    onChangeRef.current(widget.getValue());
                });
                // 失焦同步为清洗结果；OOUI 的 TextInputWidget 不 emit 'blur'，监听必须挂内部 input/textarea
                onInputBlur = () => {
                    const current = widget.getValue();
                    const cleaned = sanitizeFilename(current);
                    if (cleaned && cleaned !== current) {
                        widget.setValue(cleaned);
                        onChangeRef.current(cleaned);
                    }
                };
                blurHost = widget.$element[0].querySelector("input, textarea");
                blurHost?.addEventListener("blur", onInputBlur);
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
            if (blurHost && onInputBlur) {
                blurHost.removeEventListener("blur", onInputBlur);
            }
            // widget 实例可能没有 destroy：此处抛错会打断渲染提交，界面表现为按钮全部无响应
            widgetRef.current?.destroy?.();
            widgetRef.current = null;
        };
        // 仅在挂载时创建一次；namespace / placeholder 假定不变
    }, []);

    useEffect(() => {
        const widget = widgetRef.current;
        if (!widget) {
            return;
        }
        const current = widget.getValue();
        if (current === value) {
            return;
        }
        // 外部值回写前先用清洗结果比对：差异仅为输入中间态时不回写，避免吞空格与光标跳动
        if (sanitizeFilename(current) === value) {
            return;
        }
        widget.setValue(value);
    }, [value]);

    useEffect(() => {
        widgetRef.current?.setDisabled(!!disabled);
    }, [disabled]);

    return (
        <div ref={containerRef} className="moeupload-titleinput">
            {mode === "fallback"
                ? <TextInput
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder={effectivePlaceholder}
                    maxLength={240}
                />
                : null}
        </div>
    );
};

export { TitleInput };
