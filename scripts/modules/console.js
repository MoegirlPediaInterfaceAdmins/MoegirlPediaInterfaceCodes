const originalConsole = global.console;
const prefixable = ["log", "warn", "debug", "info", "error"];
import { endGroup, startGroup } from "@actions/core";
import { ISO } from "./toLocalTimeZoneStrings.js";

const split = (length = 137) => originalConsole.info("=".repeat(length));
const prefixedConsole = new Proxy(originalConsole, {
    get: (t, p) => prefixable.includes(p) ? t[p].bind(t, `[${ISO()}]`) : t[p],
});
/**
 * startGroup / console.info / endGroup 三连的封装，输出与三行原样写法完全一致
 * （info 走带时间戳前缀的 console，故须在模块内引用而非让调用方自行拼接）。
 * @param {string} title 分组标题，调用方自带结尾冒号等格式
 * @param {unknown} value 要打印的值
 */
const dump = (title, value) => {
    startGroup(title);
    prefixedConsole.info(value);
    endGroup();
};
export default prefixedConsole;
export { originalConsole, prefixable, split, dump };
