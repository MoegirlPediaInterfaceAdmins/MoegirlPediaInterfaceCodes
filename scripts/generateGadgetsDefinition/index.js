import console from "../modules/console.js";
console.info("Initialization done.");
import fs from "fs";
import path from "path";
import { startGroup, endGroup } from "@actions/core";
import createCommit from "../modules/createCommit.js";
import yamlModule from "../modules/yamlModule.js";

const gadgetBaseRoot = "src/gadgets";

/**
 * @type { { name: string, gadgets: string[] }[] }
 */
const gadgetsDefinitionList = await yamlModule.readFile(path.join(gadgetBaseRoot, "Gadgets-definition-list.yaml"));
startGroup("gadgetsDefinitionList:");
console.info(gadgetsDefinitionList);
endGroup();
const gadgets = [];
for (const gadgetDirent of await fs.promises.readdir(gadgetBaseRoot, { withFileTypes: true })) {
    if (!gadgetDirent.isDirectory()) {
        continue;
    }
    const gadget = gadgetDirent.name;
    console.info("gadget:", gadget);
    gadgets.push(gadget);
    try {
        /**
         * @type { { _section: string; _files: string[] } }
         */
        const gadgetDefinition = await yamlModule.readFile(path.join(gadgetBaseRoot, gadget, "definition.yaml"));
        const { _section } = gadgetDefinition;
        const _files = (await fs.promises.readdir(path.join(gadgetBaseRoot, gadget))).filter((file) => [".js", ".css"].includes(path.extname(path.join(gadgetBaseRoot, gadget, file))));
        if (gadgetDefinition._files.filter((file) => !_files.includes(file)).length + _files.filter((file) => !gadgetDefinition._files.includes(file)).length > 0) {
            gadgetDefinition._files = [...gadgetDefinition._files.filter((file) => _files.includes(file)), ..._files.filter((file) => !gadgetDefinition._files.includes(file))];
            await yamlModule.writeFile(path.join(gadgetBaseRoot, gadget, "definition.yaml"), gadgetDefinition);
            await createCommit(`auto(Gadget-${gadget}): gadget definition updated by generateGadgetsDefinition`);
        }
        console.info(`[${gadget}]`, "_section:", _section);
        let sectionExist = false;
        for (let i = 0; i < gadgetsDefinitionList.length; i++) {
            if (_section === gadgetsDefinitionList[i].name) {
                sectionExist = true;
                if (!gadgetsDefinitionList[i].gadgets.includes(gadget)) {
                    console.info(`[${gadget}]`, `_section "${_section}" match, gadgets not includes, push`);
                    gadgetsDefinitionList[i].gadgets.push(gadget);
                } else {
                    console.info(`[${gadget}]`, `_section "${_section}" match, gadgets includes`);
                }
            } else {
                if (gadgetsDefinitionList[i].gadgets.includes(gadget)) {
                    console.info(`[${gadget}]`, `_section "${_section}" not match, gadgets includes, remove`);
                    gadgetsDefinitionList[i].gadgets.splice(gadgetsDefinitionList[i].gadgets.indexOf(gadget), 1);
                }
            }
        }
        if (!sectionExist) {
            console.info(`[${gadget}]`, "_section not existed, push:", { name: _section, gadgets: [gadget] });
            gadgetsDefinitionList.push({ name: _section, gadgets: [gadget] });
        }
    } catch (err) {
        console.error(`[${gadget}]`, "error:", err);
        process.exit(1);
    }
}
console.info("Start to clean up unexist gadgets...");
for (let i = 0; i < gadgetsDefinitionList.length; i++) {
    gadgetsDefinitionList[i].gadgets = gadgetsDefinitionList[i].gadgets.filter((gadget) => {
        if (gadgets.includes(gadget)) {
            return true;
        }
        console.info("gadget not exist:", gadget);
        return false;
    });
}
startGroup("gadgetsDefinitionList final:");
console.info(gadgetsDefinitionList);
endGroup();
await yamlModule.writeFile(path.join(gadgetBaseRoot, "Gadgets-definition-list.yaml"), gadgetsDefinitionList);
await createCommit("auto: new Gadgets-definition-list.yaml generated");
console.info("Done.");
