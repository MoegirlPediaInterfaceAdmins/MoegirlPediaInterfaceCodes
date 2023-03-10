import console from "../modules/console.js";
console.info("Start initialization...");
import exec from "../modules/exec.js";
const isInGithubActions = process.env.GITHUB_ACTIONS === "true";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}

process.stdout.write("=".repeat(120));
const packageLockFile = "package-lock.json";
console.info("Start to recover", packageLockFile);
await exec(`git checkout ${packageLockFile}`);
console.info("Done.");
