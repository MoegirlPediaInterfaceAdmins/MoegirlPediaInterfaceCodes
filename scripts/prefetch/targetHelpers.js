import path from "node:path";

/**
 * 校验 targets.yaml 中 `repo` 字段的格式：恰好两段非空、以单斜杠分隔。
 * @param {string} repo 形如 "owner/repository"
 * @returns {boolean}
 */
export const isValidRepoFormat = (repo) => /^[^/\s]+\/[^/\s]+$/.test(repo);

/**
 * 构造 jsDelivr 上 npm 包产物的下载地址。
 * @param {string} moduleName 包名
 * @param {string | undefined} version 版本（dist-tag 或具体版本），缺省时取 latest
 * @param {string} distFilePath 包内产物路径
 * @returns {URL}
 */
export const buildJsDelivrUrl = (moduleName, version, distFilePath) => {
    const packageName = `${moduleName}${typeof version === "string" ? `@${version}` : ""}`;
    return new URL(path.posix.join("npm", packageName, distFilePath), "https://cdn.jsdelivr.net/");
};

/**
 * 清洗抓取到的产物正文：剥掉 TypeScript 三斜线引用指令（jsDelivr 产物中带的
 * `<reference>` 会污染浏览器侧文件），再逐段删除配置声明的 removeCode 片段。
 * @param {string} data 抓取到的原文
 * @param {string[]} removeCode 要整段删除的代码片段列表
 * @returns {string}
 */
export const transformFetchedCode = (data, removeCode) => removeCode.reduce((p, c) => p.replaceAll(c, ""), data.replace(/(?<=\n|^)\/\/\/ *<reference [^\n]+\n?/ig, ""));
