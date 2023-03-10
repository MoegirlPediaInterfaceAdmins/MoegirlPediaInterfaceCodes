import fs from "fs";
import console from "../modules/console.js";
console.info("Start initialization...");
import path from "path";
import jsonModule from "../modules/jsonModule.js";
import mkdtmp from "../modules/mkdtmp.js";
const isInGithubActions = process.env.GITHUB_ACTIONS === "true";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}
const packageLockFile = "package-lock.json";
const tmpdir = await mkdtmp();
const tempPackageLockFile = path.join(tmpdir, packageLockFile);
console.info("tempPackageLockFile", tempPackageLockFile);
await fs.promises.appendFile(process.env.GITHUB_ENV, `tempPackageLockFile=${tempPackageLockFile}\n`, {
    encoding: "utf-8",
});
console.info("Start to rename", packageLockFile);
await fs.promises.rename(packageLockFile, tempPackageLockFile);
console.info("Start to read", packageLockFile);
const packageLockFileContent = await jsonModule.readFile(tempPackageLockFile);
console.info("Start to modified resolved path for packages");
for (const key of Object.keys(packageLockFileContent.packages)) {
    if (typeof packageLockFileContent.packages[key].resolved === "string") {
        const url = new URL(packageLockFileContent.packages[key].resolved);
        url.hostname = "registry.npmjs.org";
        packageLockFileContent.packages[key].resolved = `${url}`;
    }
}
console.info("Start to write back", packageLockFile);
await jsonModule.writeFile(packageLockFile, packageLockFileContent);
console.info("Done.");
