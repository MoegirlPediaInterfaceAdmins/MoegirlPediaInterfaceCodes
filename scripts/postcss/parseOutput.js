import { debug } from "@actions/core";

/**
 * 解析 postcss --verbose 的输出：跟踪 "Finished <file>" 行得到当前文件名，
 * 含 ⚠ 的行生成一条注解（消息 + 文件/行列属性）。
 * 行列号正则不匹配时 startLine / startColumn 为 NaN，与原内联实现一致，交由
 * @actions/core 的 warning 按缺省处理。
 * @param {string} output postcss 的完整输出文本
 * @param {string} repository 形如 "owner/repo"，用于拼接文件链接
 * @param {string} sha 提交哈希，链接中截取前 7 位
 * @returns {[string, import("@actions/core").AnnotationProperties][]} 注解列表
 */
export default (output, repository, sha) => {
    /**
     * @type { [string, import("@actions/core").AnnotationProperties][] }
     */
    const annotations = [];
    /**
     * @type { string }
     */
    let lastFileName;
    for (const line of output.split("\n")) {
        if (line.trim().startsWith("Finished")) {
            const match = line.match(/Finished (.*?) in/)?.[1];
            if (match) {
                lastFileName = match;
                debug(line, { match });
            }
        }
        if (line.includes("⚠")) {
            /**
             * @type { import("@actions/core").AnnotationProperties }
             */
            const annotationProperties = {
                title: "PostCSS Annotation",
                file: lastFileName,
                startLine: +line.match(/^(\d+):(\d+)/)?.[1],
                startColumn: +line.match(/^(\d+):(\d+)/)?.[2],
            };
            const fileLink = `https://github.com/${repository}/blob/${sha.slice(0, 7)}/${encodeURI(`${lastFileName}#L${annotationProperties.startLine}`)}`;
            const msg = `${line.replace(/^.*?⚠\s*/, "")} @ ${fileLink}`;
            annotations.push([msg, annotationProperties]);
            debug(line, { msg, annotationProperties, fileLink });
        }
    }
    return annotations;
};
