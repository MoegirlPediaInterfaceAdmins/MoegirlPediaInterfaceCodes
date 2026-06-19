import fs from "node:fs";
import path from "node:path";
import console, { split } from "../modules/console.js";
import jsonModule from "../modules/jsonModule.js";
import mkdtmp from "../modules/mkdtmp.js";
import testLatency from "../modules/testLatency.js";
console.info("Initialization done.");

// 指针文件：把数据目录的绝对路径落盘，供 after.js 跨进程读取（经验要点①③）。
// 固定文件名放仓库内已 gitignore 的 .cache/（复用既有忽略规则、跨进程可见，经验要点①）；
// 本仓库 CI 不存在同机并发实例，无需实例标识去重。只存一行路径字符串，不承载数据。
const pointerFile = path.join(".cache", "ci-backup");

const packageLockFile = "package-lock.json";

const registries = [
    "https://registry.npmjs.org/",
    "https://mirrors.cloud.tencent.com/npm/",
    "https://registry.npmmirror.com/",
];
const targetPath = "index.json";
const latency = await testLatency(registries.map((base) => `${base}${targetPath}`));
const targetRegistry = latency.sort(([, a], [, b]) => a - b)[0][0].replace(targetPath, "");
const otherRegistries = registries.filter((registry) => registry !== targetRegistry);
console.info("targetRegistry:", targetRegistry);
console.info("otherRegistries:", otherRegistries);
console.info("Start to backup", packageLockFile);
const tmpdir = await mkdtmp();
const backupedPackageLockFile = path.join(tmpdir, packageLockFile);
await fs.promises.cp(packageLockFile, backupedPackageLockFile, { force: true, preserveTimestamps: true });
console.info("backup:", backupedPackageLockFile);
// 创建方只写一次指针，把数据目录路径桥接给 after.js（经验要点⑤：创建与复用分离）。
await fs.promises.mkdir(".cache", { recursive: true });
await fs.promises.writeFile(pointerFile, tmpdir, "utf8");
console.info("pointer written:", pointerFile);
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
split();
