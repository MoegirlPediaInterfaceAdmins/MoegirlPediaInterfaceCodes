// 预览管线域：任务计数（pendingNavpopTask/completedNavpopTask/debugData）
// 与 insertPreview 家族（条目预览的分派、重定向跟随、惰性挂载）、
// prepPreviewmaker/anchorize。行为基准 = legacy src/modules/actions.ts
// （commit 02c8dec）的 startArticlePreview..anchorize 段。
//
// 先头件背景：任务计数三件套先行落位——queries 域（src/api/queries.ts 的
// loadAPIPreview）依赖前两者。insertPreview 家族与 prepPreviewmaker/anchorize
// 由批 C 的 pipeline 子任务续写（本文件）。
//
// pg 动态域映射：pg.re.redirect→nsState.re.redirect（title/namespaces，
// setRedirs 装配）、pg.wiki.articlebase→siteState（api/siteinfo）、
// pg.nsImageId/pg.nsTemplateId→nsState。
import { fillEmptySpans, setPopupHTML, setPopupTrailer } from "../core/htmlout.ts";
import { getValueOf } from "../core/options.ts";
import { assume, entify, joinPath, literalizeRegex } from "../core/tools.ts";
import { siteState } from "../api/siteinfo.ts";
import { loadAPIPreview } from "../api/queries.ts";
import { nsState } from "../title/namespaces.ts";
import { Title } from "../title/title.ts";
import { getPageInfo } from "./pageinfo.ts";
import { getValidImageFromWikiText, loadImage } from "./images.ts";
import { Previewmaker, type PreviewOwner } from "./previewmaker.ts";
import { makeFixDabs } from "./dab.ts";
import { redirLink } from "../navlinks/links.ts";
import type { Downloader } from "../net/downloader.ts";
import type { Navpopup } from "../core/popup.ts";

export const pendingNavpopTask = (navpop: Navpopup): void => {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- ??= downgrades to a lintable pattern in the es2020 artifact
    if (navpop.pending === null) {
        navpop.pending = 0;
    }
    ++navpop.pending;
    debugData(navpop);
};

export const completedNavpopTask = (navpop: Navpopup): void => {
    if (navpop.pending) {
        --navpop.pending;
    }
    debugData(navpop);
};

const debugData = (navpopup: Navpopup): void => {
    if (getValueOf("popupDebugging") && navpopup.idNumber) {
        setPopupHTML(`idNumber=${navpopup.idNumber}, pending=${String(navpopup.pending)}`, "popupError", navpopup.idNumber);
    }
};

// 导出而非 legacy 的模块私有：重写版把 actions 拆进了 pipeline/events 两域，
// 阶段 3 的 nonsimplePopupContent（events 域）import 本函数发起条目预览
export const startArticlePreview = (article: Title, oldid: string | null, navpop: Navpopup): void => {
    navpop.redir = 0;
    loadPreview(article, oldid, navpop);
};

const loadPreview = (article: Title, oldid: string | null, navpop: Navpopup): void => {
    if (!navpop.redir) {
        navpop.originalArticle = article;
    }
    article.oldid = oldid;
    loadAPIPreview("revision", article, navpop);
};

const loadPreviewFromRedir = (redirMatch: RegExpExecArray, navpop: Navpopup): void => {
    const target = new Title().fromWikiText(redirMatch[2]);
    // 原锚点透传给重定向目标（legacy 同款：先构造目标再叠加，目标 wikitext
    // 自带的锚点会被原锚点覆盖）
    if (navpop.article?.anchor) {
        target.anchor = navpop.article.anchor;
    }
    ++navpop.redir;
    navpop.redirTarget = target;
    // article 为空（选区弹窗等无宿主条目场景）时 redirLink 不适用，写入空串
    // 仍会把槽清空；legacy 原样
    const warnRedir = navpop.article ? redirLink(target, navpop.article) : "";
    setPopupHTML(warnRedir, "popupWarnRedir", navpop.idNumber);
    navpop.article = target;
    // idNumber/parentAnchor 由 events 域在弹窗构造后装配（运行时不变量，legacy
    // 直传 navpop）；本域不 import events 域（避免环路），类型层就地断言对接
    // htmlout 的 PopupLike 契约——与 prepPreviewmaker 处的 as PreviewOwner 同款
    fillEmptySpans({
        redir: true,
        redirTarget: target,
        navpopup: navpop as Navpopup & { idNumber: number; parentAnchor: HTMLAnchorElement | null },
    });
    // 重定向目标的正文经同一 revision 管线再查一次（oldid 归零：跟随时不带
    // 原条目的修订号）；redir 已非 0，loadPreview 不再覆写 originalArticle
    loadPreview(target, null, navpop);
};

