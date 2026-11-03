import { BlindWatermark, Watermark } from "watermark-js-plus/es";
import { decideScene, getNamespacePrefixRegex, hasVariantMatch, type PageContext } from "./conditions.ts";
import { auxiliaryOptions, contents, visibleOptions, watermarkZIndex } from "./options.ts";

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
        const { wgAction, wgArticleId, wgNamespaceIds, wgNamespaceNumber, wgPageName, wgCurRevisionId, wgRevisionId, wgUserGroups } = mw.config.get() as {
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
        // 库生成的内联样式对 opacity、四边偏移等属性没有声明或没有 !important，外部样式表
        // 可以隐藏水印节点或将其移出视口，且不会触发 mutationObserve（它只监听元素属性与
        // DOM 结构，不监听样式表）。这里注入的规则恢复迁移前内联样式承担的静态约束；
        // 选择器特征取随机的 watermarkZIndex，规则随水印按需注入并追加到 html 末尾（文档
        // 序上晚于页面既有样式表，同等优先级时后出现的规则生效）。注意：样式表的
        // !important 之间仍按 specificity 与出现顺序竞争，这不是内联 !important 的级联
        // 封顶，拦截对象是不执行脚本的样式表规则
        const style = document.createElement("style");
        style.textContent = `html [style*="${watermarkZIndex}"][style*="${watermarkZIndex}"] {
    opacity: 1 !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    margin: 0 !important;
    max-width: unset !important;
    max-height: unset !important;
    filter: none !important;
    clip-path: none !important;
    mix-blend-mode: normal !important;
}`;
        document.documentElement.append(style);
        await new Watermark({ ...visibleOptions, content }).create();
        // 库的 validateUnique 拒绝在同一父元素下创建第二个水印实例（可见层已挂在 body 上），
        // 且校验失败时 create() 会静默返回，故本层必须另选挂载点。documentElement 与 body
        // 同被库按全屏 fixed 定位处理（checkParentElementType 的 root 分支），各自实例的
        // parentObserver 也分别监听自己父元素的 childList，防移除监听不受影响
        await new BlindWatermark({ ...auxiliaryOptions, content, parent: document.documentElement }).create();
    })();
});
