import fs from "node:fs";
import path from "node:path";
import console, { dump } from "../modules/console.js";
import { buildGeneratedFileHeader, writeGadgetArtifact } from "../modules/gadgetArtifact.js";
import modulePath from "../modules/modulePath.js";
import yamlModule from "../modules/yamlModule.js";
console.info("Initialization done.");

// vendor 产物只服务构建链：统一写到 dist/_generated/gadgets（gitignore 覆盖，不进入仓库，
// 目录层级与 src/ 下一致），入库职责由 scripts/prefetch/ 在过渡期继续承担
const outputRoot = path.join("dist", "_generated", "gadgets");

/**
 * @type {{ moduleName: string, distFilePath: string, gadget: { name: string, fileName: string } }[]}
 */
const vendorTargets = await yamlModule.readFile("scripts/vendor/targets.yaml");
dump("vendorTargets:", vendorTargets);
for (const { moduleName, distFilePath, gadget: { name, fileName } } of vendorTargets) {
    console.info(`[${name}]`, "Reading from node_modules:", path.join(moduleName, distFilePath));
    // 版本读自实际安装的包并写进 banner，供部署产物审计追溯；
    // 版本本身由 package-lock.json 固定，targets.yaml 不再做 range 校验
    const { version } = JSON.parse(await fs.promises.readFile(path.join("node_modules", moduleName, "package.json"), "utf-8"));
    // 不 trim 原文：与 prefetch 产物拼装结构对齐（上游文件尾部换行原样保留），
    // 保证过渡期新旧两条链产出逐字节一致
    const data = await fs.promises.readFile(path.join("node_modules", moduleName, distFilePath), "utf-8");
    const code = buildGeneratedFileHeader(modulePath(import.meta), { moduleName, version, distFilePath });
    code.push(data, "");
    await writeGadgetArtifact(path.join(outputRoot, name, fileName), code.join("\n"));
    console.info(`[${name}]`, "wrote successfully:", `${moduleName}@${version}`);
}
console.info("Done.");
