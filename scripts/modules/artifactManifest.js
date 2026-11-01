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
        const artifactsPath = path.join("packages", name, "artifacts.yaml");
        // 仅「声明文件不存在」（ENOENT）表示该目录是非 gadget 包（如纯工具包），允许跳过；
        // 其余读取错误（YAML 语法、权限等）必须抛出：静默跳过会让 manifest 缺条目，
        // definition.yaml 的 _files 对账将把产物判为不存在而误删（gadget 注册丢失）
        const artifacts = await yamlModule.readFile(artifactsPath).catch((error) => {
            if (error?.code === "ENOENT") {
                return null;
            }
            throw error;
        });
        if (artifacts === null) {
            continue;
        }
        if (!Array.isArray(artifacts) || !artifacts.every((fileName) => typeof fileName === "string")) {
            throw new Error(`${artifactsPath}: 产物声明必须是字符串数组（各产物文件名的列表）`);
        }
        for (const fileName of artifacts) {
            add(name, fileName);
        }
    }
    return manifest;
};

export default artifactManifest;
