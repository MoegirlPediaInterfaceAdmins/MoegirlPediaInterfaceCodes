import { warning } from "@actions/core";
import path from "node:path";
import console from "../modules/console.js";

// 围栏字符串与正则中的路径指向入口脚本 scripts/postCommit/linguist-generated.js；
// 已落盘的 .gitattributes 中写着这个路径，改动字面量会让旧围栏无法被识别、从此剥离不掉。
// 生成段用显式围栏注释界定。旧实现靠「# From 前缀 + 空行分隔」识别生成段，
// 手工追加在最后一个生成段之后且没有空行分隔的规则会被当作生成段内容一并删除。
const managedBlockPattern = /(?<=^|\n)# >>> managed by scripts\/postCommit\/linguist-generated\.js >>>\n(?:(?!# >>> managed)[^\n]*\n)*?# <<< managed <<<(?=\n|$)/g;

/**
 * 剥离 .gitattributes 中由本脚本管理的生成段（连同围栏行），返回剩余的手工内容。
 * 围栏内允许零行（对应没有任何有效来源的空围栏）。起始边界用后行断言、结尾用先行断言，
 * 匹配只覆盖围栏行本身而不动两侧换行，避免仅隔一个换行的相邻手工规则被并入同一行、
 * 或紧随的下一个围栏失去行首边界而无法剥离。行消费组带负向前瞻，遇到新的起始围栏即
 * 放弃匹配：未闭合的起始围栏连同其后内容一律按手工内容保留，宁可重复追加也不删除手工内容。
 * @param {string} gitattributes .gitattributes 全文
 * @returns {string} 剥离生成段后的内容（已 trim）
 */
export const stripManagedBlocks = (gitattributes) => gitattributes.replace(managedBlockPattern, "").trim();

/**
 * 与运行环境 locale 无关的稳定比较器：直接比较 UTF-16 码点，
 * 避免 toLocaleLowerCase / localeCompare 随 runner 环境变化产生不同排序。
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export const compareByCodePoint = (a, b) => a > b ? 1 : a < b ? -1 : 0;

/**
 * 把 linguist-generated-* 环境变量条目转成 .gitattributes 生成段的行，
 * 并顺带收集 stylelint 的 css 清单与 CodeQL 的忽略目录。
 * 段顺序按环境变量名、段内路径各自做码点排序，使生成结果与 runner 环境块的枚举顺序
 * 以及来源脚本的目录枚举顺序（如 buildPackages 的 readdir）都无关，
 * 避免枚举顺序变化产生只有排列差异的自动提交。
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} scriptsExcludedFromCodeQL 不参与 CodeQL 目录收集的来源脚本名
 * @returns {{ managedLines: string[]; cssFiles: string[]; foldersForCodeQL: Set<string>; }}
 */
export const buildManagedLines = (env, scriptsExcludedFromCodeQL) => {
    const generatedEnvEntries = Object.entries(env)
        .filter(([index]) => index.startsWith("linguist-generated-"))
        .sort(([a], [b]) => compareByCodePoint(a, b));
    const managedLines = [];
    const cssFiles = ["dist/**/*.css"];
    const foldersForCodeQL = new Set();
    for (const [index, stringValue] of generatedEnvEntries) {
        const key = index.replace("linguist-generated-", "");
        const value = JSON.parse(stringValue);
        if (!Array.isArray(value) || value.length === 0) {
            warning(`${index} is not array or empty: ${stringValue}`);
            continue;
        }
        console.info(`${key}:`, value);
        managedLines.push(`# From ${key}`);
        for (const srcPath of [...value].sort(compareByCodePoint)) {
            if (!scriptsExcludedFromCodeQL.includes(key)) {
                foldersForCodeQL.add(path.dirname(srcPath));
            }
            managedLines.push(`${srcPath} linguist-generated=true`);
            if (path.extname(srcPath) === ".css") {
                cssFiles.push(srcPath);
            }
        }
        managedLines.push("");
    }
    // 去掉最后一个来源段末尾的空行，使闭合围栏直接跟随最后一条规则。
    if (managedLines.length > 0) {
        managedLines.pop();
    }
    return { managedLines, cssFiles, foldersForCodeQL };
};
