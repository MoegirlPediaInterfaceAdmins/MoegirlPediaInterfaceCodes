import { build as esbuildBuild } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vueSfcPlugin } from "./vueSfcPlugin.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");
const gadgetDir = path.join(repoRoot, "dist", "_generated", "gadgets", "Cat-a-lot");

const ENTRY = "src/index.ts";
const JS_OUTPUT = "index.js";
const CSS_OUTPUT = "index.css";
const JS_NAME = "Gadget-Cat-a-lot.js";
const CSS_NAME = "Gadget-Cat-a-lot.css";

// SFC 预编译为 render；Vue helper 来自 runtime.ts。CSS 单独输出给 postcss 链。
const buildOptions = () => ({
    entryPoints: [path.join(root, ENTRY)],
    bundle: true,
    format: "esm",
    target: "es2020",
    charset: "utf8",
    outdir: path.join(root, "dist"),
    minifySyntax: true,
    plugins: [vueSfcPlugin],
    banner: { js: '"use strict";' },
});

const stripInlineDirectives = (text) => text
    .split("\n")
    .filter((line) => !/^\s*\/\/\s*eslint-(?:disable|enable)\b/u.test(line))
    .join("\n");

const assertArtifact = (name, text, isCss) => {
    if (!isCss && !text.startsWith('"use strict";')) {
        throw new Error(`${name}: 产物未以 "use strict" 开头`);
    }
    if (isCss ? /^\s*@import\b/mu.test(text) : /^\s*(?:import|export)\b/mu.test(text)) {
        throw new Error(`${name}: 产物中残留未打包的${isCss ? " @import" : " import/export"}语法`);
    }
    if (!isCss && /from\s+["']vue["']/u.test(text)) {
        throw new Error(`${name}: 产物中残留对 vue 的静态 import`);
    }
    if (text.startsWith("\uFEFF")) {
        throw new Error(`${name}: 产物带 BOM`);
    }
    if (text.includes("\r")) {
        throw new Error(`${name}: 产物含 CR (0x0d)`);
    }
    if (!text.endsWith("\n")) {
        throw new Error(`${name}: 产物必须以换行符结尾`);
    }
};

const buildOnce = async () => {
    const result = await esbuildBuild({ ...buildOptions(), write: false, metafile: true });
    const outputs = Object.keys(result.metafile?.outputs ?? {}).map((file) => path.basename(file)).sort();
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

const write = async () => {
    const first = await buildOnce();
    for (const [name, buffer] of [[JS_NAME, first.js], [CSS_NAME, first.css]]) {
        const file = path.join(gadgetDir, name);
        await fs.promises.mkdir(path.dirname(file), { recursive: true });
        await fs.promises.writeFile(file, buffer);
        console.log(`Built ${path.relative(repoRoot, file)} (${buffer.length} bytes)`);
    }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        if (process.argv.includes("--check-idempotent")) {
            const first = await buildOnce();
            const second = await buildOnce();
            for (const [name, a, b] of [
                [JS_NAME, first.js, second.js],
                [CSS_NAME, first.css, second.css],
            ]) {
                if (!a.equals(b)) {
                    throw new Error(`${name}: 连续两次构建产物不一致`);
                }
                // 产物由 npm run build:artifacts 生成到 dist/_generated，缺失（ENOENT）说明
                // 还没跑过生成，直接让读取失败抛出
                const artifact = path.join(gadgetDir, name);
                const onDisk = await fs.promises.readFile(artifact);
                if (!a.equals(onDisk)) {
                    throw new Error(`${name}: ${path.relative(repoRoot, artifact)} on disk differs from a fresh build`);
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
