import { endGroup, startGroup, warning } from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

const foldersForCodeQL = new Set();
const scriptsExcludedFromCodeQL = [
    "generateCommitsHistory",
];

const gitattributesPath = ".gitattributes";
// 生成段用显式围栏注释界定。旧实现靠「# From 前缀 + 空行分隔」识别生成段，
// 手工追加在最后一个生成段之后且没有空行分隔的规则会被当作生成段内容一并删除。
const managedFenceStart = "# >>> managed by scripts/postCommit/linguist-generated.js >>>";
const managedFenceEnd = "# <<< managed <<<";
// 围栏内允许零行（对应没有任何有效来源的空围栏）。起始边界用后行断言、结尾用先行断言，
// 匹配只覆盖围栏行本身而不动两侧换行，避免仅隔一个换行的相邻手工规则被并入同一行、
// 或紧随的下一个围栏失去行首边界而无法剥离。行消费组带负向前瞻，遇到新的起始围栏即
// 放弃匹配：未闭合的起始围栏连同其后内容一律按手工内容保留，宁可重复追加也不删除手工内容。
const managedBlockPattern = /(?<=^|\n)# >>> managed by scripts\/postCommit\/linguist-generated\.js >>>\n(?:(?!# >>> managed)[^\n]*\n)*?# <<< managed <<<(?=\n|$)/g;
const oldGitattributes = await fs.promises.readFile(gitattributesPath, {
    encoding: "utf-8",
});
startGroup("old .gitattributes:");
console.info(oldGitattributes);
endGroup();
const originalGitattributes = oldGitattributes.replace(managedBlockPattern, "").trim();
startGroup("original .gitattributes:");
console.info(originalGitattributes);
endGroup();
const compareByCodePoint = (a, b) => a > b ? 1 : a < b ? -1 : 0;
// 段顺序按环境变量名、段内路径各自做码点排序，使生成结果与 runner 环境块的枚举顺序
// 以及来源脚本的目录枚举顺序（如 buildPackages 的 readdir）都无关，
// 避免枚举顺序变化产生只有排列差异的自动提交。
const generatedEnvEntries = Object.entries(process.env)
    .filter(([index]) => index.startsWith("linguist-generated-"))
    .sort(([a], [b]) => compareByCodePoint(a, b));
const managedLines = [];
const cssFiles = ["dist/**/*.css"];
for (const [index, stringValue] of generatedEnvEntries) {
    const key = index.replace("linguist-generated-", "");
    const value = JSON.parse(stringValue);
    if (!Array.isArray(value) || value.length === 0) {
        warning(`${index} is not array or empty: ${stringValue}`);
        continue;
    }
    console.info(`${key}:`, value);
    managedLines.push(`# From ${key}`);
    for (const srcPath of [...value].sort(compareByCodePoint)) {
        if (!scriptsExcludedFromCodeQL.includes(key)) {
            foldersForCodeQL.add(path.dirname(srcPath));
        }
        managedLines.push(`${srcPath} linguist-generated=true`);
        if (path.extname(srcPath) === ".css") {
            cssFiles.push(srcPath);
        }
    }
    managedLines.push("");
}
// 去掉最后一个来源段末尾的空行，使闭合围栏直接跟随最后一条规则。
if (managedLines.length > 0) {
    managedLines.pop();
}
startGroup("new .gitattributes:");
console.info(managedLines);
endGroup();
const finalGitattributes = [originalGitattributes, "", managedFenceStart, ...managedLines, managedFenceEnd];
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
    if (!codeQLConfigPathsIgnore.includes(folder)) {
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
