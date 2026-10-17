// 导航链接域：popup 导航条的 HTML <a> 构造器（wikiLink/titledWikiLink/
// generalLink/changeLinkTargetLink/redirLink 等）。行为基准 = legacy
// src/modules/links.ts 的链接构造段（commit 02c8dec，批 C-L 先头件范围）；
// 本批次（4-L3）已补齐 legacy 余段：外部统计/搜索链接五件套、HistoryInfo
// 家族与 pg.fn.* 家族——见文件下半部「阶段 4-L3 追加段」的映射说明；
// legacy 挂 pg.fn.* 的函数在本仓按既定模式移植为普通 exported 函数
// （window.pg 兼容面由阶段 5 装配层挂接，见 state.ts 的兼容面说明）。
//
// 与 legacy 的结构差异（均为既定适配，无用户可见行为差异）：
// - pg.wiki.titlebase → title 域导出的 wiki.titlebase；
//   pg.misc.defaultNavlinkClassname → wiki.misc.defaultNavlinkClassname
//   （legacy 全仓从未赋值，恒 undefined，照搬——见 title.ts 的字段声明）
// - pg.current.link → events 域的 eventsState.current.link
// - pg.unescapeQuotesHTML → tools 域的 unescapeQuotesHTML（模块静态导入恒有
//   定义，legacy 的 ?. 可选链与 ?? "" 兜底随挂载点消失而退化，无行为差异）
// - String.prototype.parenSplit → title 域导出的 parenSplit(str, re)
// - legacy 模板串内直接内插可空表达式的位置（${l.oldid} 等）以 String()
//   显式包裹：插值语义与 ToString 相同，纯 lint 适配（已被 typeof/真值守卫
//   收窄为 string 的位置保持 legacy 原样的裸内插）
import { autoClickToken } from "../actions/autoedit.ts";
import { getMwApi, siteState } from "../api/siteinfo.ts";
import { eventsState, setupTooltips } from "../core/events.ts";
import { errlog, log } from "../core/log.ts";
import { getValueOf, optionStore } from "../core/options.ts";
import { addPopupShortcut } from "../core/shortcutkeys.ts";
import { popupString, simplePrintf, tprintf } from "../core/strings.ts";
import { assume, getJsObj, anyChild, unescapeQuotesHTML } from "../core/tools.ts";
import { clearPages } from "../net/cache.ts";
import { abortAllDownloads, startDownload } from "../net/downloader.ts";
import type { Downloader } from "../net/downloader.ts";
import { nsState } from "../title/namespaces.ts";
import { Title, parenSplit, parseParams, safeDecodeURI, wiki } from "../title/title.ts";

