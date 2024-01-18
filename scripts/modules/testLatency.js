import console from "../modules/console.js";
import { debugConsole } from "../modules/debugLog.js";
/**
 * @param {string[]} urls
 * @return {Promise<[string, number][]>}
 */
const testLatency = async (urls, times = 5, timeout = 3000) => {
    console.info("[testLatency]", "urls:", urls);
    console.info("[testLatency]", "times:", times);
    console.info("[testLatency]", "timeout:", timeout);
    const latency = await Promise.all(urls.map(async (url) => {
        debugConsole.log("[testLatency]", "testing:", url, "Start");
        const result = await Promise.allSettled(Array.from({ length: times }, async (_, i) => {
            debugConsole.log("[testLatency]", url, "#", i, "Start");
            const controller = new AbortController();
            const signal = controller.signal;
            const timeoutRef = setTimeout(() => controller.abort(), timeout);
            const start = process.hrtime.bigint();
            await fetch(url, { method: "HEAD", signal });
            const end = process.hrtime.bigint();
            clearTimeout(timeoutRef);
            const latency = Number(end - start) / 10 ** 6;
            debugConsole.log("[testLatency]", url, "#", i, "latency:", latency);
            return latency;
        }));
        debugConsole.log("[testLatency]", "testing:", url, "end");
        return [url, result.reduce((p, { status, value, reason }) => status === "rejected" ? (debugConsole.error(reason), p) : Math.min(p, value), Number.MAX_SAFE_INTEGER)];
    }));
    console.info("[testLatency]", "latency:", latency);
    return latency;
};
export default testLatency;
