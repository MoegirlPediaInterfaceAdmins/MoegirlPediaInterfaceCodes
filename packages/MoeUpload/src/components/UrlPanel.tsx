import { Button, FieldLayout, Message, MultilineTextInput } from "ooui-react";
import React, { useState } from "react";
import { t } from "@/locale";

interface UrlPanelProps {
    visible: boolean;
    onAdd: (urls: string[]) => void;
}

const URL_PATTERN = /^https?:\/\/\S+$/i;

const UrlPanel = ({ visible, onAdd }: UrlPanelProps) => {
    const [text, setText] = useState("");
    const [notice, setNotice] = useState<{ type: "error" | "warning"; text: string } | null>(null);

    if (!visible) {
        return null;
    }

    const submit = () => {
        const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const urls = lines.filter((line) => URL_PATTERN.test(line));
        if (urls.length === 0) {
            setNotice({ type: "error", text: t("url.invalid") });
            return;
        }
        onAdd(urls);
        // 无效行保留在框内供修正，全部有效才清空；跳过数量由提示文案告知
        const skippedLines = lines.filter((line) => !URL_PATTERN.test(line));
        setText(skippedLines.join("\n"));
        const skipped = skippedLines.length;
        setNotice(
            skipped > 0 ? { type: "warning", text: t("url.skipped", { count: skipped }) } : null,
        );
    };

    return (
        <div className="moeupload-urlpanel">
            <FieldLayout label={t("url.title")} align="top">
                <MultilineTextInput
                    rows={4}
                    autosize
                    maxRows={12}
                    placeholder={"https://example.com/image.png\nhttps://example.com/photo.jpg"}
                    value={text}
                    onChange={setText}
                />
            </FieldLayout>
            {notice
                ? <Message type={notice.type} inline>
                    {notice.text}
                </Message>
                : null}
            <div className="moeupload-urlpanel__hint">{t("url.hint")}</div>
            <div className="moeupload-urlpanel__actions">
                <Button flags="progressive" framed onClick={submit}>
                    {t("url.button")}
                </Button>
            </div>
        </div>
    );
};

export { UrlPanel };
