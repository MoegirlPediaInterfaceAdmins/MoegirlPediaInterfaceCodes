// 基于 Wikitext 源码与指数回溯+二分/多路查找的 wikiBlame（拷打编辑）小工具
// 适配移动端与繁简/字词转换（LC），支持 sysop/staff 批量查询修订及非 noratelimit 用户使用前警告
"use strict";
$(() => {
    const {
        wgIsArticle,
        wgArticleId,
        wgNamespaceNumber,
        wgPageName,
        wgUserName,
    } = mw.config.get([
        "wgIsArticle",
        "wgArticleId",
        "wgNamespaceNumber",
        "wgPageName",
        "wgUserName",
    ]);

    if (!wgIsArticle || !wgArticleId || wgNamespaceNumber % 2 === 1) {
        return;
    }

    const canBatchQueryRevisions = true;
    const MULTI_REV_BATCH_SIZE = 50;
    const MULTI_WAY_BRANCHES = 8;
    const DEFAULT_MAX_REVISIONS = 1000;
    const HARD_MAX_REVISIONS = 5000;
    const MAX_CACHED_REVISIONS = 150;
    const VIRTUAL_ROW_HEIGHT = 24;
    const VIRTUAL_WINDOW_SIZE = 120;
    const VIRTUAL_OVERSCAN = 30;

    const sleep = (ms) => new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

    const getSelectedText = (containerEl = null) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return "";
        }
        if (containerEl) {
            const { anchorNode, focusNode } = selection;
            if (!anchorNode || !focusNode || !containerEl.contains(anchorNode) || !containerEl.contains(focusNode)) {
                return "";
            }
        }
        return selection.toString().trim();
    };

    const extractSlotContent = (rev) => {
        if (!rev) {
            return null;
        }
        if (rev.slots && rev.slots.main) {
            if (rev.slots.main.texthidden || rev.slots.main.content === undefined) {
                return null;
            }
            return rev.slots.main.content;
        }
        if (rev.texthidden || rev["*"] === undefined) {
            return null;
        }
        return rev["*"];
    };

    const formatTimestamp = (iso) => {
        if (!iso) {
            return "";
        }
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return iso;
        }
        return date.toLocaleString();
    };

    const createMatcher = (targetText, context, caseInsensitive) => {
        const normalize = (str) => caseInsensitive ? str.toLowerCase() : str;
        const normTrim = (str) => normalize(str.trim());

        if (!context) {
            const needle = normalize(targetText);
            return (text) => text !== null && normalize(text).includes(needle);
        }

        const needle = normTrim(targetText);
        const prevNeedle = context.prevLine ? normTrim(context.prevLine) : "";
        const nextNeedle = context.nextLine ? normTrim(context.nextLine) : "";
        const beforeNeedles = (context.nearbyBefore || []).map(normTrim).filter(Boolean);
        const afterNeedles = (context.nearbyAfter || []).map(normTrim).filter(Boolean);
        const occurrenceCount = context.occurrenceCount || 1;

        return (text) => {
            if (text === null) {
                return false;
            }
            // 对点击选中的行采用整行精确匹配与邻近上下文消歧，避免子串误匹配或邻行修改导致漏判
            const normLines = text.split("\n").map(normTrim);
            const matchingIndices = [];
            for (let i = 0; i < normLines.length; i++) {
                if (normLines[i] === needle) {
                    matchingIndices.push(i);
                }
            }
            if (matchingIndices.length === 0) {
                return false;
            }

            const matchesBothImmediateNeighbors = (i) => {
                const prevOk = !prevNeedle || i > 0 && normLines[i - 1] === prevNeedle;
                const nextOk = !nextNeedle || i + 1 < normLines.length && normLines[i + 1] === nextNeedle;
                return prevOk && nextOk;
            };

            const matchesAnyNearbyContext = (i) => {
                if (!prevNeedle && !nextNeedle && beforeNeedles.length === 0 && afterNeedles.length === 0) {
                    return true;
                }
                if (prevNeedle && i > 0 && normLines[i - 1] === prevNeedle) {
                    return true;
                }
                if (nextNeedle && i + 1 < normLines.length && normLines[i + 1] === nextNeedle) {
                    return true;
                }
                if (beforeNeedles.length > 0) {
                    let collected = 0;
                    for (let j = i - 1; j >= 0 && collected < 3; j--) {
                        if (!normLines[j]) {
                            continue;
                        }
                        collected++;
                        if (beforeNeedles.includes(normLines[j])) {
                            return true;
                        }
                    }
                }
                if (afterNeedles.length > 0) {
                    let collected = 0;
                    for (let j = i + 1; j < normLines.length && collected < 3; j++) {
                        if (!normLines[j]) {
                            continue;
                        }
                        collected++;
                        if (afterNeedles.includes(normLines[j])) {
                            return true;
                        }
                    }
                }
                return false;
            };

            if ((prevNeedle || nextNeedle) && matchingIndices.some(matchesBothImmediateNeighbors)) {
                return true;
            }
            if (context.isDuplicate) {
                return matchingIndices.length >= occurrenceCount && matchingIndices.some(matchesAnyNearbyContext);
            }
            return matchingIndices.length === 1 && matchesAnyNearbyContext(matchingIndices[0]);
        };
    };

    class WikiBlameSession {
        constructor() {
            this.api = new mw.Api();
            this.contentCache = new Map();
            this.hasApiHighLimits = false;
            this.hasNoRateLimit = false;
            this.pendingRequests = new Set();
            this.pendingRequestsBySignal = new Map();
            this.canBatchRevisions = canBatchQueryRevisions;
            this.rightsLoaded = false;
        }

        async initRights() {
            if (this.rightsLoaded) {
                return;
            }
            try {
                const rights = await mw.user.getRights();
                this.hasApiHighLimits = rights.includes("apihighlimits");
                this.hasNoRateLimit = rights.includes("noratelimit");
            } catch {
                this.hasApiHighLimits = false;
                this.hasNoRateLimit = false;
            }
            this.rightsLoaded = true;
        }

        getCachedContent(revid) {
            if (!this.contentCache.has(revid)) {
                return undefined;
            }
            const content = this.contentCache.get(revid);
            this.contentCache.delete(revid);
            this.contentCache.set(revid, content);
            return content;
        }

        setCachedContent(revid, content) {
            if (this.contentCache.has(revid)) {
                this.contentCache.delete(revid);
            }
            this.contentCache.set(revid, content);
            while (this.contentCache.size > MAX_CACHED_REVISIONS) {
                const oldestKey = this.contentCache.keys().next().value;
                this.contentCache.delete(oldestKey);
            }
        }

        clearCache() {
            this.contentCache.clear();
        }

        abortSignal(signal) {
            if (!signal) {
                return;
            }
            signal.cancelled = true;
            const reqs = this.pendingRequestsBySignal.get(signal);
            if (reqs) {
                for (const req of reqs) {
                    req.abort?.();
                }
                this.pendingRequestsBySignal.delete(signal);
            }
        }

        abortAll() {
            for (const req of this.pendingRequests) {
                req.abort?.();
            }
            this.pendingRequests.clear();
            this.pendingRequestsBySignal.clear();
        }

        async requestWithBackoff(params, signal, usePost = false) {
            if (signal && signal.cancelled) {
                throw new Error("CANCELLED");
            }
            const maxRetries = 4;
            let delay = 0;
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                if (signal && signal.cancelled) {
                    throw new Error("CANCELLED");
                }
                if (attempt > 0 || delay > 0) {
                    await sleep(delay);
                }
                if (signal && signal.cancelled) {
                    throw new Error("CANCELLED");
                }
                try {
                    const reqParams = {
                        formatversion: 2,
                        ...params,
                    };
                    if (wgUserName) {
                        reqParams.assertuser = wgUserName;
                    }
                    const req = usePost ? this.api.post(reqParams) : this.api.get(reqParams);
                    this.pendingRequests.add(req);
                    if (signal) {
                        let signalReqs = this.pendingRequestsBySignal.get(signal);
                        if (!signalReqs) {
                            signalReqs = new Set();
                            this.pendingRequestsBySignal.set(signal, signalReqs);
                        }
                        signalReqs.add(req);
                    }
                    try {
                        return await req;
                    } finally {
                        this.pendingRequests.delete(req);
                        if (signal) {
                            const signalReqs = this.pendingRequestsBySignal.get(signal);
                            if (signalReqs) {
                                signalReqs.delete(req);
                                if (signalReqs.size === 0) {
                                    this.pendingRequestsBySignal.delete(signal);
                                }
                            }
                        }
                    }
                } catch (err) {
                    const isRateLimited = err === "ratelimited" || err && err.code === "ratelimited";
                    if (isRateLimited && attempt < maxRetries) {
                        delay = Math.min((delay || 250) * 2 + 500, 8000);
                        continue;
                    }
                    const info = err && err.message || (typeof err === "string" ? err : "API 请求失败");
                    throw new Error(`${info}`, { cause: err });
                }
            }
            throw new Error("RATE_LIMITED");
        }

        async fetchCurrentSource(signal) {
            await this.initRights();
            const data = await this.requestWithBackoff({
                action: "query",
                prop: "revisions",
                titles: wgPageName,
                rvprop: "ids|timestamp|user|sha1|content|comment",
                rvslots: "main",
                rvlimit: 1,
            }, signal);
            const page = data && data.query && data.query.pages && data.query.pages[0];
            const rev = page && page.revisions && page.revisions[0];
            if (!rev) {
                throw new Error("NO_REVISIONS");
            }
            const content = extractSlotContent(rev);
            if (content === null) {
                throw new Error("CONTENT_HIDDEN");
            }
            this.setCachedContent(rev.revid, content);
            return {
                revid: rev.revid,
                timestamp: rev.timestamp,
                user: rev.user,
                content,
            };
        }

        async fetchRevisionMetadata({ startDate, endDate, maxRevisions, signal, onProgress }) {
            await this.initRights();
            const batchSize = this.hasApiHighLimits ? 500 : 50;
            const cappedMax = Math.min(Math.max(1, maxRevisions), HARD_MAX_REVISIONS);
            const rawRevs = [];
            let continueParams = null;

            while (rawRevs.length < cappedMax) {
                if (signal && signal.cancelled) {
                    throw new Error("CANCELLED");
                }
                const remaining = cappedMax - rawRevs.length;
                const params = {
                    action: "query",
                    prop: "revisions",
                    titles: wgPageName,
                    rvprop: "ids|timestamp|user|sha1|comment",
                    rvlimit: Math.min(batchSize, remaining),
                    rvdir: "older",
                };
                if (endDate) {
                    const [year, month, day] = endDate.split("-").map((n) => +n);
                    params.rvstart = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();
                }
                if (startDate) {
                    const [year, month, day] = startDate.split("-").map((n) => +n);
                    params.rvend = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
                }
                if (continueParams) {
                    Object.assign(params, continueParams);
                }
                const data = await this.requestWithBackoff(params, signal);
                const page = data && data.query && data.query.pages && data.query.pages[0];
                const revs = page && page.revisions || [];
                rawRevs.push(...revs);
                if (onProgress) {
                    onProgress(`正在拉取修订元数据：已获取 ${rawRevs.length} 条…`);
                }
                if (!data.continue || !data.continue.rvcontinue || revs.length === 0) {
                    break;
                }
                continueParams = data.continue;
            }

            // 转为从旧到新，保留被隐藏修订以避免将两侧可见修订误判为相邻，并跳过 sha1 相同的连续重复可见版本
            const chronological = rawRevs.reverse();
            const deduped = [];
            for (const rev of chronological) {
                const prev = deduped.length > 0 ? deduped[deduped.length - 1] : null;
                if (prev && !prev.texthidden && !rev.texthidden && prev.sha1 && rev.sha1 && prev.sha1 === rev.sha1) {
                    continue;
                }
                deduped.push(rev);
            }
            return deduped;
        }

        async fetchRevisionContentsBatch(revids, signal) {
            const result = new Map();
            const uncached = [];
            for (const id of revids) {
                const cached = this.getCachedContent(id);
                if (cached !== undefined) {
                    result.set(id, cached);
                } else {
                    uncached.push(id);
                }
            }
            for (let i = 0; i < uncached.length; i += MULTI_REV_BATCH_SIZE) {
                const chunk = uncached.slice(i, i + MULTI_REV_BATCH_SIZE);
                const data = await this.requestWithBackoff({
                    action: "query",
                    prop: "revisions",
                    revids: chunk.join("|"),
                    rvprop: "ids|content",
                    rvslots: "main",
                }, signal);
                const pages = data && data.query && data.query.pages || [];
                for (const page of pages) {
                    const revs = page.revisions || [];
                    for (const rev of revs) {
                        const content = extractSlotContent(rev);
                        if (content !== null) {
                            this.setCachedContent(rev.revid, content);
                            result.set(rev.revid, content);
                        }
                    }
                }
            }
            for (const id of revids) {
                if (!result.has(id)) {
                    result.set(id, null);
                }
            }
            return result;
        }

        async fetchRevisionContent(revid, signal) {
            const cached = this.getCachedContent(revid);
            if (cached !== undefined) {
                return cached;
            }
            const data = await this.requestWithBackoff({
                action: "query",
                prop: "revisions",
                revids: revid,
                rvprop: "ids|content",
                rvslots: "main",
            }, signal);
            const page = data && data.query && data.query.pages && data.query.pages[0];
            const rev = page && page.revisions && page.revisions[0];
            const content = extractSlotContent(rev);
            if (content !== null) {
                this.setCachedContent(revid, content);
            }
            return content;
        }

        async fetchCompare(fromrev, torev, signal) {
            if (!fromrev) {
                return null;
            }
            const data = await this.requestWithBackoff({
                action: "compare",
                fromrev,
                torev,
            }, signal, true);
            return data && data.compare ? data.compare : null;
        }

        async findNearestMatchBackward({ revisions, startIndex, matcher, signal, onProgress }) {
            if (this.canBatchRevisions) {
                for (let end = startIndex; end >= 0; end -= MULTI_REV_BATCH_SIZE) {
                    if (signal && signal.cancelled) {
                        throw new Error("CANCELLED");
                    }
                    const start = Math.max(0, end - MULTI_REV_BATCH_SIZE + 1);
                    const chunkIndices = [];
                    for (let i = end; i >= start; i--) {
                        chunkIndices.push(i);
                    }
                    if (onProgress) {
                        onProgress(`正在向更早版本回溯匹配位置（已检查至第 ${revisions.length - start} 条）…`);
                    }
                    const batchMap = await this.fetchRevisionContentsBatch(
                        chunkIndices.map((idx) => revisions[idx].revid),
                        signal,
                    );
                    for (const idx of chunkIndices) {
                        if (matcher(batchMap.get(revisions[idx].revid))) {
                            return idx;
                        }
                    }
                }
                return -1;
            }

            for (let i = startIndex; i >= 0; i--) {
                if (signal && signal.cancelled) {
                    throw new Error("CANCELLED");
                }
                if (onProgress && (startIndex - i) % 5 === 0) {
                    onProgress(`正在向更早版本回溯匹配位置（已回溯 ${startIndex - i + 1} 个版本）…`);
                }
                const content = await this.fetchRevisionContent(revisions[i].revid, signal);
                if (matcher(content)) {
                    return i;
                }
            }
            return -1;
        }

        async verifyNoDeletionBetween({ revisions, fromIndex, toIndex, matcher, signal, onProgress }) {
            let verifiedHigh = toIndex;
            if (toIndex - fromIndex <= 1) {
                return { deletedAt: -1, verifiedHigh };
            }
            if (this.canBatchRevisions) {
                for (let end = toIndex - 1; end > fromIndex; end -= MULTI_REV_BATCH_SIZE) {
                    if (signal && signal.cancelled) {
                        throw new Error("CANCELLED");
                    }
                    const start = Math.max(fromIndex + 1, end - MULTI_REV_BATCH_SIZE + 1);
                    const batchIndices = [];
                    for (let idx = end; idx >= start; idx--) {
                        batchIndices.push(idx);
                    }
                    if (onProgress) {
                        onProgress(`正在校验中间修订是否存在删除（第 ${start + 1}-${end + 1} 条）…`);
                    }
                    const batchMap = await this.fetchRevisionContentsBatch(
                        batchIndices.map((idx) => revisions[idx].revid),
                        signal,
                    );
                    for (const idx of batchIndices) {
                        const content = batchMap.get(revisions[idx].revid);
                        if (content === null) {
                            continue;
                        }
                        if (matcher(content)) {
                            verifiedHigh = idx;
                        } else {
                            return { deletedAt: idx, verifiedHigh };
                        }
                    }
                }
            } else {
                for (let idx = toIndex - 1; idx > fromIndex; idx--) {
                    if (signal && signal.cancelled) {
                        throw new Error("CANCELLED");
                    }
                    if (onProgress && (toIndex - idx) % 5 === 0) {
                        onProgress(`正在校验中间修订是否存在删除（版本 #${revisions[idx].revid}）…`);
                    }
                    const content = await this.fetchRevisionContent(revisions[idx].revid, signal);
                    if (content === null) {
                        continue;
                    }
                    if (matcher(content)) {
                        verifiedHigh = idx;
                    } else {
                        return { deletedAt: idx, verifiedHigh };
                    }
                }
            }
            return { deletedAt: -1, verifiedHigh };
        }

        async searchIntroduction({ revisions, matcher, beforeRevid, signal, onProgress }) {
            if (revisions.length === 0) {
                return { status: "NOT_FOUND_IN_RANGE" };
            }

            let anchorIndex = revisions.length - 1;
            if (beforeRevid) {
                const exactIdx = revisions.findIndex((r) => r.revid === beforeRevid);
                if (exactIdx !== -1) {
                    anchorIndex = exactIdx - 1;
                } else {
                    // 若用户更改了检索范围导致原版本不在新列表中，取新列表中小于 beforeRevid 的最新版本作为上界
                    anchorIndex = -1;
                    for (let i = revisions.length - 1; i >= 0; i--) {
                        if (revisions[i].revid < beforeRevid) {
                            anchorIndex = i;
                            break;
                        }
                    }
                }
                if (anchorIndex < 0) {
                    return { status: "NO_EARLIER_OCCURRENCE" };
                }
                anchorIndex = await this.findNearestMatchBackward({
                    revisions,
                    startIndex: anchorIndex,
                    matcher,
                    signal,
                    onProgress,
                });
                if (anchorIndex < 0) {
                    return { status: "NO_EARLIER_OCCURRENCE" };
                }
            } else {
                const latestContent = await this.fetchRevisionContent(revisions[anchorIndex].revid, signal);
                if (latestContent === null) {
                    return { status: "LATEST_UNAVAILABLE" };
                }
                if (!matcher(latestContent)) {
                    return { status: "NOT_IN_LATEST" };
                }
            }

            if (anchorIndex === 0) {
                return {
                    status: "IN_OLDEST",
                    rev: revisions[0],
                    prevRev: null,
                    revIndex: 0,
                    hiddenCount: 0,
                };
            }

            // 阶段 1：从 anchorIndex 向上指数回溯，捕捉最近一次被删除/未出现的位置，避免跳过“删除后重新加入”
            let low = -1;
            let high = anchorIndex;
            let step = 1;

            if (this.canBatchRevisions) {
                let probedZero = false;
                while (high > 0 && low === -1) {
                    if (signal && signal.cancelled) {
                        throw new Error("CANCELLED");
                    }
                    const probeIndices = [];
                    while (probeIndices.length < MULTI_WAY_BRANCHES && high - step >= 0) {
                        const candidate = high - step;
                        if (!probeIndices.includes(candidate)) {
                            probeIndices.push(candidate);
                        }
                        step *= 2;
                    }
                    if (!probedZero && (probeIndices.length === 0 || probeIndices[probeIndices.length - 1] > 0 && probeIndices.length < MULTI_WAY_BRANCHES && high - step < 0)) {
                        probeIndices.push(0);
                    }
                    if (probeIndices.length === 0) {
                        break;
                    }
                    if (probeIndices.includes(0)) {
                        probedZero = true;
                    }

                    if (onProgress) {
                        onProgress(`正在指数回溯最近引入区间（已探测至第 ${probeIndices[probeIndices.length - 1] + 1} 个版本）…`);
                    }
                    const probeMap = await this.fetchRevisionContentsBatch(
                        probeIndices.map((idx) => revisions[idx].revid),
                        signal,
                    );
                    for (const idx of probeIndices) {
                        const content = probeMap.get(revisions[idx].revid);
                        if (content === null) {
                            const { deletedAt, verifiedHigh } = await this.verifyNoDeletionBetween({
                                revisions,
                                fromIndex: idx - 1,
                                toIndex: high,
                                matcher,
                                signal,
                                onProgress,
                            });
                            if (deletedAt !== -1) {
                                low = deletedAt;
                                high = verifiedHigh;
                                break;
                            }
                            high = verifiedHigh;
                            continue;
                        }
                        if (matcher(content)) {
                            const { deletedAt, verifiedHigh } = await this.verifyNoDeletionBetween({
                                revisions,
                                fromIndex: idx,
                                toIndex: high,
                                matcher,
                                signal,
                                onProgress,
                            });
                            if (deletedAt !== -1) {
                                low = deletedAt;
                                high = verifiedHigh;
                                break;
                            }
                            high = idx;
                        } else {
                            low = idx;
                            break;
                        }
                    }
                    if (high === 0 && low === -1) {
                        return {
                            status: "IN_OLDEST",
                            rev: revisions[0],
                            prevRev: null,
                            revIndex: 0,
                            hiddenCount: 0,
                        };
                    }
                    if (probedZero && low === -1) {
                        break;
                    }
                }
            } else {
                while (high > 0 && low === -1) {
                    if (signal && signal.cancelled) {
                        throw new Error("CANCELLED");
                    }
                    const probeIdx = Math.max(0, anchorIndex - step);
                    if (onProgress) {
                        onProgress(`正在指数回溯最近引入区间（探测版本 #${revisions[probeIdx].revid}）…`);
                    }
                    const probeContent = await this.fetchRevisionContent(revisions[probeIdx].revid, signal);
                    if (probeContent === null) {
                        const { deletedAt, verifiedHigh } = await this.verifyNoDeletionBetween({
                            revisions,
                            fromIndex: probeIdx - 1,
                            toIndex: high,
                            matcher,
                            signal,
                            onProgress,
                        });
                        if (deletedAt !== -1) {
                            low = deletedAt;
                            high = verifiedHigh;
                            break;
                        }
                        high = verifiedHigh;
                    } else if (matcher(probeContent)) {
                        const { deletedAt, verifiedHigh } = await this.verifyNoDeletionBetween({
                            revisions,
                            fromIndex: probeIdx,
                            toIndex: high,
                            matcher,
                            signal,
                            onProgress,
                        });
                        if (deletedAt !== -1) {
                            low = deletedAt;
                            high = verifiedHigh;
                            break;
                        }
                        high = probeIdx;
                    } else {
                        low = probeIdx;
                        break;
                    }
                    if (probeIdx === 0) {
                        break;
                    }
                    step *= 2;
                }
            }

            if (low === -1 && high === 0) {
                return {
                    status: "IN_OLDEST",
                    rev: revisions[0],
                    prevRev: null,
                    revIndex: 0,
                    hiddenCount: 0,
                };
            }

            // 若指数回溯触达最早版本且仍未遇到明确不含该文本的可见版本（可能因部分历史版本内容被隐藏），向更早方向逐批检查可见版本
            if (low === -1 && high > 0) {
                if (this.canBatchRevisions) {
                    for (let end = high - 1; end >= 0 && low === -1; end -= MULTI_REV_BATCH_SIZE) {
                        if (signal && signal.cancelled) {
                            throw new Error("CANCELLED");
                        }
                        const start = Math.max(0, end - MULTI_REV_BATCH_SIZE + 1);
                        const batchIndices = [];
                        for (let idx = end; idx >= start; idx--) {
                            batchIndices.push(idx);
                        }
                        const batchMap = await this.fetchRevisionContentsBatch(
                            batchIndices.map((idx) => revisions[idx].revid),
                            signal,
                        );
                        for (const idx of batchIndices) {
                            const content = batchMap.get(revisions[idx].revid);
                            if (content === null) {
                                continue;
                            }
                            if (matcher(content)) {
                                high = idx;
                            } else {
                                low = idx;
                                break;
                            }
                        }
                    }
                } else {
                    for (let idx = high - 1; idx >= 0; idx--) {
                        if (signal && signal.cancelled) {
                            throw new Error("CANCELLED");
                        }
                        const content = await this.fetchRevisionContent(revisions[idx].revid, signal);
                        if (content === null) {
                            continue;
                        }
                        if (matcher(content)) {
                            high = idx;
                        } else {
                            low = idx;
                            break;
                        }
                    }
                }

                if (low === -1) {
                    if (high === 0) {
                        return {
                            status: "IN_OLDEST",
                            rev: revisions[0],
                            prevRev: null,
                            revIndex: 0,
                            hiddenCount: 0,
                        };
                    }
                    return {
                        status: "FOUND",
                        rev: revisions[high],
                        prevRev: null,
                        revIndex: high,
                        hiddenCount: high,
                    };
                }
            }

            // 阶段 2：在局部已知区间 [low, high] 内进行二分/多路精确收窄
            let rounds = 0;
            const totalRoundsEstimate = Math.max(
                1,
                this.canBatchRevisions
                    ? Math.ceil(Math.log(high - low + 1) / Math.log(MULTI_WAY_BRANCHES + 1))
                    : Math.ceil(Math.log2(high - low + 1)),
            );

            while (high - low > 1) {
                if (signal && signal.cancelled) {
                    throw new Error("CANCELLED");
                }
                rounds++;

                if (this.canBatchRevisions) {
                    const span = high - low - 1;
                    if (span <= MULTI_REV_BATCH_SIZE) {
                        if (onProgress) {
                            onProgress(`正在批量拉取最后 ${span} 个版本源码以精确定位…`);
                        }
                        const candidateIndices = [];
                        for (let idx = high - 1; idx > low; idx--) {
                            candidateIndices.push(idx);
                        }
                        const batchMap = await this.fetchRevisionContentsBatch(
                            candidateIndices.map((idx) => revisions[idx].revid),
                            signal,
                        );
                        // 从新到旧扫描，确保即使存在“删除后重新加入”也定位到最近一次引入
                        for (const idx of candidateIndices) {
                            const content = batchMap.get(revisions[idx].revid);
                            if (content === null) {
                                continue;
                            }
                            if (matcher(content)) {
                                high = idx;
                            } else {
                                low = idx;
                                break;
                            }
                        }
                        break;
                    }

                    if (onProgress) {
                        onProgress(`正在多路批量定位版本：第 ${rounds}/${totalRoundsEstimate} 轮（剩余区间 ${high - low} 个版本）…`);
                    }
                    const sampleIndices = [];
                    for (let b = 1; b <= MULTI_WAY_BRANCHES; b++) {
                        const idx = low + Math.floor((high - low) * b / (MULTI_WAY_BRANCHES + 1));
                        if (idx > low && idx < high && !sampleIndices.includes(idx)) {
                            sampleIndices.push(idx);
                        }
                    }
                    const sampleMap = await this.fetchRevisionContentsBatch(
                        sampleIndices.map((idx) => revisions[idx].revid),
                        signal,
                    );
                    let narrowed = false;
                    // 从新到旧检查采样点，并在缩窄前校验中间是否存在删除，避免跳过“删除后重新加入”
                    for (let i = sampleIndices.length - 1; i >= 0; i--) {
                        const idx = sampleIndices[i];
                        const content = sampleMap.get(revisions[idx].revid);
                        if (content === null) {
                            const { deletedAt, verifiedHigh } = await this.verifyNoDeletionBetween({
                                revisions,
                                fromIndex: idx - 1,
                                toIndex: high,
                                matcher,
                                signal,
                                onProgress,
                            });
                            if (deletedAt !== -1) {
                                low = deletedAt;
                                high = verifiedHigh;
                                narrowed = true;
                                break;
                            }
                            if (verifiedHigh < high) {
                                high = verifiedHigh;
                                narrowed = true;
                            }
                            continue;
                        }
                        if (matcher(content)) {
                            const { deletedAt, verifiedHigh } = await this.verifyNoDeletionBetween({
                                revisions,
                                fromIndex: idx,
                                toIndex: high,
                                matcher,
                                signal,
                                onProgress,
                            });
                            if (deletedAt !== -1) {
                                low = deletedAt;
                                high = verifiedHigh;
                                narrowed = true;
                                break;
                            }
                            high = idx;
                            narrowed = true;
                        } else {
                            low = idx;
                            narrowed = true;
                            break;
                        }
                    }
                    if (!narrowed) {
                        // 所有采样点内容均不可用，从 high - 1 向 low + 1 逐批查找可用修订
                        for (let end = high - 1; end > low && !narrowed; end -= MULTI_REV_BATCH_SIZE) {
                            if (signal && signal.cancelled) {
                                throw new Error("CANCELLED");
                            }
                            const start = Math.max(low + 1, end - MULTI_REV_BATCH_SIZE + 1);
                            const fallbackIndices = [];
                            for (let idx = end; idx >= start; idx--) {
                                fallbackIndices.push(idx);
                            }
                            const fallbackMap = await this.fetchRevisionContentsBatch(
                                fallbackIndices.map((idx) => revisions[idx].revid),
                                signal,
                            );
                            for (const idx of fallbackIndices) {
                                const content = fallbackMap.get(revisions[idx].revid);
                                if (content === null) {
                                    continue;
                                }
                                if (matcher(content)) {
                                    high = idx;
                                    narrowed = true;
                                } else {
                                    low = idx;
                                    narrowed = true;
                                    break;
                                }
                            }
                        }
                        if (!narrowed) {
                            break;
                        }
                    }
                } else {
                    const mid = Math.floor((low + high) / 2);
                    if (onProgress) {
                        onProgress(`正在二分定位版本：第 ${rounds}/${totalRoundsEstimate} 步（剩余区间 ${high - low} 个版本）…`);
                    }
                    const midContent = await this.fetchRevisionContent(revisions[mid].revid, signal);
                    if (midContent !== null) {
                        if (matcher(midContent)) {
                            const { deletedAt, verifiedHigh } = await this.verifyNoDeletionBetween({
                                revisions,
                                fromIndex: mid,
                                toIndex: high,
                                matcher,
                                signal,
                                onProgress,
                            });
                            if (deletedAt !== -1) {
                                low = deletedAt;
                                high = verifiedHigh;
                            } else {
                                high = mid;
                            }
                        } else {
                            low = mid;
                        }
                    } else {
                        const { deletedAt, verifiedHigh } = await this.verifyNoDeletionBetween({
                            revisions,
                            fromIndex: low,
                            toIndex: high,
                            matcher,
                            signal,
                            onProgress,
                        });
                        if (deletedAt !== -1) {
                            low = deletedAt;
                            high = verifiedHigh;
                        } else {
                            high = verifiedHigh;
                            break;
                        }
                    }
                }
            }

            return {
                status: "FOUND",
                rev: revisions[high],
                prevRev: low >= 0 ? revisions[low] : null,
                revIndex: high,
                hiddenCount: Math.max(0, high - low - 1),
            };
        }
    }

    class WikiBlameDialog extends OO.ui.Dialog {
        static static = {
            ...super.static,
            name: "wikiBlameDialog",
            escapable: true,
        };

        constructor(config, initialSelection, session) {
            super(config);
            this.initialSelection = initialSelection || "";
            this.session = session;
            this.sourceLines = [];
            this.filteredLineIndices = [];
            this.lineCounts = new Map();
            this.selectedLineIndex = null;
            this.selectedContext = null;
            this.lastRenderStart = -1;
            this.lastRenderEnd = -1;
            this.isBusy = false;
            this.cachedRevisions = null;
            this.cachedRangeKey = "";
            this.activeRunId = 0;
            this.activeRunSignal = null;
            this.sourceLoadSignal = null;
            this.currentSource = null;
            this.hasWarnedRateLimit = false;
        }

        getTeardownProcess(data) {
            return super.getTeardownProcess(data).next(() => {
                this.cancelActiveRun();
                if (this.sourceLoadSignal) {
                    this.session.abortSignal(this.sourceLoadSignal);
                    this.sourceLoadSignal = null;
                }
                this.session.abortAll();
                this.session.clearCache();
            });
        }

        initialize() {
            super.initialize();

            this.$body.addClass("wikiblame-dialog-body");

            const $header = $("<div>").addClass("wikiblame-header");
            const $title = $("<h3>").addClass("wikiblame-title").text("拷打编辑（Wikitext 源码定位）");
            this.closeButton = new OO.ui.ButtonWidget({
                framed: false,
                icon: "close",
                title: "关闭",
            });
            $header.append($title, this.closeButton.$element);

            this.searchInput = new OO.ui.TextInputWidget({
                value: this.initialSelection,
                placeholder: "输入或点选下方源码中的任意内容…",
            });
            this.submitButton = new OO.ui.ButtonWidget({
                label: "定位来源",
                flags: ["progressive", "primary"],
            });
            this.cancelButton = new OO.ui.ButtonWidget({
                label: "取消",
                flags: ["destructive"],
                disabled: true,
            });

            const $searchRow = $("<div>").addClass("wikiblame-search-row").append(
                $("<div>").addClass("wikiblame-search-input").append(this.searchInput.$element),
                $("<div>").addClass("wikiblame-actions").append(this.submitButton.$element, this.cancelButton.$element),
            );

            this.$hint = $("<p>").addClass("wikiblame-hint").text("直接点选下方源码中的任意一行（移动端推荐），或输入/粘贴 Wikitext 片段后点击“定位来源”。");

            this.advancedToggle = new OO.ui.ButtonWidget({
                label: "高级选项",
                framed: false,
                icon: "settings",
                classes: ["wikiblame-advanced-toggle"],
            });

            this.startDateInput = new OO.ui.TextInputWidget({
                placeholder: "YYYY-MM-DD（留空不限）",
            });
            this.endDateInput = new OO.ui.TextInputWidget({
                placeholder: "YYYY-MM-DD（留空不限）",
            });
            this.maxRevsInput = new OO.ui.TextInputWidget({
                value: `${DEFAULT_MAX_REVISIONS}`,
                placeholder: `1-${HARD_MAX_REVISIONS}`,
            });
            this.caseInsensitiveCheckbox = new OO.ui.CheckboxInputWidget({
                selected: false,
            });

            const $advancedPanel = $("<div>").addClass("wikiblame-advanced-panel").append(
                new OO.ui.FieldLayout(this.startDateInput, { label: "开始日期", align: "top", classes: ["wikiblame-advanced-field"] }).$element,
                new OO.ui.FieldLayout(this.endDateInput, { label: "结束日期", align: "top", classes: ["wikiblame-advanced-field"] }).$element,
                new OO.ui.FieldLayout(this.maxRevsInput, { label: `最多检索版本数（上限 ${HARD_MAX_REVISIONS}）`, align: "top", classes: ["wikiblame-advanced-field"] }).$element,
                new OO.ui.FieldLayout(this.caseInsensitiveCheckbox, { label: "忽略大小写", align: "inline", classes: ["wikiblame-advanced-field"] }).$element,
            );

            this.filterInput = new OO.ui.TextInputWidget({
                placeholder: "在当前源码中过滤/查找关键词…",
                icon: "search",
            });
            this.$filterCount = $("<span>").addClass("wikiblame-hint");
            const $sourceToolbar = $("<div>").addClass("wikiblame-source-toolbar").append(
                $("<div>").addClass("wikiblame-filter-input").append(this.filterInput.$element),
                this.$filterCount,
            );

            this.$sourceViewer = $("<div>").addClass("wikiblame-source-viewer").text("正在加载当前页面源码…");
            this.$progress = $("<div>").addClass("wikiblame-progress");
            this.$resultArea = $("<div>").hide();

            this.$body.append(
                $header,
                $searchRow,
                this.$hint,
                this.advancedToggle.$element,
                $advancedPanel,
                $sourceToolbar,
                this.$sourceViewer,
                this.$progress,
                this.$resultArea,
            );

            this.closeButton.on("click", () => {
                this.cancelActiveRun();
                this.close();
            });
            this.advancedToggle.on("click", () => {
                $advancedPanel.toggleClass("is-open");
                this.updateSize();
            });
            this.filterInput.on("change", () => {
                this.renderSourceLines();
            });
            this.searchInput.on("change", () => {
                if (this.activeRunSignal) {
                    this.cancelActiveRun();
                    this.setBusy(false);
                }
                if (this.selectedContext && this.searchInput.getValue().trim() !== this.selectedContext.lineText) {
                    this.selectedContext = null;
                }
            });
            for (const inputWidget of [this.startDateInput, this.endDateInput, this.maxRevsInput, this.caseInsensitiveCheckbox]) {
                inputWidget.on("change", () => {
                    if (this.activeRunSignal) {
                        this.cancelActiveRun();
                        this.setBusy(false);
                    }
                });
            }
            this.$sourceViewer.on("scroll", () => {
                this.renderVisibleSourceSlice(false);
            });
            this.$sourceViewer.on("keydown", ".wikiblame-source-line", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    $(e.currentTarget).trigger("click");
                }
            });
            this.$sourceViewer.on("click", ".wikiblame-source-line", (e) => {
                if (this.isBusy) {
                    return;
                }
                const lineEl = e.currentTarget;
                const idx = +$(lineEl).attr("data-line-index");
                const line = this.sourceLines[idx];
                if (line === undefined) {
                    return;
                }
                // 仅当选区位于当前触发行内部时才采用选区文本，避免误用其他行遗留的选区
                const innerSelection = getSelectedText(lineEl);
                const lineTrimmed = line.trim();
                const picked = innerSelection || lineTrimmed;
                if (!picked) {
                    return;
                }
                this.selectedLineIndex = idx;
                this.$sourceViewer.find(".wikiblame-source-line").removeClass("is-selected");
                $(lineEl).addClass("is-selected");
                if (innerSelection) {
                    this.selectedContext = null;
                } else {
                    const occurrenceCount = this.lineCounts.get(lineTrimmed) || 1;
                    let occurrenceIndex = 0;
                    for (let i = 0; i <= idx; i++) {
                        if (this.sourceLines[i].trim() === lineTrimmed) {
                            occurrenceIndex++;
                        }
                    }
                    const nearbyBefore = [];
                    for (let i = idx - 1; i >= 0 && nearbyBefore.length < 3; i--) {
                        const trimmed = this.sourceLines[i].trim();
                        if (trimmed) {
                            nearbyBefore.push(trimmed);
                        }
                    }
                    const nearbyAfter = [];
                    for (let i = idx + 1; i < this.sourceLines.length && nearbyAfter.length < 3; i++) {
                        const trimmed = this.sourceLines[i].trim();
                        if (trimmed) {
                            nearbyAfter.push(trimmed);
                        }
                    }
                    this.selectedContext = {
                        lineIndex: idx,
                        lineText: picked,
                        isDuplicate: occurrenceCount > 1,
                        occurrenceCount,
                        occurrenceIndex,
                        prevLine: idx > 0 ? this.sourceLines[idx - 1].trim() : "",
                        nextLine: idx + 1 < this.sourceLines.length ? this.sourceLines[idx + 1].trim() : "",
                        nearbyBefore,
                        nearbyAfter,
                    };
                }
                this.searchInput.setValue(picked);
            });
            this.submitButton.on("click", () => {
                this.runBlame(null);
            });
            this.cancelButton.on("click", () => {
                this.cancelActiveRun();
                this.$progress.text("已取消检索。");
                this.setBusy(false);
            });
            this.searchInput.on("enter", () => {
                this.runBlame(null);
            });

            this.loadCurrentSource();
        }

        cancelActiveRun() {
            this.activeRunId++;
            if (this.activeRunSignal) {
                this.session.abortSignal(this.activeRunSignal);
                this.activeRunSignal = null;
            }
        }

        setBusy(busy) {
            this.isBusy = busy;
            this.submitButton.setDisabled(busy);
            this.cancelButton.setDisabled(!busy);
            this.searchInput.setDisabled(busy);
            this.startDateInput.setDisabled(busy);
            this.endDateInput.setDisabled(busy);
            this.maxRevsInput.setDisabled(busy);
            this.caseInsensitiveCheckbox.setDisabled(busy);
        }

        async loadCurrentSource() {
            const loadSignal = { cancelled: false };
            this.sourceLoadSignal = loadSignal;
            try {
                const current = await this.session.fetchCurrentSource(loadSignal);
                if (loadSignal.cancelled) {
                    return;
                }
                this.currentSource = current;
                this.sourceLines = current.content.split("\n");
                this.lineCounts.clear();
                for (const line of this.sourceLines) {
                    const trimmed = line.trim();
                    if (trimmed) {
                        this.lineCounts.set(trimmed, (this.lineCounts.get(trimmed) || 0) + 1);
                    }
                }
                if (this.initialSelection && !current.content.includes(this.initialSelection)) {
                    this.$hint
                        .addClass("wikiblame-hint-warn")
                        .text("当前页面源码中未直接找到页面所选文本（可能经过了繁简/字词转换或来自模板），请在下方源码中点选或搜索对应源码。");
                }
                this.renderSourceLines();
                this.updateSize();
            } catch (err) {
                if (loadSignal.cancelled || err && err.message === "CANCELLED") {
                    return;
                }
                this.$sourceViewer.empty().append(
                    $("<span>").addClass("wikiblame-hint-error").text(`无法加载页面源码：${err.message || err}`),
                );
            }
        }

        renderSourceLines() {
            const keyword = this.filterInput.getValue().trim().toLowerCase();
            this.filteredLineIndices = [];
            for (let idx = 0; idx < this.sourceLines.length; idx++) {
                if (!keyword || this.sourceLines[idx].toLowerCase().includes(keyword)) {
                    this.filteredLineIndices.push(idx);
                }
            }
            this.$filterCount.text(keyword ? `匹配 ${this.filteredLineIndices.length} 行` : `共 ${this.sourceLines.length} 行`);
            this.$sourceViewer[0].scrollTop = 0;
            this.lastRenderStart = -1;
            this.lastRenderEnd = -1;
            this.renderVisibleSourceSlice(true);
        }

        renderVisibleSourceSlice(force = false) {
            if (!this.currentSource) {
                return;
            }
            const viewer = this.$sourceViewer[0];
            if (!viewer) {
                return;
            }
            const total = this.filteredLineIndices.length;
            if (total === 0) {
                if (force || this.lastRenderStart !== 0 || this.lastRenderEnd !== 0) {
                    this.$sourceViewer.empty().append($("<div>").addClass("wikiblame-hint").text("无匹配源码行。"));
                    this.lastRenderStart = 0;
                    this.lastRenderEnd = 0;
                }
                return;
            }
            const firstVisible = Math.floor(viewer.scrollTop / VIRTUAL_ROW_HEIGHT);
            const maxStart = Math.max(0, total - VIRTUAL_WINDOW_SIZE);
            const renderStart = Math.min(maxStart, Math.max(0, firstVisible - VIRTUAL_OVERSCAN));
            const renderEnd = Math.min(total, renderStart + VIRTUAL_WINDOW_SIZE);
            if (!force && renderStart === this.lastRenderStart && renderEnd === this.lastRenderEnd) {
                return;
            }
            this.lastRenderStart = renderStart;
            this.lastRenderEnd = renderEnd;

            const fragment = document.createDocumentFragment();
            if (renderStart > 0) {
                const topSpacer = document.createElement("div");
                topSpacer.style.height = `${renderStart * VIRTUAL_ROW_HEIGHT}px`;
                fragment.appendChild(topSpacer);
            }
            for (let i = renderStart; i < renderEnd; i++) {
                const idx = this.filteredLineIndices[i];
                const line = this.sourceLines[idx];
                const row = document.createElement("div");
                row.className = idx === this.selectedLineIndex ? "wikiblame-source-line is-selected" : "wikiblame-source-line";
                row.setAttribute("data-line-index", `${idx}`);
                row.setAttribute("data-line", `${idx + 1}`);
                row.setAttribute("tabindex", "0");

                const numSpan = document.createElement("span");
                numSpan.className = "wikiblame-line-num";
                numSpan.textContent = `${idx + 1}`;

                const textSpan = document.createElement("span");
                textSpan.className = "wikiblame-line-text";
                textSpan.textContent = line || " ";

                row.appendChild(numSpan);
                row.appendChild(textSpan);
                fragment.appendChild(row);
            }
            if (renderEnd < total) {
                const bottomSpacer = document.createElement("div");
                bottomSpacer.style.height = `${(total - renderEnd) * VIRTUAL_ROW_HEIGHT}px`;
                fragment.appendChild(bottomSpacer);
            }
            this.$sourceViewer.empty();
            viewer.appendChild(fragment);
        }

        async runBlame(beforeRevid) {
            this.cancelActiveRun();
            this.setBusy(false);

            const targetText = this.searchInput.getValue().trim();
            if (!targetText) {
                mw.notify("请先输入或点选需要定位的源码文本", { type: "warn" });
                return;
            }

            const startDate = this.startDateInput.getValue().trim();
            const endDate = this.endDateInput.getValue().trim();
            const isValidDate = (str) => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                    return false;
                }
                const [y, m, d] = str.split("-").map((n) => +n);
                const dt = new Date(Date.UTC(y, m - 1, d));
                return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
            };
            if (startDate && !isValidDate(startDate) || endDate && !isValidDate(endDate)) {
                const msg = "日期无效，请使用真实的 YYYY-MM-DD 日期（或留空）。";
                this.$progress.empty().append($("<span>").addClass("wikiblame-hint-error").text(msg));
                mw.notify(msg, { type: "error" });
                return;
            }
            if (startDate && endDate && endDate < startDate) {
                const msg = "结束日期不能早于起始日期。";
                this.$progress.empty().append($("<span>").addClass("wikiblame-hint-error").text(msg));
                mw.notify(msg, { type: "error" });
                return;
            }

            const rawMaxRevs = this.maxRevsInput.getValue().trim();
            if (!/^\d+$/.test(rawMaxRevs)) {
                const msg = `请在“最多检索版本数”中输入 1 到 ${HARD_MAX_REVISIONS} 之间的正整数。`;
                this.$progress.empty().append($("<span>").addClass("wikiblame-hint-error").text(msg));
                mw.notify(msg, { type: "error" });
                return;
            }
            const parsedMaxRevs = Number.parseInt(rawMaxRevs, 10);
            if (parsedMaxRevs < 1 || parsedMaxRevs > HARD_MAX_REVISIONS) {
                const msg = `最多检索版本数必须在 1 到 ${HARD_MAX_REVISIONS} 之间。`;
                this.$progress.empty().append($("<span>").addClass("wikiblame-hint-error").text(msg));
                mw.notify(msg, { type: "error" });
                return;
            }

            const runId = this.activeRunId;
            const runSignal = { cancelled: false };
            this.activeRunSignal = runSignal;
            const isStale = () => runId !== this.activeRunId || runSignal.cancelled;

            this.setBusy(true);
            if (!beforeRevid) {
                this.$resultArea.hide().empty();
            }

            const caseInsensitive = this.caseInsensitiveCheckbox.isSelected();
            const matcher = createMatcher(targetText, this.selectedContext, caseInsensitive);
            const rangeKey = `${startDate}|${endDate}|${parsedMaxRevs}`;

            try {
                await this.session.initRights();
                if (isStale()) {
                    return;
                }
                if (!this.session.hasNoRateLimit && !this.hasWarnedRateLimit) {
                    this.hasWarnedRateLimit = true;
                    mw.notify("当前账号无 noratelimit 权限，检索较多修订时可能触发 API 速率限制导致变慢或失败。", { type: "warn" });
                }

                if (!beforeRevid || !this.cachedRevisions || this.cachedRangeKey !== rangeKey) {
                    const revs = await this.session.fetchRevisionMetadata({
                        startDate,
                        endDate,
                        maxRevisions: parsedMaxRevs,
                        signal: runSignal,
                        onProgress: (msg) => {
                            if (!isStale()) {
                                this.$progress.text(msg);
                            }
                        },
                    });
                    if (isStale()) {
                        return;
                    }
                    this.cachedRevisions = revs;
                    this.cachedRangeKey = rangeKey;
                }

                const result = await this.session.searchIntroduction({
                    revisions: this.cachedRevisions,
                    matcher,
                    beforeRevid,
                    signal: runSignal,
                    onProgress: (msg) => {
                        if (!isStale()) {
                            this.$progress.text(msg);
                        }
                    },
                });
                if (isStale()) {
                    return;
                }

                if (result.status === "NOT_FOUND_IN_RANGE") {
                    this.$progress.empty().append($("<span>").addClass("wikiblame-hint-error").text("指定范围内没有可用的修订版本。"));
                    return;
                }
                if (result.status === "LATEST_UNAVAILABLE") {
                    this.$progress.empty().append($("<span>").addClass("wikiblame-hint-error").text("所选修订区间内的最新版本内容不可用（可能已被隐藏）。"));
                    return;
                }
                if (result.status === "NOT_IN_LATEST") {
                    this.$progress.empty().append($("<span>").addClass("wikiblame-hint-warn").text("所选修订区间内的最新版本中不包含该文本（或上下文已变化），请检查输入或放宽条件。"));
                    return;
                }
                if (result.status === "NO_EARLIER_OCCURRENCE") {
                    this.$resultArea.hide().empty();
                    this.$progress.empty().append($("<span>").addClass("wikiblame-hint-warn").text("在当前检索范围内未找到更早一次出现该文本的编辑。"));
                    return;
                }

                this.$progress.text("正在获取版本差异对比…");
                let compareData = null;
                let compareError = null;
                if (result.prevRev) {
                    try {
                        compareData = await this.session.fetchCompare(
                            result.prevRev.revid,
                            result.rev.revid,
                            runSignal,
                        );
                    } catch (err) {
                        if (isStale() || err && err.message === "CANCELLED") {
                            return;
                        }
                        compareError = err;
                    }
                }
                const comment = result.rev.comment || "";
                if (isStale()) {
                    return;
                }

                this.$progress.text(result.status === "IN_OLDEST" ? "该文本自区间内最早版本起即已存在。" : "定位完成。");
                this.renderResult(result, compareData, comment, compareError);
            } catch (err) {
                if (isStale() || err && err.message === "CANCELLED") {
                    return;
                }
                this.$resultArea.hide().empty();
                this.$progress.empty().append(
                    $("<span>").addClass("wikiblame-hint-error").text(`检索失败：${err && err.message || err}`),
                );
            } finally {
                if (runId === this.activeRunId) {
                    this.setBusy(false);
                }
            }
        }

        renderResult(result, compareData, comment, compareError = null) {
            const { rev, prevRev, revIndex, hiddenCount = 0 } = result;
            const revUrl = mw.util.getUrl(wgPageName, { oldid: rev.revid });
            const diffUrl = prevRev
                ? mw.util.getUrl(wgPageName, { diff: rev.revid, oldid: prevRev.revid })
                : revUrl;

            const $meta = $("<div>").addClass("wikiblame-result-meta");
            $meta.append(
                $("<span>").text(`编者：${rev.user || "未知"}`),
                $("<span>").text(`时间：${formatTimestamp(rev.timestamp)}`),
                $("<a>").attr({ href: revUrl, target: "_blank", rel: "noopener" }).text(`版本 #${rev.revid}`),
                $("<a>").attr({ href: diffUrl, target: "_blank", rel: "noopener" }).text("查看完整差异"),
            );
            if (comment) {
                $meta.append($("<span>").text(`摘要：${comment}`));
            }
            if (hiddenCount > 0) {
                $meta.append(
                    $("<span>")
                        .addClass("wikiblame-hint-warn")
                        .text(`注意：与前一可用版本之间存在 ${hiddenCount} 个内容被隐藏或不可用的修订，该文本可能是在其中被引入的。`),
                );
            }

            if (revIndex > 0) {
                const earlierBtn = new OO.ui.ButtonWidget({
                    label: "从更早版本继续查找",
                    framed: true,
                });
                earlierBtn.on("click", () => {
                    this.runBlame(rev.revid);
                });
                $meta.append(earlierBtn.$element);
            }

            const $diffWrapper = $("<div>").addClass("wikiblame-diff-wrapper");
            const diffBody = compareData && compareData.body;
            if (diffBody) {
                const $table = $("<table>").addClass("diff").append(
                    $("<colgroup>").append(
                        $("<col>").addClass("diff-marker"),
                        $("<col>").addClass("diff-content"),
                        $("<col>").addClass("diff-marker"),
                        $("<col>").addClass("diff-content"),
                    ),
                    $("<tbody>").html(diffBody),
                );
                $diffWrapper.append($table);
            } else if (compareError) {
                $diffWrapper.append(
                    $("<span>").addClass("wikiblame-hint-error").text(`无法获取差异对比：${compareError.message || compareError}`),
                );
            } else {
                $diffWrapper.text("无差异表格可展示（可能为首个版本）。");
            }

            this.$resultArea.empty().append($meta, $diffWrapper).show();
            this.updateSize();
        }

        getBodyHeight() {
            const viewportCap = Math.max(360, window.innerHeight - 100);
            const contentHeight = this.$body[0] ? this.$body[0].scrollHeight + 16 : 520;
            return Math.min(viewportCap, Math.max(460, contentHeight));
        }
    }

    let windowManager = null;
    let latestOpenCallId = 0;

    const openWikiBlameDialog = async () => {
        const callId = ++latestOpenCallId;
        const initialSelection = getSelectedText();
        const session = new WikiBlameSession();
        await session.initRights();
        if (callId !== latestOpenCallId) {
            return;
        }

        if (!windowManager) {
            windowManager = new OO.ui.WindowManager();
            $(document.body).append(windowManager.$element);
        } else {
            await windowManager.clearWindows();
            if (callId !== latestOpenCallId) {
                return;
            }
        }
        const dialog = new WikiBlameDialog({
            size: window.innerWidth <= 720 ? "full" : "larger",
        }, initialSelection, session);
        windowManager.addWindows([dialog]);
        windowManager.openWindow(dialog);
    };

    // 在侧边栏添加按钮
    const link = mw.util.addPortletLink(
        "p-cactions",
        "#",
        "拷打编辑",
        "t-wikiblame",
        "打开拷打编辑源码定位工具",
    );
    if (link) {
        $(link).on("click", (e) => {
            e.preventDefault();
            openWikiBlameDialog();
        });
    }
});
