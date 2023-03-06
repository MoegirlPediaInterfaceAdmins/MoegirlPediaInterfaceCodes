import { startGroup, endGroup } from "@actions/core";
import jsonModule from "../modules/jsonModule.js";

console.info("import.meta.url:", import.meta.url);
startGroup("process.env");
console.info(process.env);
endGroup();
startGroup("process.env.GITHUB_EVENT_PATH");
console.info(await jsonModule.readFile(process.env.GITHUB_EVENT_PATH));
endGroup();
