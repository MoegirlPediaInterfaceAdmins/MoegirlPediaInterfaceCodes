import type { TypeConfig } from "./types.ts";

/**
 * 由类型配置与参数值拼出模板调用。值为空的参数整段省略，不输出 |key=。
 * 纯数字键（如 "1"）与命名键同样以 |key=值 输出——对位置参数而言 |1=值 与裸值等价，且不依赖参数顺序。
 * @param typeConfig 类型配置
 * @param values 参数名 → 值
 * @returns 拼出的 wikitext
 */
const buildTemplateWikitext = (typeConfig: TypeConfig, values: Record<string, string>): string => {
    const params = (typeConfig.parameters ?? [])
        .map(({ key }) => {
            const value = values[key];
            return value ? `|${key}=${value}` : "";
        })
        .join("");

    return `{{${typeConfig.template}${params}}}`;
};

/**
 * 把开头的 {{ 改写为 {{subst:。正则锚定在字符串起始处，模板内部嵌套的 {{ 不受影响。
 * @param wikitext 原始 wikitext
 * @returns 改写后的 wikitext
 */
const toSubst = (wikitext: string): string => wikitext.replace(/^\{\{/, "{{subst:");

/**
 * 由模板调用得到最终提交正文：施加 subst 改写。
 * 签名不在外部追加——阶段 1 的各模板都以 sign 参数的缺省值输出 `——~~~~`，
 * 外部再补会产生两份签名。
 * 这是唯一一处做改写的地方——预览与实际发送共用它的产物，
 * 保证「预览里看到的」与「真正提交的」逐字一致。
 * @param wikitext 模板调用
 * @returns 最终提交正文
 */
const buildSubmitText = (wikitext: string): string => toSubst(wikitext);

/**
 * 剥离正文开头的二级标题行。
 * 权限申请（阶段 2）、封禁申诉（阶段 3）等模板的正文以 `== … ==` 开头，
 * 而 addtopic 已按 sectiontitle 生成章节标题，正文里的标题行须在拼装时删去以免重复。
 * 只认行首的二级标题：`(?!=)` 排除 `===`（三级及更深属于正文结构）；
 * 标题可两侧无空格（如 ==提请将[[User:X]]列入破坏者列表==）。
 * @param text 待剥离的正文
 * @returns 标题与剩余正文；开头不是二级标题时为 null
 */
const extractLeadingHeading = (text: string): { title: string; body: string } | null => {
    const match = /^==(?!=)[ \t]*(.+?)[ \t]*==(?!=)[ \t]*(?:\r?\n|$)/.exec(text);
    if (!match) {
        return null;
    }
    return { title: match[1], body: text.slice(match[0].length) };
};

export { buildSubmitText, buildTemplateWikitext, extractLeadingHeading, toSubst };
