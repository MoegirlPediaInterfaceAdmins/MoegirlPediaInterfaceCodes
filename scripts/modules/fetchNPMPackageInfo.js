import { endGroup, startGroup } from "@actions/core";
import console from "../modules/console.js";
import exec from "../modules/exec.js";

const registryBaseUrl = (await exec("npm config get registry --global")).trim();
console.info("npm config get registry --global:", registryBaseUrl);
const cachedPackageInfo = new Map();
/**
 * @param {string} pkg
 */
const fetchNPMPackageInfo = async (pkg) => {
    const registryUrl = `${new URL(pkg, registryBaseUrl)}`;
    console.info("[fetchNPMPackageVersion]", `[${pkg}]`, "Start to fetch the package info:", registryUrl);
    let packageInfo;
    if (!cachedPackageInfo.has(pkg)) {
        console.info("[fetchNPMPackageVersion]", `[${pkg}]`, "There is no cache, fetching...");
        const packageInfoResponse = await fetch(registryUrl, {
            method: "GET",
        });
        if (!packageInfoResponse.ok) {
            throw new Error(`[fetchNPMPackageVersion] [${pkg}] Failed to fetch package info: ${packageInfoResponse.status} ${packageInfoResponse.statusText}`, { cause: await packageInfoResponse.text() });
        }
        packageInfo = await packageInfoResponse.json();
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
