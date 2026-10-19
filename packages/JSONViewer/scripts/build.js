import { build as esbuildBuild, context } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");
const gadgetDir = path.join(repoRoot, "src", "gadgets", "JSONViewer");

// esbuild 以入口文件名给产物命名（index.js / index.css），写入磁盘时再改成 on-wiki 需要的 gadget 名
const ENTRY = "src/index.tsx";
const JS_OUTPUT = "index.js";
const CSS_OUTPUT = "index.css";
const JS_NAME = "Gadget-JSONViewer.js";
const CSS_NAME = "Gadget-JSONViewer.css";

/**
 * 产物头部声明：只携带生成警告与仓库地址。
 * JS 的 "use strict" 由 banner 显式携带：产物以 esm 裸语句形式交付，esbuild 不注入指令，
 * 而产物门禁要求文件以 "use strict" 开头。
 */
const BANNER = `/**
 * 本文件由 packages/JSONViewer 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */`;

/**
 * dev 专用内联插件（style-loader 语义）：把每个 CSS 模块编译为向页面注入 `<style>` 的 JS 模块，
 * 开发调试时单个脚本即携带全部样式，无需另行加载 CSS 产物；注入顺序与模块求值顺序一致，
 * 也与生产产物中 CSS 的合并顺序相同。生产模式不注册该插件：CSS 单独打包，满足界面库
 * definition.yaml 需要 js 与 css 两份产物的部署要求。
 */
const cssInjectPlugin = {
    name: "dev-css-inject",
    setup: (pluginBuild) => {
        pluginBuild.onLoad({ filter: /\.css$/ }, async (args) => {
            const css = await fs.promises.readFile(args.path, "utf8");
            const contents = `const css = ${JSON.stringify(css)};
const style = document.createElement("style");
style.textContent = css;
document.head.append(style);`;
            return { contents, loader: "js" };
        });
    },
};

/**
 * esbuild 公共构建选项。产物保持未压缩：唯一的压缩发生在界面库部署侧的 terser，
 * 避免同一份代码被压缩两次。format esm 输出裸顶层语句、不带 IIFE 包裹：
 * gadget 经 mw.loader.implement 下发，其函数作用域已经隔离顶层名。
 * CSS 的浏览器前缀与 stylelint 由界面库自身的 postcss 构建与 lint 流程处理
 * （做法同 Navigation_popups），生产模式只产出 esbuild 的原始输出。
 * __DEV__ 按构建形态区分：发布构建取 false，配合 minifySyntax 使入口中为 safemode
 * 调试写的 mw.loader.using 分支整段消除；dev watch 取 true 时保留该分支。
 */
const buildOptions = (dev = false) => ({
    entryPoints: [path.join(root, ENTRY)],
    bundle: true,
    format: "esm",
    target: "es2020",
    // classic JSX runtime，与源码中的显式 React import 及 tsconfig 的 "jsx": "react" 对应
    jsx: "transform",
    outdir: dev ? path.join(root, "dist", "dev") : path.join(root, "dist"),
    // 仅做语法级优化，不压缩空白与标识符，产物保持可读。
    minifySyntax: true,
    define: { __DEV__: dev ? "true" : "false" },
    ...dev
        ? { plugins: [cssInjectPlugin], sourcemap: "inline" }
        : { banner: { js: `${BANNER}\n"use strict";`, css: BANNER } },
});

/**
 * 去掉 esbuild 残留在产物正文里的整行 eslint 指令注释：它们来自依赖源码
 * （如 preact/compat/client.mjs 的裸 `// eslint-disable-next-line`）。产物被界面库的
 * src/gadgets/JSONViewer/.eslint-exemptions.yaml 排除在规则之外（该目录下实际无规则生效），
 * 此时任何残留指令都会被 eslint 报成 unused directive / 未知规则，故将指令行整体剔除。
 */
const stripInlineDirectives = (text) =>
    text.split("\n").filter((line) => !/^\s*\/\/\s*eslint-(?:disable|enable)\b/.test(line)).join("\n");

