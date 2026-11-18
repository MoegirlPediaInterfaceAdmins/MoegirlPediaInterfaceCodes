import { MAX_QUERY_TITLES } from "./api.ts";
import {
    NON_BOT_DELAY_MS,
    NON_BOT_MAX_PAGES,
    SYSOP_FLOOD_PROMPT_THRESHOLD,
    activeChangeTags,
} from "./constants.ts";
import {
    computeNewWikitext,
    extractCategoryNames,
    normalizeCatName,
    sameCategory,
    validateCategoryTitle,
    verifyCommittedOnServer,
} from "./wikitext.ts";
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
            skippedVariant: [],
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

            if (!initiallyHasBotRight && !isSysopOrStaff && titles.length > NON_BOT_MAX_PAGES) {
                await hooks.askDialog({
                    message: wgULS(
                        `非机器用户单次最多批量处理 ${NON_BOT_MAX_PAGES} 个页面（当前已选 ${titles.length} 个）。请减少选择数量后再试。`,
                        `非機器用戶單次最多批次處理 ${NON_BOT_MAX_PAGES} 個頁面（當前已選 ${titles.length} 個）。請減少選擇數量後再試。`,
                    ),
                    showCancel: false,
                });
                return result;
            }

            const MAX_VARIANT_QUERIES_PER_PAGE = 20;
            const MAX_PRIVILEGED_CATS_PER_PAGE = 200;
            const MAX_SOURCE_VARIANTS_PER_PAGE = 20;
            const variantCache = new Map<string, string>();
            const canonicalOf = (name: string): string => {
                const clean = normalizeCatName(name);
                return variantCache.get(clean) ?? clean;
            };
            const ensureVariantsResolved = async (names: readonly string[], batchSize: number): Promise<void> => {
                const missing: string[] = [];
                for (const raw of names) {
                    const clean = normalizeCatName(raw);
                    if (clean && !variantCache.has(clean)) {
                        missing.push(clean);
                    }
                }
                if (missing.length === 0) {
                    return;
                }
                const resolved = await api.resolveCategoryVariants(missing, batchSize);
                for (const name of missing) {
                    const canonical = resolved.get(name);
                    if (canonical !== undefined) {
                        variantCache.set(name, canonical);
                    }
                }
            };

            // move 模式无论是否全选，都在运行前解析一次 [sourceCat, cleanTarget]，防止把页面改写成等价红链变体；
            // add/copy 解析一次 [cleanTarget]，供每页用缓存的规范目标分类比对页内分类（不额外发每页请求）。
            let moveVariantsConfirmed = false;
            const preflightNames: string[] = [];
            if (mode === "move" && sourceCat !== "" && !sameCategory(sourceCat, cleanTarget)) {
                preflightNames.push(sourceCat, cleanTarget);
            } else if ((mode === "add" || mode === "copy") && cleanTarget !== "") {
                preflightNames.push(cleanTarget);
            }
            if (preflightNames.length > 0) {
                hooks.setCurrentTitle(wgULS("正在校验分类变体…", "正在校驗分類變體…"));
                hooks.setProgress(0, titles.length);
                try {
                    await ensureVariantsResolved(
                        preflightNames,
                        isSysopOrStaff || initiallyHasBotRight ? MAX_QUERY_TITLES : 1,
                    );
                    moveVariantsConfirmed = mode === "move";
                } catch (error) {
                    if (isStopped() && isAbortError(error)) {
                        hooks.setCurrentTitle("");
                        hooks.notify(wgULS("已中止批处理。", "已中止批次處理。"), "info");
                        return result;
                    }
                    // 前置解析失败时：move 不提供分类重定向选项，add/copy 继续按原名执行
                }
                hooks.setCurrentTitle("");
                if (isStopped()) {
                    hooks.notify(wgULS("已中止批处理。", "已中止批次處理。"), "info");
                    return result;
                }
                if (moveVariantsConfirmed && sameCategory(canonicalOf(sourceCat), canonicalOf(cleanTarget))) {
                    hooks.notify(
                        wgULS("源分类与目标分类指向同一分类，未执行任何编辑。", "源分類與目標分類指向同一分類，未執行任何編輯。"),
                        "info",
                    );
                    for (const t of titles) {
                        result.skippedAlready.push(t);
                    }
                    return result;
                }
            }

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
                if (moveVariantsConfirmed && hooks.askMoveAllDialog) {
                    choice = await hooks.askMoveAllDialog({
                        message,
                        primaryLabel: wgULS("立即执行", "立即執行"),
                        extraLabel: wgULS("悬挂分类重定向", "懸掛分類重定向"),
                    });
                } else {
                    const confirmed = await hooks.askDialog({
                        message: moveVariantsConfirmed
                            ? message
                            : wgULS(
                                `检测到您正在迁移当前分类下的全部成员。\n将「${normalizedSource}」批量移动至「${cleanTarget}」，是否继续？`,
                                `檢測到您正在遷移當前分類下的全部成員。\n將「${normalizedSource}」批次移動至「${cleanTarget}」，是否繼續？`,
                            ),
                        showCancel: true,
                    });
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

            if (!initiallyHasBotRight && isSysopOrStaff && titles.length > SYSOP_FLOOD_PROMPT_THRESHOLD) {
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
            }

            // 本次运行实际拥有的 bot/flood 权限：初始权限或本次自授权成功
            const hasBotRight = initiallyHasBotRight || grantedThisRun;
            const canBatchTitleQueries = isSysopOrStaff || hasBotRight;
            const delayMs = hasBotRight ? 0 : NON_BOT_DELAY_MS;
            const findVariantMatchesForPage = async (pageCats: readonly string[]): Promise<{
                sourceMatches: string[];
                targetMatches: string[];
                truncated: boolean;
            }> => {
                const cleanSource = normalizeCatName(sourceCat);
                const extraTargets = mode === "move" && cleanTarget !== "" ? [cleanTarget] : [];
                if (canBatchTitleQueries) {
                    let truncated = pageCats.length > MAX_PRIVILEGED_CATS_PER_PAGE;
                    const boundedCats = pageCats.slice(0, MAX_PRIVILEGED_CATS_PER_PAGE);
                    await ensureVariantsResolved([...boundedCats, sourceCat, ...extraTargets], MAX_QUERY_TITLES);
                    if (isStopped()) {
                        return { sourceMatches: [], targetMatches: [], truncated: false };
                    }
                    const canonicalSource = canonicalOf(sourceCat);
                    const canonicalTarget = cleanTarget !== "" ? canonicalOf(cleanTarget) : "";
                    const sourceMatches = boundedCats.filter((cat) => sameCategory(canonicalOf(cat), canonicalSource));
                    if (sourceMatches.length > MAX_SOURCE_VARIANTS_PER_PAGE) {
                        truncated = true;
                    }
                    const targetMatches = canonicalTarget
                        ? boundedCats.filter((cat) => sameCategory(canonicalOf(cat), canonicalTarget))
                        : [];
                    return {
                        sourceMatches: sourceMatches.slice(0, MAX_SOURCE_VARIANTS_PER_PAGE),
                        targetMatches,
                        truncated,
                    };
                }
                // 非 sysop/bot/flood 每次请求仅允许查询 1 个标题；单页总变体查询次数严格计入 MAX_VARIANT_QUERIES_PER_PAGE
                let remainingQueries = MAX_VARIANT_QUERIES_PER_PAGE;
                let truncated = false;
                if (cleanSource && !variantCache.has(cleanSource)) {
                    if (remainingQueries <= 0) {
                        return { sourceMatches: [], targetMatches: [], truncated: true };
                    }
                    remainingQueries -= 1;
                    await ensureVariantsResolved([sourceCat], 1);
                    if (isStopped()) {
                        return { sourceMatches: [], targetMatches: [], truncated: false };
                    }
                }
                if (mode === "move" && cleanTarget !== "" && !variantCache.has(cleanTarget)) {
                    if (remainingQueries <= 0) {
                        return { sourceMatches: [], targetMatches: [], truncated: true };
                    }
                    remainingQueries -= 1;
                    await ensureVariantsResolved([cleanTarget], 1);
                    if (isStopped()) {
                        return { sourceMatches: [], targetMatches: [], truncated: false };
                    }
                }
                const canonicalSource = canonicalOf(sourceCat);
                const canonicalTarget = cleanTarget !== "" ? canonicalOf(cleanTarget) : "";
                const sourceMatches: string[] = [];
                const targetMatches: string[] = [];
                for (const cat of pageCats) {
                    if (!variantCache.has(cat)) {
                        if (remainingQueries <= 0) {
                            truncated = true;
                            continue;
                        }
                        remainingQueries -= 1;
                        await ensureVariantsResolved([cat], 1);
                        if (isStopped()) {
                            return { sourceMatches: [], targetMatches: [], truncated: false };
                        }
                    }
                    if (sameCategory(canonicalOf(cat), canonicalSource)) {
                        sourceMatches.push(cat);
                    }
                    if (canonicalTarget && sameCategory(canonicalOf(cat), canonicalTarget)) {
                        targetMatches.push(cat);
                    }
                }
                if (sourceMatches.length > MAX_SOURCE_VARIANTS_PER_PAGE) {
                    truncated = true;
                }
                return {
                    sourceMatches: sourceMatches.slice(0, MAX_SOURCE_VARIANTS_PER_PAGE),
                    targetMatches,
                    truncated,
                };
            };
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
                let effectiveSourceVariants: string[] = [];
                let effectiveTargetVariants: string[] = [];

                try {
                    const page = await api.fetchPageWikitext(title);
                    if (isStopped()) {
                        break;
                    }
                    if (page.missing || page.invalid || page.content === undefined) {
                        result.skippedServer.push(`${title}（${wgULS("页面不存在或无法读取", "頁面不存在或無法讀取")}）`);
                    } else {
                        const pageCats = extractCategoryNames(page.content);
                        if (cleanTarget !== "" && pageCats.length > 0) {
                            const canonicalTarget = canonicalOf(cleanTarget);
                            effectiveTargetVariants = pageCats.filter((cat) => sameCategory(canonicalOf(cat), canonicalTarget));
                        }
                        let computed = computeNewWikitext({
                            text: page.content,
                            mode,
                            sourceCat,
                            targetCat: cleanTarget,
                            targetVariants: effectiveTargetVariants,
                        });
                        let variantSkipReason: string | null = null;
                        if (computed.status === "skipped-not-found" && sourceCat !== "" && pageCats.length > 0) {
                            try {
                                const variantResult = await findVariantMatchesForPage(pageCats);
                                if (isStopped()) {
                                    break;
                                }
                                if (variantResult.truncated) {
                                    variantSkipReason = `${title}（${wgULS("页面分类过多，部分分类未做变体解析，已跳过", "頁面分類過多，部分分類未做變體解析，已跳過")}）`;
                                } else if (
                                    mode === "move"
                                    && cleanTarget !== ""
                                    && sameCategory(canonicalOf(sourceCat), canonicalOf(cleanTarget))
                                ) {
                                    computed = { status: "skipped-already", text: page.content };
                                } else if (variantResult.sourceMatches.length > 0) {
                                    effectiveSourceVariants = variantResult.sourceMatches;
                                    effectiveTargetVariants = variantResult.targetMatches;
                                    computed = computeNewWikitext({
                                        text: page.content,
                                        mode,
                                        sourceCat,
                                        targetCat: cleanTarget,
                                        sourceVariants: effectiveSourceVariants,
                                        targetVariants: effectiveTargetVariants,
                                    });
                                }
                            } catch (error) {
                                if (isStopped() && isAbortError(error)) {
                                    throw error;
                                }
                                variantSkipReason = `${title}（${wgULS("分类变体解析失败：", "分類變體解析失敗：")}${errorMessage(error)}）`;
                            }
                        }
                        if (variantSkipReason !== null) {
                            result.skippedVariant.push(variantSkipReason);
                        } else if (computed.status === "skipped-already") {
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
                                    sourceVariants: effectiveSourceVariants,
                                    targetVariants: effectiveTargetVariants,
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
