import {
    NON_BOT_DELAY_MS,
    NON_BOT_MAX_PAGES,
    SYSOP_FLOOD_PROMPT_THRESHOLD,
    activeChangeTags,
} from "./constants.ts";
import { computeNewWikitext, normalizeCatName, sameCategory, validateCategoryTitle, verifyCommittedOnServer } from "./wikitext.ts";
import type {
    BatchOptions,
    BatchResult,
    BatchRun,
    EditMode,
    EditPageParams,
} from "./types.ts";

const asRecord = (value: unknown): Record<string, unknown> | null => typeof value === "object"
    && value !== null
    ? value as Record<string, unknown>
    : null;

const stringValue = (value: unknown): string => typeof value === "string" ? value : "";

/** 错误是否带 API 业务错误码（网络/中止错误不带 error.code，需要回读核对）。 */
const isApiBusinessError = (error: unknown): boolean => {
    const record = asRecord(error);
    const details = record ? asRecord(record.error) : null;
    return details !== null && stringValue(details.code) !== "";
};

const isAbortError = (error: unknown): boolean => {
    if (typeof error === "string") {
        return error === "abort";
    }
    if (error instanceof Error) {
        return error.name === "AbortError" || error.message === "abort";
    }
    const record = asRecord(error);
    return record !== null
        && (stringValue(record.statusText) === "abort" || stringValue(record.textStatus) === "abort");
};

const errorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    const record = asRecord(error);
    const message = record ? stringValue(record.message) : "";
    return message || wgULS("未知错误", "未知錯誤");
};

const buildEditSummary = (mode: EditMode, sourceCat: string, targetCat: string): string => {
    const source = normalizeCatName(sourceCat);
    const target = normalizeCatName(targetCat);
    if (mode === "add") {
        return wgULS(`[[Help:Cat-a-lot|Cat-a-lot]]：加入分类[[Cat:${target}]]`, `[[Help:Cat-a-lot|Cat-a-lot]]：加入分類[[Cat:${target}]]`);
    }
    if (mode === "copy") {
        return wgULS(`[[Help:Cat-a-lot|Cat-a-lot]]：分类间复制：从[[Cat:${source}]]到[[Cat:${target}]]`, `[[Help:Cat-a-lot|Cat-a-lot]]：分類間複製：從[[Cat:${source}]]到[[Cat:${target}]]`);
    }
    if (mode === "move") {
        return wgULS(`[[Help:Cat-a-lot|Cat-a-lot]]：分类间移动：从[[Cat:${source}]]到[[Cat:${target}]]`, `[[Help:Cat-a-lot|Cat-a-lot]]：分類間移動：從[[Cat:${source}]]到[[Cat:${target}]]`);
    }
    return wgULS(`[[Help:Cat-a-lot|Cat-a-lot]]：从分类移除：[[Cat:${source}]]`, `[[Help:Cat-a-lot|Cat-a-lot]]：從分類移除：[[Cat:${source}]]`);
};

