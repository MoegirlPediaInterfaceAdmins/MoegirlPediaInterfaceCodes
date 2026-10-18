import type { TemplateEntry } from "./types.ts";

/**
 * 由预设模板与参数值拼出 wikitext。值为空的参数整段省略，不输出 |key=。
 * @param tpl 模板定义
 * @param values 参数名 → 值
 * @returns 拼出的 wikitext
 */
const buildPresetWikitext = (tpl: TemplateEntry, values: Record<string, string>): string => {
    const params = (tpl.parameters ?? [])
        .map(({ key }) => {
            const value = values[key];
            return value ? `|${key}=${value}` : "";
        })
        .join("");

    return `{{${tpl.template}${params}}}`;
};

/**
 * 把开头的 {{ 改写为 {{subst:。正则锚定在字符串起始处，模板内部嵌套的 {{ 不受影响。
 * @param wikitext 原始 wikitext
 * @returns 改写后的 wikitext
 */
const toSubst = (wikitext: string): string => wikitext.replace(/^\{\{/, "{{subst:");

/**
 * 去除 <noinclude> 块与 <includeonly> 标签，得到可直接编辑的模板正文。
 * @param source 模板页的原始 wikitext
 * @returns 模板正文
 */
const stripNoInclude = (source: string): string => source
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, "")
    .replace(/<\/?includeonly>/gi, "")
    .trim();

/**
 * 由待发送的 wikitext 得到最终提交正文：非自定义模式施加 subst 改写，再补签名。
 *
 * 这是唯一一处做这两步变换的地方 —— 预览与实际发送共用它，
 * 保证「预览里看到的」与「真正提交的」逐字一致。
 * @param wikitext 原始 wikitext
 * @param customMode 自定义模式（不加 subst）
 * @param signatureSuffix 尾随签名，取自配置
 * @returns 最终提交正文
 */
const buildSubmitText = (wikitext: string, customMode: boolean, signatureSuffix: string): string => {
    const body = customMode ? wikitext : toSubst(wikitext);
    return `${body}${signatureSuffix}`;
};

export { buildPresetWikitext, buildSubmitText, stripNoInclude, toSubst };
