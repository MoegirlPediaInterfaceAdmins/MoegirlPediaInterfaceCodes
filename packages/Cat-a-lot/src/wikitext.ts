import type { ComputedWikitext, EditMode } from "./types.ts";

const CATEGORY_NAMESPACE_PATTERN = "(?:[Cc][Aa][Tt][Ee][Gg][Oo][Rr][Yy]|[Cc][Aa][Tt]|分类|分類)";

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

interface ComputeWikitextInput {
    text: string;
    mode: EditMode;
    sourceCat: string;
    targetCat: string;
}

const computeNewWikitext = (input: ComputeWikitextInput): ComputedWikitext => {
    const { text, mode, sourceCat, targetCat } = input;
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

    const targetRegex = targetName ? buildCategoryRegex(targetName) : null;
    const sourceRegex = sourceName ? buildCategoryRegex(sourceName) : null;
    const alreadyInTarget = matches(targetRegex, text);

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
            if (sourceRegex && matches(sourceRegex, text)) {
                resetRegex(sourceRegex);
                let inserted = false;
                const replaced = text.replace(sourceRegex, (matched: string) => {
                    if (inserted) {
                        return matched;
                    }
                    inserted = true;
                    return `${matched}\n[[Category:${targetName}]]`;
                });
                return { status: "ok", text: replaced };
            }
            return { status: "ok", text: appendCategory(text, targetName) };
        }
        case "move": {
            if (!matches(sourceRegex, text) || !sourceRegex) {
                return { status: "skipped-not-found", text };
            }
            resetRegex(sourceRegex);
            if (alreadyInTarget) {
                return {
                    status: "ok",
                    text: text.replace(sourceRegex, "").replace(/\n{3,}/gu, "\n\n"),
                };
            }
            let replacedFirst = false;
            const replaced = text.replace(sourceRegex, (_matched: string, ...args: unknown[]) => {
                if (replacedFirst) {
                    return "";
                }
                replacedFirst = true;
                const sortkey = typeof args[0] === "string" ? args[0] : "";
                return `[[Category:${targetName}${sortkey}]]`;
            });
            return { status: "ok", text: replaced };
        }
        case "remove": {
            if (!matches(sourceRegex, text) || !sourceRegex) {
                return { status: "skipped-not-found", text };
            }
            resetRegex(sourceRegex);
            return {
                status: "ok",
                text: text.replace(sourceRegex, "").replace(/\n{3,}/gu, "\n\n"),
            };
        }
    }
};

interface VerifyCommittedInput {
    latestText: string;
    mode: EditMode;
    sourceCat: string;
    targetCat: string;
}

const verifyCommittedOnServer = (input: VerifyCommittedInput): boolean => {
    const { latestText, mode, sourceCat, targetCat } = input;
    const targetRegex = targetCat ? buildCategoryRegex(targetCat) : null;
    const sourceRegex = sourceCat ? buildCategoryRegex(sourceCat) : null;
    const hasTarget = matches(targetRegex, latestText);
    const hasSource = matches(sourceRegex, latestText);

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
    sameCategory,
    computeNewWikitext,
    verifyCommittedOnServer,
};
