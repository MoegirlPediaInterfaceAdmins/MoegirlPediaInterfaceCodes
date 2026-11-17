import type { ComputedWikitext, EditMode } from "./types.ts";

const CATEGORY_NAMESPACE_PATTERN = "(?:[Cc][Aa][Tt][Ee][Gg][Oo][Rr][Yy]|[Cc][Aa][Tt]|分类|分類)";

const CATEGORY_NAMESPACE_PREFIX_REGEX = /^(?:Category|Cat|分类|分類)\s*:\s*/iu;

const INVALID_TITLE_PATTERN = /[[\]{}|<>#]/u;

const hasControlCharacter = (value: string): boolean => {
    for (const character of value) {
        const code = character.codePointAt(0) ?? 0;
        if (code < 0x20 || code === 0x7F) {
            return true;
        }
    }
    return false;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const normalizeCatName = (raw: string): string => raw
    .trim()
    .replace(/_/gu, " ")
    .replace(/\s+/gu, " ")
    .replace(/^(?:Category|Cat|分类|分類)\s*:\s*/iu, "")
    .trim();

const validateCategoryTitle = (raw: string): string | null => {
    const clean = normalizeCatName(raw);
    if (!clean || INVALID_TITLE_PATTERN.test(clean) || hasControlCharacter(clean)) {
        return null;
    }
    try {
        const parsed = mw.Title.newFromText(clean, 14);
        if (parsed?.getNamespaceId() !== 14) {
            return null;
        }
        const mainText = parsed.getMainText();
        return mainText || null;
    } catch {
        return null;
    }
};

const buildFirstCharPattern = (char: string): string => {
    const lower = char.toLowerCase();
    const upper = char.toUpperCase();
    if (lower !== upper && lower.length === 1 && upper.length === 1) {
        return `[${escapeRegex(upper)}${escapeRegex(lower)}]`;
    }
    return escapeRegex(char);
};

const buildCategoryRegex = (catName: string): RegExp | null => {
    const clean = normalizeCatName(catName);
    if (!clean) {
        return null;
    }
    const firstPattern = buildFirstCharPattern(clean.charAt(0));
    const restPattern = escapeRegex(clean.slice(1)).replace(/ /gu, "[ _]+");
    return new RegExp(
        `\\[\\[\\s*${CATEGORY_NAMESPACE_PATTERN}\\s*:\\s*${firstPattern}${restPattern}\\s*(\\|[^\\]]*)?\\]\\]`,
        "gu",
    );
};

const resetRegex = (regex: RegExp): void => {
    regex.lastIndex = 0;
};

/** 线性扫描并将 HTML 注释与 <nowiki> 区块替换为空格（保持下标与原文本一致）。 */
const blankCommentsAndNowiki = (text: string): string => {
    const lower = text.toLowerCase();
    const parts: string[] = [];
    let cursor = 0;

    while (cursor < text.length) {
        const commentIdx = text.indexOf("<!--", cursor);
        const nowikiIdx = lower.indexOf("<nowiki", cursor);
        let nextIdx = -1;
        let isComment = false;

        if (commentIdx !== -1 && (nowikiIdx === -1 || commentIdx < nowikiIdx)) {
            nextIdx = commentIdx;
            isComment = true;
        } else if (nowikiIdx !== -1) {
            nextIdx = nowikiIdx;
        }

        if (nextIdx === -1) {
            parts.push(text.slice(cursor));
            break;
        }

        if (nextIdx > cursor) {
            parts.push(text.slice(cursor, nextIdx));
        }

        if (isComment) {
            const endIdx = text.indexOf("-->", nextIdx + 4);
            const stopIdx = endIdx === -1 ? text.length : endIdx + 3;
            parts.push(" ".repeat(stopIdx - nextIdx));
            cursor = stopIdx;
        } else {
            const tagClose = text.indexOf(">", nextIdx + 7);
            const afterOpen = nextIdx + 7 < text.length ? text.charAt(nextIdx + 7) : "";
            const isNowikiTag = tagClose !== -1 && (afterOpen === ">" || afterOpen === " " || afterOpen === "\t" || afterOpen === "\n" || afterOpen === "\r" || afterOpen === "/");
            if (!isNowikiTag) {
                parts.push(text.slice(nextIdx, nextIdx + 7));
                cursor = nextIdx + 7;
                continue;
            }
            // 自闭合 <nowiki /> 仅遮罩标签本身
            if (text.charAt(tagClose - 1) === "/") {
                parts.push(" ".repeat(tagClose + 1 - nextIdx));
                cursor = tagClose + 1;
                continue;
            }
            const closeTagIdx = lower.indexOf("</nowiki>", tagClose + 1);
            const stopIdx = closeTagIdx === -1 ? text.length : closeTagIdx + 9;
            parts.push(" ".repeat(stopIdx - nextIdx));
            cursor = stopIdx;
        }
    }

    return parts.join("");
};

/** 线性扫描 wikitext（跳过注释与 nowiki）并提取所有合法分类名（去重并规范化，保留原文大小写与繁简）。 */
const extractCategoryNames = (text: string): string[] => {
    const masked = blankCommentsAndNowiki(text);
    const seen = new Set<string>();
    const names: string[] = [];
    let cursor = 0;

    while (cursor < masked.length) {
        const openIdx = masked.indexOf("[[", cursor);
        if (openIdx === -1) {
            break;
        }
        const closeIdx = masked.indexOf("]]", openIdx + 2);
        if (closeIdx === -1) {
            break;
        }
        const nextOpen = masked.indexOf("[[", openIdx + 2);
        if (nextOpen !== -1 && nextOpen < closeIdx) {
            cursor = nextOpen;
            continue;
        }
        const inner = masked.slice(openIdx + 2, closeIdx).trimStart();
        if (CATEGORY_NAMESPACE_PREFIX_REGEX.test(inner)) {
            const pipeIdx = inner.indexOf("|");
            const rawCat = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
            const clean = normalizeCatName(rawCat);
            if (clean && !INVALID_TITLE_PATTERN.test(clean) && !hasControlCharacter(clean) && !seen.has(clean)) {
                seen.add(clean);
                names.push(clean);
            }
        }
        cursor = closeIdx + 2;
    }

    return names;
};

const matches = (regex: RegExp | null, text: string): boolean => {
    if (!regex) {
        return false;
    }
    resetRegex(regex);
    const matched = regex.test(text);
    resetRegex(regex);
    return matched;
};

const appendCategory = (text: string, targetCat: string): string => {
    const trimmed = text.replace(/\s+$/u, "");
    return trimmed
        ? `${trimmed}\n[[Category:${targetCat}]]\n`
        : `[[Category:${targetCat}]]\n`;
};

const sameCategory = (a: string, b: string): boolean => {
    const left = normalizeCatName(a);
    const right = normalizeCatName(b);
    if (!left || !right) {
        return false;
    }
    const leftFirst = left.charAt(0).toLowerCase();
    const rightFirst = right.charAt(0).toLowerCase();
    return leftFirst === rightFirst && left.slice(1) === right.slice(1);
};

interface CategoryMatchSpan {
    start: number;
    end: number;
    sortkey: string;
}

const buildSourceRegexes = (sourceCat: string, sourceVariants?: readonly string[]): RegExp[] => {
    const seen = new Set<string>();
    const regexes: RegExp[] = [];
    const extras = sourceVariants ?? [];
    for (const raw of [sourceCat, ...extras]) {
        const clean = normalizeCatName(raw);
        if (!clean || seen.has(clean)) {
            continue;
        }
        seen.add(clean);
        const regex = buildCategoryRegex(clean);
        if (regex) {
            regexes.push(regex);
        }
    }
    return regexes;
};

const collectMatchSpans = (regexes: readonly RegExp[], maskedText: string): CategoryMatchSpan[] => {
    const spans: CategoryMatchSpan[] = [];
    for (const regex of regexes) {
        resetRegex(regex);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(maskedText)) !== null) {
            spans.push({
                start: match.index,
                end: match.index + match[0].length,
                sortkey: typeof match[1] === "string" ? match[1] : "",
            });
        }
        resetRegex(regex);
    }
    spans.sort((a, b) => a.start - b.start);
    const deduped: CategoryMatchSpan[] = [];
    for (const span of spans) {
        if (deduped.length === 0 || span.start >= deduped[deduped.length - 1].end) {
            deduped.push(span);
        }
    }
    return deduped;
};

