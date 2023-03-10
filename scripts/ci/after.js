import console from "../modules/console.js";
console.info("Start initialization...");
import fs from "fs";
import { isInGithubActions } from "../modules/octokit.js";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}

const packageLockFile = "package-lock.json";
const { tempPackageLockFile } = process.env;
console.info("tempPackageLockFile", tempPackageLockFile);
console.info("Start to recover", packageLockFile);
await fs.promises.rm(packageLockFile, {
    force: true,
});
await fs.promises.rename(tempPackageLockFile, packageLockFile);
console.info("Done.");
