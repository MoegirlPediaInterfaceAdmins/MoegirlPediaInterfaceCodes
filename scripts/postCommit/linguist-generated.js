import console from "../modules/console.js";
console.info("Initialization done.");
import fs from "node:fs";
import path from "node:path";
import { warning, startGroup, endGroup } from "@actions/core";
import createCommit from "../modules/createCommit.js";
import yamlModule from "../modules/yamlModule.js";

const foldersForCodeQL = new Set();
const scriptsExcludedFromCodeQL = [
    "generateCommitsHistory"
];

const gitattributesPath = ".gitattributes";
const oldGitattributes = await fs.promises.readFile(gitattributesPath, {
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
        if (!scriptsExcludedFromCodeQL.includes(key)){
            foldersForCodeQL.add(path.dirname(srcPath));
        }
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
await fs.promises.writeFile(gitattributesPath, `${finalGitattributes.join("\n").trim()}\n`, {
    encoding: "utf-8",
});
await createCommit("auto: new .gitattributes generated");

const stylelintrcPath = ".stylelintrc.yaml";
startGroup("cssFiles:");
console.info(cssFiles);
endGroup();
const stylelintrc = await yamlModule.readFile(stylelintrcPath);
startGroup("old .stylelintrc:");
console.info(stylelintrc);
endGroup();
stylelintrc.ignoreFiles = cssFiles;
startGroup("new .stylelintrc:");
console.info(stylelintrc);
endGroup();
await yamlModule.writeFile(stylelintrcPath, stylelintrc);
await createCommit("auto: new .stylelintrc.yaml generated");

const codeqlConfigPath = ".github/codeql-config.yaml";
const oldCodeQLConfig = await yamlModule.readFile(codeqlConfigPath);
startGroup("old codeql-config.yaml");
console.info(oldCodeQLConfig);
endGroup();
const codeQLConfigPathsIgnore = oldCodeQLConfig["paths-ignore"];
startGroup("old `paths-ignore`:");
console.info(codeQLConfigPathsIgnore);
endGroup();
for (const folder of foldersForCodeQL) {
    if(!codeQLConfigPathsIgnore.includes(folder)) {
        codeQLConfigPathsIgnore.push(folder);
    }
}
startGroup("new `paths-ignore`:");
console.info(codeQLConfigPathsIgnore);
endGroup();
const finalCodeQLConfig = {
    ...oldCodeQLConfig,
    "paths-ignore": codeQLConfigPathsIgnore,
};
startGroup("final codeql-config.yaml:");
console.info(finalCodeQLConfig);
endGroup();
await yamlModule.writeFile(codeqlConfigPath, finalCodeQLConfig);
await createCommit("auto: new .github/codeql-config.yaml generated");

console.info("Done.");
