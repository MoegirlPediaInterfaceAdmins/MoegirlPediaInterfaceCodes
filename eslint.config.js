import { configs } from "@annangela/eslint-config";
import typescriptParser from "@typescript-eslint/parser";
import vuePlugin from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import jsonModule from "./scripts/modules/jsonModule.js";
import { nodeLintTargets } from "./scripts/modules/lintTargets.js";

const packageJson = await jsonModule.readFile("./package.json");

/**
 * @type { import("eslint").Linter.Config["ignores"] }
 */
const ignores = [
    "**/dist/**",
    "**/coverage/**",
    "**/.*/**",
    "node_modules",
    // .husky/ 是点目录、会被上一条 `**/.*/**` 整体忽略，而其中的 .mjs 是需要检查的源码，
    // 需显式反忽略才能被 lint。negation 必须写成整个目录（!.husky/**）才能撤销 `**/.*/**`
    // 的匹配——只否定目录内文件（!.husky/*.mjs）不会生效
    "!.husky/**",
];

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
        ],
        ignores: [
            ...ignores,
        ],
    },
    node: {
        files: [
            ...nodeLintTargets,
        ],
        ignores: [
            ...ignores,
        ],
    },
};

/**
 * packages/ 下浏览器侧小工具包的 TS 源码与测试（typescript 严集，
 * 规则与各包迁入前独立仓库时期的配置一致，见 packages 下各包的 README）。
 */
const packageFiles = [
    "packages/*/src/**/*.{ts,tsx}",
    "packages/*/tests/**/*.{ts,tsx}",
];

/** packages/ 下 Vue SFC（模板 + 极薄 script）。 */
const vueFiles = [
    "packages/*/src/**/*.vue",
];

/**
 * packages/ 浏览器侧源码共享的全局名。TS 块与 Vue 块共用，避免两处漂移。
 * @type { Record<string, false> }
 */
const packageGlobals = {
    ...configs.browser.languageOptions.globals,
    mw: false,
    mediaWiki: false,
    // OOUI 由 ResourceLoader 注入，packages 下的小工具同样使用
    OO: false,
    wgULS: false,
    wgUVS: false,
    moment: false,
    // JSONViewer 入口把整段逻辑包在 $(() => …) 中（jQuery ready 简写），不能删
    $: false,
    jQuery: false,
    // 由 esbuild define 注入的编译期常量，见 packages/JSONViewer/src/env.d.ts
    __DEV__: false,
    // 由 wikEd gadget 在运行时提供（该小工具存在时）
    wikEdUseWikEd: false,
    WikEdUpdateFrame: false,
    // 仅类型位置的名字：no-undef 无法区分类型位置与值位置，ambient 类型须在此声明；
    // 值位置的误用仍会被 tsc 检出（TS2693: "only refers to a type"）
    JQuery: false,
    HTMLElementTagNameMap: false,
    // ext.gadget.libOOUIDialog 提供的站点全局
    oouiDialog: false,
    HTMLCollectionOf: false,
    EventListener: false,
    GlobalEventHandlers: false,
    MouseEventInit: false,
};

/** vue-eslint-plugin 的 flat/essential 规则（只取规则，不重复声明 parser/plugin）。 */
const vueEssentialRules = (Array.isArray(vuePlugin.configs["flat/essential"])
    ? vuePlugin.configs["flat/essential"]
    : [vuePlugin.configs["flat/essential"] ?? []])
    .reduce((rules, entry) => ({ ...rules, ...entry.rules }), {});

/**
 * @type { import("eslint").Linter.Config[] }
 */
