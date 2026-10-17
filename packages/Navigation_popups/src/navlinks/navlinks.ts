// 导航链接域（navlink DSL）：<<tag|opt=val|text>> 规格串解析、if(x){...}else{...}
// 条件展开与嵌套 <menu>/<menurow> 的深度栈渲染、7 种弹窗结构的 navlink 槽填充器
// 注册面。行为基准 = legacy src/modules/navlinks.ts + src/modules/structures.ts 的
// navlink 段（commit 02c8dec）逐字照搬；legacy 怪癖按「照搬勿修」保留（见各处
// 注释与测试用例名）。
//
// 与 legacy 的结构差异（均为既定适配，无用户可见行为差异）：
// - pg.wiki.hostname/wikimedia → siteinfo 域的 siteState
// - pg.current.link → events 域的 eventsState.current.link
// - pg.option.popupLinksNewWindow / pg.option.simplePopups → options 域的
//   optionStore（legacy 这两处直读 pg.option，不走 getValueOf 的 window 覆盖链
//   固化，照搬该语义）
// - pg.nsImageId → namespaces 域的 nsState.imageId
// - String.prototype.parenSplit/entify 原型扩展 → title/core 域的显式函数
// - navlink 参数表：legacy 标注 Record<string, string | null>，实际来源
//   （parseParams）含 undefined 值；重写版按真实形态放宽容（仅类型层）
// - 槽填充器接线：legacy 把 navlink 渲染函数直接内联在结构对象上
//   （domdrag.ts 的 original.* 与 structures.ts 的 nostalgia/fancy/fancy2/
//   menus/shortmenus/lite），使结构域反向依赖 navlinks 域；重写版结构表只声明
//   「槽名 → 注册表键」绑定（core/structures.ts），本模块在模块求值时经
//   registerSlotFiller 注册实现——装配层（boot，阶段 5）import 本模块即完成
//   接线，未注册的槽在 fillEmptySpans 中跳过
// - 测试导出面：legacy 私有的 defaultNavlinkSpec/expandConditionalNavlinkString/
//   navlinkStringToArray/navlinkSubstituteHTML/navlinkDepth/NavlinkTag 导出为同名
//   成员以便直接单测（links.ts 的既定模式），运行时行为不变
import { autoClickToken } from "../actions/autoedit.ts";
import { siteState } from "../api/siteinfo.ts";
import { eventsState } from "../core/events.ts";
import { errlog, log } from "../core/log.ts";
import { getValueOf, optionStore } from "../core/options.ts";
import { addPopupShortcut } from "../core/shortcutkeys.ts";
import { popupString, tprintf } from "../core/strings.ts";
import { registerSlotFiller, type StructureContext } from "../core/structures.ts";
import { assume, entify } from "../core/tools.ts";
import { titledDiffLink } from "../preview/diffpreview.ts";
import { nsState } from "../title/namespaces.ts";
import { isInMainNamespace, isInStrippableNamespace, parenSplit, safeDecodeURI } from "../title/title.ts";
import type { Title } from "../title/title.ts";
import { arinLink, editCounterLink, editorListLink, globalSearchLink, googleLink, magicHistoryLink, magicWatchLink, popupMenuLink, specialLink, titledWikiLink, wikiLink } from "./links.ts";
import type { LinkSpec } from "./links.ts";

// navlink 规格串的参数表（parseParams 产物；值可为 null/undefined，见文件头差异说明）
export type NavlinkParams = Record<string, string | null | undefined>;

