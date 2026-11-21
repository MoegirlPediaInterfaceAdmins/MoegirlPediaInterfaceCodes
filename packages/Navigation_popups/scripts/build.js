import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import rollupOptions from "../rollup.config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");
// 产物落点由 rollup.config.js 的 output.file 声明（构建链暂存区 dist/_generated/gadgets）
const distFile = rollupOptions.output.file;
const { input, plugins, treeshake, onwarn, output } = rollupOptions;

const bundle = await rollup({ input, plugins, treeshake, onwarn });

export const build = async () => {
    const generated = await bundle.generate(output);
    if (generated.output.length !== 1 || generated.output[0].type !== "chunk") {
        throw new Error(`expected a single output chunk, got ${generated.output.length}`);
    }
    const artifact = generated.output[0].code;
    // 产物不做任何 lint，构建直接产出 esbuild 的原始输出；严格模式指令由部署链的 tsc
    // （alwaysStrict）在编入 dist/ 时注入，这里不再剥离或注入 directive。
    // 下面只做完整性自检（BOM、CR、残留模块语法、末尾换行），不属于 lint。
    if (artifact.startsWith("﻿")) {
        throw new Error("BOM detected in artifact");
    }
    if (artifact.includes("\r")) {
        throw new Error("CR (0x0d) detected in artifact");
    }
    if (/^\s*(?:import|export)\b/m.test(artifact)) {
        throw new Error("leftover module syntax in artifact");
    }
    if (!artifact.endsWith("\n")) {
        throw new Error("artifact must end with a newline");
    }
    return Buffer.from(artifact, "utf8");
};

const write = async (buf) => {
    await fs.promises.mkdir(path.dirname(distFile), { recursive: true });
    await fs.promises.writeFile(distFile, buf);
    console.log(`Built ${path.relative(repoRoot, distFile)} (${buf.length} bytes)`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        const first = await build();
        if (process.argv.includes("--check-idempotent")) {
            const second = await build();
            if (!first.equals(second)) {
                throw new Error("build is not deterministic: two consecutive builds differ");
            }
            // 产物由 npm run build:artifacts 生成到 dist/_generated，缺失（ENOENT）说明
            // 还没跑过生成，直接让读取失败抛出
            const onDisk = await fs.promises.readFile(distFile);
            if (!first.equals(onDisk)) {
                throw new Error(`${path.relative(repoRoot, distFile)} on disk differs from a fresh build`);
            }
            console.log(`Idempotency check passed (${first.length} bytes)`);
        } else {
            await write(first);
        }
    } catch (error) {
        console.error(error.message ?? error);
        process.exitCode = 1;
    }
}
