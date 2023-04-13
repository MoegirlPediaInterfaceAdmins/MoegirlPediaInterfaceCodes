import console, { originalConsole } from "../modules/console.js";
originalConsole.info("=".repeat(120));
console.info("Initialization done.");
import { git } from "../modules/git.js";

const packageLockFile = "package-lock.json";
console.info("Start to recover", packageLockFile);
await git.checkout(packageLockFile);
console.info("Done.");
