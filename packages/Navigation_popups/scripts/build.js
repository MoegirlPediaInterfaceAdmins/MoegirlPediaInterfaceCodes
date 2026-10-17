import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import rollupOptions from "../rollup.config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");
const distFile = rollupOptions.output.file;
const { input, plugins, treeshake, onwarn, output } = rollupOptions;

const bundle = await rollup({ input, plugins, treeshake, onwarn });

export const build = async () => {
    const generated = await bundle.generate(output);
    if (generated.output.length !== 1 || generated.output[0].type !== "chunk") {
        throw new Error(`expected a single output chunk, got ${generated.output.length}`);
    }
    const code = generated.output[0].code;
    // esbuild injects a "use strict" prologue into every module because
    // alwaysStrict is inherited from the base tsconfig and TS 6.0 forbids
    // turning it off explicitly (TS5107), so the raw chunk carries one per
    // module. The banner already provides the artifact's only global
    // directive — strip the module-level ones from the body. The filter only
    // drops lines that are exactly the directive, and no source string
    // literal can produce such a line.
    const bannerPrefix = `${output.banner}\n`;
    if (!code.startsWith(bannerPrefix)) {
        throw new Error("artifact does not start with the configured banner");
    }
    // 产物不做任何 lint，构建直接产出 esbuild 的原始输出；下面只做完整性自检
    // （BOM、CR、残留模块语法、末尾换行），不属于 lint。
    const artifact = bannerPrefix + code
        .slice(bannerPrefix.length)
        .split("\n")
        .filter((line) => line !== '"use strict";')
        .join("\n");
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
            // 产物是提交进仓库的文件，缺失（ENOENT）本身就是异常，直接让读取失败抛出，
            // 不再把缺失当作「跳过对比」处理
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
