/* eslint-disable @typescript-eslint/no-unnecessary-condition -- res.query.pages 在类型上可选，需要 ?? 兜底；按下标取首元素在类型上不含 undefined，运行时却不一定会命中，因此保留真值守卫。 */
import type { ApiQueryResponse, QueryPage } from "types-mediawiki-response";

/**
 * 解析 URL 中的 diff/oldid 参数为版本号，无参数或参数非法时返回 undefined。
 *
 * 先取 diff，取不到再取 oldid，再由 `Number.isInteger(n) && n > 0` 过滤。
 * 参数缺失得到 null、`?diff=` 得到空字符串，两者经 `+` 转换都是 0，
 * 过滤后都不会传给接口。
 */
export const parseDiffParam = (search: string): number | undefined => {
    const urlParams = new URLSearchParams(search);
    const diff = urlParams.get("diff") ?? urlParams.get("oldid");
    if (diff === null) {
        return undefined;
    }
    const revision = +diff;
    return Number.isInteger(revision) && revision > 0 ? revision : undefined;
};

/**
 * 获取页面源代码。
 * @param title 页面标题
 * @param params 追加到 revisions 查询的参数，例如按版本取内容时的 rvstartid 与 rvendid
 * @returns 页面主 slot 的内容；标题不存在、没有可用版本或内容不可读时返回 undefined
 */
export const pageSource = async (
    title: string,
    params?: Record<string, string | number>,
): Promise<string | undefined> => {
    const api = new mw.Api();
    const res = await api.post({
        action: "query",
        prop: "revisions",
        formatversion: "2",
        titles: title,
        rvprop: "content",
        rvslots: "main",
        ...params,
    }) as ApiQueryResponse;
    // 用 QueryPage<'revisions'> 收窄到本次请求真正带回来的字段，读没请求的 prop 会编译不过。
    // 标题由调用方传入，missing/invalid 仍是接口可能给出的状态，revisions 未必存在。
    const [pageData] = (res.query.pages ?? []) as QueryPage<"revisions">[];
    if (!pageData) {
        return undefined;
    }
    return pageData.revisions?.[0]?.slots?.main?.content;
};