// A navlink spec as built by navlinks.ts: an article plus the display
// and target options of one popup navlink. Fields are optional because
// different builders consume different subsets. Members widened with
// `| undefined` are explicitly assigned undefined by pass-through
// call sites (exactOptionalPropertyTypes distinguishes the two).
export interface LinkSpec {
    article: Title;
    action?: string | undefined;
    actionName?: string;
    text?: string | undefined;
    newWin?: boolean | null | undefined;
    title?: string | null | undefined;
    oldid?: string | null | undefined;
    noPopup?: boolean | number | null | undefined;
    onclick?: string | undefined;
    className?: string | null | undefined;
    id?: string;
    specialpage?: string;
    sep?: string | null;
    rcid?: string;
    diff?: string | null;
    from?: string | number | null;
    to?: string | null | undefined;
}
// the subset generalLink/generalNavLink actually consume (no article)
export interface GeneralLinkSpec {
    url: string;
    newWin?: boolean | null | undefined;
    title?: string | null;
    text?: string | null | undefined;
    className?: string | null | undefined;
    noPopup?: boolean | number | null | undefined;
    onclick?: string | undefined;
}
export const wikiLink = (l: LinkSpec): string | null => {
    if (!(typeof l.article === typeof {} && typeof l.action === typeof "" && typeof l.text === typeof "")) {
        return null;
    }
    if (typeof l.oldid === "undefined") {
        l.oldid = null;
    }
    const savedOldid = l.oldid;
    // 非 edit|view|revert|render|^raw 动作下 oldid 无意义，置空丢弃（legacy 原样）
    if (!/^(edit|view|revert|render)$|^raw/.test(assume(l.action))) {
        l.oldid = null;
    }
    let hint = popupString(`${String(l.action)}Hint`);
    const oldidData = [l.oldid, safeDecodeURI(l.article)];
    let revisionString = tprintf("revision %s of %s", oldidData);
    log(`revisionString=${revisionString}`);
    switch (l.action) {
        case "edit&section=new":
            hint = popupString("newSectionHint");
            break;
        case "edit&undo=":
            if (l.diff && l.diff !== "prev" && savedOldid) {
                l.action = `${l.action}${l.diff}&undoafter=${savedOldid}`;
            } else if (savedOldid) {
                l.action = `${l.action}${savedOldid}`;
            }
            hint = popupString("undoHint");
            break;
        case "raw&ctype=text/css":
            hint = popupString("rawHint");
            break;
        case "revert": {
            const p = parseParams(eventsState.current.link?.href ?? "");
            l.action = `edit&autoclick=wpSave&actoken=${autoClickToken()}&autoimpl=${popupString("autoedit_version")}&autosummary=${revertSummary(l.oldid, p.diff)}`;
            if (p.diff === "prev") {
                l.action += "&direction=prev";
                revisionString = tprintf("the revision prior to revision %s of %s", oldidData);
            }
            if (getValueOf("popupRevertSummaryPrompt")) {
                l.action += "&autosummaryprompt=true";
            }
            if (getValueOf("popupMinorReverts")) {
                l.action += "&autominor=true";
            }
            log(`revisionString is now ${revisionString}`);
            break;
        }
        case "nullEdit":
            l.action = `edit&autoclick=wpSave&actoken=${autoClickToken()}&autoimpl=${popupString("autoedit_version")}&autosummary=${popupString("nullEditSummary")}`;
            break;
        case "historyfeed":
            l.action = "history&feed=rss";
            break;
        case "markpatrolled":
            l.action = `markpatrolled&rcid=${String(l.rcid)}`;
    }
    // istanbul ignore else -- popupString 三级兜底最终返回键名本身，hint 恒为
    // 真值，else 回退分支结构性不可达；按行为基准纪律逐字照搬勿修
    if (hint) {
        if (l.oldid) {
            hint = simplePrintf(hint, [revisionString]);
        } else {
            hint = simplePrintf(hint, [safeDecodeURI(l.article)]);
        }
    } else {
        // 照搬勿修：+ 优先级高于三元，条件实为两侧拼接串的真值（恒取真分支），
        // legacy 上游笔误原样保留
        hint = String(safeDecodeURI(`${String(l.article)}&action=${String(l.action)}`)) + String(l.oldid) ? `&oldid=${String(l.oldid)}` : "";
    }
    return titledWikiLink({
        article: l.article,
        action: l.action,
        text: l.text,
        newWin: l.newWin,
        title: hint,
        oldid: l.oldid,
        noPopup: l.noPopup,
        onclick: l.onclick,
    });
};
const revertSummary = (oldid: string | null, diff: string | null | undefined) => {
    let ret;
    if (diff === "prev") {
        ret = getValueOf("popupQueriedRevertToPreviousSummary");
    } else {
        ret = getValueOf("popupQueriedRevertSummary");
    }
    return `${ret as string}&autorv=${String(oldid)}`;
};
export const titledWikiLink = (l: LinkSpec): string | null => {
    if (typeof l.article === "undefined" || typeof l.action === "undefined") {
        errlog("got undefined article or action in titledWikiLink");
        return null;
    }
    const base = wiki.titlebase + l.article.urlString();
    let url = base;
    if (typeof l.actionName === "undefined" || !l.actionName) {
        l.actionName = "action";
    }
    if (l.action !== "view") {
        url = `${base}&${l.actionName}=${l.action}`;
    }
    if (l.action === "edit") {
        url += "&wpChangeTags=Popups%2CAutomation%20tool";
    }
    if (typeof l.oldid !== "undefined" && l.oldid) {
        url += `&oldid=${l.oldid}`;
    }
    let cssClass: string | null | undefined = wiki.misc.defaultNavlinkClassname;
    if (typeof l.className !== "undefined" && l.className) {
        cssClass = l.className;
    }
    return generalNavLink({
        url: url,
        newWin: l.newWin,
        title: typeof l.title !== "undefined" ? l.title : null,
        text: typeof l.text !== "undefined" ? l.text : null,
        className: cssClass,
        noPopup: l.noPopup,
        onclick: l.onclick,
    });
};
export const generalLink = (link: GeneralLinkSpec): string | null => {
    if (typeof link.url === "undefined") {
        return null;
    }
    const elem = document.createElement("a");
    elem.href = link.url;
    // title/onclick 缺省时 String() 产出字面 "undefined"/"null" 属性值——legacy
    // 原样（getAttribute 恒可读到哨兵串），照搬勿修
    elem.title = String(link.title);
    elem.setAttribute("onclick", String(link.onclick));
    if (link.noPopup) {
        elem.setAttribute("noPopup", "1");
    }
    let newWin;
    if (typeof link.newWin === "undefined" || link.newWin === null) {
        newWin = getValueOf("popupNewWindows");
    } else {
        newWin = link.newWin;
    }
    if (newWin) {
        elem.target = "_blank";
    }
    if (link.className) {
        elem.className = link.className;
    }
    elem.innerText = unescapeQuotesHTML(String(link.text));
    return elem.outerHTML;
};
// legacy 未导出（links.ts 模块内部使用）；重写版导出仅为单测直调覆盖其
// 「无 href 命中返 null」分支（exported API 下结构性不可达），运行时行为不变
export const appendParamsToLink = (linkstr: string | null, params: string): string | null => {
    if (!linkstr) {
        return null;
    }
    const sp = parenSplit(linkstr, /(href="[^"]+?)"/i);
    if (sp.length < 2) {
        return null;
    }
    // istanbul ignore next -- split 产物为稠密字符串数组（长度已 >= 2），两次
    // shift 必非空，?? "" 兜底结构性不可达，照搬 legacy
    let ret = (sp.shift() ?? "") + (sp.shift() ?? "");
    ret += `&${params}"`;
    ret += sp.join("");
    return ret;
};
export const changeLinkTargetLink = (x: {
    newTarget?: string | null;
    oldTarget: string;
    title?: string | null | undefined;
    newWin?: boolean | null;
    text: string;
    hint?: string | null;
    clickButton: string | number | boolean;
    minor?: boolean | null;
    watch?: boolean | string | null;
    alsoChangeLabel?: boolean;
    summary: string;
}): string | null => {
    if (x.newTarget) {
        log(`changeLinkTargetLink: newTarget=${x.newTarget}`);
    }
    if (x.oldTarget !== decodeURIComponent(x.oldTarget)) {
        log(`This might be an input problem: ${x.oldTarget}`);
    }
    const cA = mw.util.escapeRegExp(x.oldTarget);
    let chs = cA.charAt(0).toUpperCase();
    chs = `[${chs}${chs.toLowerCase()}]`;
    let currentArticleRegexBit = chs + cA.substring(1);
    currentArticleRegexBit = currentArticleRegexBit.split(/(?:[_ ]+|%20)/g).join("(?:[_ ]+|%20)").split("\\(").join("(?:%28|\\()").split("\\)").join("(?:%29|\\))");
    currentArticleRegexBit = `\\s*(${currentArticleRegexBit}(?:#[^\\[\\|]*)?)\\s*`;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string is a meaningful value here; the || branch is deliberate upstream behavior
    const title = x.title || mw.config.get("wgPageName").split("_").join(" ");
    const lk = titledWikiLink({
        article: new Title(title),
        newWin: x.newWin,
        action: "edit",
        text: x.text,
        title: x.hint,
        className: "popup_change_title_link",
    });
    let cmd = "";
    if (x.newTarget) {
        const t = x.newTarget;
        const s = mw.util.escapeRegExp(x.newTarget);
        if (x.alsoChangeLabel) {
            cmd += `s~\\[\\[${currentArticleRegexBit}\\]\\]~[[${t}]]~g;`;
            cmd += `s~\\[\\[${currentArticleRegexBit}[|]~[[${t}|~g;`;
            cmd += `s~\\[\\[${s}\\|${s}\\]\\]~[[${t}]]~g`;
        } else {
            cmd += `s~\\[\\[${currentArticleRegexBit}\\]\\]~[[${t}|$1]]~g;`;
            cmd += `s~\\[\\[${currentArticleRegexBit}[|]~[[${t}|~g;`;
            cmd += `s~\\[\\[${s}\\|${s}\\]\\]~[[${t}]]~g`;
        }
    } else {
        cmd += `s~\\[\\[${currentArticleRegexBit}\\]\\]~$1~g;`;
        cmd += `s~\\[\\[${currentArticleRegexBit}[|](.*?)\\]\\]~$2~g`;
    }
    cmd = `autoedit=${encodeURIComponent(cmd)}`;
    cmd += `&autoclick=${encodeURIComponent(x.clickButton)}&actoken=${encodeURIComponent(autoClickToken())}`;
    cmd += x.minor === null ? "" : `&autominor=${encodeURIComponent(String(x.minor))}`;
    cmd += x.watch === null ? "" : `&autowatch=${encodeURIComponent(String(x.watch))}`;
    cmd += `&autosummary=${encodeURIComponent(x.summary)}`;
    cmd += `&autoimpl=${encodeURIComponent(popupString("autoedit_version"))}`;
    return appendParamsToLink(lk, cmd);
};
export const redirLink = (redirMatch: string | Title, article: Title): string => {
    let ret = "";
    if (getValueOf("popupAppendRedirNavLinks") && getValueOf("popupNavLinks")) {
        ret += "<hr />";
        if (getValueOf("popupFixRedirs")) {
            ret += popupString("Redirects to: (Fix ");
            log(`redirLink: newTarget=${String(redirMatch)}`);
            ret += String(addPopupShortcut(changeLinkTargetLink({
                newTarget: redirMatch as string,
                text: popupString("target"),
                hint: popupString("Fix this redirect, changing just the link target"),
                summary: simplePrintf((getValueOf("popupFixRedirsSummary") as string), [article.toString(), redirMatch]),
                oldTarget: article.toString(),
                clickButton: (getValueOf("popupRedirAutoClick") as string),
                minor: true,
                watch: getValueOf("popupWatchRedirredPages") as boolean | null,
            }), "R"));
            ret += popupString(" or ");
            ret += String(addPopupShortcut(changeLinkTargetLink({
                newTarget: redirMatch as string,
                text: popupString("target & label"),
                hint: popupString("Fix this redirect, changing the link target and label"),
                summary: simplePrintf((getValueOf("popupFixRedirsSummary") as string), [article.toString(), redirMatch]),
                oldTarget: article.toString(),
                clickButton: (getValueOf("popupRedirAutoClick") as string),
                minor: true,
                watch: getValueOf("popupWatchRedirredPages") as boolean | null,
                alsoChangeLabel: true,
            }), "R"));
            ret += popupString(")");
        } else {
            ret += popupString("Redirects") + popupString(" to ");
        }
        return ret;
    }
    return `<br> ${popupString("Redirects")}${popupString(" to ")}${String(titledWikiLink({
        article: new Title().fromWikiText(redirMatch),
        action: "view",
        text: safeDecodeURI(redirMatch) as string,
        title: popupString("Bypass redirect"),
    }))}`;
};
// generalNavLink：className 为 null 时回落 popupNavLink——undefined 不命中该
// 分支（=== null 严格比较），照搬勿修
// legacy 未导出（links.ts 模块内部使用）；重写版导出仅为单测直调覆盖该回落
// 分支（现行调用链只传 string | undefined），运行时行为不变
export const generalNavLink = (l: GeneralLinkSpec): string | null => {
    l.className = l.className === null ? "popupNavLink" : l.className;
    return generalLink(l);
};

