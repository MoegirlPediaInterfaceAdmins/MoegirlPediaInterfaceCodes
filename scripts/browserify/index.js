import browserify from "browserify";
import fs from "node:fs";
import path from "node:path";
import console, { dump } from "../modules/console.js";
import exec from "../modules/exec.js";
import { buildGeneratedFileHeader, writeGadgetArtifact } from "../modules/gadgetArtifact.js";
import buildInputCode from "./buildInputCode.js";
import minifyStream from "../modules/minify-stream.js";
import { mkdlocaltmp } from "../modules/mkdtmp.js";
import modulePath from "../modules/modulePath.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

/**
 * @type {{ module: string; entry: string; gadget: { name: string, fileName: string }; exportValues?: string[], removePlugins?: string[], prependCode?: string }[]}
 */
const browserifyTargets = await yamlModule.readFile("scripts/browserify/targets.yaml");
dump("browserifyTargets:", browserifyTargets);
// 产物只服务构建链：统一写到 dist/_generated/gadgets（gitignore 覆盖，不进入仓库），
// 由 tsconfig.artifacts.json 编入 dist/_compiled；目录层级与 src/ 下一致
const outputRoot = path.join("dist", "_generated", "gadgets");
const tempPath = await mkdlocaltmp();
const inputPath = path.join(tempPath, "input.js");
console.info("中间产物（临时入口）目录:", tempPath);
try {
    const jsonOutput = await exec("npm ls --json");
    /**
     * @type {{ [name: string]: { version: string } }}
     */
    const localPackageVersions = JSON.parse(jsonOutput).dependencies;
    console.info("npm ls:", ["", ...Object.entries(localPackageVersions).map(([name, { version }]) => `* ${name}@${version}`)].join("\n"));
    for (const browserifyTarget of browserifyTargets) {
        console.info("target:", browserifyTarget);
        const { module, gadget: { name, fileName }, removePlugins, prependCode } = browserifyTarget;
        const file = path.join(outputRoot, name, fileName);
        await fs.promises.rm(inputPath, {
            recursive: true,
            force: true,
        });
        await fs.promises.writeFile(inputPath, buildInputCode(browserifyTarget));
        const codes = await new Promise((res, rej) => {
            console.info(`[${module}]`, "start generating...");
            const plugins = new Set([
                "esmify",
                "common-shakeify",
                "browser-pack-flat/plugin",
            ]);
            if (Array.isArray(removePlugins)) {
                for (const removePlugin of removePlugins) {
                    plugins.delete(removePlugin);
                }
            }
            let codeObject = browserify(inputPath).transform("unassertify", { global: true }).transform("envify", { global: true });
            for (const plugin of plugins) {
                codeObject = codeObject.plugin(plugin);
            }
            const bundleStream = codeObject.bundle();
            const codeStream = bundleStream.pipe(minifyStream({
                mangle: false,
                output: {
                    beautify: true,
                    width: 1024 * 10,
                },
            }));
            const chunks = [];
            // pipe 不转发源流错误：bundle 报错（缺模块、transform 语法错误）时错误事件落在
            // 源流上，没有监听就会成为未捕获异常，绕过下面的 rej 路径
            bundleStream.on("error", (err) => rej(err));
            codeStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            codeStream.on("error", (err) => rej(err));
            codeStream.on("end", () => res(Buffer.concat(chunks).toString("utf8")));
        });
        const output = buildGeneratedFileHeader(modulePath(import.meta), browserifyTarget);
        if (typeof prependCode === "string") {
            output.push(prependCode);
        }
        output.push(codes.trim(), "");
        const code = output.join("\n");
        const changed = await writeGadgetArtifact(file, code);
        if (!changed) {
            console.info(`[${module}]`, "No change, continue to next one.");
            continue;
        }
        console.info(`[${module}]`, "generated successfully.");
    }
} finally {
    // 成功与失败路径都清理临时目录，避免本地多次构建后 .tmp/mgp-* 累积
    await fs.promises.rm(tempPath, { recursive: true, force: true });
}
console.info("Done.");
