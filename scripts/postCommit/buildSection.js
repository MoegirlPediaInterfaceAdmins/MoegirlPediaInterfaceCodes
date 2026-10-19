/**
 * 构建单个失败 job 的 PR 评论段落：标题 + 失败步骤列表 + 可选的报错日志折叠块。
 * 失败步骤为空时展示「无法获取失败步骤」兜底文案；日志为空时整个 details 块省略。
 * @param {string} jobName job 名称
 * @param {string[]} failedSteps 已格式化的失败步骤行
 * @param {string} logTail 日志末尾文本，可为空字符串
 * @returns {string} markdown 段落
 */
export default (jobName, failedSteps, logTail) => {
    const lines = [
        `### ${jobName} 失败`,
        "",
        "失败步骤：",
        "",
        ...failedSteps.length > 0 ? failedSteps : ["- （无法获取失败步骤）"],
        "",
    ];
    if (logTail.length > 0) {
        lines.push(
            "<details>",
            "<summary>报错日志（末尾 200 行）</summary>",
            "",
            "```text",
            logTail,
            "```",
            "",
            "</details>",
        );
    }
    return lines.join("\n");
};
