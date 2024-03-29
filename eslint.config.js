import path from "node:path";
import yamlModule from "./scripts/modules/yamlModule.js";
import { configs } from "@annangela/eslint-config";
import readDir from "./scripts/modules/readDir.js";

/**
 * @type { import("eslint").Linter.FlatConfigFileSpec[] }
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
            ignores.push(path.join(dir, ignorePattern));
        }
    }
}

/**
 * @typedef { Pick<import("eslint").Linter.FlatConfig, "files" | "ignores"> } FileSpec
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
