import fs from "node:fs";
import path from "node:path";
import yamlModule from "./yamlModule.js";

/**
 * 三类构建产物（browserify 打包、vendor 从 node_modules 读取、packages/ 各包构建）清单的
 * 单一数据来源：browserify 与 vendor 的 targets.yaml 自带 gadget 归属，packages/<name>/
 * artifacts.yaml 声明该包的产物文件名（新增包只需添加声明文件，无需改本模块）。
 * 产物不入库后，definition.yaml 的 `_files` 对账以「目录扫描 ∪ 本清单」为准，
 * 见 scripts/generateGadgetsDefinition/。
 * @returns {Promise<Map<string, string[]>>} gadget 名 -> 产物文件名列表
 */
export const artifactManifest = async () => {
    const manifest = new Map();
    const add = (gadget, fileName) => {
        if (!manifest.has(gadget)) {
            manifest.set(gadget, []);
        }
        manifest.get(gadget).push(fileName);
    };
    for (const { gadget: { name, fileName } } of await yamlModule.readFile("scripts/browserify/targets.yaml")) {
        add(name, fileName);
    }
    for (const { gadget: { name, fileName } } of await yamlModule.readFile("scripts/vendor/targets.yaml")) {
        add(name, fileName);
    }
    const packageDirents = await fs.promises.readdir("packages", { withFileTypes: true });
    for (const { name } of packageDirents.filter((dirent) => dirent.isDirectory())) {
        // packages/ 允许存在不带 artifacts.yaml 的目录（如纯工具包、tsconfig 等文件条目），
        // 读不到声明即视为无产物，不参与清单
        const artifacts = await yamlModule.readFile(path.join("packages", name, "artifacts.yaml")).catch(() => null);
        if (!Array.isArray(artifacts)) {
            continue;
        }
        for (const fileName of artifacts) {
            add(name, fileName);
        }
    }
    return manifest;
};

export default artifactManifest;
