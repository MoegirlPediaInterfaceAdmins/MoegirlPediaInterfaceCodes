import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, "..");
const repoRoot = path.resolve(root, "..", "..");
// 产物写入构建链暂存区 dist/_generated/gadgets（gitignore 覆盖，不进入仓库），
// 目录层级与 src/ 下一致，由 tsconfig.artifacts.json（js）与 build:css 第二段（css）编入部署链
const gadgetDir = path.join(repoRoot, "dist", "_generated", "gadgets", "MoeUpload");

// Vite 以 lib 模式给产物命名（moeupload.js / moeupload.css），写入磁盘时再改成 on-wiki 需要的 gadget 名
const JS_OUTPUT = "moeupload.js";
const CSS_OUTPUT = "moeupload.css";

/**
 * Vite 构建选项。与源项目保持一致的关键项：
 * - lib + iife：单文件产物，可直接作为 gadget 脚本执行；
 * - define process.env.NODE_ENV：lib/iife 不会自动注入，缺失会把 React 开发分支打进产物；
 * - react / react-dom alias 到 preact/compat：源码按 React 18 API 编写，运行时是 Preact；
 * - target/cssTarget es2020：与部署链 tsconfig.production.json 与 terser 的 ecma 一致；
 * - minify false：压缩留给部署链 terser，避免同一份代码被压两次；
 * - write false：两份产物在内存中取出后分别落盘，避免产生未在 artifacts.yaml 声明的中间文件。
 * @returns {import("vite").InlineConfig} Vite 构建配置
 */
const buildOptions = () => ({
    configFile: false,
    root,
    logLevel: "warn",
    define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
    resolve: {
        alias: {
            "@": path.join(root, "src"),
            react: "preact/compat",
            "react-dom": "preact/compat",
        },
    },
    css: {
        // 前缀与语法降级由部署链根 .postcssrc.yaml 统一处理，这里只做 Sass 编译
        postcss: { plugins: [] },
    },
    build: {
        write: false,
        outDir: path.join(root, "dist"),
        emptyOutDir: false,
        target: "es2020",
        cssTarget: "es2020",
        minify: false,
        cssMinify: false,
        sourcemap: false,
        cssCodeSplit: false,
        lib: {
            entry: path.join(root, "src", "main.ts"),
            formats: ["iife"],
            name: "MoeUpload",
            fileName: () => JS_OUTPUT,
            cssFileName: "moeupload",
        },
    },
});

/**
 * 执行一次内存构建，返回 JS 与 CSS 的字节内容。
 * @returns {Promise<{ js: Buffer, css: Buffer }>} 两份产物
 */
const buildOnce = async () => {
    const result = await build(buildOptions());
    const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output;
    const js = outputs.find((output) => output.type === "chunk" && path.posix.basename(output.fileName) === JS_OUTPUT);
    const css = outputs.find((output) => output.type === "asset" && path.posix.basename(output.fileName) === CSS_OUTPUT);
    if (!js) {
        throw new Error(`产物文件缺失：未在构建结果中找到 ${JS_OUTPUT}`);
    }
    if (!css) {
        throw new Error(`产物文件缺失：未在构建结果中找到 ${CSS_OUTPUT}`);
    }
    return {
        js: Buffer.from(js.code, "utf8"),
        css: Buffer.from(String(css.source), "utf8"),
    };
};

export { buildOnce, gadgetDir, repoRoot, root };
