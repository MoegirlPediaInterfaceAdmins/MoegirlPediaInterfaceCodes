import console from "../modules/console.js";
/**
 * @param {string[]} urls 
 * @return {Promise<[string, number][]>}
 */
const testLatency = async (urls, times = 5, timeout = 3000) => {
    console.info("[testLatency]", "urls:", urls);
    console.info("[testLatency]", "times:", times);
    const latency = await Promise.all(urls.map(async (url) => {
        // console.info("[testLatency]", "testing:", url, "Start");
        const result = await Promise.allSettled(Array.from({ length: times }, async (/* _, i */) => {
            // console.info("[testLatency]", url, "#", i, "Start");
            const controller = new AbortController();
            const signal = controller.signal;
            setTimeout(() => controller.abort(), timeout);
            const start = process.hrtime.bigint();
            await fetch(url, { method: "HEAD", signal });
            const end = process.hrtime.bigint();
            // console.info("[testLatency]", url, "#", i, "end:", Number(end - start) / 10 ** 6);
            return Number(end - start) / 10 ** 6;
        }));
        // console.info("[testLatency]", "testing:", url, "end");
        return [url, result.reduce((p, { status, value }) => status === "rejected" ? p : Math.min(p, value), Number.MAX_SAFE_INTEGER)];
    }));
    console.info("[testLatency]", "latency:", latency);
    return latency;
};
export default testLatency;
