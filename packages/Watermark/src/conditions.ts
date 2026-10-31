/**
 * 页面上下文：`decideScene` 所需的全部 mw.config 输入。
 * 集中为纯数据对象，便于单测脱离 MediaWiki 运行时构造。
 */
export interface PageContext {
    readonly userGroups: readonly string[];
    readonly skin: string;
    readonly action: string;
    readonly articleId: number;
    readonly namespaceNumber: number;
    readonly namespaceIds: Record<string, number>;
    readonly pageName: string;
    readonly curRevisionId: number;
    readonly revisionId: number;
}

/**
 * 水印场景判定结果：
 * - 三种直接可判定的场景；
 * - `"variant-check"`：显示标题与页名不符的用户页，需经 API 拉取 varianttitles 复核后才能定论；
 * - `null`：不显示水印。
 */
export type WatermarkScene = "history-revision" | "user-page" | "draft" | "variant-check" | null;

/**
 * 拼出某命名空间所有别名前缀的正则（大小写不敏感）。
 * wgNamespaceIds 的键含全部本地化别名（如 `user`、`user_talk`、`用户` 等），
 * 比较显示标题时必须把任意别名形式的前缀都剥掉。
 * @param namespaceNumber 命名空间编号
 * @param namespaceIds wgNamespaceIds
 */
export const getNamespacePrefixRegex = (namespaceNumber: number, namespaceIds: Record<string, number>): RegExp => RegExp(`^(?:${Object.entries(namespaceIds).filter(([, id]) => id === namespaceNumber).map(([name]) => name.toLowerCase()).join("|")}):`, "i");

/**
 * 标题归一化：空格转下划线、剥命名空间前缀、去首尾空白。
 * 显示标题（#firstHeading）与 wgPageName / varianttitles 的标题必须经过
 * 同一归一化后比较，否则「显示时空格、存储时下划线」会造成假性不符。
 * @param title 原始标题
 * @param prefixRegex {@link getNamespacePrefixRegex} 的产物
 */
export const normalizeTitle = (title: string, prefixRegex: RegExp): string => title.replace(/ /g, "_").replace(prefixRegex, "").trim();

/**
 * 第一阶段判定：仅凭 mw.config 与显示标题即可确定的场景。
 * 判定顺序沿用迁移前 site-js 的实现：历史版本 → 用户页复核 → 草稿。
 * 受众过滤（autoconfirmed 用户不显示）也在最前：三种场景全部跳过。
 * @param ctx 页面上下文
 * @param displayedTitle 页面显示标题（#firstHeading / #section_0 的原始文本）
 */
export const decideScene = (ctx: PageContext, displayedTitle: string): WatermarkScene => {
    if (ctx.userGroups.includes("autoconfirmed")) {
        return null;
    }
    if (ctx.curRevisionId > 0 && ctx.revisionId > 0 && ctx.curRevisionId !== ctx.revisionId) {
        return "history-revision";
    }
    if ([2, 3].includes(ctx.namespaceNumber)) {
        if (ctx.action === "view" && ctx.articleId > 0) {
            const prefixRegex = getNamespacePrefixRegex(ctx.namespaceNumber, ctx.namespaceIds);
            if (normalizeTitle(displayedTitle, prefixRegex) !== normalizeTitle(ctx.pageName, prefixRegex)) {
                return "variant-check";
            }
        }
        return null;
    }
    if (ctx.namespaceNumber === 118) { // 草稿命名空间
        return "draft";
    }
    return null;
};

/**
 * 第二阶段判定（variant-check 的复核）：显示标题与任一语言变体标题
 * 归一化后一致即视为正常显示（如简繁转换改写了标题），不显示水印。
 * @param variantTitles prop=info&inprop=varianttitles 返回的全部变体标题
 * @param displayedTitle 页面显示标题的原始文本
 * @param prefixRegex {@link getNamespacePrefixRegex} 的产物
 * @returns `true` 表示存在匹配的变体标题（不显示水印）
 */
export const hasVariantMatch = (variantTitles: readonly string[], displayedTitle: string, prefixRegex: RegExp): boolean => {
    const normalizedDisplayed = normalizeTitle(displayedTitle, prefixRegex);
    return variantTitles.some((title) => normalizeTitle(title, prefixRegex) === normalizedDisplayed);
};
