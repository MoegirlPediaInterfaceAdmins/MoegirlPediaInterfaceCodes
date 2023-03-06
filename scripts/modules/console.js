const globalConsole = global.console;
const prefixable = ["log", "warn", "debug", "info", "error"];
import { ISO } from "./toLocalTimeZoneStrings.js";

export default new Proxy(globalConsole, {
    get: (t, p) => typeof t[p] === "function" ? t[p].bind(t, ...prefixable.includes(p) ? [`[${ISO()}]`] : []) : t[p],
});
