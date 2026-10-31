import { BlindWatermark, Watermark } from "watermark-js-plus/es";
import { decideScene, getNamespacePrefixRegex, hasVariantMatch, type PageContext } from "./conditions.ts";
import { auxiliaryOptions, contents, visibleOptions } from "./options.ts";

/**
 * 拉取某页面的全部语言变体标题（prop=info&inprop=varianttitles）。
 * pages 以 pageid 为键索引，与迁移前 site-js 的查询保持一致。
 * @param pageName wgPageName
 * @param articleId wgArticleId
 */
const fetchVariantTitles = async (pageName: string, articleId: number): Promise<string[]> => {
    const result = await new mw.Api().post({
        action: "query",
        prop: "info",
        inprop: "varianttitles",
        titles: pageName,
    }) as { query: { pages: Record<string, { varianttitles?: Record<string, string> }> } };
    const page = result.query.pages[String(articleId)];
    return Object.values(page.varianttitles ?? {});
};

$(() => {
    void (async () => {
        const { skin, wgAction, wgArticleId, wgNamespaceIds, wgNamespaceNumber, wgPageName, wgCurRevisionId, wgRevisionId, wgUserGroups } = mw.config.get() as {
            skin: string;
            wgAction: string;
            wgArticleId: number;
            wgNamespaceIds: Record<string, number>;
            wgNamespaceNumber: number;
            wgPageName: string;
            wgCurRevisionId: number;
            wgRevisionId: number;
            wgUserGroups: string[];
        };
        const ctx: PageContext = {
            userGroups: wgUserGroups,
            skin,
            action: wgAction,
            articleId: wgArticleId,
            namespaceNumber: wgNamespaceNumber,
            namespaceIds: wgNamespaceIds,
            pageName: wgPageName,
            curRevisionId: wgCurRevisionId || -1,
            revisionId: wgRevisionId || -1,
        };
        // #section_0 是 MoeSkin 的标题节点；两种皮肤取其一
        const displayedTitle = $("#firstHeading, #section_0").first().text();
        const scene = decideScene(ctx, displayedTitle);
        let content: string | null = null;
        if (scene === "variant-check") {
            const variantTitles = await fetchVariantTitles(ctx.pageName, ctx.articleId);
            content = hasVariantMatch(variantTitles, displayedTitle, getNamespacePrefixRegex(ctx.namespaceNumber, ctx.namespaceIds))
                ? null
                : contents["user-page"];
        } else if (scene !== null) {
            content = contents[scene];
        }
        if (!content) {
            return;
        }
        await new Watermark({ ...visibleOptions, content }).create();
        if (ctx.skin === "moeskin") {
            await new BlindWatermark({ ...auxiliaryOptions, content }).create();
        }
    })();
});