export const defaultNavlinkSpec = (): string => {
    let str = "";
    str += "<b><<mainlink|shortcut= >></b>";
    if (getValueOf("popupLastEditLink")) {
        str += "*<<lastEdit|shortcut=/>>|<<lastContrib>>|<<sinceMe>>if(oldid){|<<oldEdit>>|<<diffCur>>}";
    }
    str += "if(user){<br><<contribs|shortcut=c>>*<<userlog|shortcut=L|log>>";
    str += "if(ipuser){*<<arin>>}if(wikimedia){*<<count|shortcut=#>>}";
    str += "if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>|<<blocklog|log>>}}";
    const editstr = "<<edit|shortcut=e>>";
    const editOldidStr = `if(oldid){<<editOld|shortcut=e>>|<<revert|shortcut=v|rv>>|<<edit|cur>>}else{${editstr}}`;
    const historystr = "<<history|shortcut=h>>|<<editors|shortcut=E|>>";
    const watchstr = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
    str += `<br>if(talk){${editOldidStr}|<<new|shortcut=+>>*${historystr}*${watchstr}*<b><<article|shortcut=a>></b>|<<editArticle|edit>>}else{${editOldidStr}*${historystr}*${watchstr}*<b><<talk|shortcut=t>></b>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>}`;
    str += "<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>*<<move|shortcut=m>>";
    str += "if(admin){<br><<unprotect|unprotectShort>>|<<protect|shortcut=p>>|<<protectlog|log>>*<<undelete|undeleteShort>>|<<delete|shortcut=d>>|<<deletelog|log>>}";
    return str;
};
export const navLinksHTML = (article: Title, _hint?: string | null, params?: NavlinkParams): string => {
    const str = `<span class="popupNavLinks">${defaultNavlinkSpec()}</span>`;
    return navlinkStringToHTML(str, article, params);
};
// 测试导出面：legacy 私有件在此导出同名成员以便直接单测（含递归上限的显式
// 计数入参），运行时行为不变
export const expandConditionalNavlinkString = (s: string, article: Title, z: NavlinkParams, _recursionCount?: number): string => {
    const oldid = z.oldid,
        rcid = z.rcid,
        diff = z.diff;
    let recursionCount = _recursionCount;
    if (typeof recursionCount !== "number") {
        recursionCount = 0;
    }
    // 组序（parenSplit 保留捕获组）：1=整段、2=条件名、3=真分支、4=else 段、5=假分支
    const conditionalSplitRegex = RegExp("(;?\\s*if\\s*\\(\\s*([\\w]*)\\s*\\)\\s*\\{([^{}]*)\\}(\\s*else\\s*\\{([^{}]*?)\\}|))", "i");
    const splitted = parenSplit(s, conditionalSplitRegex);
    const numParens = 5;
    let ret = splitted[0];
    for (let i = 1; i < splitted.length; i = i + numParens + 1) {
        const testString = splitted[i + 2 - 1];
        const trueString = splitted[i + 3 - 1];
        // split 的捕获组未参与匹配时该槽位是 undefined（TS 的 string[] 标注不含
        // 此真实形态，局部放宽类型还原，不改运行时）；后续 !falseString 与赋值
        // 守卫逐字照搬 legacy
        const rawFalseString: string | undefined = splitted[i + 5 - 1];
        let falseString = rawFalseString;
        if (typeof falseString === "undefined" || !falseString) {
            falseString = "";
        }
        let testResult: boolean | null = null;
        switch (testString) {
            case "user":
                testResult = !!article.userName();
                break;
            case "talk":
                testResult = !!article.talkPage();
                break;
            case "admin":
                testResult = !!getValueOf("popupAdminLinks");
                break;
            case "oldid":
                testResult = !!(typeof oldid !== "undefined" && oldid);
                break;
            case "rcid":
                testResult = !!(typeof rcid !== "undefined" && rcid);
                break;
            case "ipuser":
                testResult = article.isIpUser();
                break;
            case "mainspace_en":
                testResult = isInMainNamespace(article) && siteState.hostname === "en.wikipedia.org";
                break;
            case "wikimedia":
                testResult = siteState.wikimedia;
                break;
            case "diff":
                testResult = !!(typeof diff !== "undefined" && diff);
                break;
        }
        switch (testResult) {
            case null:
                ret += splitted[i];
                break;
            case true:
                ret += trueString;
                break;
            case false:
                ret += falseString;
                break;
        }
        ret += splitted[i + numParens];
    }
    if (conditionalSplitRegex.test(ret) && recursionCount < 10) {
        return expandConditionalNavlinkString(ret, article, z, recursionCount + 1);
    }
    return ret;
};
export const navlinkStringToArray = (_s: string, article: Title, params: NavlinkParams): (NavlinkTag | string)[] => {
    const s = expandConditionalNavlinkString(_s, article, params);
    const splitted = parenSplit(s, /<<(.*?)>>/);
    const ret: (NavlinkTag | string)[] = [];
    for (let i = 0; i < splitted.length; ++i) {
        if (i % 2) {
            const t = new NavlinkTag();
            const ss = splitted[i].split("|");
            t.id = ss[0];
            for (let j = 1; j < ss.length; ++j) {
                const sss = ss[j].split("=");
                if (sss.length > 1) {
                    t[sss[0]] = sss[1];
                } else {
                    t.text = popupString(sss[0]);
                }
            }
            t.article = article;
            const oldid = params.oldid,
                rcid = params.rcid,
                diff = params.diff;
            if (typeof oldid !== "undefined" && oldid !== null) {
                t.oldid = oldid;
            }
            if (typeof rcid !== "undefined" && rcid !== null) {
                t.rcid = rcid;
            }
            if (typeof diff !== "undefined" && diff !== null) {
                t.diff = diff;
            }
            if (!t.text && t.id !== "mainlink") {
                t.text = popupString(t.id);
            }
            ret.push(t);
        } else {
            ret.push(splitted[i]);
        }
    }
    return ret;
};
export const navlinkSubstituteHTML = (s: string) => s.split("*").join(getValueOf("popupNavLinkSeparator") as string).split("<menurow>").join('<li class="popup_menu_row">').split("</menurow>").join("</li>").split("<menu>").join('<ul class="popup_menu">').split("</menu>").join("</ul>");
export const navlinkDepth = (magic: string, s: string) => s.split(`<${magic}>`).length - s.split(`</${magic}>`).length;
export const navlinkStringToHTML = (s: string, article: Title, params?: NavlinkParams) => {
    const p = navlinkStringToArray(s, article, params ?? {});
    let html = "";
    let menudepth = 0;
    let menurowdepth = 0;
    for (const item of p) {
        if (typeof item === "string") {
            html += navlinkSubstituteHTML(item);
            menudepth += navlinkDepth("menu", item);
            menurowdepth += navlinkDepth("menurow", item);
        } else {
            // 照搬勿修：legacy 以 typeof item.type !== "undefined" 防未定义成员；
            // navlinkStringToArray 只产出 string 或 type 恒为 "navlinkTag" 的
            // NavlinkTag，该短路臂结构性不可达（同上先例）
            // istanbul ignore next -- 同上：type 恒有定义，undefined 侧不可达
            if (typeof item.type !== "undefined" && item.type === "navlinkTag") {
                if (menudepth > 0 && menurowdepth === 0) {
                    html += `<li class="popup_menu_item">${item.html()}</li>`;
                } else {
                    html += item.html();
                }
            }
        }
    }
    return html;
};
export type NavlinkPrintFn = (this: NavlinkTag, l: LinkSpec) => string | null;
export class NavlinkTag implements LinkSpec {
    type = "navlinkTag";
    id!: string;
    article!: Title;
    text?: string;
    title?: string | null;
    oldid?: string | null;
    rcid?: string;
    diff?: string | null;
    // `| undefined`：getNewWin() 把选项表的原始查询结果直接拷入
    newWin?: boolean | null | undefined;
    noPopup?: boolean | number | null;
    specialpage?: string;
    sep?: string | null;
    action?: string;
    actionName?: string;
    from?: string | number | null;
    // `| undefined`：oldEdit 把 this.oldid（可选）直接拷入
    to?: string | null | undefined;
    shortcut?: string;
    print?: NavlinkPrintFn;
    [key: string]: unknown;
    html(): string {
        this.getNewWin();
        this.getPrintFunction();
        let html: string | null = "";
        const tagType = "span";
        const opening = `<${tagType} class="popup_${this.id}">`;
        const closing = `</${tagType}>`;
        if (typeof this.print !== "function") {
            errlog(`Oh dear - invalid print function for a navlinkTag, id=${this.id}`);
        } else {
            html = this.print(this);
            if (typeof html !== "string") {
                html = "";
            } else if (typeof this.shortcut !== "undefined") {
                html = addPopupShortcut(html, this.shortcut);
            }
        }
        return opening + String(html) + closing;
    }
    getNewWin(): void {
        getValueOf("popupLinksNewWindow");
        const linksNewWin = optionStore.popupLinksNewWindow as Record<string, boolean | null> | undefined;
        if (typeof linksNewWin?.[this.id] === "undefined") {
            this.newWin = null;
        }
        this.newWin = linksNewWin?.[this.id];
    }
    getPrintFunction(): void {
        if (typeof this.id !== typeof "" || typeof this.article !== typeof {}) {
            return;
        }
        this.noPopup = 1;
        switch (this.id) {
            case "contribs":
            case "history":
            case "whatLinksHere":
            case "userPage":
            case "monobook":
            case "userTalk":
            case "talk":
            case "article":
            case "lastEdit":
                this.noPopup = null;
        }
        switch (this.id) {
            case "email":
            case "contribs":
            case "block":
            case "unblock":
            case "userlog":
            case "userSpace":
            case "deletedContribs":
                this.article = assume(this.article.userName());
        }
        switch (this.id) {
            case "userTalk":
            case "newUserTalk":
            case "editUserTalk":
            case "userPage":
            case "monobook":
            case "editMonobook":
            case "blocklog":
                this.article = assume(this.article.userName(true));
                Reflect.deleteProperty(this, "oldid");
                break;
            case "pagelog":
            case "deletelog":
            case "protectlog":
                Reflect.deleteProperty(this, "oldid");
        }
        if (this.id === "editMonobook" || this.id === "monobook") {
            this.article.append("/monobook.js");
        }
        if (this.id !== "mainlink") {
            this.article = this.article.removeAnchor();
        }
        switch (this.id) {
            case "undelete":
                this.print = specialLink;
                this.specialpage = "Undelete";
                this.sep = "/";
                break;
            case "whatLinksHere":
                this.print = specialLink;
                this.specialpage = "Whatlinkshere";
                break;
            case "relatedChanges":
                this.print = specialLink;
                this.specialpage = "Recentchangeslinked";
                break;
            case "move":
                this.print = specialLink;
                this.specialpage = "Movepage";
                break;
            case "contribs":
                this.print = specialLink;
                this.specialpage = "Contributions";
                break;
            case "deletedContribs":
                this.print = specialLink;
                this.specialpage = "Deletedcontributions";
                break;
            case "email":
                this.print = specialLink;
                this.specialpage = "EmailUser";
                this.sep = "/";
                break;
            case "block":
                this.print = specialLink;
                this.specialpage = "Blockip";
                this.sep = "&ip=";
                break;
            case "unblock":
                this.print = specialLink;
                this.specialpage = "Ipblocklist";
                this.sep = "&action=unblock&ip=";
                break;
            case "userlog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&user=";
                break;
            case "blocklog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&type=block&page=";
                break;
            case "pagelog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&page=";
                break;
            case "protectlog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&type=protect&page=";
                break;
            case "deletelog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&type=delete&page=";
                break;
            case "userSpace":
                this.print = specialLink;
                this.specialpage = "PrefixIndex";
                this.sep = "&namespace=2&prefix=";
                break;
            case "search":
                this.print = specialLink;
                this.specialpage = "Search";
                this.sep = "&fulltext=Search&search=";
                break;
            case "thank":
                this.print = specialLink;
                this.specialpage = "Thanks";
                this.sep = "/";
                this.article.value = this.diff !== "prev" ? this.diff ?? null : this.oldid ?? null;
                break;
            case "unwatch":
            case "watch":
                this.print = magicWatchLink;
                this.action = `${this.id}&autowatchlist=1&autoimpl=${popupString("autoedit_version")}&actoken=${autoClickToken()}`;
                break;
            case "history":
            case "historyfeed":
            case "unprotect":
            case "protect":
                this.print = wikiLink;
                this.action = this.id;
                break;
            case "delete":
                this.print = wikiLink;
                this.action = "delete";
                if (this.article.namespaceId() === nsState.imageId) {
                    const img = this.article.stripNamespace();
                    this.action += `&image=${img}`;
                }
                break;
            case "markpatrolled":
            case "edit":
                Reflect.deleteProperty(this, "oldid");
                this.print = wikiLink;
                this.action = this.id;
                break;
            case "view":
            case "purge":
            case "render":
                this.print = wikiLink;
                this.action = this.id;
                break;
            case "raw":
                this.print = wikiLink;
                this.action = "raw";
                break;
            case "new":
                this.print = wikiLink;
                this.action = "edit&section=new";
                break;
            case "mainlink":
                if (typeof this.text === "undefined") {
                    this.text = entify(this.article.toString());
                }
                if (getValueOf("popupSimplifyMainLink") && isInStrippableNamespace(this.article)) {
                    const s = assume(this.text).split("/");
                    this.text = s[s.length - 1];
                    if (this.text === "" && s.length > 1) {
                        this.text = s[s.length - 2];
                    }
                }
                this.print = titledWikiLink;
                if (typeof this.title === "undefined" && typeof eventsState.current.link?.href !== "undefined") {
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 空串是有意义的值：originalTitle 为空串时须回落 article（legacy 三元照搬，?? 会放行空串）
                    this.title = safeDecodeURI(eventsState.current.link.originalTitle ? eventsState.current.link.originalTitle : this.article) as string;
                    if (typeof this.oldid !== "undefined" && this.oldid) {
                        this.title = tprintf("Revision %s of %s", [this.oldid, this.title]);
                    }
                }
                this.action = "view";
                break;
            case "userPage":
            case "article":
            case "monobook":
            case "editMonobook":
            case "editArticle":
                Reflect.deleteProperty(this, "oldid");
                this.article = this.article.articleFromTalkOrArticle();
                this.print = wikiLink;
                if (this.id.startsWith("edit")) {
                    this.action = "edit";
                } else {
                    this.action = "view";
                }
                break;
            case "userTalk":
            case "talk":
                this.article = assume(this.article.talkPage());
                Reflect.deleteProperty(this, "oldid");
                this.print = wikiLink;
                this.action = "view";
                break;
            case "arin":
                this.print = arinLink;
                break;
            case "count":
                this.print = editCounterLink;
                break;
            case "google":
                this.print = googleLink;
                break;
            case "editors":
                this.print = editorListLink;
                break;
            case "globalsearch":
                this.print = globalSearchLink;
                break;
            case "lastEdit":
                this.print = titledDiffLink;
                this.title = popupString("Show the last edit");
                this.from = "prev";
                this.to = "cur";
                break;
            case "oldEdit":
                this.print = titledDiffLink;
                this.title = `${popupString("Show the edit made to get revision")} ${String(this.oldid)}`;
                this.from = "prev";
                this.to = this.oldid;
                break;
            case "editOld":
                this.print = wikiLink;
                this.action = "edit";
                break;
            case "undo":
                this.print = wikiLink;
                this.action = "edit&undo=";
                break;
            case "revert":
                this.print = wikiLink;
                this.action = "revert";
                break;
            case "nullEdit":
                this.print = wikiLink;
                this.action = "nullEdit";
                break;
            case "diffCur":
                this.print = titledDiffLink;
                this.title = tprintf("Show changes since revision %s", [this.oldid]);
                this.from = this.oldid ?? null;
                this.to = "cur";
                break;
            case "editUserTalk":
            case "editTalk":
                Reflect.deleteProperty(this, "oldid");
                this.article = assume(this.article.talkPage());
                this.action = "edit";
                this.print = wikiLink;
                break;
            case "newUserTalk":
            case "newTalk":
                this.article = assume(this.article.talkPage());
                this.action = "edit&section=new";
                this.print = wikiLink;
                break;
            case "lastContrib":
            case "sinceMe":
                this.print = magicHistoryLink;
                break;
            case "togglePreviews":
                this.text = popupString(optionStore.simplePopups ? "enable previews" : "disable previews");
                this.print = popupMenuLink;
                break;
            case "disablePopups":
            case "purgePopups":
                this.print = popupMenuLink;
                break;
            default:
                this.print = function () {
                    return `Unknown navlink type: ${this.id}`;
                };
        }
    }
}

