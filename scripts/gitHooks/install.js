import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const managedMarker = "# Managed by scripts/gitHooks/install.js";
const hookScript = "node scripts/gitHooks/runCiOnPackageLockChange.js";
const hookContents = Object.freeze({
    "post-merge": `#!/bin/sh\n${managedMarker}\n${hookScript} post-merge "$@"\n`,
    "post-rewrite": `#!/bin/sh\n${managedMarker}\n${hookScript} post-rewrite "$@"\n`,
});

const stat = async (targetPath) => await fs.promises.stat(targetPath).catch((error) => {
    if (error.code === "ENOENT") {
        return null;
    }
    throw error;
});

const readFile = async (targetPath) => await fs.promises.readFile(targetPath, {
    encoding: "utf-8",
}).catch((error) => {
    if (error.code === "ENOENT") {
        return null;
    }
    throw error;
});

const resolveGitDir = async () => {
    const gitPath = path.join(repoRoot, ".git");
    const gitPathStat = await stat(gitPath);
    if (!gitPathStat) {
        return null;
    }
    if (gitPathStat.isDirectory()) {
        return gitPath;
    }
    if (!gitPathStat.isFile()) {
        return null;
    }
    const match = /^gitdir:\s*(.+)\s*$/u.exec(await readFile(gitPath) ?? "");
    if (!match) {
        return null;
    }
    return path.resolve(repoRoot, match[1]);
};

const installHook = async (hooksDir, hookName, contents) => {
    const hookPath = path.join(hooksDir, hookName);
    const currentContents = await readFile(hookPath);
    if (currentContents !== null) {
        if (!currentContents.includes(managedMarker)) {
            console.warn(`Skip installing ${hookName}: existing hook is not managed by this repository.`);
            return;
        }
        if (currentContents === contents) {
            await fs.promises.chmod(hookPath, 0o755);
            return;
        }
    }
    await fs.promises.writeFile(hookPath, contents, {
        encoding: "utf-8",
    });
    await fs.promises.chmod(hookPath, 0o755);
    console.info(`Installed git hook: ${hookName}`);
};

const gitDir = await resolveGitDir();
if (gitDir) {
    const hooksDir = path.join(gitDir, "hooks");
    await fs.promises.mkdir(hooksDir, { recursive: true });
    await Promise.all(Object.entries(hookContents).map(async ([hookName, contents]) => await installHook(hooksDir, hookName, contents)));
}
