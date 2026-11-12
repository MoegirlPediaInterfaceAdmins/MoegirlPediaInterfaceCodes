import { alert, Button, confirm, Message } from "ooui-react";
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { errText, fetchSession } from "@/api/client";
import { t } from "@/locale";
import { findProhibitedExtension, stripFilePrefix } from "@/logic/filename";
import { formatSize } from "@/logic/format";
import { runCheck, runPool, runStash, runSubmit } from "@/state/pipeline";
import {
    isFinalStatus,
    makeItem,
    queueReducer,
    rawNameFromFile,
    rawNameFromUrl,
    takenNames,
} from "@/state/queue";
import type { QueueAction } from "@/state/queue";
import type { MoeUploadConfig, QueueItem, Session } from "@/types";
import { DropZone } from "./Dropzone";
import { QueueItemCard } from "./QueueItem";
import { UrlPanel } from "./UrlPanel";

let idCounter = 0;
const nextId = (): string => {
    idCounter += 1;
    return `moeupload-${Date.now().toString(36)}-${idCounter}`;
};

interface Notice {
    id: number;
    type: "warning" | "error";
    text: string;
}

interface AppProps {
    config: MoeUploadConfig;
    /** 渲染形态：page = 接管上传页（读 URL 的 reupload 参数）；dialog = 上传弹窗（忽略 reupload） */
    variant?: "page" | "dialog";
    onBusyChange?: (busy: boolean) => void;
}

