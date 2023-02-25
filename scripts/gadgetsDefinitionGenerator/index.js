"use strict";
const console = require("../modules/console.js");
console.info("Start initialization...");
const fs = require("fs");
const path = require("path");
const createCommit = require("../modules/createCommit.js");

const gadgetBaseRoot = "src/gadgets";

(async () => {
    /**
     * @type { { name: string, gadgets: string[] }[] }
     */
    const gadgetsDefinitionList = require(`../../${path.join(gadgetBaseRoot, "Gadgets-definition-list.json")}`);
    console.info("gadgetsDefinitionList:", gadgetsDefinitionList);
    const diff = [];
    for (const gadgetDirent of await fs.promises.readdir(gadgetBaseRoot, { withFileTypes: true })) {
        if (!gadgetDirent.isDirectory()) {
            continue;
        }
        const gadget = gadgetDirent.name;
        console.info("gadget:", gadget);
        try {
            /**
             * @type { { _section: string; _files: string[] } }
             */
            const gadgetDefinition = require(`../../${path.join(gadgetBaseRoot, gadget, "definition.json")}`);
            const { _section } = gadgetDefinition;
            const _files = (await fs.promises.readdir(path.join(gadgetBaseRoot, gadget))).filter((file) => [".js", ".css"].includes(path.extname(path.join(gadgetBaseRoot, gadget, file))));
            if (gadgetDefinition._files.filter((file) => !_files.includes(file)).length + _files.filter((file) => !gadgetDefinition._files.includes(file)).length > 0) {
                gadgetDefinition._files = [...gadgetDefinition._files.filter((file) => _files.includes(file)), ..._files.filter((file) => !gadgetDefinition._files.includes(file))];
                diff.push(gadget);
                await fs.promises.writeFile(path.join(gadgetBaseRoot, gadget, "definition.json"), JSON.stringify(gadgetDefinition, null, 4));
            }
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
    if (diff.length > 0) {
        console.info("Try to create commit for gadget definition update.");
        const message = `auto: gadget definition updated - ${diff.join(", ")}`;
        await createCommit(message);
        console.info("Done.");
    }
    console.info("gadgetsDefinitionList final:", gadgetsDefinitionList);
    await fs.promises.writeFile(path.join(gadgetBaseRoot, "Gadgets-definition-list.json"), `${JSON.stringify(gadgetsDefinitionList, null, 4)}\n`);
    const message = "auto: new Gadgets-definition-list.json generated";
    await createCommit(message);
    console.info("Done.");
    process.exit(0);
})();
