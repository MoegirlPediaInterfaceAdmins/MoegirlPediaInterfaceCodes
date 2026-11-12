import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildOnce, gadgetDir, repoRoot } from "./vite-build.js";

// on-wiki 需要的 gadget 文件名
const CSS_NAME = "Gadget-MoeUpload.css";

/** 产物头部声明：只携带生成警告与仓库地址。 */
const BANNER = `/**
 * 本文件由 packages/MoeUpload 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */`;

/**
 * 产物完整性检查。
 * @param {string} name 产物文件名
 * @param {string} text 产物内容
 * @returns {void}
 */
const assertArtifact = (name, text) => {
    if (!text.startsWith(BANNER)) {
        throw new Error(`${name}: banner 缺失或不位于文件头部`);
    }
    if (/^\s*@(?:import|use)\b/mu.test(text)) {
        throw new Error(`${name}: 产物中残留未编译的 @import/@use 语法`);
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

/** 单次构建并执行产物门禁。 */
const buildArtifact = async () => {
    const { css } = await buildOnce();
    const style = css.toString("utf8").replace(/\n+$/u, "");
    const artifact = `${BANNER}\n${style}\n`;
    assertArtifact(CSS_NAME, artifact);
    return Buffer.from(artifact, "utf8");
};

/** 写入产物。 */
const write = async () => {
    const buffer = await buildArtifact();
    const file = path.join(gadgetDir, CSS_NAME);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, buffer);
    console.log(`Built ${path.relative(repoRoot, file)} (${buffer.length} bytes)`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        if (process.argv.includes("--check-idempotent")) {
            const first = await buildArtifact();
            const second = await buildArtifact();
            if (!first.equals(second)) {
                throw new Error(`${CSS_NAME}: 连续两次构建产物不一致`);
            }
            // 产物由 npm run build:artifacts 生成到 dist/_generated，缺失（ENOENT）说明
            // 还没跑过生成，直接让读取失败抛出
            const artifact = path.join(gadgetDir, CSS_NAME);
            const onDisk = await fs.promises.readFile(artifact);
            if (!first.equals(onDisk)) {
                throw new Error(`${CSS_NAME}: ${path.relative(repoRoot, artifact)} on disk differs from a fresh build`);
            }
            console.log(`CSS idempotency check passed (${first.length} bytes)`);
        } else {
            await write();
        }
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}
