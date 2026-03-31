import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageLockFile = "package-lock.json";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const [hookName, rewriteType] = process.argv.slice(2);

const revParse = async (revision) => {
    const result = await execFileAsync("git", ["rev-parse", "-q", "--verify", revision], {
        encoding: "utf8",
    }).catch(() => null);
    if (!result) {
        return null;
    }
    return result.stdout.trim();
};

const packageLockChanged = async (fromRevision, toRevision) => {
    const result = await execFileAsync("git", ["diff", "--name-only", fromRevision, toRevision, "--", packageLockFile], {
        encoding: "utf8",
    }).catch(() => null);
    if (!result) {
        return false;
    }
    return result.stdout.trim() !== "";
};

const runNpmCi = async () => await new Promise((resolve, reject) => {
    const childProcess = spawn(npmCommand, ["run", "ci"], {
        stdio: "inherit",
    });
    childProcess.on("error", reject);
    childProcess.on("exit", (exitCode, signal) => {
        if (exitCode === 0) {
            resolve();
            return;
        }
        if (typeof exitCode === "number") {
            reject(Object.assign(new Error(`npm run ci exited with code ${exitCode}.`), { exitCode }));
            return;
        }
        reject(new Error(`npm run ci exited unexpectedly${signal ? ` with signal ${signal}` : "."}`));
    });
});

const shouldCheckPackageLock = !!hookName && (hookName !== "post-rewrite" || rewriteType === "rebase");
if (shouldCheckPackageLock) {
    const previousRevision = await revParse("ORIG_HEAD");
    const currentRevision = await revParse("HEAD");
    const shouldRunCi = !!previousRevision && !!currentRevision && previousRevision !== currentRevision && await packageLockChanged(previousRevision, currentRevision);
    if (shouldRunCi) {
        console.info(`[git hook] Detected ${packageLockFile} change after ${hookName}; running npm run ci.`);
        try {
            await runNpmCi();
        } catch (error) {
            process.exitCode = error.exitCode ?? 1;
            throw error;
        }
    }
}
