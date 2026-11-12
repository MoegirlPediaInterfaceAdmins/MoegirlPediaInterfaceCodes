import { Button, Icon, Message, ProgressBar } from "ooui-react";
import React, { useState } from "react";
import { t } from "@/locale";
import type { MessageKey } from "@/locale";
import { formatSize } from "@/logic/format";
import { isImageUrl } from "@/logic/preview";
import type { MoeUploadConfig, QueueItem } from "@/types";
import { MetaForm } from "./MetaForm";
import { TitleInput } from "./widgets/TitleInput";

interface QueueItemCardProps {
    item: QueueItem;
    config: MoeUploadConfig;
    onRename: (id: string, name: string) => void;
    onMeta: (id: string, fieldId: string, value: string) => void;
    onLicense: (id: string, licenseId: string) => void;
    onCategories: (id: string, categories: string[]) => void;
    onApplyAll: (id: string) => void;
    onUpload: (id: string) => void;
    onSubmit: (id: string) => void;
    onOverwrite: (id: string) => void;
    onCancel: (id: string) => void;
    onRetry: (id: string) => void;
    onRemove: (id: string) => void;
}

const QueueItemCard = (props: QueueItemCardProps) => {
    const { item, config } = props;
    const [expanded, setExpanded] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);
    // URL 条目没有本地 objectURL：直链指向图片时直接加载预览，加载失败回退图标
    const previewUrl
        = item.kind === "url" && item.url && !previewFailed && isImageUrl(item.url)
            ? item.url
            : undefined;

    // 按钮显隐按状态：pending/ready→上传，staged→提交，failed→重试（有 filekey 另有覆盖），uploading/submitting→取消
    const busy
        = item.status === "checking" || item.status === "uploading" || item.status === "submitting";
    const canUpload = item.status === "pending" || item.status === "ready";
    const canSubmit = item.status === "staged";
    const canRetry = item.status === "failed";
    const canCancel = item.status === "uploading" || item.status === "submitting";
    const canRemove = !busy;
    const canEditMeta = item.status !== "done" && item.status !== "queued" && !busy;

    return (
        <div className={`moeupload-item moeupload-item--${item.status}`}>
            <div className="moeupload-item__main">
                <div className="moeupload-item__thumb">
                    {item.thumbUrl
                        ? <img src={item.thumbUrl} alt="" loading="lazy" />
                        : previewUrl
                            ? <img
                                src={previewUrl}
                                alt=""
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={() => { setPreviewFailed(true); }}
                            />
                            : <Icon icon={item.kind === "url" ? "link" : "image"} />
                    }
                </div>

                <div className="moeupload-item__body">
                    <div className="moeupload-item__namerow">
                        <TitleInput
                            value={item.name}
                            onChange={(next) => { props.onRename(item.id, next); }}
                            disabled={!canEditMeta || item.reupload === true}
                        />
                    </div>

                    <div className="moeupload-item__inforow">
                        <StatusBadge item={item} />
                        {item.size > 0
                            ? <span className="moeupload-item__size">{formatSize(item.size)}</span>
                            : null}
                        {item.kind === "url" && item.url
                            ? <a
                                className="moeupload-item__url"
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={item.url}
                            >
                                {item.url}
                            </a>
                            : null}
                    </div>

                    {item.status === "uploading"
                        || item.status === "submitting"
                        || item.status === "checking"
                        ? <ProgressBar progress={false} aria-label={t("item.progress")} />
                        : null}

                    {item.error
                        ? <Message type="error" inline>
                            {item.error}
                        </Message>
                        : null}
                    {item.status === "done" && item.result
                        ? <Message type="success" inline>
                            {t("item.done")} ·{" "}
                            <a
                                href={
                                    item.result.descriptionurl
                                    ?? mw.util.getUrl(`File:${item.result.title}`)
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {t("item.view")}
                            </a>
                        </Message>
                        : null}
                    {item.status === "queued"
                        ? <Message type="notice" inline>
                            {t("item.queued")}
                        </Message>
                        : null}
                </div>

                <div className="moeupload-item__actions">
                    {canEditMeta
                        ? <Button
                            icon="edit"
                            title={expanded ? t("item.collapse") : t("item.expand")}
                            framed
                            onClick={() => { setExpanded((value) => !value); }}
                        >
                            {expanded ? t("item.collapse") : t("item.expand")}
                        </Button>
                        : null}
                    {canUpload
                        ? <Button
                            icon="upload"
                            flags="progressive"
                            framed
                            onClick={() => { props.onUpload(item.id); }}
                        >
                            {t("item.upload")}
                        </Button>
                        : null}
                    {canSubmit
                        ? <Button
                            icon="upload"
                            flags="progressive"
                            framed
                            onClick={() => { props.onSubmit(item.id); }}
                        >
                            {t("item.submit")}
                        </Button>
                        : null}
                    {canRetry
                        ? <Button
                            icon="reload"
                            flags="warning"
                            framed
                            onClick={() => { props.onRetry(item.id); }}
                        >
                            {t("item.retry")}
                        </Button>
                        : null}
                    {item.status === "failed" && item.filekey
                        ? <Button
                            icon="upload"
                            flags="destructive"
                            framed
                            title={t("item.overwriteHint")}
                            onClick={() => { props.onOverwrite(item.id); }}
                        >
                            {t("item.overwrite")}
                        </Button>
                        : null}
                    {canCancel
                        ? <Button
                            icon="close"
                            flags="destructive"
                            framed
                            onClick={() => { props.onCancel(item.id); }}
                        >
                            {t("item.cancel")}
                        </Button>
                        : null}
                    {canRemove
                        ? <Button
                            icon="trash"
                            flags="destructive"
                            // 仅图标按钮：标签视觉隐藏但保留为可访问名称
                            invisibleLabel
                            title={t("item.remove")}
                            onClick={() => { props.onRemove(item.id); }}
                        >
                            {t("item.remove")}
                        </Button>
                        : null}
                </div>
            </div>

            {expanded && canEditMeta
                ? <div className="moeupload-item__meta">
                    <div className="moeupload-item__metahead">
                        <Button
                            icon="add"
                            framed
                            title={t("item.applyAll")}
                            onClick={() => { props.onApplyAll(item.id); }}
                        >
                            {t("item.applyAll")}
                        </Button>
                    </div>
                    <MetaForm
                        item={item}
                        config={config}
                        onMeta={(fieldId, value) => { props.onMeta(item.id, fieldId, value); }}
                        onLicense={(licenseId) => { props.onLicense(item.id, licenseId); }}
                        onCategories={(categories) => { props.onCategories(item.id, categories); }}
                    />
                </div>
                : null}
        </div>
    );
};

const StatusBadge = ({ item }: { item: QueueItem }) => {
    const key = `status.${item.status}` as MessageKey;
    const tone
        = item.status === "done" ? "success" : item.status === "failed" ? "error" : "neutral";
    return (
        <span
            className={`moeupload-item__status moeupload-item__status--${item.status} moeupload-item__status--${tone}`}
            role="status"
            aria-live="polite"
        >
            {t(key)}
        </span>
    );
};

export { QueueItemCard };
