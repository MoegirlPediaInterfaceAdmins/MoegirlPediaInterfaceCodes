/**
 * 将仅包含 type / type(scope)（及可选 breaking `!` 与冒号）的首行补全为 `type: _`，
 * 以便 commitlint 正常校验 type / scope，同时避免尾部空格触发 `header-trim` 错误。
 * 故意不做 trim：首行带前后空白的畸形标头应原样交给 commitlint 校验并报错。
 * @param {string} message
 * @returns {string}
 */
const normalizeEmptySubject = (message) => {
    const [firstLine, ...rest] = message.split("\n");
    if (/^[^\s:]+(?:\([^)]*\))?!?:?$/.test(firstLine)) {
        return [firstLine.replace(/:?$/, ": _"), ...rest].join("\n");
    }
    return message;
};

export default normalizeEmptySubject;