const App = ({ config, variant = "page", onBusyChange }: AppProps) => {
    const [state, rawDispatch] = useReducer(queueReducer, { items: [] });
    // 镜像 stateRef：dispatch 时同步推进 stateRef.current，异步流程必须读它而非渲染闭包 state
    const stateRef = useRef(state);
    const dispatch = useCallback((action: QueueAction) => {
        stateRef.current = queueReducer(stateRef.current, action);
        rawDispatch(action);
    }, []);

    const [session, setSession] = useState<Session | null>(null);
    const noUpload = !session?.canUpload;
    const [fatal, setFatal] = useState<string | null>(null);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [showUrlPanel, setShowUrlPanel] = useState(false);
    // 上传/提交可能并发触发，busy 用引用计数而非布尔，避免先结束的一方提前解锁工具栏
    const [busyCount, setBusyCount] = useState(0);
    const busy = busyCount > 0;
    // 每条目一个 AbortController，按 id 存放；结束时引用比对再删，避免旧请求清掉同 id 的新控制器
    const aborts = useRef(new Map<string, AbortController>());
    const noticeSeq = useRef(0);

    useEffect(() => {
        fetchSession()
            .then(setSession)
            .catch((error) => { setFatal(`${t("app.loadFailed")}${errText(error)}`); });
    }, []);

    useEffect(() => {
        onBusyChange?.(busy);
    }, [busy, onBusyChange]);

    // 卸载时中断在途请求并回收缩略图 objectURL：弹窗关闭后应用随之卸载，未中止的请求会变成孤儿
    useEffect(
        () => () => {
            for (const controller of aborts.current.values()) {
                controller.abort();
            }
            for (const item of stateRef.current.items) {
                if (item.thumbUrl) {
                    URL.revokeObjectURL(item.thumbUrl);
                }
            }
        },
        [],
    );

    const pushNotice = useCallback((type: Notice["type"], text: string) => {
        noticeSeq.current += 1;
        setNotices((list) => [...list, { id: noticeSeq.current, type, text }]);
    }, []);

    // 「上传新版本」入口：仅页面接管形态生效（弹窗模式不读宿主页 URL），目标名锁定、提交不带 text
    const reuploadTarget = useMemo(() => {
        if (variant !== "page") {
            return null;
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get("wpForReUpload") !== "1") {
            return null;
        }
        const dest = stripFilePrefix(params.get("wpDestFile")?.trim() ?? "");
        return dest || null;
    }, [variant]);
    const [reuploadBound, setReuploadBound] = useState(false);

    const addFiles = useCallback(
        (files: File[]) => {
            if (files.length === 0) {
                return;
            }
            const current = stateRef.current;
            const accepted: File[] = [];
            for (const file of files) {
                const extension = file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase();
                // 被禁扩展名要查所有段（evil.php.png 的 php 也算），只查最后一段会漏到服务端才失败
                if (
                    findProhibitedExtension(file.name) !== null
                    || !config.allowedExtensions.includes(extension)
                ) {
                    pushNotice("warning", t("dropzone.badType", { name: file.name }));
                    continue;
                }
                if (session?.maxUploadSize && file.size > session.maxUploadSize) {
                    pushNotice(
                        "warning",
                        t("dropzone.oversize", {
                            name: file.name,
                            limit: formatSize(session.maxUploadSize),
                        }),
                    );
                    continue;
                }
                accepted.push(file);
            }
            const capacity = config.maxBatch - current.items.length;
            if (accepted.length > capacity) {
                pushNotice("warning", t("dropzone.tooMany", { max: config.maxBatch }));
            }
            const batch = accepted.slice(0, Math.max(0, capacity));
            if (batch.length === 0) {
                return;
            }

            const taken = takenNames(current.items);
            // reupload 目标只绑定本批第一个文件，之后照常命名（跳过批内去重，名字必须与 wpDestFile 一致）
            const bindReupload = reuploadTarget !== null && !reuploadBound;
            const items = batch.map((file, index) => {
                const isReuploadItem = bindReupload && index === 0;
                if (isReuploadItem) {
                    setReuploadBound(true);
                }
                const item = makeItem({
                    id: nextId(),
                    kind: "file",
                    file,
                    rawName: isReuploadItem ? reuploadTarget : rawNameFromFile(file),
                    reupload: isReuploadItem,
                    config,
                    takenNames: isReuploadItem ? new Set<string>() : taken,
                });
                if (isReuploadItem) {
                    taken.add(item.name);
                }
                return item;
            });
            dispatch({ type: "add", items });
        },
        [config, session, pushNotice, dispatch, reuploadTarget, reuploadBound],
    );

    useEffect(() => {
        const onPaste = (event: ClipboardEvent) => {
            if (noUpload) {
                return;
            }
            const files = Array.from(event.clipboardData?.files ?? []);
            if (files.length > 0) {
                event.preventDefault();
                addFiles(files);
            }
        };
        document.addEventListener("paste", onPaste);
        return () => { document.removeEventListener("paste", onPaste); };
    }, [addFiles, noUpload]);

    const patchOf = useCallback(
        (id: string) => (patch: Partial<QueueItem>) => { dispatch({ type: "patch", id, patch }); },
        [dispatch],
    );

    const alertBatchSummary = useCallback((ids: string[]) => {
        const batch = stateRef.current.items.filter((item) => ids.includes(item.id));
        if (batch.length === 0) {
            return;
        }
        const done = batch.filter(
            (item) => item.status === "done" || item.status === "queued",
        ).length;
        const failed = batch.filter((item) => item.status === "failed").length;
        if (failed > 0) {
            void alert(t("upload.summary", { done, failed }), {
                title: t("upload.summaryTitle"),
            });
        }
    }, []);

    const addUrls = useCallback(
        (urls: string[]) => {
            const capacity = config.maxBatch - stateRef.current.items.length;
            const accepted = urls.slice(0, Math.max(0, capacity));
            if (accepted.length < urls.length) {
                pushNotice("warning", t("dropzone.tooMany", { max: config.maxBatch }));
            }
            if (accepted.length === 0) {
                return;
            }
            const taken = takenNames(stateRef.current.items);
            const items = accepted.map((url) =>
                makeItem({
                    id: nextId(),
                    kind: "url",
                    url,
                    rawName: rawNameFromUrl(url),
                    config,
                    takenNames: taken,
                }),
            );
            dispatch({ type: "add", items });
        },
        [config, pushNotice, dispatch],
    );

    const submitItems = useCallback(
        async (ids: string[], options: { silent?: boolean } = {}) => {
            if (ids.length === 0) {
                return;
            }
            setBusyCount((count) => count + 1);
            try {
                await runPool(ids.length, Math.min(2, config.concurrency), async (index) => {
                    const itemId = ids[index];
                    const current = stateRef.current.items.find((item) => item.id === itemId);
                    if (
                        !current
                        || !(
                            current.status === "staged"
                            || current.status === "failed" && current.filekey
                        )
                    ) {
                        return;
                    }
                    const controller = new AbortController();
                    aborts.current.set(itemId, controller);
                    try {
                        await runSubmit(current, config, patchOf(itemId), controller.signal);
                    } finally {
                        if (aborts.current.get(itemId) === controller) {
                            aborts.current.delete(itemId);
                        }
                    }
                });
            } finally {
                setBusyCount((count) => Math.max(0, count - 1));
                if (!options.silent) {
                    alertBatchSummary(ids);
                }
            }
        },
        [config, patchOf, alertBatchSummary],
    );

    const uploadItems = useCallback(
        async (ids: string[], options: { silent?: boolean } = {}) => {
            if (ids.length === 0) {
                return;
            }
            setBusyCount((count) => count + 1);
            try {
                await runPool(ids.length, config.concurrency, async (index) => {
                    const itemId = ids[index];
                    const first = stateRef.current.items.find((item) => item.id === itemId);
                    if (!first) {
                        return;
                    }
                    if (
                        first.status !== "pending"
                        && first.status !== "ready"
                        && !(first.status === "failed" && !first.filekey)
                    ) {
                        return;
                    }
                    const controller = new AbortController();
                    aborts.current.set(itemId, controller);
                    try {
                        const ok = await runCheck(first, config, patchOf(itemId));
                        if (!ok) {
                            return;
                        }
                        const checked = stateRef.current.items.find((item) => item.id === itemId);
                        if (checked?.status !== "ready") {
                            return;
                        }
                        if (!checked.name.trim()) {
                            pushNotice("error", t("item.nameEmpty"));
                            return;
                        }
                        const filekey = await runStash(
                            checked,
                            config,
                            patchOf(itemId),
                            controller.signal,
                        );
                        if (!filekey) {
                            return;
                        }
                        // 一次点击跑完整链路：暂存成功立即提交，冲突交由服务端 warnings 驱动
                        const staged = stateRef.current.items.find((item) => item.id === itemId);
                        if (!staged) {
                            return;
                        }
                        await runSubmit(staged, config, patchOf(itemId), controller.signal);
                    } finally {
                        if (aborts.current.get(itemId) === controller) {
                            aborts.current.delete(itemId);
                        }
                    }
                });
            } finally {
                setBusyCount((count) => Math.max(0, count - 1));
                if (!options.silent) {
                    alertBatchSummary(ids);
                }
            }
        },
        [config, pushNotice, patchOf, alertBatchSummary],
    );

    const startUpload = useCallback(() => {
        const items = stateRef.current.items;
        const uploadIds = items
            .filter((item) => item.status === "pending" || item.status === "ready")
            .map((item) => item.id);
        const stagedIds = items.filter((item) => item.status === "staged").map((item) => item.id);
        if (uploadIds.length === 0 && stagedIds.length === 0) {
            return;
        }
        // 两池都非空时静默跑完、合并为一次汇总，避免两边各有失败连弹两个 alert
        const merge = uploadIds.length > 0 && stagedIds.length > 0;
        void (async () => {
            await Promise.all([
                uploadItems(uploadIds, { silent: merge }),
                submitItems(stagedIds, { silent: merge }),
            ]);
            if (merge) {
                alertBatchSummary([...uploadIds, ...stagedIds]);
            }
        })();
    }, [uploadItems, submitItems, alertBatchSummary]);

    const retryItem = useCallback(
        (id: string) => {
            const current = stateRef.current.items.find((item) => item.id === id);
            if (!current) {
                return;
            }
            if (current.filekey) {
                void submitItems([id]);
                return;
            }
            void uploadItems([id]);
        },
        [submitItems, uploadItems],
    );

    // 一键重试：有 filekey 直接重新 finalize，无则重走完整管线；两半静默跑完合并汇总
    const retryFailed = useCallback(async () => {
        const failedItems = stateRef.current.items.filter((item) => item.status === "failed");
        const withKey: string[] = [];
        const withoutKey: string[] = [];
        for (const item of failedItems) {
            (item.filekey ? withKey : withoutKey).push(item.id);
        }
        if (withoutKey.length > 0) {
            await uploadItems(withoutKey, { silent: true });
        }
        if (withKey.length > 0) {
            await submitItems(withKey, { silent: true });
        }
        alertBatchSummary([...withoutKey, ...withKey]);
    }, [submitItems, uploadItems, alertBatchSummary]);

    const cancelItem = useCallback((id: string) => {
        aborts.current.get(id)?.abort();
    }, []);

    const removeItem = useCallback(
        (id: string) => {
            aborts.current.get(id)?.abort();
            aborts.current.delete(id);
            const item = stateRef.current.items.find((entry) => entry.id === id);
            if (item?.thumbUrl) {
                URL.revokeObjectURL(item.thumbUrl);
            }
            dispatch({ type: "remove", id });
        },
        [dispatch],
    );

    const applyAll = useCallback(
        async (sourceId: string) => {
            const ok = await confirm(t("item.applyAllConfirm"), { title: t("item.applyAll") });
            if (ok) {
                dispatch({ type: "applyToAll", sourceId });
            }
        },
        [dispatch],
    );

    const counts = useMemo(() => {
        const result = { total: state.items.length, uploadable: 0, staged: 0, done: 0, failed: 0 };
        for (const item of state.items) {
            if (item.status === "pending" || item.status === "ready") {
                result.uploadable++;
            } else if (item.status === "staged") {
                result.staged++;
            } else if (item.status === "done" || item.status === "queued") {
                result.done++;
            } else if (item.status === "failed") {
                result.failed++;
            }
        }
        return result;
    }, [state.items]);

    // 覆盖上传意图一次性：提交结束即重置，避免后续「重试」静默覆盖别的文件
    const overwriteItem = useCallback(
        async (id: string) => {
            dispatch({ type: "patch", id, patch: { ignoreWarnings: true } });
            await submitItems([id]);
            dispatch({ type: "patch", id, patch: { ignoreWarnings: false } });
        },
        [dispatch, submitItems],
    );

    const clearDone = useCallback(() => {
        for (const item of stateRef.current.items) {
            if (isFinalStatus(item.status) && item.thumbUrl) {
                URL.revokeObjectURL(item.thumbUrl);
            }
        }
        dispatch({ type: "clearDone" });
    }, [dispatch]);

    const clearAll = useCallback(async () => {
        const ok = await confirm(t("toolbar.clearConfirm"), { title: t("toolbar.clearAll") });
        if (!ok) {
            return;
        }
        for (const item of stateRef.current.items) {
            aborts.current.get(item.id)?.abort();
            if (item.thumbUrl) {
                URL.revokeObjectURL(item.thumbUrl);
            }
        }
        aborts.current.clear();
        dispatch({ type: "clearAll" });
    }, [dispatch]);

    return (
        <div className={variant === "dialog" ? "moeupload moeupload--dialog" : "moeupload"}>
            {fatal ? <Message type="error">{fatal}</Message> : null}
            {session && !session.canUpload
                ? <Message type="error">{t("app.noPermission")}</Message>
                : null}
            {notices.map((notice) =>
                <Message
                    key={notice.id}
                    type={notice.type}
                    showClose
                    onClose={() => { setNotices((list) => list.filter((entry) => entry.id !== notice.id)); }}
                >
                    {notice.text}
                </Message>,
            )}

            {reuploadTarget && !reuploadBound
                ? <Message type="notice">{t("app.reuploadBanner", { name: reuploadTarget })}</Message>
                : null}

            <DropZone
                onFiles={addFiles}
                maxBatch={config.maxBatch}
                allowedExtensions={config.allowedExtensions}
                disabled={noUpload}
            />

            <div className="moeupload-row">
                <Button
                    icon="link"
                    framed
                    disabled={noUpload || !session?.canUploadByUrl}
                    onClick={() => { setShowUrlPanel((value) => !value); }}
                >
                    {t("url.title")}
                </Button>
            </div>
            <UrlPanel visible={showUrlPanel} onAdd={addUrls} />

            {state.items.length > 0
                ? <div className="moeupload-toolbar">
                    <Button
                        flags="progressive"
                        framed
                        disabled={busy || noUpload || counts.uploadable + counts.staged === 0}
                        onClick={startUpload}
                    >
                        {t("toolbar.upload", { count: counts.uploadable + counts.staged })}
                    </Button>
                    <div className="moeupload-toolbar__spacer" />
                    {counts.failed >= 2
                        ? <Button
                            flags="warning"
                            framed
                            disabled={busy}
                            onClick={() => void retryFailed()}
                        >
                            {t("toolbar.retryFailed", { count: counts.failed })}
                        </Button>
                        : null}
                    <Button framed disabled={counts.done === 0} onClick={clearDone}>
                        {t("toolbar.clearDone")}
                    </Button>
                    <Button flags="destructive" framed onClick={() => void clearAll()}>
                        {t("toolbar.clearAll")}
                    </Button>
                </div>
                : null}

            <div className="moeupload-queue">
                {state.items.map((item) =>
                    <QueueItemCard
                        key={item.id}
                        item={item}
                        config={config}
                        onRename={(id, name) => { dispatch({ type: "rename", id, name }); }}
                        onMeta={(id, fieldId, value) => { dispatch({ type: "setMeta", id, fieldId, value }); }
                        }
                        onLicense={(id, licenseId) => { dispatch({ type: "patch", id, patch: { licenseId } }); }
                        }
                        onCategories={(id, categories) => { dispatch({ type: "patch", id, patch: { categories } }); }
                        }
                        onApplyAll={(id) => void applyAll(id)}
                        onUpload={(id) => void uploadItems([id])}
                        onSubmit={(id) => void submitItems([id])}
                        onOverwrite={(id) => void overwriteItem(id)}
                        onCancel={cancelItem}
                        onRetry={retryItem}
                        onRemove={removeItem}
                    />,
                )}
            </div>

            {state.items.length > 0
                ? <div className="moeupload-summary">
                    {t("queue.count", {
                        total: counts.total,
                        done: counts.done,
                        todo: counts.uploadable + counts.staged,
                    })}
                </div>
                : null}
        </div>
    );
};

export { App };
