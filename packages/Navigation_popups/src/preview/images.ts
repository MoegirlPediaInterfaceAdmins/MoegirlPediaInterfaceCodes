// 图片域：loadImage（图片信息查询发起）、popupsInsertImage（结果写入
// #popupImg<N>/#popupImageLink<N> 槽）、toggleSize、getValidImageFromWikiText
// （wikitext 图片提取）、removeMatchesUnless，以及模块顶层的
// original.popupImage 槽填充器注册（legacy domdrag.ts 的图片骨架填充器，
// 属 imageHTML 消费域）。行为基准 = legacy src/modules/images.ts
// （commit 02c8dec）全文件 + domdrag.ts 的结构填充器段。
//
// pg 动态域映射：pg.wiki.apiwikibase→siteState（api/siteinfo）、
// pg.current.article→eventsState（core/events）、pg.nsImageId→nsState、
// pg.re.image→wiki.re.image（title/title，boot 按 setRegexps 装配）。
//
// wiki.re.image 是 "img" 全局正则（legacy init.ts 同款）：exec 推进
// lastIndex，getValidImageFromWikiText 的 while 循环据此逐个命中推进，
// 结束后显式归零 lastIndex（legacy 原样，见函数内注释）。
import { pendingNavpopTask } from "./pipeline.ts";
import { getPageWithCaching } from "../net/cache.ts";
import type { Downloader } from "../net/downloader.ts";
import { eventsState } from "../core/events.ts";
import { imageHTML, popTipsSoonFn } from "../core/htmlout.ts";
import { log } from "../core/log.ts";
import { getValueOf } from "../core/options.ts";
import { registerSlotFiller, type StructureContext } from "../core/structures.ts";
import { popupString } from "../core/strings.ts";
import { assume, anyChild, getJsObj } from "../core/tools.ts";
import { siteState } from "../api/siteinfo.ts";
import { nsState, upcaseFirst } from "../title/namespaces.ts";
import { isValidImageName, parenSplit, wiki, type Title } from "../title/title.ts";
import type { Navpopup } from "../core/popup.ts";

// legacy domdrag.ts 的 original.popupImage 槽填充器（图片骨架 HTML）。
// 该槽由全部结构经 copyStructure 继承（仅 original 声明、其余结构整表拷贝），
// 故只需注册 original.popupImage 一个键。legacy 的 imageHTML(x.article, id) 首参
// 恒被弃用（重写版 htmlout.imageHTML 已删该形参）；x.navpop?.idNumber 的可选链
// 随 StructureContext 的 navpop 非空收窄而退化（回调恒由 fillEmptySpans 传入
// 弹窗），日志文案逐字保留
registerSlotFiller("original.popupImage", (x: StructureContext): string => {
    log(`original.popupImage, x.article=${String(x.article)}, x.navpop?.idNumber=${String(x.navpop.idNumber)}`);
    return imageHTML(x.navpop.idNumber);
});

export const loadImage = (image: Title, navpop: Navpopup): false | undefined => {
    // legacy 防御检查照搬：Title 原型方法恒为 function，条件恒假；真实
    // Title 输入下 alert 不可达（legacy images.ts 原样保留）
    // istanbul ignore if -- legacy 防御检查照搬：恒假分支，无可测触发条件
    if (typeof image.stripNamespace !== "function") {
        alert("loadImages bad");
    }
    if (!getValueOf("popupImages")) {
        return;
    }
    if (!isValidImageName(image)) {
        return false;
    }
    const art = image.urlString();
    let url = `${siteState.apiwikibase}?format=json&formatversion=2&action=query`;
    url += `&prop=imageinfo&iiprop=url|mime&iiurlwidth=${getValueOf("popupImageSizeLarge") as string}`;
    url += `&titles=${art}`;
    pendingNavpopTask(navpop);
    const callback = (d: Downloader): void => {
        popupsInsertImage(navpop.idNumber, navpop, d);
    };
    const go = (): boolean => {
        getPageWithCaching(url, callback, navpop);
        return true;
    };
    if (navpop.visible || !getValueOf("popupLazyDownloads")) {
        go();
    } else {
        navpop.addHook(go, "unhide", "after", "DOWNLOAD_IMAGE_QUERY_DATA");
    }
    return undefined;
};

