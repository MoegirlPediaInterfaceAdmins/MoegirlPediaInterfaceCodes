/**
 * 将错误对象转换为字符串
 * @param {Error} error
 * @returns {string}
 */
const errorToString = (error) => {
    const strings = [
        error.stack,
    ];
    const prefixNames = [];
    const suffixNames = [];
    const notIncludedNames = ["message", "stack", "cause", ...prefixNames, ...suffixNames];
    for (const name of prefixNames) {
        if (error[name]) {
            strings.push(error[name] instanceof Error ? errorToString(error[name]) : error[name]);
        }
    }
    const middleNames = Reflect.ownKeys(error).filter((name) => !notIncludedNames.includes(name));
    if (middleNames.length > 0) {
        strings.push(JSON.stringify(Object.fromEntries(middleNames.map((name) => [name, error[name]])), null, 4));
    }
    for (const name of suffixNames) {
        if (error[name]) {
            strings.push(error[name] instanceof Error ? errorToString(error[name]) : error[name]);
        }
    }
    if (error.cause) {
        strings.push("\n[cause]");
        strings.push(error.cause instanceof Error ? errorToString(error.cause) : error.cause);
    }
    return strings.join(" ");
};

export default errorToString;