const config = [
    // 只有仅含 ignores 的配置对象才作为全局忽略生效；此前这份 ignores 只挂在 base 块上，
    // 因混入其他键退化为仅作用于该块的排他规则，coverage/dist/点目录从未被全局排除——
    // 本地先跑 package:test 生成 packages/*/coverage 再 lint 就会扫到 istanbul 产物。
    // 依赖其中的 !.husky/*.mjs 反忽略把 .husky 源码重新纳入后续块的匹配范围
    {
        ignores,
    },
    // base
    {
        ...configs.base,
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
                libRequestAnimationFrame: false,
                libGetPageNames: false,
                libPrefixNumber: false,
                wgGetEditRequestPreload: false,
            },
        },
    },
    {
        // packages/ 源码：strict-type-checked + stylistic-type-checked 严集
        ...configs.typescript,
        files: [
            ...packageFiles,
        ],
        languageOptions: {
            ...configs.typescript.languageOptions,
            globals: packageGlobals,
        },
        rules: {
            ...configs.typescript.rules,
            // 上游源码形态按原样保留：no-use-before-define——上游自底向上的辅助函数排序，
            // const 箭头函数重排会改变模块求值顺序；camelcase——上游（wpTextbox1、wikEdUseWikEd、
            // last_attr…）与 wiki/DOM 约定标识符 1:1 保留以便上游补丁仍可对照
            "no-use-before-define": "off",
            camelcase: "off",
        },
    },
    {
        // packages/ 下的 Vue SFC：模板由 vue-eslint-parser 解析，script 交给 TS parser，
        // 规则沿用 TS 严集 + vue plugin 的 flat/essential（不引入 stylistic 规则，避免与
        // 仓库 4 空格 / 200 列的行宽约定冲突；模板类型由 vue-tsc 负责）。
        files: [
            ...vueFiles,
        ],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                ...configs.typescript.languageOptions.parserOptions,
                parser: typescriptParser,
                extraFileExtensions: [".vue"],
                sourceType: "module",
            },
            globals: packageGlobals,
        },
        plugins: {
            ...configs.typescript.plugins,
            vue: vuePlugin,
        },
        // eslint-plugin-vue 的 flat/base 通过 processor 吞掉 SFC 行尾的 comment-directive clear 信号
        processor: "vue/vue",
        rules: {
            ...configs.typescript.rules,
            ...vueEssentialRules,
            // 组件名由 SFC 文件名与 defineComponent name 决定，CatALotApp 视为多词
            "vue/multi-word-component-names": "off",
        },
    },
    {
        // packages/UserMessages 与 jQuery Promise / OOUI 打交道的固有写法：整包统一关闭。
        files: [
            "packages/UserMessages/src/**/*.ts",
        ],
        rules: {
            // postWithToken 以 (code, result) 多参 reject，await 只能拿到第一个参数
            "promise/prefer-await-to-then": "off",
            // 同上：catch 回调的首参是错误码（string），不是 Error
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
            // openWindow 的 R 由调用点显式指定（close() 的载荷在 OOUI 里无类型）
            "@typescript-eslint/no-unnecessary-type-parameters": "off",
        },
    },
    {
        // packages/HotCat 测试目录：断言后收窄与 vitest spyOn 的既有形态。
        files: [
            "packages/HotCat/tests/**/*.ts",
        ],
        rules: {
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/unbound-method": "off",
        },
    },
    {
        // packages/HotCat 为 legacy 逐句移植，以下规则的现代化改写会改变行为
        // 或与原文形态冲突。
        files: [
            "packages/HotCat/src/**/*.ts",
        ],
        rules: {
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/prefer-for-of": "off",
            "@typescript-eslint/prefer-optional-chain": "off",
            "@typescript-eslint/prefer-string-starts-ends-with": "off",
            "no-redeclare": "off",
            "@typescript-eslint/no-this-alias": "off",
            "@typescript-eslint/no-deprecated": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
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
        // packages/ 的事件/XHR 流是回调驱动的既有设计，与 src 的 browser 文件同规则关闭
        files: [
            ...packageFiles,
        ],
        rules: {
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
                        "commit_sha",
                        "job_id",
                        "run_id",
                        "per_page",
                        "workflow_runs",
                        "key_id",
                        "raw_key",
                    ],
                },
            ],

            // other disabled rules for node files
        },
    },
];
export default config;