export const insertPreview = (download: Downloader): void => {
    if (!download.owner) {
        return;
    }
    const navpop = download.owner as Navpopup;
    const redirMatch = assume(nsState.re.redirect).exec(download.data ?? "");
    if (navpop.redir === 0 && redirMatch) {
        loadPreviewFromRedir(redirMatch, navpop);
        return;
    }
    if (navpop.visible || !getValueOf("popupLazyPreviews")) {
        insertPreviewNow(download);
    } else {
        const id = navpop.redir ? "PREVIEW_REDIR_HOOK" : "PREVIEW_HOOK";
        navpop.addHook(() => {
            insertPreviewNow(download);
            return true;
        }, "unhide", "after", id);
    }
};

const insertPreviewNow = (download: Downloader): void => {
    if (!download.owner) {
        return;
    }
    const wikiText = download.data ?? "";
    const navpop = download.owner as Navpopup;
    const art = navpop.redirTarget ?? navpop.originalArticle;
    if (!art) {
        return;
    }
    makeFixDabs(wikiText, navpop);
    if (getValueOf("popupSummaryData")) {
        // getPageInfo 调用两次、首次返回值丢弃是 legacy 原样（副作用层面两次
        // 结果一致）——照搬勿修
        getPageInfo(wikiText, download);
        setPopupTrailer(getPageInfo(wikiText, download), navpop.idNumber);
    }
    let imagePage: string | null;
    if (art.namespaceId() === nsState.imageId) {
        imagePage = art.toString();
    } else {
        imagePage = getValidImageFromWikiText(wikiText);
    }
    if (imagePage) {
        loadImage(Title.fromWikiText(imagePage), navpop);
    }
    if (getValueOf("popupPreviews")) {
        insertArticlePreview(download, art, navpop);
    }
};

const insertArticlePreview = (download: Downloader, art: Title, navpop: Navpopup): void => {
    if (typeof download.data === "string") {
        if (art.namespaceId() === nsState.templateId && getValueOf("popupPreviewRawTemplates")) {
            // split("\\n") 的入参是字面反斜杠+n 两字符（非换行转义）——legacy
            // 源里即如此，常规 wikitext 上该 split 永不命中，照搬勿修
            const h = `<hr /><span style="font-family: monospace;">${entify(download.data).split("\\n").join("<br />\\n")}</span>`;
            setPopupHTML(h, "popupPreview", navpop.idNumber);
        } else {
            const p = prepPreviewmaker(download.data, art, navpop);
            p.showPreview();
        }
    }
};

export const prepPreviewmaker = (data: string, article: Title, navpop: Navpopup): Previewmaker => {
    const d = anchorize(data, article.anchorString());
    const urlBase = joinPath([siteState.articlebase, article.urlString()]);
    // PreviewOwner.article 是 Title | undefined；Navpopup 侧因 events 域模块
    // 增广并了 null（见 popup.ts 字段注释）——运行时同一对象，类型收窄经 as
    const p = new Previewmaker(d, urlBase, navpop as PreviewOwner);
    return p;
};

const anchorize = (d: string, anch: string): string => {
    if (!anch) {
        return d;
    }
    const anchRe = RegExp(`(?:=+\\s*${literalizeRegex(anch).replace(/[_ ]/g, "[_ ]")}\\s*=+|\\{\\{\\s*${getValueOf("popupAnchorRegexp") as string}\\s*(?:\\|[^|}]*)*?\\s*${literalizeRegex(anch)}\\s*(?:\\|[^}]*)?}})`);
    const match = d.match(anchRe);
    if (match && match.length > 0 && match[0]) {
        return d.substring(d.indexOf(match[0]));
    }
    const lines = d.split("\n");
    for (let i = 0; i < lines.length; ++i) {
        lines[i] = lines[i].replace(RegExp("[[]{2}([^|\\]]*?[|])?(.*?)[\\]]{2}", "g"), "$2").replace(/'''([^'])/g, "$1").replace(RegExp("''([^'])", "g"), "$1");
        if (lines[i].match(anchRe)) {
            return d.split("\n").slice(i).join("\n").replace(RegExp("^[^=]*"), "");
        }
    }
    return d;
};
