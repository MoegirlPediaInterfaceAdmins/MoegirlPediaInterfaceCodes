import type { ApiParseResponse, ApiQueryResponse } from "types-mediawiki-response";

/** mw.Api 单例。惰性创建：QuickRequest 与 site-js 一样全站加载，模块求值时不应构造 Api 实例。 */
let apiInstance: mw.Api | null = null;

/**
 * 取 mw.Api 单例。
 * @returns API 实例
 */
const getApi = (): mw.Api => {
    apiInstance ??= new mw.Api();
    return apiInstance;
};

/**
 * 读取页面的 wikitext。
 * @param title 页面名
 * @returns 页面内容；页面不存在时为空字符串
 */
const fetchPageContent = async (title: string): Promise<string> => {
    const res = await getApi().post({
        action: "query",
        titles: title,
        prop: "revisions",
        rvprop: "content",
        formatversion: 2,
    }) as Partial<ApiQueryResponse>;
    return res.query?.pages?.[0]?.revisions?.[0]?.content ?? "";
};

/**
 * 读取页面的分类（方针修改提醒用）。
 * 页面不存在时 prop=categories 返回空数组，与「无分类」同样处理。
 * @param title 页面名
 * @returns 分类页名集合（形如 Category:萌娘百科方针）
 */
const fetchPageCategories = async (title: string): Promise<Set<string>> => {
    const res = await getApi().post({
        action: "query",
        titles: title,
        prop: "categories",
        cllimit: "max",
        formatversion: 2,
    }) as Partial<ApiQueryResponse> & {
        query?: {
            pages?: ({
                categories?: {
                    title: string;
                }[];
            } & Record<string, unknown>)[];
        };
    };
    return new Set(res.query?.pages?.[0]?.categories?.map((category) => category.title) ?? []);
};

/**
 * 用 action=parse 渲染 wikitext 为 HTML（预览用）。
 *
 * 正文带 {{subst:}} 与模板内的 ~~~~，而真实页面是「存盘时 PST、浏览时再解析」：
 * pst=true 让服务端先做保存前变换、再解析变换后的文本，一次调用即得到与保存后一致的渲染。
 * 注意：formatversion=2 下 parse.text 是纯字符串，不是 { '*': ... }。
 *
 * title 必须传正文将要落到的页面：不传时解析上下文是 "API"，{{PAGENAME}} /
 * {{ARTICLEPAGENAME}}（编辑请求模板以它指向被请求的基页面）等会渲染出与真实保存
 * 结果不同的内容，PST 也拿不到正确的页面上下文。
 * @param wikitext 待渲染的 wikitext
 * @param title 正文所属页面，给解析器提供页面上下文
 * @returns 渲染出的 HTML
 */
const parseWikitext = async (wikitext: string, title: string): Promise<string> => {
    const res = await getApi().post({
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

export { fetchPageCategories, fetchPageContent, getApi, parseWikitext };
