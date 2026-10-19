/**
 * 生成 browserify 打包用的临时入口文件内容：一行 import + 一行挂载到全局。
 * 导入形式按配置三选一：namespaceImport 用 `* as m`、exportValues 用命名导出、
 * 其余用默认导入；挂载引用与导入形式联动（namespace 挂命名空间对象本身）。
 * @param {{ module: string; entry: string; exportValues?: string[]; namespaceImport?: boolean; }} browserifyTarget
 * @returns {string} 两行代码，以换行连接
 */
export default ({ module, entry, exportValues, namespaceImport }) => {
    const hasExports = Array.isArray(exportValues) && exportValues.length > 0;
    const exportReference = namespaceImport ? "* as m" : hasExports ? `{ ${exportValues.join(", ")} }` : "m";
    const importReference = namespaceImport ? "m" : hasExports ? `{ ${exportValues.join(", ")} }` : "m";
    return [
        `import ${exportReference} from "${module}";`,
        `global["${entry}"] = ${importReference};`,
    ].join("\n");
};