/** 产物门禁：banner 位于文件头部、没有残留的模块语法、以换行符结尾 */
const assertArtifact = (name, text, isCss) => {
    if (!text.startsWith(BANNER)) {
        throw new Error(`${name}: banner 缺失或不位于文件头部`);
    }
    if (isCss ? /^\s*@import\b/m.test(text) : /^\s*(?:import|export)\b/m.test(text)) {
        throw new Error(`${name}: 产物中残留未打包的${isCss ? " @import" : " import/export"}语法`);
    }
    if (!text.endsWith("\n")) {
        throw new Error(`${name}: 产物必须以换行符结尾`);
    }
};

const artifacts = [
    [JS_NAME, path.join(gadgetDir, JS_NAME)],
    [CSS_NAME, path.join(gadgetDir, CSS_NAME)],
];

/** 单次构建（write: false 在内存产出），执行产物门禁，返回两份产物的字节内容 */
const buildOnce = async () => {
    const result = await esbuildBuild({ ...buildOptions(), write: false, metafile: true });
    // 断言：metafile 中 esbuild 产出必须恰为 index.js 与 index.css，防止意外的 code-split 或附加产物
    const outputs = Object.keys(result.metafile.outputs).map((file) => path.basename(file)).sort();
    const expected = [CSS_OUTPUT, JS_OUTPUT].sort();
    if (outputs.length !== expected.length || outputs.some((name, index) => name !== expected[index])) {
        throw new Error(`产物清单异常：期望 [${expected.join(", ")}]，实际 [${outputs.join(", ")}]`);
    }
    const js = result.outputFiles.find((file) => file.path.endsWith(JS_OUTPUT));
    const css = result.outputFiles.find((file) => file.path.endsWith(CSS_OUTPUT));
    if (!js || !css) {
        throw new Error("产物文件缺失：未在 outputFiles 中找到 JS 或 CSS");
    }
    const jsText = stripInlineDirectives(Buffer.from(js.contents).toString("utf8"));
    const cssText = Buffer.from(css.contents).toString("utf8");
    assertArtifact(JS_NAME, jsText, false);
    assertArtifact(CSS_NAME, cssText, true);
    return { js: Buffer.from(jsText, "utf8"), css: Buffer.from(cssText, "utf8") };
};

/** 产物直接写入 src/gadgets/JSONViewer/（wiki 部署读取该位置），不经过包内 dist/ */
const write = async () => {
    const first = await buildOnce();
    for (const [name, file] of artifacts) {
        const buffer = name === JS_NAME ? first.js : first.css;
        await fs.promises.mkdir(path.dirname(file), { recursive: true });
        await fs.promises.writeFile(file, buffer);
        console.log(`Built ${path.relative(repoRoot, file)} (${buffer.length} bytes)`);
    }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        if (process.argv.includes("--watch")) {
            // dev 产物：未压缩 + inline sourcemap，CSS 以 <style> 注入打包进单个 JS 文件，
            // 写入包内 dist/dev/（已被 .gitignore 的 dist 覆盖），不触碰提交进仓库的 src/gadgets/ 产物。
            const ctx = await context(buildOptions(true));
            await ctx.watch();
            console.log(`${ENTRY} -> packages/JSONViewer/dist/dev/（未压缩 + inline sourcemap + CSS 内联），监听改动中，Ctrl+C 退出`);
        } else if (process.argv.includes("--check-idempotent")) {
            const first = await buildOnce();
            const second = await buildOnce();
            for (const [name, file] of artifacts) {
                const a = name === JS_NAME ? first.js : first.css;
                const b = name === JS_NAME ? second.js : second.css;
                if (!a.equals(b)) {
                    throw new Error(`${name}: 连续两次构建产物不一致`);
                }
                // 产物是提交进仓库的文件，缺失（ENOENT）本身就是异常，直接让读取失败抛出
                const onDisk = await fs.promises.readFile(file);
                if (!a.equals(onDisk)) {
                    throw new Error(`${name}: ${path.relative(repoRoot, file)} on disk differs from a fresh build`);
                }
            }
            console.log(`Idempotency check passed (${first.js.length} bytes js, ${first.css.length} bytes css)`);
        } else {
            await write();
        }
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}
