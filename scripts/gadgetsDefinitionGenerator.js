"use strict";
const console = require("./console.js");
console.info("Start initialization...");
const fs = require("fs");
const path = require("path");

const gadgetBaseRoot = "src/gadgets";

/**
 * @type { { name: string, gadgets: string[] }[] }
 */
const gadgetsDefinitionList = JSON.parse(fs.readFileSync(path.join(gadgetBaseRoot, "Gadgets-definition-list.json"), "utf-8"));
console.info("gadgetsDefinitionList:", gadgetsDefinitionList);
for (const gadgetDirent of fs.readdirSync(gadgetBaseRoot, { withFileTypes: true })) {
    if (!gadgetDirent.isDirectory()) {
        continue;
    }
    const gadget = gadgetDirent.name;
    console.info("gadget:", gadget);
    try {
        /**
         * @type { { _section: string } }
         */
        const { _section } = JSON.parse(fs.readFileSync(path.join(gadgetBaseRoot, gadget, "definition.json"), "utf-8"));
        console.info(`[${gadget}]`, "_section:", _section);
        let sectionExist = false;
        for (const { name, gadgets } of gadgetsDefinitionList) {
            if (_section === name) {
                sectionExist = true;
                if (!gadgets.includes(gadget)) {
                    console.info(`[${gadget}]`, `_section "${_section}" match, gadgets not includes, push`);
                    gadgets.push(gadget);
                } else {
                    console.info(`[${gadget}]`, `_section "${_section}" match, gadgets includes`);
                }
            } else {
                if (gadgets.includes(gadget)) {
                    console.info(`[${gadget}]`, `_section "${_section}" not match, gadgets includes, remove`);
                    gadgets.splice(gadgets.indexOf(gadget), 1);
                }
            }
        }
        if (!sectionExist) {
            console.info(`[${gadget}]`, "_section not existed, push:", { name: _section, gadgets: [gadget] });
            gadgetsDefinitionList.push({ name: _section, gadgets: [gadget] });
        }
    } catch (error) {
        console.error(`[${gadget}]`, "error:", error);
        process.exit(1);
    }
}
console.info("gadgetsDefinitionList final:", gadgetsDefinitionList);
fs.writeFileSync(path.join(gadgetBaseRoot, "Gadgets-definition-list.json"), `${JSON.stringify(gadgetsDefinitionList, null, 4)}\n`);
process.exit(0);
