import fs from "node:fs";
import console, { dump } from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import { readDocumentFile, syncSeq, writeDocumentFile } from "../modules/yamlModule.js";
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
// readDocumentFile/writeDocumentFile 保留注释与键序；readFile→writeFile 的
// parse/stringify 往返会丢掉 ignoreFiles 之外的注释（如 rules 段的说明）
const stylelintrcDoc = await readDocumentFile(stylelintrcPath);
dump("old .stylelintrc:", stylelintrcDoc.toJS());
// 值级同步而非整体替换：ignoreFiles 条目旁若有注释可保留，条目顺序不随来源波动
syncSeq(stylelintrcDoc, "ignoreFiles", cssFiles);
dump("new .stylelintrc:", stylelintrcDoc.toJS());
await writeDocumentFile(stylelintrcPath, stylelintrcDoc);
await createCommit("auto: new .stylelintrc.yaml generated");

const codeqlConfigPath = ".github/codeql-config.yaml";
const codeQLConfigDoc = await readDocumentFile(codeqlConfigPath);
dump("old codeql-config.yaml", codeQLConfigDoc.toJS());
// YAMLSeq 不是 Array 子类，没有 includes/push；当前值经 toJSON() 读取
// （add() 追加的是原始字符串而非 Scalar 节点，直接解构 items[].value 会得到
// undefined），追加用 add()（flow 风格由 writeDocumentFile 统一兜底）
const codeQLConfigPathsIgnore = codeQLConfigDoc.get("paths-ignore");
dump("old `paths-ignore`:", codeQLConfigPathsIgnore.toJSON());
const existingIgnores = new Set(codeQLConfigPathsIgnore.toJSON());
for (const folder of foldersForCodeQL) {
    if (!existingIgnores.has(folder)) {
        codeQLConfigPathsIgnore.add(folder);
    }
}
dump("new `paths-ignore`:", codeQLConfigPathsIgnore.toJSON());
await writeDocumentFile(codeqlConfigPath, codeQLConfigDoc);
await createCommit("auto: new .github/codeql-config.yaml generated");

console.info("Done.");
