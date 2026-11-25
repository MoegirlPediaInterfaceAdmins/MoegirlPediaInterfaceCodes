import console, { dump } from "../modules/console.js";
console.info("Initialization done.");
import fs from "node:fs";
import path from "node:path";
import { artifactManifest } from "../modules/artifactManifest.js";
import createCommit from "../modules/createCommit.js";
import { sortWithLowerFirstCharacter } from "../modules/sortWithLowerFirstCharacter.js";
import { readDocumentFile, syncSeq, writeDocumentFile } from "../modules/yamlModule.js";
import reconcileDefinitionFiles from "./reconcileDefinitionFiles.js";

const gadgetBaseRoot = "src/gadgets";
// 构建产物不入库：browserify / vendor / packages 三类产物只存在于 dist/_generated，
// 各 gadget 目录下不再有产物文件；_files 对账需把产物清单并入目录扫描结果
const manifest = await artifactManifest();

/**
 * @type { import("yaml").Document }
 */
// readDocumentFile/writeDocumentFile 保留注释与键序（如各 definition.yaml 顶部的
// 说明注释）；readFile→writeFile 的 parse/stringify 往返会全部丢弃
const gadgetsDefinitionListDoc = await readDocumentFile(path.join(gadgetBaseRoot, "Gadgets-definition-list.yaml"));
// YAMLSeq 不是 Array 子类（没有 length/push/includes），一律经 .items 操作；
// 其条目是 YAMLMap，字段读取用 get()（标量直接返回值，集合返回节点）
const gadgetsDefinitionList = gadgetsDefinitionListDoc.contents;
dump("gadgetsDefinitionList:", gadgetsDefinitionList.toJSON());
const gadgetDirents = await fs.promises.readdir(gadgetBaseRoot, { withFileTypes: true });
// gadget 名与其内文件均显式排序：跨环境 readdir 顺序不定，排序既保证 Gadgets-definition-list.yaml
// 各 section 的 gadgets 顺序稳定，也保证未登记文件按稳定顺序追加进 definition.yaml，
// 避免交叉重新生成时出现纯排序 diff
const gadgetNames = sortWithLowerFirstCharacter(gadgetDirents.filter((dirent) => dirent.isDirectory()).map(({ name }) => name));
const gadgetDirs = await Promise.all(gadgetNames.map(async (gadget) => {
    const gadgetDir = path.join(gadgetBaseRoot, gadget);
    const dirFiles = (await fs.promises.readdir(gadgetDir)).filter((file) => [".js", ".css", ".json"].includes(path.extname(path.join(gadgetDir, file))));
    // manifest 条目与目录内文件天然不相交（产物不入库），直接拼接
    const manifestFiles = manifest.get(gadget) ?? [];
    return {
        gadget,
        files: sortWithLowerFirstCharacter([...dirFiles, ...manifestFiles]),
    };
}));
const gadgets = gadgetDirs.map(({ gadget }) => gadget);
const gadgetFiles = gadgetDirs.flatMap(({ files: _files }) => _files);
const duplicatedGadgetFiles = gadgetFiles.filter((file, index) => gadgetFiles.lastIndexOf(file) !== index);
if (duplicatedGadgetFiles.length > 0) {
    console.error("Found duplicated gadget files, exit:");
    console.error(duplicatedGadgetFiles);
    process.exit(1);
}
for (const { gadget, files } of gadgetDirs) {
    console.info("gadget:", gadget);
    try {
        const gadgetDefinitionDoc = await readDocumentFile(path.join(gadgetBaseRoot, gadget, "definition.yaml"));
        // toJS() 取纯对象快照走既有 reconcile 逻辑；变更回写走 syncSeq 只动 _files，
        // 其余键（skins、peers 等及其注释）原样保留
        const { _section } = gadgetDefinitionDoc.toJS();
        const { unexistFiles, unindexedFiles, definitionFiles } = reconcileDefinitionFiles({ definitionFiles: gadgetDefinitionDoc.get("_files").toJSON(), files, gadgetFiles });
        if (unexistFiles.length + unindexedFiles.length > 0) {
            console.info("Found unexist or unindexed files, update definition.yaml and commit:", { unexistFiles, unindexedFiles });
            syncSeq(gadgetDefinitionDoc, "_files", definitionFiles);
            await writeDocumentFile(path.join(gadgetBaseRoot, gadget, "definition.yaml"), gadgetDefinitionDoc);
            await createCommit(`auto(Gadget-${gadget}): gadget definition updated by generateGadgetsDefinition`);
        }
        console.info(`[${gadget}]`, "_section:", _section);
        let sectionExist = false;
        for (let i = 0; i < gadgetsDefinitionList.items.length; i++) {
            const section = gadgetsDefinitionList.items[i];
            // 条目当前值一律经 toJSON() 读取：add() 追加的是原始字符串而非 Scalar
            // 节点，直接解构 items[].value 会得到 undefined
            if (_section === section.get("name")) {
                sectionExist = true;
                const sectionGadgets = section.get("gadgets");
                const gadgetNames = sectionGadgets.toJSON();
                if (!gadgetNames.includes(gadget)) {
                    console.info(`[${gadget}]`, `_section "${_section}" match, gadgets not includes, push`);
                    sectionGadgets.add(gadget);
                } else {
                    console.info(`[${gadget}]`, `_section "${_section}" match, gadgets includes`);
                }
            } else {
                const gadgetNames = section.get("gadgets").toJSON();
                if (gadgetNames.includes(gadget)) {
                    console.info(`[${gadget}]`, `_section "${_section}" not match, gadgets includes, remove`);
                    section.get("gadgets").items.splice(gadgetNames.indexOf(gadget), 1);
                }
            }
        }
        if (!sectionExist) {
            console.info(`[${gadget}]`, "_section not existed, push:", { name: _section, gadgets: [gadget] });
            // add() 自动把普通对象包装成节点
            gadgetsDefinitionList.add({ name: _section, gadgets: [gadget] });
        }
    } catch (err) {
        console.error(`[${gadget}]`, "error:", err);
        process.exit(1);
    }
}
console.info("Start to clean up unexist gadgets...");
for (const section of gadgetsDefinitionList.items) {
    // 逐 section 收集仍存在的 gadget，经 syncSeq 删除失效条目；
    // 无失效条目时 syncSeq 不动节点，section 内注释不受影响
    const kept = [];
    for (const gadget of section.get("gadgets").toJSON()) {
        if (gadgets.includes(gadget)) {
            kept.push(gadget);
        } else {
            console.info("gadget not exist:", gadget);
        }
    }
    syncSeq(section, "gadgets", kept);
}
dump("gadgetsDefinitionList final:", gadgetsDefinitionList.toJSON());
await writeDocumentFile(path.join(gadgetBaseRoot, "Gadgets-definition-list.yaml"), gadgetsDefinitionListDoc);
await createCommit("auto: new Gadgets-definition-list.yaml generated");
console.info("Done.");
