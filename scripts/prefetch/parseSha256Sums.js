/**
 * 从 GNU sha256sums.txt 文本中找出指定文件的哈希值。
 * GNU sha256sum 行格式固定为「64 位哈希 + 两字符分隔符 + 文件名」，text 模式分隔符为
 * 两个空格、binary 模式（sha256sum -b）为空格加星号；文件名可含空格，须整段取到行尾，
 * 不能按空白拆分，否则二进制标记与含空格的文件名都会匹配失败
 * @param {string} sumsText sha256sums.txt 全文
 * @param {string} asset 要查找的文件名
 * @returns {string | undefined} 对应的 sha256 十六进制值，无记录时为 undefined
 */
export default (sumsText, asset) => sumsText.trim().split(/\r?\n/)
    .map((line) => /^([0-9a-f]{64}) (?: |\*)(.+)$/.exec(line))
    .filter(Boolean)
    .find(([, , fileName]) => fileName === asset)?.[1];
