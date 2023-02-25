"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const fs = require("fs");
const core = require("@actions/core");

(async () => {
    const oldGitattributes = await fs.promises.readFile(".gitattributes", {
        encoding: "utf-8",
    });
    console.info("old .gitattributes", oldGitattributes);
    const originalGitattributes = oldGitattributes.split("\n").filter((line) => line.length > 0 && !line.includes(" # From ")).join("\n");
    console.info("original .gitattributes", originalGitattributes);
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
        console.info(key, value);
        for (const srcPath of value) {
            newGitattributes.push(`${srcPath}  linguist-generated=true # From ${key}`);
        }
        newGitattributes.push("");
    }
    console.info("new .gitattributes", newGitattributes);
    const finalGitattributes = [...originalGitattributes, ...newGitattributes];
    console.info("final .gitattributes", finalGitattributes);
    await fs.promises.writeFile(".gitattributes", finalGitattributes.join("\n"), {
        encoding: "utf-8",
    });
    process.exit(0);
})();
