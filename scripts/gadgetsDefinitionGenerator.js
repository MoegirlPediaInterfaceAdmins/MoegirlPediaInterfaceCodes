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
    try {
        if (!gadgetDirent.isDirectory()) {
            continue;
        }
        const gadget = gadgetDirent.name;
        console.info("gadget:", gadget);
        /**
         * @type { { section: string } }
         */
        const { section } = JSON.parse(fs.readFileSync(path.join(gadgetBaseRoot, gadget, "definition.json"), "utf-8"));
        console.info(`[${gadget}]`, "section:", section);
        let sectionExist = false;
        for (const { name, gadgets } of gadgetsDefinition) {
            if (section === name) {
                console.info(`[${gadget}]`, "section match, gadgets:", gadgets);
                sectionExist = true;
                if (!gadgets.includes(gadget)) {
                    console.info(`[${gadget}]`, "gadgets not includes, push");
                    gadgets.push(gadget);
                }
                break;
            }
        }
        if (!sectionExist) {
            console.info(`[${gadget}]`, "section not existed, push:", { name: section, gadgets: [gadget] });
            gadgetsDefinition.push({ name: section, gadgets: [gadget] });
        }
    } catch (error) {
        throw {
            gadgetDirent,
            error,
        };
    }
}
console.info("gadgetsDefinition final:", gadgetsDefinition);
fs.writeFileSync(path.join(gadgetBaseRoot, "Gadgets-definition.json"), JSON.stringify(gadgetsDefinition, null, 4));
process.exit(4);