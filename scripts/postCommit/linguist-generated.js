
import console from "../modules/console.js";
console.info("Initialization done.");
import fs from "fs";
import path from "path";
import { warning, startGroup, endGroup } from "@actions/core";
import createCommit from "../modules/createCommit.js";
import yamlModule from "../modules/yamlModule.js";

const oldGitattributes = await fs.promises.readFile(".gitattributes", {
    encoding: "utf-8",
});
startGroup("old .gitattributes:");
console.info(oldGitattributes);
endGroup();
const originalGitattributes = oldGitattributes.replace(/\n# From [^\n]+\n(?:[^\n]+\n)+(?=\n|$)/g, "").trim();
startGroup("original .gitattributes:");
console.info(originalGitattributes);
endGroup();
const newGitattributes = [""];
const cssFiles = ["dist/**/*.css"];
for (const [index, stringValue] of Object.entries(process.env)) {
    if (!index.startsWith("linguist-generated-")) {
        continue;
    }
    const key = index.replace("linguist-generated-", "");
    const value = JSON.parse(stringValue);
    if (!Array.isArray(value) || value.length === 0) {
        warning(`${index} is not array or empty: ${stringValue}`);
        continue;
    }
    console.info(`${key}:`, value);
    newGitattributes.push(`# From ${key}`);
    for (const srcPath of value) {
        newGitattributes.push(`${srcPath} linguist-generated=true`);
        if (path.extname(srcPath) === ".css") {
            cssFiles.push(srcPath);
        }
    }
    newGitattributes.push("");
}
startGroup("new .gitattributes:");
console.info(newGitattributes);
endGroup();
const finalGitattributes = [originalGitattributes, ...newGitattributes];
startGroup("final .gitattributes:");
console.info(finalGitattributes);
endGroup();
await fs.promises.writeFile(".gitattributes", `${finalGitattributes.join("\n").trim()}\n`, {
    encoding: "utf-8",
});
await createCommit("auto: new .gitattributes generated");
startGroup("cssFiles:");
console.info(cssFiles);
endGroup();
const stylelintrc = await yamlModule.readFile(".stylelintrc.yaml");
startGroup("old .stylelintrc:");
console.info(stylelintrc);
endGroup();
stylelintrc.ignoreFiles = cssFiles;
startGroup("new .stylelintrc:");
console.info(stylelintrc);
endGroup();
await yamlModule.writeFile(".stylelintrc.yaml", stylelintrc);
await createCommit("auto: new .stylelintrc.yaml generated");
console.info("Done.");
