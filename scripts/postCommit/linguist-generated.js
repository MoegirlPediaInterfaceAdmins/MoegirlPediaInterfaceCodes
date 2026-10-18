import fs from "node:fs";
import console, { dump } from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import yamlModule from "../modules/yamlModule.js";
import { buildManagedLines, stripManagedBlocks } from "./linguist-generated-utils.js";
console.info("Initialization done.");

const scriptsExcludedFromCodeQL = [
    "generateCommitsHistory",
];

const gitattributesPath = ".gitattributes";
// 生成段用显式围栏注释界定，识别与剥离的规则（正则及其语义说明）见 ./linguist-generated-utils.js。
const managedFenceStart = "# >>> managed by scripts/postCommit/linguist-generated.js >>>";
const managedFenceEnd = "# <<< managed <<<";
const oldGitattributes = await fs.promises.readFile(gitattributesPath, {
    encoding: "utf-8",
});
dump("old .gitattributes:", oldGitattributes);
const originalGitattributes = stripManagedBlocks(oldGitattributes);
dump("original .gitattributes:", originalGitattributes);
const { managedLines, cssFiles, foldersForCodeQL } = buildManagedLines(process.env, scriptsExcludedFromCodeQL);
dump("new .gitattributes:", managedLines);
const finalGitattributes = [originalGitattributes, "", managedFenceStart, ...managedLines, managedFenceEnd];
dump("final .gitattributes:", finalGitattributes);
await fs.promises.writeFile(gitattributesPath, `${finalGitattributes.join("\n").trim()}\n`, {
    encoding: "utf-8",
});
await createCommit("auto: new .gitattributes generated");

const stylelintrcPath = ".stylelintrc.yaml";
dump("cssFiles:", cssFiles);
const stylelintrc = await yamlModule.readFile(stylelintrcPath);
dump("old .stylelintrc:", stylelintrc);
stylelintrc.ignoreFiles = cssFiles;
dump("new .stylelintrc:", stylelintrc);
await yamlModule.writeFile(stylelintrcPath, stylelintrc);
await createCommit("auto: new .stylelintrc.yaml generated");

const codeqlConfigPath = ".github/codeql-config.yaml";
const oldCodeQLConfig = await yamlModule.readFile(codeqlConfigPath);
dump("old codeql-config.yaml", oldCodeQLConfig);
const codeQLConfigPathsIgnore = oldCodeQLConfig["paths-ignore"];
dump("old `paths-ignore`:", codeQLConfigPathsIgnore);
for (const folder of foldersForCodeQL) {
    if (!codeQLConfigPathsIgnore.includes(folder)) {
        codeQLConfigPathsIgnore.push(folder);
    }
}
dump("new `paths-ignore`:", codeQLConfigPathsIgnore);
const finalCodeQLConfig = {
    ...oldCodeQLConfig,
    "paths-ignore": codeQLConfigPathsIgnore,
};
dump("final codeql-config.yaml:", finalCodeQLConfig);
await yamlModule.writeFile(codeqlConfigPath, finalCodeQLConfig);
await createCommit("auto: new .github/codeql-config.yaml generated");

console.info("Done.");
