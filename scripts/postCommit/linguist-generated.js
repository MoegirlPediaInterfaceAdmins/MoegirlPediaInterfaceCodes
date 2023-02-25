"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const fs = require("fs");
const core = require("@actions/core");

(async () => {
    const oldGitattributes = await fs.promises.readFile(".gitattributes", {
        encoding: "utf-8",
    });
    const originalGitattributes = oldGitattributes.split("\n").filter((line) => !line.includes(" # From ")).join("\n").replace(/(?<=\n)\n+/g, "");
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
        for (const srcPath of value) {
            newGitattributes.push(`${srcPath}  linguist-generated=true # From ${key}`);
        }
        newGitattributes.push("");
    }
    await fs.promises.writeFile(".gitattributes", [...originalGitattributes, ...newGitattributes].join("\n"), {
        encoding: "utf-8",
    });
    process.exit(0);
})();
