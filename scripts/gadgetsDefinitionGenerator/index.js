"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const fs = require("fs");
const path = require("path");

const gadgetBaseRoot = "src/gadgets";

(async () => {
    /**
     * @type { { name: string, gadgets: string[] }[] }
     */
    const gadgetsDefinitionList = JSON.parse(await fs.promises.readFile(path.join(gadgetBaseRoot, "Gadgets-definition-list.json"), "utf-8"));
    console.info("gadgetsDefinitionList:", gadgetsDefinitionList);
    for (const gadgetDirent of await fs.promises.readdir(gadgetBaseRoot, { withFileTypes: true })) {
        if (!gadgetDirent.isDirectory()) {
            continue;
        }
        const gadget = gadgetDirent.name;
        console.info("gadget:", gadget);
        try {
            /**
             * @type { { _section: string } }
             */
            const gadgetDefinition = JSON.parse(await fs.promises.readFile(path.join(gadgetBaseRoot, gadget, "definition.json"), "utf-8"));
            const { _section } = gadgetDefinition;
            gadgetDefinition._files = (await fs.promises.readdir(path.join(gadgetBaseRoot, gadget))).filter((file) => [".js", ".css"].includes(path.extname(path.join(gadgetBaseRoot, gadget, file))));
            await fs.promises.writeFile(path.join(gadgetBaseRoot, gadget, "definition.json"), JSON.stringify(gadgetDefinition, null, 4));
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
    await fs.promises.writeFile(path.join(gadgetBaseRoot, "Gadgets-definition-list.json"), `${JSON.stringify(gadgetsDefinitionList, null, 4)}\n`);
    process.exit(0);

})();
