import console from "../modules/console.js";
console.info("Start initialization...");
import jsonModule from "../modules/jsonModule.js";
const isInGithubActions = process.env.GITHUB_ACTIONS === "true";

if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}
const packageLockFile = "package-lock.json";
console.info("Start to read", packageLockFile);
const packageLockFileContent = await jsonModule.readFile(packageLockFile);
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
