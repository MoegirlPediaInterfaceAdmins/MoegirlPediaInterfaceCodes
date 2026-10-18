/**
 * 依据目录现状重建 gadget 的 definition.yaml `_files` 列表：
 * 保留仍然存在的既有条目，并入目录里未登记的文件，最后剔除下划线开头的
 * 内部文件与 jsconfig.json。
 * @param {{ definitionFiles: string[]; files: string[]; gadgetFiles: string[]; }} params
 * @param {string[]} params.definitionFiles definition.yaml 现有的 _files
 * @param {string[]} params.files 该 gadget 目录下实际存在的文件
 * @param {string[]} params.gadgetFiles 全仓库所有 gadget 文件名（用于判断既有条目是否仍存在）
 * @returns {{ unexistFiles: string[]; unindexedFiles: string[]; definitionFiles: string[]; }}
 */
export default ({ definitionFiles, files, gadgetFiles }) => {
    const unexistFiles = definitionFiles.filter((file) => !gadgetFiles.includes(file));
    const unindexedFiles = files.filter((file) => !definitionFiles.includes(file));
    const newDefinitionFiles = [...definitionFiles.filter((file) => gadgetFiles.includes(file)), ...unindexedFiles]
        .filter((fileName) => !fileName.startsWith("_") && fileName !== "jsconfig.json");
    return { unexistFiles, unindexedFiles, definitionFiles: newDefinitionFiles };
};
