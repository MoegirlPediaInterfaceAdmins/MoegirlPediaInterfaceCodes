const PACKAGE_VALID_PATH_RE = /^packages\/([^/]+)\/(?:src\/|scripts\/|artifacts\.yaml$|rollup\.config\.js$)/;

/**
 * @param { string } file file path like "src/@types/libBottomRightCorner.d.ts"
 * @returns { boolean }
 */
export const pathValidator = (file) =>
    file.startsWith("src/") && !file.startsWith("src/@types/")
    || PACKAGE_VALID_PATH_RE.test(file);

/**
 * 展开 --numstat -M 的重命名路径，返回所有涉及的路径。
 * @param { string } raw 形如 "src/gadgets/{A.js => B.js}" 或 "scripts/a.js => src/a.js"
 * @returns { string[] }
 */
const expandRenamePaths = (raw) => {
    if (!raw.includes("=>")) {
        return [raw];
    }
    const braceMatch = /^(.*?)\{(.*?) => (.*?)\}(.*)$/.exec(raw);
    if (braceMatch) {
        return [
            braceMatch[1] + braceMatch[2] + braceMatch[4],
            braceMatch[1] + braceMatch[3] + braceMatch[4],
        ];
    }
    const [from, to] = raw.split(" => ");
    return [from.trim(), to.trim()];
};

/**
 * 处理 --numstat -M 的两种重命名写法：`{a => b}`（同目录/部分相同）与 `a => b`（完全不同）。
 * 重命名两侧只要任一侧位于有效范围（src/ 或 packages/ 产物路径）就算改动，否则跨目录重命名（如 scripts/x => src/x）会被漏计。
 * @param { string } raw 形如 "src/gadgets/{A.js => B.js}" 或 "scripts/a.js => src/a.js"
 * @returns { boolean }
 */
export const renamePathValidator = (raw) => {
    if (pathValidator(raw)) {
        return true;
    }
    if (!raw.includes("=>")) {
        return false;
    }
    return expandRenamePaths(raw).some((file) => pathValidator(file));
};

/**
 * 获取变更单元的去重键：packages/<pkg>/ 下有效路径按包名归并，其余返回原路径。
 * @param { string } raw
 * @returns { string }
 */
export const getChangeUnitKey = (raw) => {
    for (const file of expandRenamePaths(raw)) {
        const match = PACKAGE_VALID_PATH_RE.exec(file);
        if (match) {
            return `package:${match[1]}`;
        }
    }
    return raw;
};

/**
 * 解析 `git diff --numstat` 的输出：每行「增\t删\t路径」，路径可能含 {a => b} 重命名写法，
 * 整段路径取到最后一个制表符之后，不按空白拆分。
 * @param { string } text git raw 输出
 * @returns { string[] } 非空行对应的路径列表
 */
export const parseNumstatPaths = (text) => text.split("\n").filter((line) => line.trim().length > 0).map((line) => line.split("\t").pop());
