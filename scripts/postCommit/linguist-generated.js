"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const fs = require("fs");
const core = require("@actions/core");
const createCommit = require("../modules/createCommit.js");

(async () => {
    const oldGitattributes = await fs.promises.readFile(".gitattributes", {
        encoding: "utf-8",
    });
    console.info("old .gitattributes:", oldGitattributes);
    const originalGitattributes = oldGitattributes.replace(/\n# From [^\n]+\n(?:[^\n]+\n)+(?=\n|$)/g, "").trim();
    console.info("original .gitattributes:", originalGitattributes);
    const newGitattributes = [""];
    for (const [index, stringValue] of Object.entries(process.env)) {
        if (!index.startsWith("linguist-generated-")) {
            continue;
        }
        const key = index.replace("linguist-generated-", "");
        const value = JSON.parse(stringValue);
        if (!Array.isArray(value) || value.length === 0) {
            core.warning(`${index} is not array or empty: ${stringValue}`);
            continue;
        }
        console.info(`${key}:`, value);
        newGitattributes.push(`# From ${key}`);
        for (const srcPath of value) {
            newGitattributes.push(`${srcPath}  linguist-generated=true`);
        }
        newGitattributes.push("");
    }
    console.info("new .gitattributes:", newGitattributes);
    const finalGitattributes = [originalGitattributes, ...newGitattributes];
    console.info("final .gitattributes:", finalGitattributes);
    await fs.promises.writeFile(".gitattributes", `${finalGitattributes.join("\n").trim()}\n`, {
        encoding: "utf-8",
    });
    await createCommit("auto: new .gitattributes generated");
    console.info("Done.");
    process.exit(0);
})();
