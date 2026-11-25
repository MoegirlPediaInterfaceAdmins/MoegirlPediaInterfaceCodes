import type { ComputedWikitext, EditMode } from "./types.ts";

const CATEGORY_NAMESPACE_PATTERN = "(?:[Cc][Aa][Tt][Ee][Gg][Oo][Rr][Yy]|[Cc][Aa][Tt]|分类|分類)";

const CATEGORY_NAMESPACE_PREFIX_REGEX = /^(?:Category|Cat|分类|分類)\s*:\s*/iu;

const isCategoryPrefixedTitle = (title: string): boolean => CATEGORY_NAMESPACE_PREFIX_REGEX.test(title.trimStart());

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

interface ScannedCategoryLink {
    start: number;
    end: number;
    catName: string;
    sortkey: string;
}

/** 线性扫描 wikitext（跳过注释与不解析标签块）并提取所有合法分类链接及原文下标、排序键。 */
const scanCategoryLinks = (text: string): ScannedCategoryLink[] => {
    const masked = blankCommentsAndNowiki(text);
    const links: ScannedCategoryLink[] = [];
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
        const maskedInner = masked.slice(openIdx + 2, cachedCloseIdx);
        const pipeIdx = maskedInner.indexOf("|");
        const maskedCatPart = pipeIdx === -1 ? maskedInner : maskedInner.slice(0, pipeIdx);
        if (!maskedCatPart.includes("\u0001")) {
            const catEndIdx = pipeIdx === -1 ? cachedCloseIdx : openIdx + 2 + pipeIdx;
            const origCatPart = stripHtmlComments(text.slice(openIdx + 2, catEndIdx)).trimStart();
            if (CATEGORY_NAMESPACE_PREFIX_REGEX.test(origCatPart)) {
                const clean = normalizeCatName(origCatPart);
                if (clean && !INVALID_TITLE_PATTERN.test(clean) && !hasControlCharacter(clean)) {
                    const sortkey = pipeIdx === -1
                        ? ""
                        : stripHtmlComments(text.slice(catEndIdx, cachedCloseIdx));
                    links.push({
                        start: openIdx,
                        end: cachedCloseIdx + 2,
                        catName: clean,
                        sortkey,
                    });
                }
            }
        }
        cursor = cachedCloseIdx + 2;
    }

    return links;
};

/** 线性扫描 wikitext（跳过注释与不解析标签块）并提取所有合法分类名（去重并规范化，保留原文大小写与繁简）。 */
const extractCategoryNames = (text: string): string[] => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const link of scanCategoryLinks(text)) {
        if (!seen.has(link.catName)) {
            seen.add(link.catName);
            names.push(link.catName);
        }
    }
    return names;
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

const buildNormalizedCategoryList = (primary: string, variants?: readonly string[]): string[] => {
    const seen = new Set<string>();
    const list: string[] = [];
    const extras = variants ?? [];
    for (const raw of [primary, ...extras]) {
        const clean = normalizeCatName(raw);
        if (clean && !seen.has(clean)) {
            seen.add(clean);
            list.push(clean);
        }
    }
    return list;
};

const matchesAnyCategory = (catName: string, targets: readonly string[]): boolean => targets.some((target) => sameCategory(catName, target));

const replaceSpans = (
    text: string,
    spans: readonly ScannedCategoryLink[],
    render: (span: ScannedCategoryLink, index: number) => string,
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

    const links = scanCategoryLinks(text);
    const targetList = buildNormalizedCategoryList(targetName, targetVariants);
    const sourceList = buildNormalizedCategoryList(sourceName, sourceVariants);
    const alreadyInTarget = links.some((link) => matchesAnyCategory(link.catName, targetList));
    const sourceSpans = links.filter((link) => matchesAnyCategory(link.catName, sourceList));

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
            if (sourceSpans.length > 0) {
                const first = sourceSpans[0];
                const replaced = `${text.slice(0, first.end)}\n[[Category:${targetName}]]${text.slice(first.end)}`;
                return { status: "ok", text: replaced };
            }
            return { status: "ok", text: appendCategory(text, targetName) };
        }
        case "move": {
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
    const links = scanCategoryLinks(latestText);
    const targetList = buildNormalizedCategoryList(targetCat, targetVariants);
    const sourceList = buildNormalizedCategoryList(sourceCat, sourceVariants);
    const hasTarget = links.some((link) => matchesAnyCategory(link.catName, targetList));
    const hasSource = links.some((link) => matchesAnyCategory(link.catName, sourceList));

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
    isCategoryPrefixedTitle,
    normalizeCatName,
    validateCategoryTitle,
    buildCategoryRegex,
    extractCategoryNames,
    sameCategory,
    computeNewWikitext,
    verifyCommittedOnServer,
};
