const originalConsole = global.console;
const prefixable = ["log", "warn", "debug", "info", "error"];
import { ISO } from "./toLocalTimeZoneStrings.js";

const split = (length = 137) => originalConsole.info("=".repeat(length));
export default new Proxy(originalConsole, {
    get: (t, p) => prefixable.includes(p) ? t[p].bind(t, `[${ISO()}]`) : t[p],
});
export { originalConsole, prefixable, split };
