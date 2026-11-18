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

const IGNORED_TAGS = ["nowiki", "pre", "syntaxhighlight", "source", "math", "gallery"] as const;

const IGNORED_CLOSE_TAG_REGEXES = new Map<string, RegExp>(
    IGNORED_TAGS.map((tag) => [tag, new RegExp(`</${tag}\\s*>`, "giu")]),
);

const isTagBoundary = (char: string): boolean => char === ">"
    || char === " "
    || char === "\t"
    || char === "\n"
    || char === "\r"
    || char === "/";

/** 线性扫描并将 HTML 注释与不解析分类语法的标签块（nowiki/pre/syntaxhighlight/source/math/gallery）替换为等长占位符（\u0000），保持原文下标且避免把注释误拼成空格。 */
const blankCommentsAndNowiki = (text: string): string => {
    const parts: string[] = [];
    let cursor = 0;

    while (cursor < text.length) {
        const ltIdx = text.indexOf("<", cursor);
        if (ltIdx === -1) {
            parts.push(text.slice(cursor));
            break;
        }
        if (ltIdx > cursor) {
            parts.push(text.slice(cursor, ltIdx));
        }

        if (text.startsWith("<!--", ltIdx)) {
            const endIdx = text.indexOf("-->", ltIdx + 4);
            const stopIdx = endIdx === -1 ? text.length : endIdx + 3;
            parts.push("\u0000".repeat(stopIdx - ltIdx));
            cursor = stopIdx;
            continue;
        }

        const matchedTag = IGNORED_TAGS.find((tag) => {
            const boundaryPos = ltIdx + 1 + tag.length;
            if (boundaryPos >= text.length || !isTagBoundary(text.charAt(boundaryPos))) {
                return false;
            }
            return text.slice(ltIdx + 1, boundaryPos).toLowerCase() === tag;
        });
        if (!matchedTag) {
            parts.push("<");
            cursor = ltIdx + 1;
            continue;
        }

        const tagClose = text.indexOf(">", ltIdx + 1 + matchedTag.length);
        if (tagClose === -1) {
            parts.push(text.slice(ltIdx));
            break;
        }
        // 自闭合标签（如 <nowiki />）仅遮罩标签本身
        if (text.charAt(tagClose - 1) === "/") {
            parts.push("\u0001".repeat(tagClose + 1 - ltIdx));
            cursor = tagClose + 1;
            continue;
        }
        const closeRegex = IGNORED_CLOSE_TAG_REGEXES.get(matchedTag);
        let stopIdx = text.length;
        if (closeRegex) {
            closeRegex.lastIndex = tagClose + 1;
            const closeMatch = closeRegex.exec(text);
            if (closeMatch) {
                stopIdx = closeMatch.index + closeMatch[0].length;
            }
        }
        parts.push("\u0001".repeat(stopIdx - ltIdx));
        cursor = stopIdx;
    }

    return parts.join("");
};

const stripHtmlComments = (text: string): string => {
    const parts: string[] = [];
    let cursor = 0;
    while (cursor < text.length) {
        const start = text.indexOf("<!--", cursor);
        if (start === -1) {
            parts.push(text.slice(cursor));
            break;
        }
        if (start > cursor) {
            parts.push(text.slice(cursor, start));
        }
        const end = text.indexOf("-->", start + 4);
        if (end === -1) {
            break;
        }
        cursor = end + 3;
    }
    return parts.join("");
};

