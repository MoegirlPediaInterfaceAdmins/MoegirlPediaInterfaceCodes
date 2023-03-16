import { startGroup, endGroup } from "@actions/core";
import jsonModule from "../modules/jsonModule.js";
import path from "path";
import { fileURLToPath } from "url";

console.info("import.meta.url:", import.meta.url);
console.info("new URL(import.meta.url).pathname):", `${new URL(import.meta.url).pathname}`);
console.info("path.relative(process.cwd(), new URL(import.meta.url).pathname):", path.relative(process.cwd(), new URL(import.meta.url).pathname));
console.info("fileURLToPath(import.meta.url):", fileURLToPath(import.meta.url));
startGroup("process.env");
console.info(process.env);
endGroup();
startGroup("process.env.GITHUB_EVENT_PATH");
console.info(await jsonModule.readFile(process.env.GITHUB_EVENT_PATH));
endGroup();
