/**
 * 从源码文本中提取 npm.elemecdn.com 上硬编码引用的包及版本（含 @v 前缀写法），去重后返回。
 * @param {string} content 源码文本
 * @returns {string[] | null} 包引用列表；无匹配时返回 null（与 String.match 语义一致）
 */
export default (content) => {
    const matches = content.match(/(?<=npm\.elemecdn\.com\/)[^@/]+@v?\d+(?:\.\d+)*[^/]*/g);
    return matches === null ? null : [...new Set(matches)];
};
