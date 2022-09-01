"use strict";
const console = require("./console.js");
console.info("Start initialization...");
const fs = require("fs");
const path = require("path");

const gadgetBaseRoot = "src/gadgets";

/**
 * @type { { name: string, gadgets: string[] }[] }
 */
const gadgetsDefinition = JSON.parse(fs.readFileSync(path.join(gadgetBaseRoot, "Gadgets-definition.json"), "utf-8"));
console.info("gadgetsDefinition:", gadgetsDefinition);
for (const gadgetDirent of fs.readdirSync(gadgetBaseRoot, { withFileTypes: true })) {
    if (!gadgetDirent.isDirectory()) {
        continue;
    }
    const gadget = gadgetDirent.name;
    console.info("gadget:", gadget);
    try {
        /**
         * @type { { section: string } }
         */
        const { section } = JSON.parse(fs.readFileSync(path.join(gadgetBaseRoot, gadget, "definition.json"), "utf-8"));
        console.info(`[${gadget}]`, "section:", section);
        let sectionExist = false;
        for (const { name, gadgets } of gadgetsDefinition) {
            if (section === name) {
                sectionExist = true;
                if (!gadgets.includes(gadget)) {
                    console.info(`[${gadget}]`, `section "${section}" match, gadgets not includes, push`);
                    gadgets.push(gadget);
                } else {
                    console.info(`[${gadget}]`, `section "${section}" match, gadgets includes`);
                }
            } else {
                if (gadgets.includes(gadget)) {
                    console.info(`[${gadget}]`, `section "${section}" not match, gadgets includes, remove`);
                    gadgets.splice(gadgets.indexOf(gadget), 1);
                }
            }
        }
        if (!sectionExist) {
            console.info(`[${gadget}]`, "section not existed, push:", { name: section, gadgets: [gadget] });
            gadgetsDefinition.push({ name: section, gadgets: [gadget] });
        }
    } catch (error) {
        console.error(`[${gadget}]`, "error:", error);
        process.exit(1);
    }
}
console.info("gadgetsDefinition final:", gadgetsDefinition);
fs.writeFileSync(path.join(gadgetBaseRoot, "Gadgets-definition.json"), JSON.stringify(gadgetsDefinition, null, 4));
process.exit(0);