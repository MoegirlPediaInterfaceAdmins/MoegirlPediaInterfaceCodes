// 预览分派域：脚注/引用预览（footnoteTarget/footnotePreview）与弹窗内容装配的
// 分派器（nonsimplePopupContent 全分支）。行为基准 = legacy src/modules/actions.ts
// 160-343 段（commit 02c8dec）逐字照搬，分支优先级与各项判定怪癖原样保留；
// 同段夹着的骨架渲染 simplePopupContent（含红链槽写入，即 :256-278）与
// newNavpopup/registerHooks（:284-294）留在 core/events.ts——它们依赖结构与
// 拖拽装配，属事件流域。
//
// 落位说明：legacy 把这段函数夹在 actions.ts 的悬停/隐藏流之间；重写版把
// 「悬停与隐藏流」留在 core/events.ts（阶段 1 已落位），把「按锚点形态决定去
// 哪个数据域取什么数据」的分派独立成本模块——events.ts 只保留调用点，不反向
// 依赖 api/preview 各数据域（依赖方向：dispatch → 数据域）。simplePopupContent
// （骨架渲染）与 newNavpopup/registerHooks 属事件流域，仍在 core/events.ts。
//
// pg 动态域映射：pg.re.contribs/backlinks→title 域的 wiki.re（boot 经
// setRegexps 装配）、pg.nsXxxId→title/namespaces 的 nsState、
// pg.idNumber→htmlout 的当前弹窗 id 注入口（setPopupHTML 缺省 id）。
// shouldShow/shouldShowNonSimple 由 core/options 提供（legacy 同款定义，
// 不在本域重复实现）。
import { loadAPIPreview } from "../api/queries.ts";
import { setPopupHTML } from "../core/htmlout.ts";
import { shouldShow, shouldShowNonSimple } from "../core/options.ts";
import { assume } from "../core/tools.ts";
import { nsState } from "../title/namespaces.ts";
import { anchorContainsImage, parseParams, Title, wiki } from "../title/title.ts";
import { loadDiff } from "./diffpreview.ts";
import { loadImage } from "./images.ts";
import { startArticlePreview } from "./pipeline.ts";
import type { Navpopup } from "../core/popup.ts";

// 引用/脚注目标探测（legacy :160-184）：锚点须形如 #cite_note-…/#_note-…/
// #endnote…，且锚点所属条目与本页 URL 的标题一致（锚点属本页 = 页内引用跳转，
// 否则视为跨页链接走常规预览）；命中后从目标元素向上找到最近的 <li> 作为预览
// 源，途中撞到 <body> 或链断则放弃。
// legacy 未导出；重写版导出仅为单测直调（覆盖「命中/不命中/跨页/上游链断」
// 各分支），运行时行为不变。
export const footnoteTarget = (a: HTMLAnchorElement): HTMLElement | false => {
    const aTitle = Title.fromAnchor(a);
    const anch = aTitle.anchor;
    if (!/^(cite_note-|_note-|endnote)/.test(anch)) {
        return false;
    }
    const lTitle = Title.fromURL(location.href);
    if (lTitle.toString(true) !== aTitle.toString(true)) {
        return false;
    }
    let el: HTMLElement | null = document.getElementById(anch);
    while (el && typeof el.nodeName === "string") {
        const nt = el.nodeName.toLowerCase();
        if (nt === "li") {
            return el;
        } else if (nt === "body") {
            return false;
        } else if (el.parentNode) {
            el = el.parentNode as HTMLElement;
        } else {
            return false;
        }
    }
    return false;
};

// 引用预览槽写入（legacy :185-187）：<li> 的 innerHTML 以 <hr /> 前缀原样
// 写入 popupPreview 槽（不再二次转义，上游行为）
export const footnotePreview = (x: HTMLElement, navpop: Navpopup): void => {
    setPopupHTML(`<hr />${x.innerHTML}`, "popupPreview", navpop.idNumber);
};

// 完整预览装配（legacy :303-343）：按锚点形态分派到引用预览 / diff / history /
// contribs / backlinks / imagepage / category / userinfo / revision。分支顺序
// 即优先级（引用 > diff > history > contribs > backlinks > 图片 > 其余），
// 照搬勿改。imagepage 分支的组合判定照搬：imagePopupsForImages 开启时总走，
// 关闭时仅对不含 <img> 的锚点走（锚点本体是缩略图时不弹图片预览）；category/
// userinfo 的专用预览之后仍会继续发起 revision 预览（并存是上游设计）。
export const nonsimplePopupContent = (a: HTMLAnchorElement, article: Title): void => {
    const navpop = a.navpopup;
    if (!navpop) {
        return;
    }
    // diff 的声明类型照搬 legacy：params.diff 实际可为 undefined（URL 无 diff
    // 参数），仅类型层与 legacy 的标注有差，运行时同一值
    let diff: string | null | undefined = null;
    let history: boolean | null = null;
    const params = parseParams(a.href);
    const oldid = typeof params.oldid === "undefined" ? null : params.oldid;
    if (shouldShow(a, "popupPreviewDiffs")) {
        diff = params.diff;
    }
    if (shouldShow(a, "popupPreviewHistory")) {
        history = params.action === "history";
    }
    // 置 0 = 首轮装配完成；mouseOverWikiLink2 的重入判定据此决定是否重渲染骨架
    navpop.pending = 0;
    const referenceElement = footnoteTarget(a);
    if (referenceElement) {
        footnotePreview(referenceElement, navpop);
    } else if (diff) {
        loadDiff(article, oldid, diff, navpop);
    } else if (history) {
        loadAPIPreview("history", article, navpop);
    } else if (shouldShowNonSimple(a) && assume(wiki.re.contribs).test(a.href)) {
        loadAPIPreview("contribs", article, navpop);
    } else if (shouldShowNonSimple(a) && assume(wiki.re.backlinks).test(a.href)) {
        loadAPIPreview("backlinks", article, navpop);
    } else if (article.namespaceId() === nsState.imageId && (shouldShow(a, "imagePopupsForImages") || !anchorContainsImage(a))) {
        loadAPIPreview("imagepagepreview", article, navpop);
        loadImage(article, navpop);
    } else {
        if (article.namespaceId() === nsState.categoryId && shouldShow(a, "popupCategoryMembers")) {
            loadAPIPreview("category", article, navpop);
        } else if ((article.namespaceId() === nsState.userId || article.namespaceId() === nsState.usertalkId) && shouldShow(a, "popupUserInfo")) {
            loadAPIPreview("userinfo", article, navpop);
        }
        if (shouldShowNonSimple(a)) {
            startArticlePreview(article, oldid, navpop);
        }
    }
};
