import console from "../modules/console.js";
console.info("Start initialization...");
import fs from "fs";
import path from "path";
import createCommit from "../modules/createCommit.js";
import jsonModule from "../modules/jsonModule.js";

/**
 * @param {string} str 
 * @returns {string}
 */
const toLowerFirstCharacter = (str) => str[0].toLowerCase() + str.slice(1);
const settings = await jsonModule.readFile(".vscode/settings.json");
const totalScopes = [];
const dirents = await fs.promises.readdir("src", {
    withFileTypes: true,
});
console.info("dirents:", dirents);
for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
        continue;
    }
    const type = dirent.name;
    const prefix = type[0].toUpperCase() + type.slice(1).replace(/s$/, "");
    console.info(`[${type}]`, "prefix:", prefix);
    const listSet = new Set();
    if (type === "gadgets") {
        for (const item of await fs.promises.readdir(path.join("src", type))) {
            listSet.add(item);
        }
    } else {
        const sites = await fs.promises.readdir(path.join("src", type));
        for (const site of sites) {
            for (const item of await fs.promises.readdir(path.join("src", type, site))) {
                listSet.add(item);
            }
        }
    }
    const list = [...listSet];
    const lowerCaseList = list.map((item) => toLowerFirstCharacter(item));
    lowerCaseList.sort();
    list.sort((a, b) => lowerCaseList.indexOf(toLowerFirstCharacter(a)) - lowerCaseList.indexOf(toLowerFirstCharacter(b)));
    console.info(`[${type}]`, "list after sorting:", list);
    const scopes = list.map((_name) => {
        let name;
        switch (prefix) {
            case "Gadget":
            case "Group": {
                name = _name;
                break;
            }
            default: {
                name = _name.replace(/^MediaWiki:|\.js(?=#|$)/g, "");
                break;
            }
        }
        return `${prefix}-${name}`;
    });
    console.info(`[${type}]`, "scopes:", scopes);
    totalScopes.push(...scopes);
}
console.info("totalScopes:", totalScopes);
settings["conventionalCommits.scopes"] = totalScopes;
await jsonModule.writeFile(".vscode/settings.json", settings);
await createCommit("auto: new conventionalCommits.scopes generated");
console.info("Done.");
