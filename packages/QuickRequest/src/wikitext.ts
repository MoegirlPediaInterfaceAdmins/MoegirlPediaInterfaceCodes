import type { TemplateSpec } from "./types.ts";

/**
 * 转义值中会拆散模板参数的顶层管道符。
 *
 * 逐字符扫描 {{ }} 与 [[ ]] 的括号深度,只把深度 0 的 | 替换为 {{!}}:
 * 嵌套模板与内链里的管道是它们自己的参数分隔符,必须原样保留;
 * {{!}} 在渲染时展开回字面 |,内容不丢失。用户往字段里粘贴表格源码
 * ({| |} 的管道全在深度 0)或含 | 的文字时,参数结构不会被拆散。
 * 深度已为 0 时出现的孤立 }} / ]] 属于不平衡输入,原样保留(由服务端模板解析报错)。
 * @param value 字段原始值
 * @returns 顶层管道已转义的值
 */
const escapeTopLevelPipes = (value: string): string => {
    let depth = 0;
    let out = "";
    let index = 0;
    while (index < value.length) {
        const two = value.slice(index, index + 2);
        if (two === "{{" || two === "[[") {
            depth += 1;
            out += two;
            index += 2;
            continue;
        }
        if (depth > 0 && (two === "}}" || two === "]]")) {
            depth -= 1;
            out += two;
            index += 2;
            continue;
        }
        if (value[index] === "|" && depth === 0) {
            out += "{{!}}";
            index += 1;
            continue;
        }
        out += value[index];
        index += 1;
    }
    return out;
};

/**
 * 由模板规格与参数值拼出 wikitext。值为空的参数整段省略，不输出 |key=。
 * 纯数字键（如 "1"）与命名键同样以 |key=值 输出——对位置参数而言 |1=值 与裸值等价，且不依赖参数顺序。
 * 值先经 escapeTopLevelPipes,防止字面 | 拆散本层参数。
 * 固定参数（fixedParams，如 用户组=机器用户）先于用户参数输出，二者走同一转义路径。
 * @param spec 模板规格（类型条目或其变体）
 * @param values 参数名 → 值
 * @returns 拼出的 wikitext
 */
const buildTemplateWikitext = (spec: TemplateSpec, values: Record<string, string>): string => {
    const fixed = Object.entries(spec.fixedParams ?? {})
        .map(([key, value]) => `|${key}=${escapeTopLevelPipes(value)}`)
        .join("");
    const params = (spec.parameters ?? [])
        .map(({ key }) => {
            const value = values[key];
            return value ? `|${key}=${escapeTopLevelPipes(value)}` : "";
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
