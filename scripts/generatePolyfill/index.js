import console from "../modules/console.js";
console.info("Initialization done.");
import fs from "node:fs";
import path from "node:path";
import { startGroup, endGroup } from "@actions/core";
import semver from "semver";
import jsonModule from "../modules/jsonModule.js";
import yamlModule from "../modules/yamlModule.js";
import createCommit from "../modules/createCommit.js";

const polyfillGadgetDefinitionPath = "src/gadgets/libPolyfill/definition.yaml";
const polyfillGadgetDefinition = await yamlModule.readFile(polyfillGadgetDefinitionPath);
const getPolyfillGadgetFiles = async () => (await fs.promises.readdir("src/gadgets/libPolyfill/")).filter((file) => path.extname(file) === ".js");

/**
 * @type { { TARGET_CHROMIUM_VERSION: string | number, TARGET_ALIASES: string[] } }
 */
const { TARGET_CHROMIUM_VERSION, TARGET_ALIASES } = await yamlModule.readFile("./scripts/generatePolyfill/config.yaml");

const TARGET_VERSION = `${TARGET_CHROMIUM_VERSION}.0.0`;
const { POLYFILL_PATH } = process.env;

if (!POLYFILL_PATH) {
    throw new Error("No POLYFILL_PATH env variable.");
}

startGroup("Config:");
console.info("TARGET_CHROMIUM_VERSION:", TARGET_CHROMIUM_VERSION);
console.info("TARGET_ALIASES:", TARGET_ALIASES);
console.info("TARGET_VERSION:", TARGET_VERSION);
console.info("POLYFILL_PATH:", POLYFILL_PATH);
endGroup();

const polyfillGadgetFiles = await getPolyfillGadgetFiles();
const polyfillMainJSONPath = path.join(POLYFILL_PATH, "main.json");
const customPolyfillMainJSONPath = "./scripts/generatePolyfill/customPolyfill/main.json";
const polyfillLibraryPath = path.join(POLYFILL_PATH, "library");
const customPolyfillLibraryPath = "./scripts/generatePolyfill/customPolyfill/library";

console.info("Start to delete old polyfill files:");
for (const file of polyfillGadgetFiles) {
    if (file.startsWith("MediaWiki:Gadget-libPolyfill-")) {
        continue;
    }
    console.info("\tDeleteting", file);
    await fs.promises.rm(path.join("src/gadgets/libPolyfill/", file), {
        force: true,
        recursive: true,
    });
    console.info("\tDeleteting", file, "done.");
}
console.info("Start to read polyfill JSON...");
const polyfillMainJSONArray = [
    ...Object.entries(await jsonModule.readFile(polyfillMainJSONPath)).map(([id, v]) => ({
        id,
        ...JSON.parse(v),
    })),
    ...Object.entries(await jsonModule.readFile(customPolyfillMainJSONPath)).map(([id, v]) => ({
        id,
        ...v,
    })),
];
console.info("Start to merge custom polyfill...");
for (const dir of await fs.promises.readdir(customPolyfillLibraryPath)) {
    await fs.promises.cp(path.join(customPolyfillLibraryPath, dir), path.join(polyfillLibraryPath, dir), { recursive: true });
}
const polyfillMainJSON = Object.fromEntries(polyfillMainJSONArray.map((v) => [v.id, v]));
console.info("Get", polyfillMainJSONArray.length, "polyfill entries.");
const polyfillList = polyfillMainJSONArray.filter(({ aliases }) => Array.isArray(aliases) && TARGET_ALIASES.some((targetAliases) => aliases.includes(targetAliases)));
console.info("Get", polyfillList.length, "polyfill entries with aliases.");
const polyfillListAllowed = polyfillList.filter(({ browsers }) => browsers?.chrome && semver.satisfies(TARGET_VERSION, browsers?.chrome));
console.info("Get", polyfillListAllowed.length, "polyfill entries with aliases and target browsers.");

