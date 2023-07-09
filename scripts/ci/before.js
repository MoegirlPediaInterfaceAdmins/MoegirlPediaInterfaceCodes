import console, { originalConsole } from "../modules/console.js";
console.info("Initialization done.");
import jsonModule from "../modules/jsonModule.js";
import testLatency from "../modules/testLatency.js";
import mkdtmp from "../modules/mkdtmp.js";
import fs from "fs";
import path from "path";

const packageLockFile = "package-lock.json";

const registries = [
    "https://registry.npmjs.org/",
    "https://mirrors.cloud.tencent.com/npm/",
];
const targetPath = "index.json";
const latency = await testLatency(registries.map((base) => `${base}${targetPath}`));
const targetRegistry = latency.sort(([, a], [, b]) => a - b)[0][0].replace(targetPath, "");
const otherRegistries = registries.filter((registry) => registry !== targetRegistry);
console.info("targetRegistry:", targetRegistry);
console.info("otherRegistries:", otherRegistries);
console.info("Start to backup", packageLockFile);
const tmpdir = await mkdtmp({
    subDir: process.env.RANDOM_UUID,
});
const backupedPackageLockFile = path.join(tmpdir, packageLockFile);
await fs.promises.cp(packageLockFile, backupedPackageLockFile, { force: true, preserveTimestamps: true });
console.info("backup:", backupedPackageLockFile);
console.info("Start to read", packageLockFile);
const packageLockFileContent = await jsonModule.readFile(packageLockFile);
console.info("Start to modified resolved path for packages");
const modifiedCount = {};
for (const key of Object.keys(packageLockFileContent.packages)) {
    if (typeof packageLockFileContent.packages[key].resolved === "string") {
        let url = packageLockFileContent.packages[key].resolved;
        for (const registry of otherRegistries) {
            if (url.startsWith(registry)) {
                url = url.replace(registry, targetRegistry);
                if (typeof modifiedCount[registry] !== "number") {
                    modifiedCount[registry] = 0;
                }
                modifiedCount[registry]++;
                break;
            }
        }
        packageLockFileContent.packages[key].resolved = url;
    }
}
console.info("modifiedCount:", modifiedCount);
console.info("Start to write back", packageLockFile);
await jsonModule.writeFile(packageLockFile, packageLockFileContent);
console.info("Done.");
originalConsole.info("=".repeat(120));