// imageinfo 查询结果的单页形态（thumburl 仅在可出缩略图时存在）
interface ThumbImageInfo {
    thumburl?: string;
    url: string;
    mime: string;
    descriptionurl: string;
}

interface ImageQuery {
    query: { pages: Record<string, { imageinfo?: ThumbImageInfo[] }> };
}

const popupsInsertImage = (id: number | undefined, _navpop: Navpopup, download: Downloader): null | undefined => {
    log("popupsInsertImage");
    let imageinfo: ThumbImageInfo;
    try {
        const jsObj = getJsObj(download.data ?? "") as ImageQuery;
        // anyChild 对空 pages 对象返回 null：此处照 legacy 原样直取成员，
        // 崩溃被下方 catch 接住走「查询失败」路径（勿改成可选链早退）
        const imagepage = assume(anyChild(jsObj.query.pages));
        if (typeof imagepage.imageinfo === "undefined") {
            return;
        }
        imageinfo = assume(imagepage.imageinfo)[0];
    } catch {
        log("popupsInsertImage failed :(");
        return;
    }
    const popupImage = document.getElementById(`popupImg${String(id)}`) as HTMLImageElement | null;
    if (!popupImage) {
        log("could not find insertion point for image");
        return;
    }
    popupImage.width = +(getValueOf("popupImageSize") as string | number);
    popupImage.style.display = "inline";
    if (imageinfo.thumburl) {
        popupImage.src = imageinfo.thumburl;
    } else if (imageinfo.mime.startsWith("image")) {
        popupImage.src = imageinfo.url;
        log("a thumb could not be found, using original image");
    } else {
        log("fullsize imagethumb, but not sure if it's an image");
    }
    const a = document.getElementById(`popupImageLink${String(id)}`) as HTMLAnchorElement | null;
    if (a === null) {
        return null;
    }
    switch (getValueOf("popupThumbAction")) {
        case "imagepage": {
            if (eventsState.current.article && eventsState.current.article.namespaceId() !== nsState.imageId) {
                a.href = imageinfo.descriptionurl;
                popTipsSoonFn(`popupImg${String(id)}`)();
                break;
            }
            a.onclick = toggleSize;
            a.title = popupString("Toggle image size");
            return;
        }
        case "sizetoggle":
            a.onclick = toggleSize;
            a.title = popupString("Toggle image size");
            return;
        case "linkfull":
            a.href = imageinfo.url;
            a.title = popupString("Open full-size image");
            return;
    }
    return undefined;
};

function toggleSize(this: GlobalEventHandlers) {
    const imgContainer = this as HTMLElement;
    const img = imgContainer.firstChild as HTMLElement | null;
    // istanbul ignore if -- toggleSize 绑定于含 img 子节点的容器 onclick，
    // firstChild 为 null 的防御分支不可达（legacy images.ts 原样保留）
    if (!img) {
        alert("img is null :/");
        return;
    }
    if (!img.style.width || img.style.width === "") {
        img.style.width = "100%";
    } else {
        img.style.width = "";
    }
}

export const getValidImageFromWikiText = (wikiText: string): string | null => {
    let matched: string | null = null;
    const t = removeMatchesUnless(wikiText, /(<!--[\s\S]*?-->)/, 1, /^<!--[^[]*popup/i);
    let match = assume(wiki.re.image).exec(t);
    while (match) {
        const m = match[2] || match[6];
        if (isValidImageName(m)) {
            matched = m;
            break;
        }
        match = assume(wiki.re.image).exec(t);
    }
    // wiki.re.image 是全局正则：共享实例的 lastIndex 会遗留给后续调用方
    // （pageinfo 的 countImages 也 split 同一正则），结束后归零——legacy 原样
    assume(wiki.re.image).lastIndex = 0;
    if (!matched) {
        return null;
    }
    return `${mw.config.get("wgFormattedNamespaces")[nsState.imageId]}:${upcaseFirst(matched)}`;
};

const removeMatchesUnless = (str: string, re1: RegExp, parencount: number, re2: RegExp): string => {
    const split = parenSplit(str, re1);
    const c = parencount + 1;
    for (let i = 0; i < split.length; ++i) {
        if (i % c === 0 || re2.test(split[i])) {
            continue;
        }
        split[i] = "";
    }
    return split.join("");
};
