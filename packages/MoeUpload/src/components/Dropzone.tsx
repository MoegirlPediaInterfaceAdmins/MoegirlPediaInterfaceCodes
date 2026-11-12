import { Icon } from "ooui-react";
import React, { useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { t } from "@/locale";

interface DropZoneProps {
    onFiles: (files: File[]) => void;
    maxBatch: number;
    allowedExtensions: string[];
    disabled?: boolean;
}

// 拖拽 + 点击选择入口；粘贴监听在 App 层挂 document，本组件不处理粘贴
const DropZone = ({ onFiles, maxBatch, allowedExtensions, disabled }: DropZoneProps) => {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    // dragenter/leave 用深度计数：在子节点间移动会成对触发，布尔标记会闪
    const dragDepth = useRef(0);

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (disabled) {
            return;
        }
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length > 0) {
            onFiles(files);
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) {
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
        }
    };

    return (
        <div
            className={`moeupload-dropzone${dragging ? " moeupload-dropzone--drag" : ""}${disabled ? " moeupload-dropzone--disabled" : ""}`}
            onClick={() => !disabled && inputRef.current?.click()}
            onDragEnter={(event) => {
                event.preventDefault();
                dragDepth.current += 1;
                setDragging(true);
            }}
            onDragOver={(event) => { event.preventDefault(); }}
            onDragLeave={() => {
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) {
                    setDragging(false);
                }
            }}
            onDrop={handleDrop}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={handleKeyDown}
            aria-disabled={disabled}
        >
            <Icon icon="upload" />
            <div className="moeupload-dropzone__title">{t("dropzone.title")}</div>
            <div className="moeupload-dropzone__hint">{t("dropzone.hint", { max: maxBatch })}</div>
            <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                accept={allowedExtensions.map((ext) => `.${ext}`).join(",")}
                onChange={(event) => {
                    onFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                }}
            />
        </div>
    );
};

export { DropZone };
