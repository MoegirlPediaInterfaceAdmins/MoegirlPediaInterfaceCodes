// 消歧域：makeFixDabs（五条件门 + popupFixDab 槽写入）、makeFixDab/listLinks/
// retargetDab/rmDupesFromSortedList 与 popupRedlinkHTML（红链移除链接）。
// 行为基准 = legacy src/modules/dab.ts（commit 02c8dec）全文件。
//
// pg 动态域映射：pg.nsSpecialId→nsState.specialId；simplePrintf 自 legacy
// tools.ts 收入 core/strings。
import { log } from "../core/log.ts";
import { setPopupHTML } from "../core/htmlout.ts";
import { getValueOf } from "../core/options.ts";
import { popupString, simplePrintf, tprintf } from "../core/strings.ts";
import { assume } from "../core/tools.ts";
import { changeLinkTargetLink } from "../navlinks/links.ts";
import { isDisambig, parenSplit, Title } from "../title/title.ts";
import { nsState } from "../title/namespaces.ts";
import type { Navpopup } from "../core/popup.ts";

const retargetDab = (newTarget: string, oldTarget: unknown, friendlyCurrentArticleName: string, titleToEdit: string | undefined): string => {
    log(`retargetDab: newTarget=${newTarget} oldTarget=${String(oldTarget)}`);
    // 本域调用恒传非空 Title 与 action="edit"，titledWikiLink/appendParamsToLink
    // 的 null 返回路径不可达；links 域声明为 string | null，此处用 assume 收窄回
    // string（运行时值不变）——与 queries.ts 的 assume(navpop.article) 同款适配
    return assume(changeLinkTargetLink({
        newTarget: newTarget,
        text: newTarget.split(" ").join("&nbsp;"),
        hint: tprintf("disambigHint", [newTarget]),
        summary: simplePrintf((getValueOf("popupFixDabsSummary") as string), [friendlyCurrentArticleName, newTarget]),
        clickButton: (getValueOf("popupDabsAutoClick") as string),
        minor: true,
        oldTarget: oldTarget as string,
        watch: getValueOf("popupWatchDisambiggedPages") as boolean | null,
        title: titleToEdit,
    }));
};

const listLinks = (wikitext: string, oldTarget: unknown, titleToEdit: string | undefined): (string | null)[] => {
    const reg = RegExp("\\[\\[([^|]*?) *(\\||\\]\\])", "gi");
    let ret: (string | null)[] = [];
    const splitted = parenSplit(wikitext, reg);
    const omitRegex = RegExp("^[a-z]*:|^[Ss]pecial:|^[Ii]mage|^[Cc]ategory");
    const friendlyCurrentArticleName = String(oldTarget);
    const wikPos = getValueOf("popupDabWiktionary");
    for (let i = 1; i < splitted.length; i = i + 3) {
        if (typeof splitted[i] === typeof "string" && splitted[i].length > 0 && !omitRegex.test(splitted[i])) {
            ret.push(retargetDab(splitted[i], oldTarget, friendlyCurrentArticleName, titleToEdit));
        }
    }
    ret = rmDupesFromSortedList(ret.sort());
    if (wikPos) {
        const wikTarget = `wiktionary:${friendlyCurrentArticleName.replace(RegExp("^(.+)\\s+[(][^)]+[)]\\s*$"), "$1")}`;
        let meth: "unshift" | "push";
        if (typeof wikPos === "string" && wikPos.toLowerCase() === "first") {
            meth = "unshift";
        } else {
            meth = "push";
        }
        ret[meth](retargetDab(wikTarget, oldTarget, friendlyCurrentArticleName, titleToEdit));
    }
    ret.push(changeLinkTargetLink({
        newTarget: null,
        text: popupString("remove this link").split(" ").join("&nbsp;"),
        hint: popupString("remove all links to this disambig page from this article"),
        clickButton: (getValueOf("popupDabsAutoClick") as string),
        oldTarget: oldTarget as string,
        summary: simplePrintf((getValueOf("popupRmDabLinkSummary") as string), [friendlyCurrentArticleName]),
        watch: getValueOf("popupWatchDisambiggedPages") as boolean | null,
        title: titleToEdit,
    }));
    return ret;
};

const rmDupesFromSortedList = (list: (string | null)[]): (string | null)[] => {
    const ret: (string | null)[] = [];
    for (const item of list) {
        if (ret.length === 0 || item !== ret[ret.length - 1]) {
            ret.push(item);
        }
    }
    return ret;
};

const makeFixDab = (data: string, navpop: Navpopup): string | null => {
    const titleToEdit = navpop.parentPopup ? String(navpop.parentPopup.article) : undefined;
    const list = listLinks(data, navpop.originalArticle, titleToEdit);
    // istanbul ignore if -- listLinks 恒推入至少一条 remove 链接，空列表分支
    // 结构性不可达（legacy dab.ts 原样保留的防御性早退）
    if (list.length === 0) {
        log("listLinks returned empty list");
        return null;
    }
    let html = `<hr />${popupString("Click to disambiguate this link to:")}<br>`;
    html += list.join(popupString("separator"));
    return html;
};

export const makeFixDabs = (wikiText: string, navpop: Navpopup): void => {
    if (getValueOf("popupFixDabs") && navpop.article && isDisambig(wikiText, navpop.article) && Title.fromURL(location.href).namespaceId() !== nsState.specialId && navpop.article.talkPage()) {
        setPopupHTML(makeFixDab(wikiText, navpop), "popupFixDab", navpop.idNumber);
    }
};

// 同 retargetDab：调用面恒传非空参数，links 域的 string | null 经 assume 收窄
export const popupRedlinkHTML = (article: unknown): string => assume(changeLinkTargetLink({
    newTarget: null,
    text: popupString("remove this link").split(" ").join("&nbsp;"),
    hint: popupString("remove all links to this page from this article"),
    clickButton: (getValueOf("popupRedlinkAutoClick") as string),
    oldTarget: String(article),
    summary: simplePrintf((getValueOf("popupRedlinkSummary") as string), [String(article)]),
}));
