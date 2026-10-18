import { build as esbuildBuild } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");
const gadgetDir = path.join(repoRoot, "src", "gadgets", "UserMessages");

// esbuild 以入口文件名给产物命名（index.js），写入磁盘时再改成 on-wiki 需要的 gadget 名
const ENTRY = "src/index.ts";
const JS_OUTPUT = "index.js";
const JS_NAME = "Gadget-UserMessages.js";

/**
 * 产物头部声明：只携带生成警告与仓库地址。
 * "use strict" 由 banner 显式携带：产物以裸顶层语句形式交付，esbuild 不注入指令，
 * 而部署侧要求文件以严格模式运行。
 */
const BANNER = `/**
 * 本文件由 packages/UserMessages 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */`;

/**
 * esbuild 构建选项。
 *
 * target es2020 与界面库部署侧一致（`tsconfig.production.json` 的 target 与 terser 的 ecma），
 * 类字段、`??=` 等在此就降到 es2020，产物不依赖部署侧的二次降级。
 * 产物保持未压缩（只开 minifySyntax）：唯一的压缩发生在界面库部署侧的 terser，
 * 避免同一份代码被压两次。format esm 输出裸顶层语句、不带 IIFE 包裹：
 * gadget 经 mw.loader.implement 下发，其函数作用域已经隔离顶层名。
 * charset utf8：界面文案是中文，别让 esbuild 转成 \uXXXX。
 */
const buildOptions = () => ({
    entryPoints: [path.join(root, ENTRY)],
    bundle: true,
    format: "esm",
    target: "es2020",
    charset: "utf8",
    outdir: path.join(root, "dist"),
    minifySyntax: true,
    banner: { js: `${BANNER}\n"use strict";` },
});

/** 产物门禁：banner 位于文件头部、没有残留的模块语法、无 BOM/CR、以换行符结尾 */
const assertArtifact = (name, text) => {
    if (!text.startsWith(BANNER)) {
        throw new Error(`${name}: banner 缺失或不位于文件头部`);
    }
    if (/^\s*(?:import|export)\b/m.test(text)) {
        throw new Error(`${name}: 产物中残留未打包的 import/export 语法`);
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

/** 单次构建（write: false 在内存产出），执行产物门禁，返回产物字节内容 */
const buildOnce = async () => {
    const result = await esbuildBuild({ ...buildOptions(), write: false, metafile: true });
    const outputs = Object.keys(result.metafile.outputs).map((file) => path.basename(file));
    if (outputs.length !== 1 || outputs[0] !== JS_OUTPUT) {
        throw new Error(`产物清单异常：期望 [${JS_OUTPUT}]，实际 [${outputs.join(", ")}]`);
    }
    const js = result.outputFiles.find((file) => file.path.endsWith(JS_OUTPUT));
    if (!js) {
        throw new Error("产物文件缺失：未在 outputFiles 中找到 JS");
    }
    const text = Buffer.from(js.contents).toString("utf8");
    assertArtifact(JS_NAME, text);
    return Buffer.from(text, "utf8");
};

/** 产物直接写入 src/gadgets/UserMessages/（wiki 部署读取该位置），不经过包内 dist/ */
const write = async () => {
    const buffer = await buildOnce();
    const file = path.join(gadgetDir, JS_NAME);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, buffer);
    console.log(`Built ${path.relative(repoRoot, file)} (${buffer.length} bytes)`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        if (process.argv.includes("--check-idempotent")) {
            const first = await buildOnce();
            const second = await buildOnce();
            if (!first.equals(second)) {
                throw new Error(`${JS_NAME}: 连续两次构建产物不一致`);
            }
            // 产物是提交进仓库的文件，缺失（ENOENT）本身就是异常，直接让读取失败抛出
            const artifact = path.join(gadgetDir, JS_NAME);
            const onDisk = await fs.promises.readFile(artifact);
            if (!first.equals(onDisk)) {
                throw new Error(`${JS_NAME}: ${path.relative(repoRoot, artifact)} on disk differs from a fresh build`);
            }
            console.log(`Idempotency check passed (${first.length} bytes)`);
        } else {
            await write();
        }
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}