/** 线性扫描 wikitext（跳过注释与不解析标签块）并提取所有合法分类名（去重并规范化，保留原文大小写与繁简）。 */
const extractCategoryNames = (text: string): string[] => {
    const masked = blankCommentsAndNowiki(text);
    const seen = new Set<string>();
    const names: string[] = [];
    let cursor = 0;
    let cachedCloseIdx = -1;

    while (cursor < masked.length) {
        const openIdx = masked.indexOf("[[", cursor);
        if (openIdx === -1) {
            break;
        }
        if (cachedCloseIdx < openIdx + 2) {
            cachedCloseIdx = masked.indexOf("]]", openIdx + 2);
            if (cachedCloseIdx === -1) {
                break;
            }
        }
        const nextOpen = masked.indexOf("[[", openIdx + 2);
        if (nextOpen !== -1 && nextOpen < cachedCloseIdx) {
            cursor = nextOpen;
            continue;
        }
        const inner = stripHtmlComments(text.slice(openIdx + 2, cachedCloseIdx)).trimStart();
        if (CATEGORY_NAMESPACE_PREFIX_REGEX.test(inner)) {
            const pipeIdx = inner.indexOf("|");
            const rawCat = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
            const clean = normalizeCatName(rawCat);
            if (clean && !INVALID_TITLE_PATTERN.test(clean) && !hasControlCharacter(clean) && !seen.has(clean)) {
                seen.add(clean);
                names.push(clean);
            }
        }
        cursor = cachedCloseIdx + 2;
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

/** 剔除注释占位符 \u0000 并保留原串下标映射，使 [[Category:Foo<!--c-->]] 与 extractCategoryNames 判定一致。 */
const compactComments = (maskedText: string): { compacted: string; toOrigIndex: number[] } => {
    const parts: string[] = [];
    const toOrigIndex: number[] = [];
    let cursor = 0;

    while (cursor < maskedText.length) {
        const nulIdx = maskedText.indexOf("\u0000", cursor);
        if (nulIdx === -1) {
            for (let i = cursor; i < maskedText.length; i += 1) {
                toOrigIndex.push(i);
            }
            parts.push(maskedText.slice(cursor));
            break;
        }
        if (nulIdx > cursor) {
            for (let i = cursor; i < nulIdx; i += 1) {
                toOrigIndex.push(i);
            }
            parts.push(maskedText.slice(cursor, nulIdx));
        }
        let next = nulIdx + 1;
        while (next < maskedText.length && maskedText.charAt(next) === "\u0000") {
            next += 1;
        }
        cursor = next;
    }

    toOrigIndex.push(maskedText.length);
    return { compacted: parts.join(""), toOrigIndex };
};

const collectMatchSpans = (
    regexes: readonly RegExp[],
    compactedText: string,
    toOrigIndex: readonly number[],
): CategoryMatchSpan[] => {
    const spans: CategoryMatchSpan[] = [];
    for (const regex of regexes) {
        resetRegex(regex);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(compactedText)) !== null) {
            spans.push({
                start: toOrigIndex[match.index],
                end: toOrigIndex[match.index + match[0].length],
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
    targetVariants?: readonly string[];
}

const computeNewWikitext = (input: ComputeWikitextInput): ComputedWikitext => {
    const { text, mode, sourceCat, targetCat, sourceVariants, targetVariants } = input;
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

    const { compacted, toOrigIndex } = compactComments(blankCommentsAndNowiki(text));
    const targetRegexes = buildSourceRegexes(targetName, targetVariants);
    const sourceRegexes = buildSourceRegexes(sourceName, sourceVariants);
    const alreadyInTarget = targetRegexes.some((regex) => matches(regex, compacted));

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
            const sourceSpans = collectMatchSpans(sourceRegexes, compacted, toOrigIndex);
            if (sourceSpans.length > 0) {
                const first = sourceSpans[0];
                const replaced = `${text.slice(0, first.end)}\n[[Category:${targetName}]]${text.slice(first.end)}`;
                return { status: "ok", text: replaced };
            }
            return { status: "ok", text: appendCategory(text, targetName) };
        }
        case "move": {
            const sourceSpans = collectMatchSpans(sourceRegexes, compacted, toOrigIndex);
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
            const sourceSpans = collectMatchSpans(sourceRegexes, compacted, toOrigIndex);
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
    targetVariants?: readonly string[];
}

const verifyCommittedOnServer = (input: VerifyCommittedInput): boolean => {
    const { latestText, mode, sourceCat, targetCat, sourceVariants, targetVariants } = input;
    const { compacted: compactedLatest } = compactComments(blankCommentsAndNowiki(latestText));
    const targetRegexes = buildSourceRegexes(targetCat, targetVariants);
    const sourceRegexes = buildSourceRegexes(sourceCat, sourceVariants);
    const hasTarget = targetRegexes.some((regex) => matches(regex, compactedLatest));
    const hasSource = sourceRegexes.some((regex) => matches(regex, compactedLatest));

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
    CATEGORY_NAMESPACE_PREFIX_REGEX,
    normalizeCatName,
    validateCategoryTitle,
    buildCategoryRegex,
    extractCategoryNames,
    sameCategory,
    computeNewWikitext,
    verifyCommittedOnServer,
};
