import console, { originalConsole } from "../modules/console.js";
originalConsole.info("=".repeat(120));
console.info("Initialization done.");
import git from "../modules/git.js";
import mkdtmp from "../modules/mkdtmp.js";
import fs from "node:fs";
import path from "node:path";

const packageLockFile = "package-lock.json";

console.info("Start to recover", packageLockFile);
const tmpdir = await mkdtmp({
    subDir: process.env.RANDOM_UUID,
});
const backupedPackageLockFile = path.join(tmpdir, packageLockFile);
console.info("Start to check backup file:", backupedPackageLockFile);
const backupedPackageLockFileExists = await fs.promises.access(backupedPackageLockFile).then(() => true).catch(() => false);
if (backupedPackageLockFileExists) {
    console.info("Backup file exists, use it to recover.");
    await fs.promises.cp(backupedPackageLockFile, packageLockFile, { force: true, preserveTimestamps: true });
} else {
    console.info("Backup file unexists, use `git` to recover.");
    await git.checkout(packageLockFile);
}
console.info("Done.");
