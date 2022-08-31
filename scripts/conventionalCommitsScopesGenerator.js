"use strict";
const console = require("./console.js");
console.info("Start initialization...");
const fsPromises = require("fs/promises");
const path = require("path");
/**
 * @param {string} str 
 * @returns {string}
 */
const toLowerFirstCharacter = (str) => str[0].toLowerCase() + str.slice(1);
import("strip-json-comments").then(async ({
    "default": stripJsonComments,
}) => {
    const settings = JSON.parse(stripJsonComments(await fsPromises.readFile(".vscode/settings.json", "utf-8"), {
        trailingCommas: true,
    }));
    const totalScopes = [];
    const types = await fsPromises.readdir("src");
    console.info("types:", types);
    for (const type of types) {
        const prefix = type[0].toUpperCase() + type.slice(1).replace(/s$/, "");
        console.info(`[${type}]`, "prefix:", prefix);
        const list = await fsPromises.readdir(path.join("src", type));
        const lowerCaseList = list.map((item) => toLowerFirstCharacter(item));
        lowerCaseList.sort();
        list.sort((a, b) => lowerCaseList.indexOf(toLowerFirstCharacter(a)) - lowerCaseList.indexOf(toLowerFirstCharacter(b)));
        console.info(`[${type}]`, "list after sorting:", list);
        const scopes = list.map((_name) => {
            let name;
            switch (prefix) {
                case "Gadget": {
                    name = _name;
                    break;
                }
                default: {
                    name = _name.replace(/^MediaWiki:(?:Group-)?|\.js(?=#|$)/g, "");
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
    await fsPromises.writeFile(".vscode/settings.json", JSON.stringify(settings, null, 4));
    console.info("Done.");
    process.exit(0);
});