// ══ 阶段 4-L3 追加段：legacy links.ts 余段（:150 接口 → :694 文件尾） ══
// 上文头部注释所述「history 查询与 arin/editCounter 等统计链接属后续批次，
// 不在本文件」的条目自此段落位，legacy 余段至此全部移植完毕：外部统计/
// 搜索链接五件套、getHistoryInfo 家族、pg.fn.* 家族的普通函数化移植
// （window.pg 兼容面由阶段 5 装配层挂接，见 state.ts 的兼容面说明）。
// legacy 模块私有件（toolDbName/saneLinkCheck/processLastContribInfo/
// processDiffSinceMyEdit/displayUrl/processAllPopups/getHistoryInfo/
// getHistory/processHistory/finishProcessHistory）按 legacy 原文移植为模块
// 内函数，私有性不变。
//
// 与 legacy 的结构差异（均为既定适配，无用户可见行为差异）：
// - pg.wiki.wikimedia/hostname/apibase → siteinfo 域的 siteState；
//   pg.wiki.titlebase → title 域的 wiki.titlebase；pg.idNumber → events 域的
//   eventsState.idNumber；pg.nsSpecialId → namespaces 域的 nsState.specialId
//   （非空 number，消 legacy `?? -1` 兜底的死分支，queries.ts 同款适配）
// - setupCache()（清空 pg.cache.pages）→ net/cache 域的 clearPages()；
//   abortAllDownloads → net/downloader 域同名导出
// - `pg.option = {}`（purgePopups）：optionStore 为 const 导出、各域经 live
//   binding 引用同一对象，无法整体换引用，以逐键删除实现等价重置
// - displayUrl 的 `document.location = url`：Document.location 是
//   [PutForwards=href] 的 Location 对象 setter，类型层不接受 string，改写为
//   document.location.href = url（浏览器/jsdom 导航行为一致）
export const arinLink = (l: LinkSpec): string | null => {
    if (!saneLinkCheck(l)) {
        return null;
    }
    if (!l.article.isIpUser() || !siteState.wikimedia) {
        return null;
    }
    const uN = l.article.userName();
    return generalNavLink({
        url: `http://ws.arin.net/cgi-bin/whois.pl?queryinput=${encodeURIComponent(String(uN))}`,
        newWin: l.newWin,
        title: tprintf("Look up %s in ARIN whois database", [uN]),
        text: l.text,
        noPopup: 1,
    });
};
const toolDbName = (cookieStyle?: boolean): string => {
    let ret = mw.config.get("wgDBname");
    // istanbul ignore else -- cookieStyle 参数 legacy 无调用方（唯一调用点
    // toolDbName() 不传参，且函数本身未导出），true 分支结构性不可达；照搬勿修
    if (!cookieStyle) {
        ret += "_p";
    }
    return ret;
};
const saneLinkCheck = (l: { article?: unknown; text?: unknown }): boolean => {
    if (typeof l.article !== typeof {} || typeof l.text !== typeof "") {
        return false;
    }
    return true;
};
export const editCounterLink = (l: LinkSpec): string | null => {
    if (!saneLinkCheck(l)) {
        return null;
    }
    if (!siteState.wikimedia) {
        return null;
    }
    const uN = l.article.userName();
    const tool = getValueOf("popupEditCounterTool");
    let url;
    const defaultToolUrl = `https://xtools.wmflabs.org/ec?user=$1&project=$2.$3&uselang=${mw.config.get("wgUserLanguage")}`;
    switch (tool) {
        case "custom":
            url = simplePrintf((getValueOf("popupEditCounterUrl") as string), [encodeURIComponent(String(uN)), toolDbName()]);
            break;
        case "soxred":
        case "kate":
        case "interiot":
        case "supercount":
        default: {
            // theWiki[0]/[1] 只取主机名前两段（zh.moegirl.org.cn → zh.moegirl，
            // 丢掉 .org.cn）；legacy 原样，照搬勿修
            const theWiki = siteState.hostname.split(".");
            url = simplePrintf(defaultToolUrl, [encodeURIComponent(String(uN)), theWiki[0], theWiki[1]]);
        }
    }
    return generalNavLink({
        url: url,
        title: tprintf("editCounterLinkHint", [uN]),
        newWin: l.newWin,
        text: l.text,
        noPopup: 1,
    });
};
export const globalSearchLink = (l: LinkSpec): string | null => {
    if (!saneLinkCheck(l)) {
        return null;
    }
    const base = `https://global-search.toolforge.org/?uselang=${mw.config.get("wgUserLanguage")}&q=`;
    const article = l.article.urlString({
        keepSpaces: true,
    });
    return generalNavLink({
        url: base + article,
        newWin: l.newWin,
        title: tprintf("globalSearchHint", [safeDecodeURI(l.article)]),
        text: l.text,
        noPopup: 1,
    });
};
export const googleLink = (l: LinkSpec): string | null => {
    if (!saneLinkCheck(l)) {
        return null;
    }
    const base = "https://www.google.com/search?q=";
    const article = l.article.urlString({
        keepSpaces: true,
    });
    return generalNavLink({
        url: `${base}%22${article}%22`,
        newWin: l.newWin,
        title: tprintf("googleSearchHint", [safeDecodeURI(l.article)]),
        text: l.text,
        noPopup: 1,
    });
};
export const editorListLink = (l: LinkSpec): string | null => {
    if (!saneLinkCheck(l)) {
        return null;
    }
    const article = l.article.articleFromTalkPage() ?? l.article;
    const url = `https://xtools.wmflabs.org/articleinfo/${encodeURI(siteState.hostname)}/${article.urlString()}?uselang=${mw.config.get("wgUserLanguage")}`;
    return generalNavLink({
        url: url,
        title: tprintf("editorListHint", [article]),
        newWin: l.newWin,
        text: l.text,
        noPopup: 1,
    });
};
interface HistoryEdit {
    oldid?: number | undefined;
    editor?: string | undefined;
}
interface HistoryMarker {
    index: number;
    oldid?: number | undefined;
    previd?: number | null | undefined;
}
export interface HistoryInfo {
    edits: HistoryEdit[];
    userName: string | null;
    myLastEdit?: HistoryMarker;
    firstNewEditor?: HistoryMarker;
}
// legacy pg.fn.getLastContrib（window.pg 兼容面阶段 5 装配）
export const getLastContrib = (wikipage: string, newWin: boolean): void => {
    getHistoryInfo(wikipage, (x) => {
        processLastContribInfo(x, {
            page: wikipage,
            newWin: newWin,
        });
    });
};
const processLastContribInfo = (info: HistoryInfo, stuff: { page: string; newWin: boolean }): void => {
    if (!info.edits.length) {
        // legacy 原文（未经 popupString 的裸英文串），照搬勿修
        alert("Popups: an odd thing happened. Please retry.");
        return;
    }
    if (!info.firstNewEditor) {
        alert(tprintf("Only found one editor: %s made %s edits", [info.edits[0].editor, info.edits.length]));
        return;
    }
    const newUrl = `${wiki.titlebase + new Title(stuff.page).urlString()}&diff=cur&oldid=${String(info.firstNewEditor.oldid)}`;
    displayUrl(newUrl, stuff.newWin);
};
// legacy pg.fn.getDiffSinceMyEdit（window.pg 兼容面阶段 5 装配）
export const getDiffSinceMyEdit = (wikipage: string, newWin: boolean): void => {
    getHistoryInfo(wikipage, (x) => {
        processDiffSinceMyEdit(x, {
            page: wikipage,
            newWin: newWin,
        });
    });
};
const processDiffSinceMyEdit = (info: HistoryInfo, stuff: { page: string; newWin: boolean }): void => {
    if (!info.edits.length) {
        // legacy 原文（未经 popupString 的裸英文串），照搬勿修
        alert("Popups: something fishy happened. Please try again.");
        return;
    }
    const friendlyName = stuff.page.split("_").join(" ");
    if (!info.myLastEdit) {
        alert(tprintf("Couldn't find an edit by %s\nin the last %s edits to\n%s", [info.userName, getValueOf("popupHistoryLimit"), friendlyName]));
        return;
    }
    if (info.myLastEdit.index === 0) {
        alert(tprintf("%s seems to be the last editor to the page %s", [info.userName, friendlyName]));
        return;
    }
    const newUrl = `${wiki.titlebase + new Title(stuff.page).urlString()}&diff=cur&oldid=${String(info.myLastEdit.oldid)}`;
    displayUrl(newUrl, stuff.newWin);
};
// legacy 私有件：新仓 src/ 无对位，按 legacy 原文移植；两条分支分别经
// getLastContrib/getDiffSinceMyEdit 的 newWin 参数直测（true → window.open、
// 否则 → document.location 导航）
const displayUrl = (url: string, newWin?: boolean | null): void => {
    if (newWin) {
        window.open(url);
    } else {
        document.location.href = url;
    }
};
// legacy pg.fn.purgePopups（window.pg 兼容面阶段 5 装配）
export const purgePopups = (): void => {
    processAllPopups(true);
    clearPages();
    // legacy `pg.option = {}` 的等价重置（见段首差异说明）
    for (const key of Object.keys(optionStore)) {
        Reflect.deleteProperty(optionStore, key);
    }
    abortAllDownloads();
};
const processAllPopups = (nullify?: boolean, banish?: boolean): void => {
    for (const link of eventsState.current.links) {
        if (!link.navpopup) {
            continue;
        }
        // istanbul ignore else -- 三个调用点（purgePopups 传 nullify、disablePopups
        // 传 banish、togglePreviews 双真）至少命中一个真值，双假侧无调用方可达；
        // 条件语句照搬 legacy，勿删
        if (nullify || banish) {
            assume(link.navpopup).banish();
        }
        link.simpleNoMore = false;
        if (nullify) {
            link.navpopup = null;
        }
    }
};
// legacy pg.fn.disablePopups（window.pg 兼容面阶段 5 装配）
export const disablePopups = (): void => {
    processAllPopups(false, true);
    setupTooltips(null, true);
};
// legacy pg.fn.togglePreviews（window.pg 兼容面阶段 5 装配）
export const togglePreviews = (): void => {
    processAllPopups(true, true);
    // legacy 直读直写 pg.option（绕过 getValueOf 的默认化），照搬勿修
    optionStore.simplePopups = !optionStore.simplePopups;
    abortAllDownloads();
};
export function magicWatchLink(this: { id?: string }, l: LinkSpec): string | null {
    l.onclick = simplePrintf("pg.fn.modifyWatchlist('%s','%s');return false;", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), this.id]);
    return wikiLink(l);
}
// legacy pg.fn.modifyWatchlist（window.pg 兼容面阶段 5 装配）
export const modifyWatchlist = async (title: string | null, action: string | null): Promise<void> => {
    const reqData: {
        action: string;
        formatversion: number;
        titles: string;
        uselang: string;
        unwatch?: boolean;
    } = {
        action: "watch",
        formatversion: 2,
        titles: title ?? "",
        uselang: mw.config.get("wgUserLanguage"),
    };
    if (action === "unwatch") {
        reqData.unwatch = true;
    }
    const mwTitle = mw.Title.newFromText(title ?? "");
    let messageName;
    if (mwTitle && mwTitle.getNamespaceId() > 0 && mwTitle.getNamespaceId() % 2 === 1) {
        messageName = action === "watch" ? "addedwatchtext-talk" : "removedwatchtext-talk";
    } else {
        messageName = action === "watch" ? "addedwatchtext" : "removedwatchtext";
    }
    await Promise.all([
        getMwApi().postWithToken("watch", reqData),
        // mw.loader.using(["mediawiki.jqueryMsg"]),
        getMwApi().loadMessagesIfMissing([messageName]),
    ]);
    mw.notify(mw.message(messageName, title ?? "").parseDom() as unknown as JQuery);
};
export const magicHistoryLink = (l: LinkSpec): string | null => {
    let title = "",
        onClick = "";
    switch (l.id) {
        case "lastContrib":
            onClick = simplePrintf("pg.fn.getLastContrib('%s',%s)", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), l.newWin]);
            title = popupString("lastContribHint");
            break;
        case "sinceMe":
            onClick = simplePrintf("pg.fn.getDiffSinceMyEdit('%s',%s)", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), l.newWin]);
            title = popupString("sinceMeHint");
            break;
    }
    // jsUrl 在补 ";return false;" 之前快照（legacy 顺序照搬）
    const jsUrl = `javascript:${onClick}`;
    onClick += ";return false;";
    return generalNavLink({
        url: jsUrl,
        newWin: false,
        title: title,
        text: l.text,
        noPopup: l.noPopup,
        onclick: onClick,
    });
};
export const popupMenuLink = (l: LinkSpec): string | null => {
    const jsUrl = simplePrintf("javascript:pg.fn.%s()", [l.id]);
    const title = popupString(simplePrintf("%sHint", [l.id]));
    const onClick = simplePrintf("pg.fn.%s();return false;", [l.id]);
    return generalNavLink({
        url: jsUrl,
        newWin: false,
        title: title,
        text: l.text,
        noPopup: l.noPopup,
        onclick: onClick,
    });
};
export const specialLink = (l: LinkSpec): string | null => {
    if (typeof l.specialpage === "undefined" || !l.specialpage) {
        return null;
    }
    const base = `${wiki.titlebase + mw.config.get("wgFormattedNamespaces")[nsState.specialId]}:${l.specialpage}`;
    if (typeof l.sep === "undefined" || l.sep === null) {
        l.sep = "&target=";
    }
    let article = l.article.urlString({
        keepSpaces: l.specialpage === "Search",
    });
    let hint = popupString(`${l.specialpage}Hint`);
    switch (l.specialpage) {
        case "Log":
            switch (l.sep) {
                case "&user=":
                    hint = popupString("userLogHint");
                    break;
                case "&type=block&page=":
                    hint = popupString("blockLogHint");
                    break;
                case "&page=":
                    hint = popupString("pageLogHint");
                    break;
                case "&type=protect&page=":
                    hint = popupString("protectLogHint");
                    break;
                case "&type=delete&page=":
                    hint = popupString("deleteLogHint");
                    break;
                default:
                    log(`Unknown log type, sep=${l.sep}`);
                    hint = "Missing hint (FIXME)";
            }
            break;
        case "PrefixIndex":
            article += "/";
            break;
    }
    // istanbul ignore else -- popupString 三级兜底最终返回键名本身，hint 恒为
    // 真值（specialpage 非空已由上方守卫收窄），else 回退分支结构性不可达；
    // 按行为基准纪律逐字照搬勿修（legacy :369-373）
    if (hint) {
        hint = simplePrintf(hint, [safeDecodeURI(l.article)]);
    } else {
        hint = safeDecodeURI(`${l.specialpage}:${String(l.article)}`) as string;
    }
    const url = base + l.sep + article;
    return generalNavLink({
        url: url,
        title: hint,
        text: l.text,
        newWin: l.newWin,
        noPopup: l.noPopup,
    });
};
// 测试导出面：legacy 私有的 getHistoryInfo/processHistory/finishProcessHistory
// 在此导出为同名函数以便直接单测（历史 JSON 夹具→HistoryInfo 的判定矩阵与
// whatNext 缺省分支），运行时行为不变（queries.ts 同款既定模式）；getHistory
// 仍为模块私有，经 getHistoryInfo 的 XHR 完整回调链覆盖。
export const getHistoryInfo = (wikipage: string, whatNext?: (x: HistoryInfo) => void): void => {
    log("getHistoryInfo");
    getHistory(wikipage, whatNext
        ? (d) => {
            whatNext(processHistory(d));
        }
        : processHistory);
};
// legacy 返回类型 Downloader | string 的 string 侧来自下载器域的「XHR 不可用」
// 哨兵分支（重写版按不过度防御删除），故此处收紧为 Downloader
const getHistory = (wikipage: string, onComplete: (d: Downloader) => void): Downloader => {
    log("getHistory");
    const url = `${siteState.apiwikibase}?format=json&formatversion=2&action=query&prop=revisions&titles=${new Title(wikipage).urlString()}&rvlimit=${getValueOf("popupHistoryLimit") as string}`;
    log(`getHistory: url=${url}`);
    return startDownload(url, `${eventsState.idNumber}history`, onComplete);
};
export const processHistory = (download: Downloader): HistoryInfo => {
    // legacy 分两段标注（pages 值先标成 HistoryEdit 再 as 成 API 原始 revision
    // 形状）；重写版按运行时实际形状一次标注，行为一致
    const jsobj = getJsObj(download.data ?? "") as { query?: { pages?: Record<string, { revisions?: { revid?: number; user?: string }[] }> } };
    try {
        const page = anyChild(jsobj.query?.pages ?? {});
        const revisions = page?.revisions;
        if (!revisions) {
            log("Something went wrong with JSON business");
            return finishProcessHistory([], mw.config.get("wgUserName"));
        }
        const edits: HistoryEdit[] = [];
        for (const revision of revisions) {
            edits.push({
                oldid: revision.revid,
                editor: revision.user,
            });
        }
        log(`processed ${edits.length} edits`);
        return finishProcessHistory(edits, mw.config.get("wgUserName"));
    } catch {
        // istanbul ignore next -- getJsObj 自吞 JSON.parse 异常并返回哨兵 1
        // （tools.ts:25-44），jsobj.query / anyChild / 属性访问对数字与任意 JSON
        // 形态均不抛，catch 结构性不可达（legacy :667-670 同款照搬）
        log("Something went wrong with JSON business");
        // istanbul ignore next -- 同上：catch 整体结构性不可达（两语句按同一理由登记）
        return finishProcessHistory([], mw.config.get("wgUserName"));
    }
};
export const finishProcessHistory = (edits: HistoryEdit[], userName: string | null): HistoryInfo => {
    const histInfo: HistoryInfo = {
        edits: edits,
        userName: userName,
    };
    for (let i = 0; i < edits.length; ++i) {
        if (typeof histInfo.myLastEdit === "undefined" && userName && edits[i].editor === userName) {
            histInfo.myLastEdit = {
                index: i,
                oldid: edits[i].oldid,
                previd: i === 0 ? null : edits[i - 1].oldid,
            };
        }
        if (typeof histInfo.firstNewEditor === "undefined" && edits[i].editor !== edits[0].editor) {
            histInfo.firstNewEditor = {
                index: i,
                oldid: edits[i].oldid,
                // firstNewEditor 必在 i > 0 时成立（i=0 的编者即 edits[0].editor，
                // 条件必假），故三元 null 侧结构性不可达；照搬勿修
                previd: i === 0 ? /* istanbul ignore next -- 同上，null 侧结构性不可达 */ null : edits[i - 1].oldid,
            };
        }
    }
    return histInfo;
};
