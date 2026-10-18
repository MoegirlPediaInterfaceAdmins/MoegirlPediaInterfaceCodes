import type { ApiParseResponse, ApiQueryResponse } from "types-mediawiki-response";

const api = new mw.Api();

/**
 * 读取页面的 wikitext。
 * @param title 页面名
 * @returns 页面内容；页面不存在时为空字符串
 */
const fetchPageContent = async (title: string): Promise<string> => {
    const res = await api.post({
        action: "query",
        titles: title,
        prop: "revisions",
        rvprop: "content",
        formatversion: 2,
    }) as Partial<ApiQueryResponse>;
    return res.query?.pages?.[0]?.revisions?.[0]?.content ?? "";
};

/**
 * 读取页面的 wikitext，页面不存在或内容为空时抛错。
 * 自定义模式用它，避免把空页面静默地变成一个空编辑器。
 * @param title 页面名
 * @returns 页面内容
 */
const fetchPageContentOrThrow = async (title: string): Promise<string> => {
    const content = await fetchPageContent(title);
    if (content.trim() === "") {
        throw new Error(wgULS(`页面 ${title} 不存在或内容为空`, `頁面 ${title} 不存在或內容為空`));
    }
    return content;
};

/**
 * 用 action=parse 渲染 wikitext 为 HTML（预览用）。
 *
 * 正文常带 {{subst:}} 与签名（~~~~），而真实页面是「存盘时 PST、浏览时再解析」：
 * pst=true 让服务端先做保存前变换、再解析变换后的文本，一次调用即得到与保存后一致的渲染。
 * 注意：formatversion=2 下 parse.text 是纯字符串，不是 { '*': ... }。
 *
 * title 必须传正文将要落到的页面：不传时解析上下文是 "API"，{{PAGENAME}} / {{SUBJECTPAGENAME}}
 * 等会渲染出与真实保存结果不同的内容，PST 也拿不到正确的页面上下文。
 * @param wikitext 待渲染的 wikitext
 * @param title 正文所属页面，给解析器提供页面上下文
 * @returns 渲染出的 HTML
 */
const parseWikitext = async (wikitext: string, title: string): Promise<string> => {
    const res = await api.post({
        action: "parse",
        title,
        text: wikitext,
        contentmodel: "wikitext",
        pst: true,
        disablelimitreport: true,
        formatversion: 2,
        wrapoutputclass: "mw-parser-output",
    }) as Partial<ApiParseResponse>;
    return res.parse?.text ?? "";
};

export { api, fetchPageContent, fetchPageContentOrThrow, parseWikitext };
