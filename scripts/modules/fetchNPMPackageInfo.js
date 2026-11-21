import { endGroup, startGroup } from "@actions/core";
import console from "../modules/console.js";
import exec from "../modules/exec.js";

const registryBaseUrl = (await exec("npm config get registry --global")).trim();
console.info("npm config get registry --global:", registryBaseUrl);
// 定时任务在 CI 上跑：registry 偶发 5xx/限流或网络卡住时，不能让整轮扫描挂死或立即中断。
// 单次请求设上限并按有限次数重试；扫描脚本再对每个包兜底，保证其余包仍会被检查。
const requestTimeoutMs = 30_000;
const maxAttempts = 3;
const retryDelayMs = 500;
const retryableStatuses = new Set([429]);
const cachedPackageInfo = new Map();
/**
 * 请求单个包在 registry 上的元数据，对网络错误、超时、429 与 5xx 做有限次重试。
 * @param {string} pkg 包名
 * @param {string} registryUrl registry 上的包元数据地址
 * @returns {Promise<Record<string, unknown>>} registry 返回的 JSON
 */
const requestPackageInfo = async (pkg, registryUrl) => {
    for (let attempt = 1; ; attempt++) {
        try {
            const packageInfoResponse = await fetch(registryUrl, {
                method: "GET",
                signal: AbortSignal.timeout(requestTimeoutMs),
            });
            if (!packageInfoResponse.ok) {
                throw Object.assign(
                    new Error(`[fetchNPMPackageVersion] [${pkg}] Failed to fetch package info: ${packageInfoResponse.status} ${packageInfoResponse.statusText}`, { cause: await packageInfoResponse.text() }),
                    { status: packageInfoResponse.status },
                );
            }
            return await packageInfoResponse.json();
        } catch (error) {
            // 4xx（404 等）是包名或 registry 配置问题，重试无意义
            const status = error?.status;
            const isRetryable = status === undefined || retryableStatuses.has(status) || status >= 500;
            if (!isRetryable || attempt >= maxAttempts) {
                throw error;
            }
            console.info("[fetchNPMPackageVersion]", `[${pkg}]`, `Attempt ${attempt} failed, retrying:`, error.message);
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
        }
    }
};
/**
 * @param {string} pkg
 */
const fetchNPMPackageInfo = async (pkg) => {
    const registryUrl = `${new URL(pkg, registryBaseUrl)}`;
    console.info("[fetchNPMPackageVersion]", `[${pkg}]`, "Start to fetch the package info:", registryUrl);
    let packageInfo;
    if (!cachedPackageInfo.has(pkg)) {
        console.info("[fetchNPMPackageVersion]", `[${pkg}]`, "There is no cache, fetching...");
        packageInfo = await requestPackageInfo(pkg, registryUrl);
        console.info("[fetchNPMPackageVersion]", `[${pkg}]`, "Successfully get the package info, and wrote in cache.");
        cachedPackageInfo.set(pkg, packageInfo);
    } else {
        console.info("[fetchNPMPackageVersion]", `[${pkg}]`, "There is a cache, not need to fetch.");
        packageInfo = cachedPackageInfo.get(pkg);
    }
    startGroup(`[fetchNPMPackageVersion] [${pkg}] Package info:`);
    console.info(packageInfo);
    endGroup();
    return packageInfo;
};
export default fetchNPMPackageInfo;
