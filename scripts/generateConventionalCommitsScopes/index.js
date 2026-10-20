import fs from "node:fs";
import path from "node:path";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import jsonModule from "../modules/jsonModule.js";
import { sortWithLowerFirstCharacter } from "../modules/sortWithLowerFirstCharacter.js";
console.info("Initialization done.");

const settings = await jsonModule.readFile(".vscode/settings.json", "jsonc");
const totalScopes = [];
// 顶层类型显式排序：跨环境 readdir 顺序不定，排序保证生成的 scopes 顺序稳定，
// 避免本地与 CI 交叉重新生成时出现纯排序 diff 与自动提交噪音
const typeNames = sortWithLowerFirstCharacter((await fs.promises.readdir("src", {
    withFileTypes: true,
})).filter((dirent) => dirent.isDirectory()).map(({ name }) => name));
const blacklists = [
    "Injection",
];
console.info("typeNames:", typeNames);
for (const type of typeNames) {
    const prefix = type[0].toUpperCase() + type.slice(1).replace(/s$/, "");
    console.info(`[${type}]`, "prefix:", prefix);
    if (blacklists.includes(prefix)) {
        continue;
    }
    const listSet = new Set();
    if (["gadgets", "@types"].includes(type)) {
        for (const item of await fs.promises.readdir(path.join("src", type))) {
            listSet.add(item);
        }
    } else {
        // sites 需要目录守卫：本地 src/<type>/ 下可能存在 gitignored 的杂项文件，
        // 把文件名当目录再 readdir 会 ENOTDIR 崩溃
        const siteDirents = await fs.promises.readdir(path.join("src", type), {
            withFileTypes: true,
        });
        for (const { name: site } of siteDirents.filter((dirent) => dirent.isDirectory())) {
            for (const item of await fs.promises.readdir(path.join("src", type, site))) {
                listSet.add(item);
            }
        }
    }
    const list = sortWithLowerFirstCharacter([...listSet]);
    console.info(`[${type}]`, "list after sorting:", list);
    const scopes = list.map((_name) => {
        let name = _name;
        switch (prefix) {
            case "Gadget":
            case "Group": {
                break;
            }
            default: {
                name = _name.replace(/^MediaWiki:|\.js(?=#|$)/g, "");
                break;
            }
        }
        return `${prefix}/${name}`;
    });
    console.info(`[${type}]`, "scopes:", scopes);
    totalScopes.push(...scopes);
}
console.info("totalScopes:", totalScopes);
const packageDirents = await fs.promises.readdir("packages", {
    withFileTypes: true,
});
const packageList = sortWithLowerFirstCharacter(packageDirents.filter((dirent) => dirent.isDirectory()).map(({ name }) => name));
console.info("[packages]", "list after sorting:", packageList);
const packageScopes = packageList.map((name) => `Package/${name}`);
console.info("[packages]", "scopes:", packageScopes);
totalScopes.push(...packageScopes);
console.info("totalScopes (with packages):", totalScopes);
settings["conventionalCommits.scopes"] = totalScopes;
await jsonModule.writeFile(".vscode/settings.json", settings);
await createCommit("auto: new conventionalCommits.scopes generated");
console.info("Done.");
