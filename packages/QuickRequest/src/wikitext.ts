import type { TemplateSpec } from "./types.ts";

/**
 * 由模板规格与参数值拼出 wikitext。值为空的参数整段省略，不输出 |key=。
 * 纯数字键（如 "1"）与命名键同样以 |key=值 输出——对位置参数而言 |1=值 与裸值等价，且不依赖参数顺序。
 *
 * 值一律原样拼接、不做任何改写（含顶层管道符）：预览是强制步骤、与提交共用同一份文本，
 * 含管道的输入造成的拆参异常在预览中可见，用户可当场修正；反之若在客户端改写
 * （如把顶层 | 替换为 {{!}}），会破坏 nowiki / pre / syntaxhighlight 等环境里的合法输入，
 * 等于维护一个不完整的 wikitext 解析器——两者取舍下不改写用户输入。
 * 固定参数（fixedParams，如 用户组=机器用户）先于用户参数输出，同样原样拼接。
 * @param spec 模板规格（类型条目或其变体）
 * @param values 参数名 → 值
 * @returns 拼出的 wikitext
 */
const buildTemplateWikitext = (spec: TemplateSpec, values: Record<string, string>): string => {
    const fixed = Object.entries(spec.fixedParams ?? {})
        .map(([key, value]) => `|${key}=${value}`)
        .join("");
    const params = (spec.parameters ?? [])
        .map(({ key }) => {
            const value = values[key];
            return value ? `|${key}=${value}` : "";
        })
        .join("");

    return `{{${spec.template}${fixed}${params}}}`;
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

export { buildSubmitText, buildTemplateWikitext, toSubst };