// 批次预留由 state 负责；stop() 立即中断页面间延迟与当前请求。
const startBatch = (options: BatchOptions): BatchRun => {
    const { titles, mode, sourceCat, targetCat, prefs, isSysopOrStaff, api, hooks } = options;
    // Stop 来自闭包回调，用对象属性避免 TS 把闭包内的赋值判成不可达分支
    const control = { stopRequested: false };
    const isStopped = (): boolean => control.stopRequested;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let releaseDelay: (() => void) | null = null;
    let running = false;
    const initiallyHasBotRight = options.hasBotRight;

    const clearDelay = (): void => {
        if (delayTimer !== null) {
            clearTimeout(delayTimer);
            delayTimer = null;
        }
        const release = releaseDelay;
        releaseDelay = null;
        if (release) {
            release();
        }
    };

    const stop = (): void => {
        if (isStopped()) {
            return;
        }
        control.stopRequested = true;
        clearDelay();
        api.abortActive();
    };

    const waitDelay = (delayMs: number): Promise<void> => new Promise((resolve) => {
        releaseDelay = resolve;
        delayTimer = setTimeout(() => {
            delayTimer = null;
            releaseDelay = null;
            resolve();
        }, delayMs);
    });

    const run = async (): Promise<BatchResult> => {
        const result: BatchResult = {
            total: titles.length,
            done: 0,
            stopped: false,
            skippedAlready: [],
            skippedNotFound: [],
            skippedServer: [],
        };
        let grantedThisRun = false;

        try {
            if (titles.length === 0) {
                await hooks.askDialog({
                    message: wgULS("没有选择任何页面或文件！", "沒有選擇任何頁面或文件！"),
                    showCancel: false,
                });
                return result;
            }
            if (isStopped()) {
                return result;
            }

            const validatedTarget = mode === "remove" ? "" : validateCategoryTitle(targetCat);
            if (mode !== "remove" && validatedTarget === null) {
                await hooks.askDialog({
                    message: wgULS(
                        "目标分类名称无效（不能包含 [[、]]、{{、}}、| 等特殊字符）。请检查后重试。",
                        "目標分類名稱無效（不能包含 [[、]]、{{、}}、| 等特殊字元）。請檢查後重試。",
                    ),
                    showCancel: false,
                });
                return result;
            }
            const cleanTarget = validatedTarget ?? "";

            if (
                mode === "move"
                && sourceCat !== ""
                && options.isAllSelected === true
                && !sameCategory(sourceCat, cleanTarget)
            ) {
                const normalizedSource = normalizeCatName(sourceCat);
                const message = wgULS(
                    `检测到您正在迁移当前分类下的全部成员。\n如果只是需要将「${normalizedSource}」合并或迁移至「${cleanTarget}」，只需在分类页悬挂 {{分类重定向|${cleanTarget}}}，次日由机器人自动处理，无需手动批量操作。\n\n您也可以点击「悬挂分类重定向」将当前分类页替换为重定向，如果特别着急请点击「立即执行」。`,
                    `檢測到您正在遷移當前分類下的全部成員。\n如果只是需要將「${normalizedSource}」合併或遷移至「${cleanTarget}」，只需在分類頁懸掛 {{分类重定向|${cleanTarget}}}，次日由機器人自動處理，無需手動批次操作。\n\n您也可以點擊「懸掛分類重定向」將當前分類頁替換為重定向，如果特別著急請點擊「立即執行」。`,
                );
                let choice: "primary" | "extra" | "cancel";
                if (hooks.askMoveAllDialog) {
                    choice = await hooks.askMoveAllDialog({
                        message,
                        primaryLabel: wgULS("立即执行", "立即執行"),
                        extraLabel: wgULS("悬挂分类重定向", "懸掛分類重定向"),
                    });
                } else {
                    const confirmed = await hooks.askDialog({ message, showCancel: true });
                    choice = confirmed ? "primary" : "cancel";
                }
                if (choice === "cancel" || isStopped()) {
                    return result;
                }
                if (choice === "extra") {
                    const categoryTitle = `Category:${normalizedSource}`;
                    const redirectText = `#重定向 [[:Category:${cleanTarget}]]\n{{分类重定向|${cleanTarget}}}`;
                    try {
                        const page = await api.fetchPageWikitext(categoryTitle);
                        if (isStopped()) {
                            return result;
                        }
                        const editParams: EditPageParams = {
                            title: categoryTitle,
                            text: redirectText,
                            summary: wgULS(
                                `[[Help:Cat-a-lot|Cat-a-lot]]：分类重定向至[[Cat:${cleanTarget}]]`,
                                `[[Help:Cat-a-lot|Cat-a-lot]]：分類重定向至[[Cat:${cleanTarget}]]`,
                            ),
                            watchlist: prefs.watchlist,
                            minor: prefs.minor,
                            bot: initiallyHasBotRight,
                            tags: activeChangeTags(initiallyHasBotRight),
                        };
                        if (typeof page.timestamp === "string" && page.timestamp !== "") {
                            editParams.basetimestamp = page.timestamp;
                        }
                        if (typeof page.curtimestamp === "string" && page.curtimestamp !== "") {
                            editParams.starttimestamp = page.curtimestamp;
                        }
                        await api.editPage(editParams);
                        hooks.notify(
                            wgULS(
                                `已将「${categoryTitle}」替换为分类重定向。`,
                                `已將「${categoryTitle}」替換為分類重定向。`,
                            ),
                            "success",
                        );
                    } catch (error) {
                        hooks.notify(
                            wgULS(
                                `替换分类重定向失败：${errorMessage(error)}`,
                                `替換分類重定向失敗：${errorMessage(error)}`,
                            ),
                            "error",
                        );
                    }
                    return result;
                }
            }

            if (!initiallyHasBotRight) {
                if (isSysopOrStaff && titles.length > SYSOP_FLOOD_PROMPT_THRESHOLD) {
                    const approved = await hooks.askDialog({
                        message: wgULS(
                            `您本次计划批量处理 ${titles.length} 个页面（已超过 10 页）。\n建议临时授权机器用户以避免近期更改刷屏并豁免速率限制。\n\n是否立即为您自授权 2 小时的机器用户？`,
                            `您本次計劃批次處理 ${titles.length} 個頁面（已超過 10 頁）。\n建議臨時授權機器用戶以避免近期更改洗版並豁免速率限制。\n\n是否立即為您自授權 2 小時的機器用戶？`,
                        ),
                        showCancel: true,
                    });
                    if (isStopped()) {
                        return result;
                    }
                    if (approved) {
                        try {
                            grantedThisRun = await hooks.requestSelfFlood();
                        } catch {
                            // 自授权失败时按普通用户继续，速率限制由 delayMs 兜底
                            grantedThisRun = false;
                        }
                        if (isStopped()) {
                            return result;
                        }
                    }
                } else if (!isSysopOrStaff && titles.length > NON_BOT_MAX_PAGES) {
                    await hooks.askDialog({
                        message: wgULS(
                            `非机器用户单次最多批量处理 ${NON_BOT_MAX_PAGES} 个页面（当前已选 ${titles.length} 个）。请减少选择数量后再试。`,
                            `非機器用戶單次最多批次處理 ${NON_BOT_MAX_PAGES} 個頁面（當前已選 ${titles.length} 個）。請減少選擇數量後再試。`,
                        ),
                        showCancel: false,
                    });
                    return result;
                }
            }

            // 本次运行实际拥有的 bot/flood 权限：初始权限或本次自授权成功
            const hasBotRight = initiallyHasBotRight || grantedThisRun;
            const delayMs = hasBotRight ? 0 : NON_BOT_DELAY_MS;
            running = true;
            hooks.setRunning(true);
            hooks.setProgress(0, titles.length);
            hooks.setCurrentTitle("");

            for (let i = 0; i < titles.length; i += 1) {
                if (isStopped()) {
                    break;
                }
                const title = titles[i];
                hooks.setCurrentTitle(title);
                let editSubmitted = false;

                try {
                    const page = await api.fetchPageWikitext(title);
                    if (isStopped()) {
                        break;
                    }
                    if (page.missing || page.invalid || page.content === undefined) {
                        result.skippedServer.push(`${title}（${wgULS("页面不存在或无法读取", "頁面不存在或無法讀取")}）`);
                    } else {
                        const computed = computeNewWikitext({
                            text: page.content,
                            mode,
                            sourceCat,
                            targetCat: cleanTarget,
                        });
                        if (computed.status === "skipped-already") {
                            result.skippedAlready.push(title);
                        } else if (computed.status === "skipped-not-found") {
                            result.skippedNotFound.push(title);
                        } else if (computed.status === "invalid-target") {
                            result.skippedServer.push(`${title}（${wgULS("目标分类无效", "目標分類無效")}）`);
                        } else {
                            const editParams: EditPageParams = {
                                title,
                                text: computed.text,
                                summary: buildEditSummary(mode, sourceCat, cleanTarget),
                                watchlist: prefs.watchlist,
                                minor: prefs.minor,
                                bot: hasBotRight,
                                tags: activeChangeTags(hasBotRight),
                            };
                            if (typeof page.timestamp === "string" && page.timestamp !== "") {
                                editParams.basetimestamp = page.timestamp;
                            }
                            if (typeof page.curtimestamp === "string" && page.curtimestamp !== "") {
                                editParams.starttimestamp = page.curtimestamp;
                            }
                            editSubmitted = true;
                            await api.editPage(editParams);
                            hooks.onPageDone(title);
                            result.done += 1;
                        }
                    }
                } catch (error) {
                    const aborted = isStopped() && isAbortError(error);
                    let reconciled = false;
                    if (editSubmitted && !isApiBusinessError(error) && !isStopped()) {
                        try {
                            const latest = await api.fetchPageWikitext(title);
                            if (
                                latest.content !== undefined
                                && verifyCommittedOnServer({
                                    latestText: latest.content,
                                    mode,
                                    sourceCat,
                                    targetCat: cleanTarget,
                                })
                            ) {
                                hooks.onPageDone(title);
                                result.done += 1;
                                reconciled = true;
                            }
                        } catch {
                            // 回读失败时按未提交处理
                        }
                    }
                    if (!reconciled && !aborted) {
                        result.skippedServer.push(`${title}（${errorMessage(error)}）`);
                    }
                }

                hooks.setProgress(i + 1, titles.length);
                if (delayMs > 0 && i < titles.length - 1 && !isStopped()) {
                    await waitDelay(delayMs);
                }
            }

            return result;
        } finally {
            if (grantedThisRun) {
                try {
                    await hooks.releaseSelfFlood();
                } catch {
                }
            }
            clearDelay();
            if (running) {
                hooks.setRunning(false);
            }
            hooks.setCurrentTitle("");
            result.stopped = isStopped();
        }
    };

    return { result: run(), stop };
};

export { startBatch };