// ══ 弹窗结构的 navlink 槽填充器（legacy structures.ts + domdrag.ts 段） ══
// legacy 结构对象直接持有这些函数；重写版在模块求值时注册进 core/structures
// 的槽填充器注册表（键与结构表的 slots 绑定一一对应），实现与结构域的分离。

const originalPopupTitle = (x: StructureContext): string => {
    log("defaultstructure.popupTitle");
    if (!getValueOf("popupNavLinks")) {
        return navlinkStringToHTML("<b><<mainlink>></b>", x.article, x.params);
    }
    return "";
};
const originalPopupTopLinks = (x: StructureContext): string => {
    log("defaultstructure.popupTopLinks");
    if (getValueOf("popupNavLinks")) {
        return navLinksHTML(x.article, x.hint, x.params);
    }
    return "";
};
// nostalgia：怀旧式平铺链接串（legacy structures.ts:14-29 逐字照搬）
const nostalgiaPopupTopLinks = (x: StructureContext): string => {
    let str = "";
    str += "<b><<mainlink|shortcut= >></b>";
    str += "if(user){<br><<contribs|shortcut=c>>";
    str += "if(wikimedia){*<<count|shortcut=#>>}";
    str += "if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>}}";
    const editstr = "<<edit|shortcut=e>>";
    const editOldidStr = `if(oldid){<<editOld|shortcut=e>>|<<revert|shortcut=v|rv>>|<<edit|cur>>}else{${editstr}}`;
    const historystr = "<<history|shortcut=h>>";
    const watchstr = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
    str += `<br>if(talk){${editOldidStr}|<<new|shortcut=+>>*${historystr}*${watchstr}*<b><<article|shortcut=a>></b>|<<editArticle|edit>>}else{${editOldidStr}*${historystr}*${watchstr}*<b><<talk|shortcut=t>></b>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>}`;
    str += "<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>";
    str += "if(admin){<br>}else{*}<<move|shortcut=m>>";
    str += "if(admin){*<<unprotect|unprotectShort>>|<<protect|shortcut=p>>*<<undelete|undeleteShort>>|<<delete|shortcut=d>>}";
    return navlinkStringToHTML(str, x.article, x.params);
};
// fancy：三槽（Title/TopLinks/OtherLinks）各自的 fancy 变体
const fancyPopupTitle = (x: StructureContext): string => navlinkStringToHTML("<font size=+0><<mainlink>></font>", x.article, x.params);
const fancyPopupTopLinks = (x: StructureContext): string => {
    const hist = "<<history|shortcut=h|hist>>|<<lastEdit|shortcut=/|last>>|<<editors|shortcut=E|eds>>";
    const watch = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
    const move = "<<move|shortcut=m|move>>";
    return navlinkStringToHTML(`if(talk){<<edit|shortcut=e>>|<<new|shortcut=+|+>>*${hist}*<<article|shortcut=a>>|<<editArticle|edit>>*${watch}*${move}}else{<<edit|shortcut=e>>*${hist}*<<talk|shortcut=t|>>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>*${watch}*${move}}<br>`, x.article, x.params);
};
const fancyPopupOtherLinks = (x: StructureContext): string => {
    const admin = "<<unprotect|unprotectShort>>|<<protect|shortcut=p>>*<<undelete|undeleteShort>>|<<delete|shortcut=d|del>>";
    let user = "<<contribs|shortcut=c>>if(wikimedia){|<<count|shortcut=#|#>>}";
    user += `if(ipuser){|<<arin>>}else{*<<email|shortcut=E|${popupString("email")}>>}if(admin){*<<block|shortcut=b>>}`;
    const normal = "<<whatLinksHere|shortcut=l|links here>>*<<relatedChanges|shortcut=r|related>>";
    return navlinkStringToHTML(`<br>if(user){${user}*}if(admin){${admin}if(user){<br>}else{*}}${normal}`, x.article, x.params);
};
// fancy2：在 fancy TopLinks 外侧补前导 <br> 并剥掉尾随 <br>（legacy 的
// 字符串手术照搬：replace(/<br>$/i) 只对尾部单个换行标记生效）
const fancy2PopupTopLinks = (x: StructureContext): string => `<br>${fancyPopupTopLinks(x).replace(/<br>$/i, "")}`;
// menus：下拉菜单式 TopLinks；shorter=true 为 shortmenus 的简化变体
const menusPopupTopLinks = (x: StructureContext, shorter?: boolean): string => {
    const s: string[] = [];
    const dropclass = "popup_drop";
    const enddiv = "</div>";
    let hist = "<<history|shortcut=h>>";
    if (!shorter) {
        hist = `<menurow>${hist}|<<historyfeed|rss>>|<<editors|shortcut=E>></menurow>`;
    }
    const lastedit = "<<lastEdit|shortcut=/|show last edit>>";
    const thank = "if(diff){<<thank|send thanks>>}";
    const jsHistory = "<<lastContrib|last set of edits>><<sinceMe|changes since mine>>";
    const linkshere = "<<whatLinksHere|shortcut=l|what links here>>";
    const related = "<<relatedChanges|shortcut=r|related changes>>";
    const search = "<menurow><<search|shortcut=s>>if(wikimedia){|<<globalsearch|shortcut=g|global>>}|<<google|shortcut=G|web>></menurow>";
    const watch = "<menurow><<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>></menurow>";
    const protect = "<menurow><<unprotect|unprotectShort>>|<<protect|shortcut=p>>|<<protectlog|log>></menurow>";
    const del = "<menurow><<undelete|undeleteShort>>|<<delete|shortcut=d>>|<<deletelog|log>></menurow>";
    const move = "<<move|shortcut=m|move page>>";
    const nullPurge = "<menurow><<nullEdit|shortcut=n|null edit>>|<<purge|shortcut=P>></menurow>";
    const viewOptions = "<menurow><<view|shortcut=v>>|<<render|shortcut=S>>|<<raw>></menurow>";
    const editRow = "if(oldid){<menurow><<edit|shortcut=e>>|<<editOld|shortcut=e|this&nbsp;revision>></menurow><menurow><<revert|shortcut=v>>|<<undo>></menurow>}else{<<edit|shortcut=e>>}";
    const markPatrolled = "if(rcid){<<markpatrolled|mark patrolled>>}";
    const newTopic = "if(talk){<<new|shortcut=+|new topic>>}";
    const protectDelete = `if(admin){${protect}${del}}`;
    if (getValueOf("popupActionsMenu")) {
        s.push(`<<mainlink>>*${menuTitle(dropclass, "actions")}`);
    } else {
        s.push(`<div class="${dropclass}"><<mainlink>>`);
    }
    s.push("<menu>");
    s.push(editRow + markPatrolled + newTopic + hist + lastedit + thank);
    if (!shorter) {
        s.push(jsHistory);
    }
    s.push(move + linkshere + related);
    if (!shorter) {
        s.push(nullPurge + search);
    }
    if (!shorter) {
        s.push(viewOptions);
    }
    s.push(`<hr />${watch}${protectDelete}`);
    s.push(`<hr />if(talk){<<article|shortcut=a|view article>><<editArticle|edit article>>}else{<<talk|shortcut=t|talk page>><<editTalk|edit talk>><<newTalk|shortcut=+|new topic>>}</menu>${enddiv}`);
    const email = "<<email|shortcut=E|email user>>";
    const contribs = "if(wikimedia){<menurow>}<<contribs|shortcut=c|contributions>>if(wikimedia){</menurow>}if(admin){<menurow><<deletedContribs>></menurow>}";
    s.push(`if(user){*${menuTitle(dropclass, "user")}`);
    s.push("<menu>");
    s.push("<menurow><<userPage|shortcut=u|user&nbsp;page>>|<<userSpace|space>></menurow>");
    s.push("<<userTalk|shortcut=t|user talk>><<editUserTalk|edit user talk>><<newUserTalk|shortcut=+|leave comment>>");
    if (!shorter) {
        s.push(`if(ipuser){<<arin>>}else{${email}}`);
    } else {
        s.push(`if(ipuser){}else{${email}}`);
    }
    s.push(`<hr />${contribs}<<userlog|shortcut=L|user log>>`);
    s.push("if(wikimedia){<<count|shortcut=#|edit counter>>}");
    s.push("if(admin){<menurow><<unblock|unblockShort>>|<<block|shortcut=b|block user>></menurow>}");
    s.push("<<blocklog|shortcut=B|block log>>");
    s.push(`</menu>${enddiv}}`);
    if (getValueOf("popupSetupMenu") && !x.navpop.hasPopupMenu) {
        x.navpop.hasPopupMenu = true;
        s.push(`*${menuTitle(dropclass, "popupsMenu")}<menu>`);
        s.push("<<togglePreviews|toggle previews>>");
        s.push("<<purgePopups|reset>>");
        s.push("<<disablePopups|disable>>");
        s.push(`</menu>${enddiv}`);
    }
    return navlinkStringToHTML(s.join(""), x.article, x.params);
};
const menuTitle = (dropclass: string, s: string) => {
    const text = popupString(s); // i18n
    const len = text.length;
    return `<div class="${dropclass}" style="--navpop-m-len:${len}ch"><a href="#" noPopup=1>${text}</a>`;
};
// shortmenus：menus 的 shorter=true 变体
const shortmenusPopupTopLinks = (x: StructureContext): string => menusPopupTopLinks(x, true);
// lite：极简结构仅 Title 槽（纯 HTML，不经 DSL）
const litePopupTitle = (x: StructureContext): string => {
    log(`${String(x.article)}: structures.lite.popupTitle`);
    return `<div><span class="popup_mainlink"><b>${String(x.article)}</b></span></div>`;
};

// 注册面：键与 core/structures.ts 各结构 slots 的绑定值一一对应（redir 槽在
// 结构表里复用同一键，故无需重复注册）
registerSlotFiller("original.popupTitle", originalPopupTitle);
registerSlotFiller("original.popupTopLinks", originalPopupTopLinks);
registerSlotFiller("nostalgia.popupTopLinks", nostalgiaPopupTopLinks);
registerSlotFiller("fancy.popupTitle", fancyPopupTitle);
registerSlotFiller("fancy.popupTopLinks", fancyPopupTopLinks);
registerSlotFiller("fancy.popupOtherLinks", fancyPopupOtherLinks);
registerSlotFiller("fancy2.popupTopLinks", fancy2PopupTopLinks);
registerSlotFiller("menus.popupTopLinks", menusPopupTopLinks);
registerSlotFiller("shortmenus.popupTopLinks", shortmenusPopupTopLinks);
registerSlotFiller("lite.popupTitle", litePopupTitle);
