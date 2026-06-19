import fs from "node:fs";
import path from "node:path";
import console, { split } from "../modules/console.js";
import git from "../modules/git.js";
split();
console.info("Initialization done.");

const packageLockFile = "package-lock.json";

// 消费方只读取指针文件，不再重新创建数据目录（经验要点⑤：创建与复用分离）。
// 固定文件名放仓库内已 gitignore 的 .cache/（经验要点①）；本仓库 CI 无同机并发实例。
const pointerFile = path.join(".cache", "ci-backup");

const tmpdir = await fs.promises.readFile(pointerFile, "utf8").then((s) => s.trim()).catch(() => null);
if (!tmpdir) {
    // 指针文件缺失（极端情况：before 未成功写出指针），降级用 git 恢复。
    console.info("Pointer file unexists, use `git` to recover.");
    await git.checkout(packageLockFile);
} else {
    const backupedPackageLockFile = path.join(tmpdir, packageLockFile);
    console.info("Start to check backup file:", backupedPackageLockFile);
    const backupedPackageLockFileExists = await fs.promises.access(backupedPackageLockFile).then(() => true).catch(() => false);
    try {
        if (backupedPackageLockFileExists) {
            console.info("Backup file exists, use it to recover.");
            await fs.promises.cp(backupedPackageLockFile, packageLockFile, { force: true, preserveTimestamps: true });
        } else {
            console.info("Backup file unexists, use `git` to recover.");
            await git.checkout(packageLockFile);
        }
    } finally {
        // 读后清理：删除数据目录与指针文件，避免同机反复跑时残留堆积（经验要点④）。
        // 用 force 容忍"不存在"竞态；无论恢复成功与否都清理。
        await fs.promises.rm(tmpdir, { recursive: true, force: true });
        await fs.promises.rm(pointerFile, { force: true });
    }
}
console.info("Done.");
