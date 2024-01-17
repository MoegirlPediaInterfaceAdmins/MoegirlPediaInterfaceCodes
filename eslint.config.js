import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { configs } from "@annangela/eslint-config";
import readDir from "./scripts/modules/readDir.js";

/**
 * @type { import("eslint").Linter.FlatConfigFileSpec }
 */
const ignores = [
    "**/dist/**",
    "**/.*/**",
    "node_modules",
];

const srcESlintrcFiles = (await readDir("./src")).filter((n) => path.basename(n) === ".eslintrc.yaml");
for (const srcESlintrcFile of srcESlintrcFiles) {
    const dir = path.dirname(srcESlintrcFile);
    const srcESlintrc = YAML.parse(await fs.promises.readFile(srcESlintrcFile, { encoding: "utf-8" }));
    if (Array.isArray(srcESlintrc.ignorePatterns)) {
        for (const ignorePattern of srcESlintrc.ignorePatterns) {
            ignores.push(path.join(dir, ignorePattern));
        }
    }
}

/**
 * @type { import("eslint").Linter.FlatConfig[] }
 */
const config = [
    // base
    {
        ...configs.base,
        ignores,
    },
    {
        ...configs.browser,
        files: [
            "src/**/*",
        ],
        ignores,
    },
    {
        files: [
            "src/**/*",
        ],
        languageOptions: {
            globals: {
                mw: false,
                mediaWiki: false,
                OO: false,
                localforage: false,
                moment: false,
                LocalObjectStorage: false,
                insertToBottomRightCorner: false,
                wgULS: false,
                wgUVS: false,
                hashwasm: false,
                oouiDialog: false,
                echarts: false,
                MOE_SKIN_GLOBAL_DATA_REF: false,
                ace: false,
                libCachedCode: false,
                CodeMirror: false,
            },
        },
    },
    {
        ...configs.node,
        files: [
            "scripts/**/*",
            "eslint.config.js",
        ],
        ignores,
    },
    // Running in trusted environment
    {
        rules: {
            "security/detect-unsafe-regex": "off",
            "security/detect-object-injection": "off",
            "security/detect-non-literal-fs-filename": "off",
            "security/detect-non-literal-regexp": "off",
        },
    },
];
export default config;
