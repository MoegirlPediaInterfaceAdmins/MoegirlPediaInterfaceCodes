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
            // 复核用于排除简繁变体等正常改写；请求失败时保持不显示——
            // 若失败时改为显示，网络抖动会让大量正常的变体标题页被误盖水印
            try {
                const variantTitles = await fetchVariantTitles(ctx.pageName, ctx.articleId);
                content = hasVariantMatch(variantTitles, displayedTitle, getNamespacePrefixRegex(ctx.namespaceNumber, ctx.namespaceIds))
                    ? null
                    : contents["user-page"];
            } catch (error) {
                console.warn("[Watermark] varianttitles 复核失败，本页不显示水印", error);
            }
        } else if (scene !== null) {
            content = contents[scene];
        }
        if (!content) {
            return;
        }
        await new Watermark({ ...visibleOptions, content }).create();
        if (ctx.skin === "moeskin") {
            // 库的 validateUnique 拒绝在同一父元素下创建第二个水印实例（可见层已挂在 body 上），
            // 且校验失败时 create() 会静默返回，故本层必须另选挂载点。documentElement 与 body
            // 同被库按全屏 fixed 定位处理（checkParentElementType 的 root 分支），各自实例的
            // parentObserver 也分别监听自己父元素的 childList，防移除能力不受影响
            await new BlindWatermark({ ...auxiliaryOptions, content, parent: document.documentElement }).create();
        }
    })();
});
