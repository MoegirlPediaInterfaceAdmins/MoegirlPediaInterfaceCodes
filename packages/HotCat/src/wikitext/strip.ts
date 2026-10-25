import { replaceByBlanks } from "./patterns.ts";

/**
 * HTML 注释：MediaWiki 解析 wikitext 的规则是 <!-- 开始、第一个 --> 结束、未闭合则吞到文末。
 * --!>、<!--> 等 HTML5 的提前闭合只作用于最终 HTML 渲染层，不影响模板与链接语法是否生效
 * （Preprocessor_Hash.php 与 Parsoid 的词法都只向后搜索 -->）。
 */
const htmlCommentRE = /<!--[\s\S]*?(?:-->|$)/g;
const nowikiRE = /<nowiki>[\s\S]*?<\/nowiki>/g;

/**
 * 剥除 HTML 注释与 nowiki，供扫描 wikitext 前清理不参与语法解析的部分。
 * 单遍替换会在删除接缝处重新拼出完整的注释或标签（如 "<!<!-- A -->-- B -->"
 * 删掉中间注释后剩下 "<!-- B -->"），所以循环替换直到结果不再变化。
 */
const stripCommentsAndNowiki = (text: string): string => {
    let out = text;
    let prev: string;
    do {
        prev = out;
        out = out.replace(htmlCommentRE, "").replace(nowikiRE, "");
    } while (out !== prev);
    return out;
};

/**
 * 用等长空白覆盖 HTML 注释与 nowiki（而非删除），其余文本下标保持不变，
 * 供需要按下标回切原文的调用方使用。
 * 空白隔开了注释前后的字符，接缝处不可能重新拼出完整的注释或标签，单遍即可，无需循环。
 */
const blankCommentsAndNowiki = (text: string): string => text.replace(htmlCommentRE, replaceByBlanks).replace(nowikiRE, replaceByBlanks);

export { stripCommentsAndNowiki, blankCommentsAndNowiki };