const replaceSpans = (
    text: string,
    spans: readonly CategoryMatchSpan[],
    render: (span: CategoryMatchSpan, index: number) => string,
): string => {
    const parts: string[] = [];
    let cursor = 0;
    for (let i = 0; i < spans.length; i += 1) {
        const span = spans[i];
        if (span.start > cursor) {
            parts.push(text.slice(cursor, span.start));
        }
        parts.push(render(span, i));
        cursor = span.end;
    }
    if (cursor < text.length) {
        parts.push(text.slice(cursor));
    }
    return parts.join("");
};

interface ComputeWikitextInput {
    text: string;
    mode: EditMode;
    sourceCat: string;
    targetCat: string;
    sourceVariants?: readonly string[];
}

const computeNewWikitext = (input: ComputeWikitextInput): ComputedWikitext => {
    const { text, mode, sourceCat, targetCat, sourceVariants } = input;
    const targetValidated = mode === "remove" ? "" : validateCategoryTitle(targetCat);
    if (mode !== "remove" && targetValidated === null) {
        return { status: "invalid-target", text };
    }
    const targetName = targetValidated ?? "";
    const sourceName = normalizeCatName(sourceCat);

    // A3：移动到原分类是 no-op，不能把源链接删掉
    if (mode === "move" && sameCategory(sourceName, targetName)) {
        return { status: "skipped-already", text };
    }

    const maskedText = blankCommentsAndNowiki(text);
    const targetRegex = targetName ? buildCategoryRegex(targetName) : null;
    const sourceRegexes = buildSourceRegexes(sourceName, sourceVariants);
    const alreadyInTarget = matches(targetRegex, maskedText);

    switch (mode) {
        case "add": {
            if (alreadyInTarget) {
                return { status: "skipped-already", text };
            }
            return { status: "ok", text: appendCategory(text, targetName) };
        }
        case "copy": {
            if (alreadyInTarget) {
                return { status: "skipped-already", text };
            }
            const sourceSpans = collectMatchSpans(sourceRegexes, maskedText);
            if (sourceSpans.length > 0) {
                const first = sourceSpans[0];
                const replaced = `${text.slice(0, first.end)}\n[[Category:${targetName}]]${text.slice(first.end)}`;
                return { status: "ok", text: replaced };
            }
            return { status: "ok", text: appendCategory(text, targetName) };
        }
        case "move": {
            const sourceSpans = collectMatchSpans(sourceRegexes, maskedText);
            if (sourceSpans.length === 0) {
                return { status: "skipped-not-found", text };
            }
            if (alreadyInTarget) {
                return {
                    status: "ok",
                    text: replaceSpans(text, sourceSpans, () => "").replace(/\n{3,}/gu, "\n\n"),
                };
            }
            const replaced = replaceSpans(
                text,
                sourceSpans,
                (span, index) => index === 0 ? `[[Category:${targetName}${span.sortkey}]]` : "",
            );
            return { status: "ok", text: replaced };
        }
        case "remove": {
            const sourceSpans = collectMatchSpans(sourceRegexes, maskedText);
            if (sourceSpans.length === 0) {
                return { status: "skipped-not-found", text };
            }
            return {
                status: "ok",
                text: replaceSpans(text, sourceSpans, () => "").replace(/\n{3,}/gu, "\n\n"),
            };
        }
    }
};

interface VerifyCommittedInput {
    latestText: string;
    mode: EditMode;
    sourceCat: string;
    targetCat: string;
    sourceVariants?: readonly string[];
}

const verifyCommittedOnServer = (input: VerifyCommittedInput): boolean => {
    const { latestText, mode, sourceCat, targetCat, sourceVariants } = input;
    const maskedLatest = blankCommentsAndNowiki(latestText);
    const targetRegex = targetCat ? buildCategoryRegex(targetCat) : null;
    const sourceRegexes = buildSourceRegexes(sourceCat, sourceVariants);
    const hasTarget = matches(targetRegex, maskedLatest);
    const hasSource = sourceRegexes.some((regex) => matches(regex, maskedLatest));

    switch (mode) {
        case "add":
        case "copy":
            return hasTarget;
        case "move":
            return hasTarget && !hasSource;
        case "remove":
            return !hasSource;
    }
};

export type { ComputeWikitextInput, VerifyCommittedInput };
export {
    normalizeCatName,
    validateCategoryTitle,
    buildCategoryRegex,
    extractCategoryNames,
    sameCategory,
    computeNewWikitext,
    verifyCommittedOnServer,
};
