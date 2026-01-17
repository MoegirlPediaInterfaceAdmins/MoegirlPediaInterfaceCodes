import fs from "node:fs";
import path from "node:path";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import jsonModule from "../modules/jsonModule.js";
import { sortWithLowerFirstCharacter } from "../modules/sortWithLowerFirstCharacter.js";
console.info("Initialization done.");

const settings = await jsonModule.readFile(".vscode/settings.json", "jsonc");
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
    if (["gadgets", "@types"].includes(type)) {
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
settings["conventionalCommits.scopes"] = totalScopes;
await jsonModule.writeFile(".vscode/settings.json", settings);
await createCommit("auto: new conventionalCommits.scopes generated");
console.info("Done.");
