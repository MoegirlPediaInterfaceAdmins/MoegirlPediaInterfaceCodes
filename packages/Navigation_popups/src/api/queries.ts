// queries 域：action=query 预览数据拉取（loadAPIPreview）与七类查询的 HTML
// 生成器（revision/category/userinfo/contribs/imagepage/backlinks/imagelinks）。
// 行为基准 = legacy src/modules/querypreview.ts（commit 02c8dec）逐字照搬，
// loadAPIPreview 对外签名冻结（调用方按 (queryType, article, navpop) 装配）。
//
// legacy pg 动态域映射：pg.wiki.apiwikibase/titlebase/commonsbase/apicommonsbase
// → siteinfo 的 siteState（同名）；pg.re.ipUser → title 域 wiki.re.ipUser；
// pg.nsXxxId → namespaces 的 nsState（非空 number，消 ?? 兜底的死分支）；
// pg.current.link → events 域 eventsState.current.link；pg.escapeQuotesHTML/
// String.prototype.entify → core/tools 的同名函数；pg.user.timeZone/locales
// 运行时缓存改本模块自持（重置经测试侧 resetModules 完成）。
// legacy 挂 pg.fn.APIsharedImagePagePreviewHTML 的共享资源页回调在此导出为
// 普通函数（window.pg 兼容面由阶段 5 装配层挂接；URL 的 callback= 参数串
// 仍逐字保留）。
//
// 测试导出面：legacy 私有的时区链/表格装配/各 HTML 生成器在此导出为同名
// 函数以便直接单测。
import { completedNavpopTask, insertPreview, pendingNavpopTask, prepPreviewmaker } from "../preview/pipeline.ts";
import { getPageWithCaching } from "../net/cache.ts";
import type { Downloader } from "../net/downloader.ts";
import { eventsState } from "../core/events.ts";
import { setPopupHTML, setPopupTipsAndHTML, setPopupTrailer } from "../core/htmlout.ts";
import { wikiLink } from "../navlinks/links.ts";
import { errlog, log } from "../core/log.ts";
import { getValueOf } from "../core/options.ts";
import { getPageInfo } from "../preview/pageinfo.ts";
import { Previewmaker } from "../preview/previewmaker.ts";
import type { PreviewOwner } from "../preview/previewmaker.ts";
import { getMwApi, siteState } from "./siteinfo.ts";
import { popupString, tprintf } from "../core/strings.ts";
import { nsState } from "../title/namespaces.ts";
import { Title, wiki } from "../title/title.ts";
import { anyChild, assume, entify, escapeQuotesHTML, getJsObj, map, zeroFill } from "../core/tools.ts";
import type { Navpopup } from "../core/popup.ts";
// one page entry of an action=query&prop=revisions response
interface RevisionPage {
    missing?: boolean | string;
    title?: string;
    revisions?: {
        revid?: number;
        title?: string;
        timestamp?: string;
        user?: string;
        comment?: string;
        minor?: boolean | string;
        userhidden?: boolean;
        commenthidden?: boolean;
        slots?: { main?: { content?: string; contentmodel?: string } };
    }[];
    pageprops?: { wikibase_item?: string };
    imagerepository?: string;
    [key: string]: unknown;
}
type RevisionRow = NonNullable<RevisionPage["revisions"]>[number];
interface RevisionQuery {
    query?: {
        pages?: Record<string, RevisionPage>;
        wikibase?: { repo?: { url?: { base?: string; articlepath?: string } } };
        backlinks?: { title: string }[];
        imageusage?: { title: string }[];
        categorymembers?: { title: string }[];
        usercontribs?: RevisionRow[];
        users?: Record<string, UserInfoEntry>;
        globaluserinfo?: { groups?: string[]; unattached?: { wiki?: string }[]; [key: string]: unknown };
        blocks?: { rangestart?: string; rangeend?: string; restrictions?: unknown }[];
    };
    "continue"?: Record<string, string>;
}
interface UserInfoEntry {
    groups?: string[];
    gender?: string;
    editcount?: number;
    registration?: string;
    invalid?: string;
    missing?: string;
    blockedby?: string;
    blockpartial?: boolean;
    [key: string]: unknown;
}
type APIPreviewFn = (article: Title, download: Downloader, navpop: Navpopup) => string | undefined;
export const loadAPIPreview = (queryType: string, article: Title, navpop: Navpopup): void => {
    const art = new Title(article).urlString();
    let url = `${siteState.apiwikibase}?format=json&formatversion=2&action=query&`;
    let htmlGenerator: APIPreviewFn = () => {
        alert("invalid html generator");
        return undefined;
    };
    let usernameart;
    switch (queryType) {
        case "history":
            url += `titles=${art}&prop=revisions&rvlimit=${getValueOf("popupHistoryPreviewLimit") as string}`;
            htmlGenerator = APIhistoryPreviewHTML;
            break;
        case "category":
            url += `list=categorymembers&cmtitle=${art}`;
            htmlGenerator = APIcategoryPreviewHTML;
            break;
        case "userinfo": {
            const username = new Title(article).userName();
            usernameart = encodeURIComponent(String(username));
            if (assume(wiki.re.ipUser).test(String(username))) {
                url += `list=blocks&bkprop=range|restrictions&bkip=${usernameart}`;
            } else {
                url += `list=users|usercontribs&usprop=blockinfo|groups|editcount|registration|gender&ususers=${usernameart}&meta=globaluserinfo&guiprop=groups|unattached&guiuser=${usernameart}&uclimit=1&ucprop=timestamp&ucuser=${usernameart}`;
            }
            htmlGenerator = APIuserInfoPreviewHTML;
            break;
        }
        case "contribs":
            usernameart = encodeURIComponent(String(new Title(article).userName()));
            url += `list=usercontribs&ucuser=${usernameart}&uclimit=${getValueOf("popupContribsPreviewLimit") as string}`;
            htmlGenerator = APIcontribsPreviewHTML;
            break;
        case "imagepagepreview": {
            let trail = "";
            if (getValueOf("popupImageLinks")) {
                trail = `&list=imageusage&iutitle=${art}`;
            }
            url += `titles=${art}&prop=revisions|imageinfo&rvslots=main&rvprop=content${trail}`;
            htmlGenerator = APIimagepagePreviewHTML;
            break;
        }
        case "backlinks":
            url += `list=backlinks&bltitle=${art}`;
            htmlGenerator = APIbacklinksPreviewHTML;
            break;
        case "revision":
            if (article.oldid) {
                url += `revids=${article.oldid}`;
            } else {
                url += `titles=${article.removeAnchor().urlString()}`;
            }
            url += "&prop=revisions|pageprops|info|images|categories&meta=wikibase&rvslots=main&rvprop=ids|timestamp|flags|comment|user|content&cllimit=max&imlimit=max";
            htmlGenerator = APIrevisionPreviewHTML;
            break;
    }
    pendingNavpopTask(navpop);
    const callback = async (d: Downloader): Promise<void> => {
        log("callback of API functions was hit");
        if (queryType === "userinfo") {
            await fetchUserGroupNames(d.data);
            showAPIPreview(queryType, htmlGenerator(article, d, navpop), navpop.idNumber, navpop, d);
            return;
        }
        showAPIPreview(queryType, htmlGenerator(article, d, navpop), navpop.idNumber, navpop, d);
    };
    const go = () => {
        getPageWithCaching(url, callback, navpop);
        return true;
    };
    if (navpop.visible || !getValueOf("popupLazyDownloads")) {
        go();
    } else {
        navpop.addHook(go, "unhide", "before", `DOWNLOAD_${queryType}_QUERY_DATA`);
    }
};
const linkList = (list: string[]): string => {
    list.sort((x, y) => x === y ? 0 : x < y ? -1 : 1);
    const buf: (string | null)[] = [];
    for (const item of list) {
        buf.push(wikiLink({
            article: new Title(item),
            text: item.split(" ").join("&nbsp;"),
            action: "view",
        }));
    }
    return buf.join(popupString("separator"));
};
// legacy pg.user.timeZone 的模块自持缓存
let userTimeZone: string | null = null;
export const getTimeOffset = (): number => {
    const tz = mw.user.options.get("timecorrection") as string | null;
    if (tz) {
        if (tz.includes("|")) {
            return parseInt(tz.split("|")[1], 10);
        }
    }
    return 0;
};
export const getTimeZone = (): string => {
    if (!userTimeZone) {
        const tz = mw.user.options.get("timecorrection") as string | null;
        userTimeZone = "UTC";
        if (tz) {
            const tzComponents = tz.split("|");
            if (tzComponents.length === 3 && tzComponents[0] === "ZoneInfo") {
                userTimeZone = tzComponents[2];
            } else {
                errlog(`Unexpected timezone information: ${tz}`);
            }
        }
    }
    return userTimeZone;
};
export const useTimeOffset = (): boolean => {
    if (typeof (Intl.DateTimeFormat.prototype as unknown as Record<string, unknown>).formatToParts === "undefined") {
        return true;
    }
    const tz = mw.user.options.get("timecorrection") as string | null;
    if (tz?.includes("ZoneInfo|") === false) {
        return true;
    }
    return false;
};
// legacy pg.user.locales 的模块自持缓存
let userLocales: string[] | null = null;
export const getLocales = (): string[] => {
    if (!userLocales) {
        let userLanguage: string | null = document.querySelector("html")?.getAttribute("lang") ?? null;
        if (getValueOf("popupLocale")) {
            userLanguage = getValueOf("popupLocale") as string;
        } else if (userLanguage === "en") {
            if (getMWDateFormat() === "mdy") {
                userLanguage = "en-US";
            } else {
                userLanguage = "en-GB";
            }
        }
        userLocales = Intl.DateTimeFormat.supportedLocalesOf([userLanguage ?? "", navigator.language]);
    }
    return userLocales;
};
export const getMWDateFormat = (): string | null => mw.user.options.get("date") as string | null;
export const editPreviewTable = (article: Title, h: RevisionRow[], reallyContribs?: boolean): string => {
    let html = ["<table>"];
    let day: string | null = null;
    let curart: Title | string = article;
    let page: string | null = null;
    let makeFirstColumnLinks: (currentRevision: RevisionRow) => string;
    if (reallyContribs) {
        makeFirstColumnLinks = (currentRevision) => {
            let result = "(";
            result += `<a href="${siteState.titlebase}${new Title(currentRevision.title ?? "").urlString()}&diff=prev&oldid=${String(currentRevision.revid)}">${popupString("diff")}</a>`;
            result += "&nbsp;|&nbsp;";
            result += `<a href="${siteState.titlebase}${new Title(currentRevision.title ?? "").urlString()}&action=history">${popupString("hist")}</a>`;
            result += ")";
            return result;
        };
    } else {
        const firstRevid = h[0].revid;
        makeFirstColumnLinks = (currentRevision) => {
            let result = "(";
            result += `<a href="${siteState.titlebase}${new Title(curart).urlString()}&diff=${String(firstRevid)}&oldid=${String(currentRevision.revid)}">${popupString("cur")}</a>`;
            result += "&nbsp;|&nbsp;";
            result += `<a href="${siteState.titlebase}${new Title(curart).urlString()}&diff=prev&oldid=${String(currentRevision.revid)}">${popupString("last")}</a>`;
            result += ")";
            return result;
        };
    }
    for (let i = 0; i < h.length; ++i) {
        if (reallyContribs) {
            page = h[i].title ?? null;
            curart = new Title(page);
        }
        const minor = h[i].minor ? "<b>小 </b>" : "";
        const editDate = new Date(h[i].timestamp ?? "");
        let thisDay = formattedDate(editDate);
        const thisTime = formattedTime(editDate);
        if (thisDay === day) {
            thisDay = "";
        } else {
            day = thisDay;
        }
        if (thisDay) {
            html.push(`<tr><td colspan=3><span class="popup_history_date">${thisDay}</span></td></tr>`);
        }
        html.push(`<tr class="popup_history_row_${i % 2 ? "odd" : "even"}">`);
        html.push(`<td>${makeFirstColumnLinks(h[i])}</td>`);
        html.push(`<td><a href="${siteState.titlebase}${new Title(curart).urlString()}&oldid=${String(h[i].revid)}">${thisTime}</a></td>`);
        let col3url: string,
            col3txt: string;
        if (!reallyContribs) {
            const user = h[i].user;
            if (!h[i].userhidden) {
                if (assume(wiki.re.ipUser).test(String(user))) {
                    col3url = `${siteState.titlebase + mw.config.get("wgFormattedNamespaces")[nsState.specialId]}:Contributions&target=${new Title(user ?? /* istanbul ignore next -- ipUser 命中蕴含 user 是非空串（null/undefined 的 String() 都不匹配 IP 形状），?? 兜底结构性不可达；legacy :252 同款照搬 */ "").urlString()}`;
                } else {
                    col3url = `${siteState.titlebase + mw.config.get("wgFormattedNamespaces")[nsState.userId]}:${new Title(user ?? "").urlString()}`;
                }
                col3txt = escapeQuotesHTML(user ?? "");
            } else {
                col3url = getValueOf("popupRevDelUrl") as string;
                col3txt = escapeQuotesHTML(popupString("revdel"));
            }
        } else {
            col3url = siteState.titlebase + curart.urlString();
            col3txt = escapeQuotesHTML(page ?? "");
        }
        html.push(`<td>${reallyContribs ? minor : ""}<a href="${col3url}">${col3txt}</a></td>`);
        let comment = "";
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 空串是有意义的值（无摘要但有 slots 内容时须回落）；|| 分支为 legacy 刻意行为
        const c = h[i].comment || (typeof h[i].slots !== "undefined" ? h[i].slots?.main?.content ?? null : null);
        if (c) {
            comment = new Previewmaker(c, new Title(curart).toUrl()).editSummaryPreview();
        } else if (h[i].commenthidden) {
            comment = popupString("revdel");
        }
        html.push(`<td>${!reallyContribs ? minor : ""}${comment}</td>`);
        html.push("</tr>");
        html = [html.join("")];
    }
    html.push("</table>");
    return html.join("");
};
export const adjustDate = (d: Date, offset: number): Date => {
    const o = offset * 60 * 1e3;
    return new Date(+d + o);
};
export const convertTimeZone = (date: Date, timeZone: string | undefined): Date => new Date(date.toLocaleString("en-US", {
    timeZone: timeZone,
}));
export const formattedDateTime = (date: Date): string => {
    if (useTimeOffset()) {
        return `${formattedDate(date)} ${formattedTime(date)}`;
    }
    if (getMWDateFormat() === "ISO 8601") {
        const d2 = convertTimeZone(date, getTimeZone());
        return `${(map(zeroFill, [d2.getFullYear(), d2.getMonth() + 1, d2.getDate()]) as string[]).join("-")}T${(map(zeroFill, [d2.getHours(), d2.getMinutes(), d2.getSeconds()]) as string[]).join(":")}`;
    }
    const options = getValueOf("popupDateTimeFormatterOptions") as Intl.DateTimeFormatOptions;
    options.timeZone = getTimeZone();
    return date.toLocaleString(getLocales(), options);
};
export const formattedDate = (date: Date): string => {
    if (useTimeOffset()) {
        const d2 = adjustDate(date, getTimeOffset());
        return (map(zeroFill, [d2.getUTCFullYear(), d2.getUTCMonth() + 1, d2.getUTCDate()]) as string[]).join("-");
    }
    if (getMWDateFormat() === "ISO 8601") {
        const d2 = convertTimeZone(date, getTimeZone());
        return (map(zeroFill, [d2.getFullYear(), d2.getMonth() + 1, d2.getDate()]) as string[]).join("-");
    }
    const options = getValueOf("popupDateFormatterOptions") as Intl.DateTimeFormatOptions;
    options.timeZone = getTimeZone();
    return date.toLocaleDateString(getLocales(), options);
};
export const formattedTime = (date: Date): string => {
    if (useTimeOffset()) {
        const d2 = adjustDate(date, getTimeOffset());
        return (map(zeroFill, [d2.getUTCHours(), d2.getUTCMinutes(), d2.getUTCSeconds()]) as string[]).join(":");
    }
    if (getMWDateFormat() === "ISO 8601") {
        const d2 = convertTimeZone(date, getTimeZone());
        return (map(zeroFill, [d2.getHours(), d2.getMinutes(), d2.getSeconds()]) as string[]).join(":");
    }
    const options = getValueOf("popupTimeFormatterOptions") as Intl.DateTimeFormatOptions;
    options.timeZone = getTimeZone();
    return date.toLocaleTimeString(getLocales(), options);
};
export const fetchUserGroupNames = (userinfoResponse: string | undefined) => {
    const queryObj = getJsObj(userinfoResponse ?? "") as RevisionQuery;
    const user = anyChild(queryObj.query?.users ?? {});
    const messages: string[] = [];
    if (user?.groups) {
        user.groups.forEach((groupName: string) => {
            messages.push(`group-${groupName}-member`);
        });
    }
    if (queryObj.query?.globaluserinfo?.groups) {
        queryObj.query.globaluserinfo.groups.forEach((groupName: string) => {
            messages.push(`group-${groupName}-member`);
        });
    }
    return getMwApi().loadMessagesIfMissing(messages);
};
export const showAPIPreview = (
    queryType: string,
    html: string | null | undefined,
    id: number | undefined,
    navpop: Navpopup,
    download?: Downloader,
): void => {
    let target = "popupPreview";
    completedNavpopTask(navpop);
    switch (queryType) {
        case "imagelinks":
        case "category":
            target = "popupPostPreview";
            break;
        case "userinfo":
            target = "popupUserData";
            break;
        case "revision":
            if (download) {
                insertPreview(download);
            }
            return;
    }
    setPopupTipsAndHTML(html, target, id);
};
export const APIrevisionPreviewHTML = (
    _article: Title,
    download: Downloader,
): string | undefined => {
    try {
        const jsObj = getJsObj(download.data ?? "") as RevisionQuery;
        const q = jsObj.query;
        if (!q?.pages) {
            return "Revision preview failed :(";
        }
        const page = anyChild(q.pages);
        if (!page) {
            return "Revision preview failed :(";
        }
        if (page.missing) {
            download.owner = null;
            return;
        }
        const content = page.revisions?.[0]?.slots?.main?.contentmodel === "wikitext" ? page.revisions[0].slots.main.content : null;
        if (typeof content === "string") {
            download.data = content;
            download.lastModified = new Date(assume(page.revisions)[0].timestamp ?? "");
        }
        if (page.pageprops?.wikibase_item) {
            download.wikibaseItem = page.pageprops.wikibase_item;
            download.wikibaseRepo = `${q.wikibase?.repo?.url?.base ?? ""}${q.wikibase?.repo?.url?.articlepath ?? ""}`;
        }
    } catch {
        // istanbul ignore next -- try 体内只有 getJsObj（内吞 JSON.parse 异常并返回哨兵 1，
        // tools.ts:25-44）与贯穿可选链的属性访问；download.data 契约恒为 string，任意
        // JSON 形态都不抛，catch 结构性不可达（legacy :386 同款照搬）
        return "Revision preview failed :(";
    }
    return undefined;
};
export const APIbacklinksPreviewHTML = (
    _article: Title,
    download: Downloader,
): string => {
    try {
        const jsObj = getJsObj(download.data ?? "") as RevisionQuery;
        const q = jsObj.query;
        if (!q) {
            return "backlinksPreviewHTML went wonky";
        }
        const list = q.backlinks;
        let html: string[] | string = [];
        if (!list) {
            return popupString("No backlinks found");
        }
        for (const entry of list) {
            const t = new Title(entry.title);
            html.push(`<a href="${siteState.titlebase}${t.urlString()}">${entify(t.toString())}</a>`);
        }
        html = html.join(popupString("separator"));
        if (jsObj.continue?.blcontinue) {
            html += popupString(" and more");
        }
        return html;
    } catch {
        return "backlinksPreviewHTML went wonky";
    }
};
export const APIsharedImagePagePreviewHTML = (obj: RevisionQuery & { requestid?: number }): void => {
    log("APIsharedImagePagePreviewHTML");
    const popupid = obj.requestid;
    if (obj.query?.pages) {
        const page = anyChild(obj.query.pages);
        const content = page?.revisions?.[0]?.slots?.main?.contentmodel === "wikitext" ? page.revisions[0].slots.main.content : null;
        if (typeof content === "string" && eventsState.current.link?.navpopup) {
            const navpop = eventsState.current.link.navpopup;
            // owner 位显式收窄到 PreviewOwner：events 域装配的 article 含 null 态，
            // 与 legacy 的无类型透传等价（类型层适配，无运行时差异）
            const p = new Previewmaker(content, assume(navpop.article), navpop as PreviewOwner);
            p.makePreview();
            setPopupHTML(p.html, "popupSecondPreview", popupid);
        }
    }
};
export const APIimagepagePreviewHTML = (article: Title, download: Downloader, navpop: Navpopup): string => {
    try {
        const jsObj = getJsObj(download.data ?? "") as RevisionQuery;
        const q = jsObj.query;
        if (!q?.pages) {
            return "API imagepage preview failed :(";
        }
        const page = anyChild(q.pages);
        const content = page?.revisions?.[0]?.slots?.main?.contentmodel === "wikitext" ? page.revisions[0].slots.main.content : null;
        let ret = "";
        let alt: string | undefined = "";
        try {
            alt = (navpop.parentAnchor?.childNodes[0] as HTMLImageElement | undefined)?.alt;
        } catch {
            // legacy 原样吞掉 DOM 访问异常
        }
        if (alt) {
            ret = `${ret}<hr /><b>${popupString("Alt text:")}</b> ${escapeQuotesHTML(alt)}`;
        }
        if (typeof content === "string") {
            const p = prepPreviewmaker(content, article, navpop);
            p.makePreview();
            if (p.html) {
                ret += `<hr />${p.html}`;
            }
            if (getValueOf("popupSummaryData")) {
                const info = getPageInfo(content, download);
                log(info);
                setPopupTrailer(info, navpop.idNumber);
            }
        }
        if (page?.imagerepository === "shared") {
            const art = new Title(article);
            const encart = encodeURIComponent(`File:${art.stripNamespace()}`);
            const shared_url = `${siteState.apicommonsbase}?format=json&formatversion=2&callback=pg.fn.APIsharedImagePagePreviewHTML&requestid=${String(navpop.idNumber)}&action=query&prop=revisions&rvslots=main&rvprop=content&titles=${encart}`;
            ret = `${ret}<hr />${popupString("Image from Commons")}: <a href="${siteState.commonsbase}?title=${encart}">${popupString("Description page")}</a>`;
            mw.loader.load(shared_url);
        }
        showAPIPreview("imagelinks", APIimagelinksPreviewHTML(article, download), navpop.idNumber, download as unknown as Navpopup);
        return ret;
    } catch {
        return "API imagepage preview failed :(";
    }
};
export const APIimagelinksPreviewHTML = (
    _article: Title,
    download: Downloader,
): string => {
    try {
        const jsobj = getJsObj(download.data ?? "") as RevisionQuery;
        const list = jsobj.query?.imageusage;
        if (list) {
            const ret: string[] = [];
            for (const entry of list) {
                ret.push(entry.title);
            }
            if (ret.length === 0) {
                return popupString("No image links found");
            }
            return `<h2>${popupString("File links")}</h2>${linkList(ret)}`;
        }
        return popupString("No image links found");
    } catch {
        return "Image links preview generation failed :(";
    }
};
export const APIcategoryPreviewHTML = (
    _article: Title,
    download: Downloader,
): string => {
    try {
        const jsobj = getJsObj(download.data ?? "") as RevisionQuery;
        const list = jsobj.query?.categorymembers;
        let ret: string[] | string = [];
        if (!list) {
            return popupString("Empty category");
        }
        for (const entry of list) {
            ret.push(entry.title);
        }
        if (ret.length === 0) {
            return popupString("Empty category");
        }
        ret = `<h2>${tprintf("Category members (%s shown)", [ret.length])}</h2>${linkList(ret)}`;
        if (jsobj.continue?.cmcontinue) {
            ret += popupString(" and more");
        }
        return ret;
    } catch {
        return "Category preview failed :(";
    }
};
export const APIuserInfoPreviewHTML = (
    _article: Title,
    download: Downloader,
): string => {
    let ret: string[] | string = [];
    let queryobj: RevisionQuery;
    try {
        queryobj = getJsObj(download.data ?? "") as RevisionQuery;
    } catch {
        // istanbul ignore next -- getJsObj 自吞 JSON.parse 异常并返回哨兵 1，download.data
        // 契约恒为 string，唯一语句无法抛出，catch 结构性不可达（legacy :518 同款照搬）
        return "Userinfo preview failed :(";
    }
    const user = anyChild(queryobj.query?.users ?? {});
    if (user) {
        const globaluserinfo = queryobj.query?.globaluserinfo;
        if (user.invalid === "") {
            ret.push(popupString("Invalid user"));
        } else if (user.missing === "") {
            ret.push(popupString("Not a registered username"));
        }
        if (user.blockedby) {
            if (user.blockpartial) {
                ret.push(`<b>${popupString("Has blocks")}</b>`);
            } else {
                ret.push(`<b>${popupString("BLOCKED")}</b>`);
            }
        }
        if (globaluserinfo && (Reflect.has(globaluserinfo, "locked") || Reflect.has(globaluserinfo, "hidden"))) {
            let lockedSulAccountIsAttachedToThis = true;
            for (let i = 0; globaluserinfo.unattached && i < globaluserinfo.unattached.length; i++) {
                if (globaluserinfo.unattached[i].wiki === mw.config.get("wgDBname")) {
                    lockedSulAccountIsAttachedToThis = false;
                    break;
                }
            }
            if (lockedSulAccountIsAttachedToThis) {
                if (Reflect.has(globaluserinfo, "locked")) {
                    ret.push(`<b><i>${popupString("LOCKED")}</i></b>`);
                }
                if (Reflect.has(globaluserinfo, "hidden")) {
                    ret.push(`<b><i>${popupString("HIDDEN")}</i></b>`);
                }
            }
        }
        if (getValueOf("popupShowGender") && user.gender) {
            switch (user.gender) {
                case "male":
                    ret.push(popupString("♂"));
                    break;
                case "female":
                    ret.push(popupString("♀"));
                    break;
            }
        }
        if (user.groups) {
            // 自定义
            const ug: string[] = [];
            user.groups.forEach((groupName) => {
                if (!["*", "user", "autoconfirmed"].includes(groupName)) {
                    ug.push(escapeQuotesHTML(mw.message(`group-${groupName}-member`, user.gender ?? "").text()));
                }
            });
            if (!user.groups.includes("autoconfirmed")) {
                ug.push(`<b>${escapeQuotesHTML(popupString("group-no-autoconfirmed"))}</b>`);
            }
            if (ug.length === 0) {
                ug.push(escapeQuotesHTML(mw.message("group-user-member", user.gender ?? "").text()));
            }
            ret.push(ug.join(popupString("separator")));
        }
        if (globaluserinfo?.groups) {
            const gug: string[] = [];
            globaluserinfo.groups.forEach((groupName) => {
                gug.push(`<i>${escapeQuotesHTML(mw.message(`group-${groupName}-member`, user.gender ?? "").text())}</i>`);
            });
            ret.push(gug.join(popupString("separator")));
        }
        if (user.registration) {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- editcount 0 须渲染为 "0"；falsy 分支为 legacy 刻意行为
            ret.push(escapeQuotesHTML(`${user.editcount ? user.editcount : "0"}${popupString(" edits since: ")}${user.registration ? formattedDate(new Date(user.registration)) : /* istanbul ignore next -- 外层 if (user.registration) 已确证真值，同一对象两次读取之间无副作用，else 侧死分支；legacy :587 同款照搬 */ ""}`));
        }
    }
    if (queryobj.query?.usercontribs?.length) {
        ret.push(popupString("last edit on ") + formattedDate(new Date(queryobj.query.usercontribs[0].timestamp ?? "")));
    }
    if (queryobj.query?.blocks) {
        ret.push(popupString("IP user"));
        for (const block of queryobj.query.blocks) {
            let rbstr = block.rangestart === block.rangeend ? "BLOCK" : "RANGEBLOCK";
            rbstr = !Array.isArray(block.restrictions) ? `Has ${rbstr.toLowerCase()}s` : `${rbstr}ED`;
            ret.push(`<b>${popupString(rbstr)}</b>`);
        }
    }
    ret = `<hr />${ret.join(popupString("comma"))}`;
    return ret;
};
export const APIcontribsPreviewHTML = (article: Title, download: Downloader, navpop: Navpopup): string => APIhistoryPreviewHTML(article, download, navpop, true);
export const APIhistoryPreviewHTML = (
    article: Title,
    download: Downloader,
    _navpop: Navpopup,
    reallyContribs?: boolean,
): string => {
    try {
        const jsobj = getJsObj(download.data ?? "") as RevisionQuery;
        let edits: RevisionRow[] = [];
        if (reallyContribs) {
            edits = jsobj.query?.usercontribs ?? [];
        } else {
            edits = anyChild(jsobj.query?.pages ?? {})?.revisions ?? [];
        }
        const ret = editPreviewTable(article, edits, reallyContribs);
        return ret;
    } catch {
        return popupString("History preview failed");
    }
};
