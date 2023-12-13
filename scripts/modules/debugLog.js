import console, { prefixable } from "../modules/console.js";

const debugLoggingEnabled = [process.env.DEBUG_MODE, process.env.ACTIONS_RUNNER_DEBUG].includes("true");
const debugConsole = new Proxy(console, {
    get: (t, p) => prefixable.includes(p) ? debugLoggingEnabled ? t[p].bind(t) : () => { } : t[p],
});

export { debugLoggingEnabled, debugConsole };
export default { debugLoggingEnabled, debugConsole };
