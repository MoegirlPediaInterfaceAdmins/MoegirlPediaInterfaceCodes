import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as sass from "sass";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");

// The banner only carries the generated-file warning and the repo URL;
// upstream provenance (the navpop oldid links) lives in the README's
// 来源与授权 section.
const banner = `/**
 * 本文件由 packages/Navigation_popups 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */
`;

export const build = async () => {
    const compiled = await sass.compileAsync(path.join(root, "src", "css", "main.scss"), {
        style: "expanded",
        // The sources ship in the repo; keeping URLs relative avoids
        // machine-specific absolute paths leaking into error reports.
        sourceMap: false,
    });
    let css = compiled.css.toString();
    // sass downlevels CSS Color 4 syntax back to legacy rgba() commas; the
    // stylelint standard preset mandates modern notation, so the
    // artifact post-processes it back. Identical color values round-trip:
    // rgba(50, 50, 50, 0.35) === rgb(50 50 50 / 35%).
    css = css.replace(/rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/gu,
        (_, r, g, b, a) => `rgb(${r} ${g} ${b} / ${Math.round(+a * 100)}%)`);
    // stylelint enforces an empty line before top-level at-rules;
    // sass expanded output puts consecutive @media blocks back to back.
    css = css.replace(/(^|\S)\n(@media)/gu, "$1\n\n$2");
    if (css.startsWith("﻿")) {
        throw new Error("BOM detected in CSS artifact");
    }
    if (css.includes("\r")) {
        throw new Error("CR (0x0d) detected in CSS artifact");
    }
    // sass expanded output carries no trailing newline; normalize it in.
    css = `${css.replace(/\n+$/u, "")}\n`;
    return Buffer.from(`${banner}${css}`, "utf8");
};

const distFile = path.join(repoRoot, "src", "gadgets", "Navigation_popups", "Gadget-popups.css");

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
                throw new Error("CSS build is not deterministic: two consecutive builds differ");
            }
            // 产物是提交进仓库的文件，缺失（ENOENT）本身就是异常，直接让读取失败抛出，
            // 不再把缺失当作「跳过对比」处理
            const onDisk = await fs.promises.readFile(distFile);
            if (!first.equals(onDisk)) {
                throw new Error(`${path.relative(repoRoot, distFile)} on disk differs from a fresh build`);
            }
            console.log(`CSS idempotency check passed (${first.length} bytes)`);
        } else {
            await write(first);
        }
    } catch (error) {
        console.error(error.message ?? error);
        process.exitCode = 1;
    }
}
