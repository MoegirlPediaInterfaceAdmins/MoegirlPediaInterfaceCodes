import { configs } from "@annangela/eslint-config";
import path from "node:path";
import jsonModule from "./scripts/modules/jsonModule.js";
import readDir from "./scripts/modules/readDir.js";
import yamlModule from "./scripts/modules/yamlModule.js";

const packageJson = await jsonModule.readFile("./package.json");

/**
 * @type { import("eslint").Linter.Config["ignores"] }
 */
const ignores = [
    "**/dist/**",
    "**/.*/**",
    "node_modules",
    "src/gadgets/libPolyfill/*",
];

const srcESlintrcFiles = (await readDir("./src")).filter((n) => path.basename(n) === ".eslintrc.yaml");
for (const srcESlintrcFile of srcESlintrcFiles) {
    const dir = path.dirname(srcESlintrcFile);
    const srcESlintrc = await yamlModule.readFile(srcESlintrcFile);
    if (Array.isArray(srcESlintrc.ignorePatterns)) {
        for (const ignorePattern of srcESlintrc.ignorePatterns) {
            ignores.push(path.posix.join(dir.replaceAll("\\", "/"), ignorePattern));
        }
    }
}

/**
 * @typedef { Pick<import("eslint").Linter.Config, "files" | "ignores"> } FileSpec
 */
/**
 * @type { { browser: FileSpec, node: FileSpec } }
 */
const fileSpec = {
    browser: {
        files: [
            "src/**/*",
            "scripts/generatePolyfill/customPolyfills/**/*",
        ],
        ignores: [
            ...ignores,
        ],
    },
    node: {
        files: [
            "scripts/**/*",
            "eslint.config.js",
        ],
        ignores: [
            ...ignores,
            "scripts/generatePolyfill/customPolyfills/**/*",
        ],
    },
};

/**
 * @type { import("eslint").Linter.Config[] }
 */
const config = [
    // base
    {
        ...configs.base,
        ignores,
    },
    {
        ...configs.browser,
        ...fileSpec.browser,
    },
    {
        ...fileSpec.browser,
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
                Prism: false,
            },
        },
    },
    {
        ...configs.node,
        ...fileSpec.node,
    },
    {
        ignores,
        rules: {
            // other disabled rules for all files
            "@stylistic/no-mixed-operators": "off",
        },
    },
    {
        ...fileSpec.browser,
        rules: {
            // other disabled rules for browser files
            "promise/prefer-await-to-callbacks": "off",
        },
    },
    {
        ...fileSpec.node,
        rules: {
            // Running in trusted environment
            "security/detect-unsafe-regex": "off",
            "security/detect-object-injection": "off",
            "security/detect-non-literal-fs-filename": "off",
            "security/detect-non-literal-regexp": "off",
            "security/detect-child-process": "off",
            "n/no-extraneous-import": "off",
            "n/no-process-exit": "off",

            // Node version specified in package.json
            "n/no-unsupported-features/es-builtins": ["error", { version: packageJson.engines.node }],
            "n/no-unsupported-features/node-builtins": ["error", { version: packageJson.engines.node }],
            "n/no-unsupported-features/es-syntax": ["error", { version: packageJson.engines.node }],

            // github api use underscores naming
            camelcase: [
                "error",
                {
                    allow: [
                        "pull_number",
                        "issue_number",
                        "head_commit",
                        "commit_long",
                        "state_reason",
                        "workflow_id",
                        "exclude_pull_requests",
                        "per_page",
                        "workflow_runs",
                    ],
                },
            ],

            // other disabled rules for node files
        },
    },
];
export default config;