const readPolyfillRawJS = async (dir) => {
    const rawJSPath = path.join(dir, "raw.js");
    try {
        return (await fs.promises.readFile(rawJSPath, { encoding: "utf-8" })).trim().split("\n");
    } catch (e) {
        console.info("\t[readPolyfillRawJS]", rawJSPath, "not exist, return false:", e);
        return false;
    }
};
const polyfillAlreadyInjected = {};
const getPolyfillContent = async (polyfill, _rootPolyfillID = false) => {
    const rootPolyfillID = _rootPolyfillID || polyfill.id;
    if (!Array.isArray(polyfillAlreadyInjected[rootPolyfillID])) {
        polyfillAlreadyInjected[rootPolyfillID] = [];
    }
    if (polyfillAlreadyInjected[rootPolyfillID].includes(polyfill.id)) {
        console.info("\t[getPolyfillContent]", `[${polyfill.id}@${rootPolyfillID}]`, "Already injected, skip.");
        return [];
    }
    polyfillAlreadyInjected[rootPolyfillID].push(polyfill.id);
    console.info("\t[getPolyfillContent]", `[${polyfill.id}@${rootPolyfillID}]`, "Processing", polyfill.id);
    const content = [
        "",
        `// Polyfill ${polyfill.id} start`,
        "",
    ];
    const detectSource = polyfill.detectSource?.trim();
    console.info("\t[getPolyfillContent]", `[${polyfill.id}@${rootPolyfillID}]`, "detectSource:", detectSource);
    if (detectSource) {
        content.push(`if (!(${detectSource})) {`);
    }
    console.info("\t[getPolyfillContent]", `[${polyfill.id}@${rootPolyfillID}]`, "dependencies:", polyfill.dependencies);
    if (Array.isArray(polyfill.dependencies)) {
        for (const dependency of polyfill.dependencies) {
            content.push(...await getPolyfillContent(polyfillMainJSON[dependency], rootPolyfillID));
        }
    }
    const polyfillRawJSFromBaseDir = await readPolyfillRawJS(path.join(polyfillLibraryPath, polyfill.baseDir));
    if (Array.isArray(polyfillRawJSFromBaseDir)) {
        console.info("\t[getPolyfillContent]", `[${polyfill.id}@${rootPolyfillID}]`, "polyfillRawJSFromBaseDir exist.");
        content.push(...polyfillRawJSFromBaseDir);
    } else {
        const polyfillRawJSFromID = await readPolyfillRawJS(path.join(polyfillLibraryPath, polyfill.id));
        if (Array.isArray(polyfillRawJSFromID)) {
            console.info("\t[getPolyfillContent]", `[${polyfill.id}@${rootPolyfillID}]`, "polyfillRawJSFromID exist.");
            content.push(...polyfillRawJSFromID);
        } else {
            throw new Error(`No raw.js found in ${path.join(polyfillLibraryPath, polyfill.baseDir)} or ${path.join(polyfillLibraryPath, polyfill.id)}`);
        }
    }
    if (detectSource) {
        content.push("}");
    }
    content.push(
        "",
        `// Polyfill ${polyfill.id} end`,
        "",
    );
    console.info("\t[getPolyfillContent]", `[${polyfill.id}@${rootPolyfillID}]`, "Done.");
    return content.join("\n").split("\n").map((line) => line.trimEnd().replace(/ *\/\/ *eslint-disable-line +no-unused-vars/)).join("\n");
};
for (const polyfill of polyfillListAllowed) {
    startGroup(`Parsing polyfill: ${polyfill.id}`);
    const content = [
        "\"use strict\";",
        "/**",
        " * Generated by scripts/generatePolyfill/index.js",
        " * Options:",
        ` *     polyfillFeature: ${polyfill.id}`,
        ` *     polyfillAliases: ${Array.isArray(polyfill.aliases) ? polyfill.aliases.join(", ") : null}`,
        ` *     targetChromiumVersion: ${TARGET_VERSION}`,
        ` *     polyfillVersionRange: ${polyfill.browsers?.chrome ? `${semver.validRange(polyfill.browsers.chrome)} (${polyfill.browsers.chrome})` : null}`,
        " */",
        "(() => {",
        ...await getPolyfillContent(polyfill),
        "})();",
    ];
    const gadgetFilePath = path.join("src/gadgets/libPolyfill/", `MediaWiki:Gadget-libPolyfill-${polyfill.id}.js`);
    console.info("Start to write polyfill file:", polyfill.id, "@", gadgetFilePath);
    await fs.promises.writeFile(gadgetFilePath, content.join("\n"));
    console.info("Done.");
    endGroup();
}
polyfillGadgetDefinition._files = await getPolyfillGadgetFiles();
await yamlModule.writeFile(polyfillGadgetDefinitionPath, polyfillGadgetDefinition);
await createCommit("auto: regenerated polyfill files by generatePolyfill");
console.info("Done.");
