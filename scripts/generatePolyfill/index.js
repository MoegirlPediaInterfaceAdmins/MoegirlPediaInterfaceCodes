import { endGroup, startGroup } from "@actions/core";
import browserslist from "browserslist";
import fs from "node:fs";
import path from "node:path";
import semver from "semver";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import jsonModule from "../modules/jsonModule.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

const polyfillGadgetPath = "src/gadgets/libPolyfill/";
const polyfillGadgetDefinitionPath = path.join(polyfillGadgetPath, "definition.yaml");
const polyfillGadgetDefinition = await yamlModule.readFile(polyfillGadgetDefinitionPath);
const getPolyfillGadgetFiles = async () => (await fs.promises.readdir(polyfillGadgetPath)).filter((file) => path.extname(file) === ".js");

/**
 * @type { { TARGET_ALIASES: string[] } }
 */
const { TARGET_ALIASES } = await yamlModule.readFile("./scripts/generatePolyfill/config.yaml");

const browserslistQuery = browserslist.loadConfig({ path: process.cwd() }) || "defaults";
const targetBrowsers = browserslist();
const browserMinVersions = {};
for (const entry of targetBrowsers) {
    const spaceIndex = entry.indexOf(" ");
    const name = entry.slice(0, spaceIndex);
    const versionStr = entry.slice(spaceIndex + 1).split("-")[0];
    const version = semver.coerce(versionStr);
    if (!version) {
        continue;
    }
    if (!browserMinVersions[name] || semver.lt(version, browserMinVersions[name])) {
        browserMinVersions[name] = version;
    }
}
const { POLYFILL_PATH } = process.env;

if (!POLYFILL_PATH) {
    throw new Error("No POLYFILL_PATH env variable.");
}

startGroup("Config:");
console.info("TARGET_ALIASES:", TARGET_ALIASES);
console.info("TARGET_BROWSERS:", Object.fromEntries(Object.entries(browserMinVersions).map(([k, v]) => [k, v.version])));
console.info("POLYFILL_PATH:", POLYFILL_PATH);
endGroup();

const polyfillGadgetFiles = await getPolyfillGadgetFiles();
const polyfillMainJSONPath = path.join(POLYFILL_PATH, "main.json");
const customPolyfillMainJSONPath = "./scripts/generatePolyfill/customPolyfill/main.json";
const polyfillLibraryPath = path.join(POLYFILL_PATH, "library");
const customPolyfillLibraryPath = "./scripts/generatePolyfill/customPolyfill/library";

console.info("Start to read polyfill JSON...");
const polyfillMainJSONArray = [
    ...Object.entries(await jsonModule.readFile(polyfillMainJSONPath)).map(([id, v]) => ({
        id,
        ...JSON.parse(v),
    })).map(({ baseDir, ...v }) => ({
        ...v,
        baseDir: baseDir.replaceAll("/", "."), // Some polyfill entries use "baseDir" with "/" as separator, but the actual directory uses "." as separator. Replace it here for later use.
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
const polyfillListAllowed = polyfillList.filter(({ browsers: polyfillBrowsers }) => {
    if (!polyfillBrowsers) {
        return false;
    }
    return Object.entries(browserMinVersions).some(([browser, minVersion]) => {
        const range = polyfillBrowsers[browser];
        return range && semver.satisfies(minVersion, range);
    });
});
console.info("Get", polyfillListAllowed.length, "polyfill entries with aliases and target browsers.");

const polyfillListAllowedFileNames = new Set(polyfillListAllowed.map(({ id }) => `Gadget-libPolyfill-${id}.js`));
console.info("Start to delete stale polyfill files:");
for (const file of polyfillGadgetFiles) {
    if (polyfillListAllowedFileNames.has(file)) {
        continue;
    }
    console.info("\tDeleting", file);
    await fs.promises.rm(path.join(polyfillGadgetPath, file), {
        force: true,
        recursive: true,
    });
    console.info("\tDeleting", file, "done.");
}

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
    return content.join("\n").split("\n").map((line) => line.trimEnd().replace(/ *\/\/ *eslint-disable-line +no-unused-vars/, ""));
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
        ` *     browserslist: ${browserslistQuery.join(", ")}`,
        ` *     polyfillBrowsers: ${polyfill.browsers ? Object.entries(polyfill.browsers).map(([b, r]) => `${b}: ${r}`).join(", ") : null}`,
        " */",
        "(() => {",
        ...await getPolyfillContent(polyfill),
        "})();",
    ];
    const gadgetFilePath = path.join(polyfillGadgetPath, `Gadget-libPolyfill-${polyfill.id}.js`);
    console.info("Start to write polyfill file:", polyfill.id, "@", gadgetFilePath);
    await fs.promises.writeFile(gadgetFilePath, content.join("\n"));
    console.info("Done.");
    endGroup();
}
polyfillGadgetDefinition._files = await getPolyfillGadgetFiles();
await yamlModule.writeFile(polyfillGadgetDefinitionPath, polyfillGadgetDefinition);
await createCommit("auto: regenerated polyfill files by generatePolyfill");
console.info("Done.");
