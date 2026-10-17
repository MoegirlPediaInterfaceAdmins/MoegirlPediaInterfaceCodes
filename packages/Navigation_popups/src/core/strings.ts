// 文案表与格式化：popupString 查表链、popupNoTranslation 缺译记录、
// tprintf/simplePrintf（%s 与 $1..$N 双占位符）。
// legacy（.zcode/legacy-src/src/modules/strings.ts + tools.ts 的 simplePrintf）
// 的行为基准照搬；差异点见各处注释。
import { popupStrings } from "../i18n/popupStrings.ts";

// 英文默认串表 = legacy pg.string 全量照搬（键值逐字保留，含
// defaultpopup*Summary 的 enwiki 署名与 popups 链接）。现行萌百表（242 键）
// 覆盖本表全部 216 键，因此该兜底层在缺省数据下不可达——它为未来翻译表
// 删键时提供英文回落（对应测试以合成键锁定此契约）。
export const englishStrings: Record<string, string> = {
    article: "article",
    category: "category",
    categories: "categories",
    image: "image",
    images: "images",
    stub: "stub",
    "section stub": "section stub",
    "Empty page": "Empty page",
    kB: "kB",
    bytes: "bytes",
    day: "day",
    days: "days",
    hour: "hour",
    hours: "hours",
    minute: "minute",
    minutes: "minutes",
    second: "second",
    seconds: "seconds",
    week: "week",
    weeks: "weeks",
    search: "search",
    SearchHint: "Find English Wikipedia articles containing %s",
    web: "web",
    global: "global",
    globalSearchHint: "Search across Wikipedias in different languages for %s",
    googleSearchHint: "Google for %s",
    actions: "actions",
    popupsMenu: "popups",
    togglePreviewsHint: "Toggle preview generation in popups on this page",
    "enable previews": "enable previews",
    "disable previews": "disable previews",
    "toggle previews": "toggle previews",
    "show preview": "show preview",
    reset: "reset",
    "more...": "more...",
    disable: "disable popups",
    disablePopupsHint: "Disable popups on this page. Reload page to re-enable.",
    historyfeedHint: "RSS feed of recent changes to this page",
    purgePopupsHint: "Reset popups, clearing all cached popup data.",
    PopupsHint: "Reset popups, clearing all cached popup data.",
    spacebar: "space",
    view: "view",
    "view article": "view article",
    viewHint: "Go to %s",
    talk: "talk",
    "talk page": "talk page",
    "this&nbsp;revision": "this&nbsp;revision",
    "revision %s of %s": "revision %s of %s",
    "Revision %s of %s": "Revision %s of %s",
    "the revision prior to revision %s of %s": "the revision prior to revision %s of %s",
    "Toggle image size": "Click to toggle image size",
    del: "del",
    "delete": "delete",
    deleteHint: "Delete %s",
    undeleteShort: "un",
    UndeleteHint: "Show the deletion history for %s",
    protect: "protect",
    protectHint: "Restrict editing rights to %s",
    unprotectShort: "un",
    unprotectHint: "Allow %s to be edited by anyone again",
    "send thanks": "send thanks",
    ThanksHint: "Send a thank you notification to this user",
    move: "move",
    "move page": "move page",
    MovepageHint: "Change the title of %s",
    edit: "edit",
    "edit article": "edit article",
    editHint: "Change the content of %s",
    "edit talk": "edit talk",
    "new": "new",
    "new topic": "new topic",
    newSectionHint: "Start a new section on %s",
    "null edit": "null edit",
    nullEditHint: "Submit an edit to %s, making no changes ",
    hist: "hist",
    history: "history",
    historyHint: "List the changes made to %s",
    "History preview failed": "History preview failed :-(",
    last: "prev",
    lastEdit: "lastEdit",
    "mark patrolled": "mark patrolled",
    markpatrolledHint: "Mark this edit as patrolled",
    "Could not marked this edit as patrolled": "Could not marked this edit as patrolled",
    "show last edit": "most recent edit",
    "Show the last edit": "Show the effects of the most recent change",
    lastContrib: "lastContrib",
    "last set of edits": "latest edits",
    lastContribHint: "Show the net effect of changes made by the last editor",
    cur: "cur",
    diffCur: "diffCur",
    "Show changes since revision %s": "Show changes since revision %s",
    "%s old": "%s old",
    oldEdit: "oldEdit",
    purge: "purge",
    purgeHint: "Demand a fresh copy of %s",
    raw: "source",
    rawHint: "Download the source of %s",
    render: "simple",
    renderHint: "Show a plain HTML version of %s",
    "Show the edit made to get revision": "Show the edit made to get revision",
    sinceMe: "sinceMe",
    "changes since mine": "diff my edit",
    sinceMeHint: "Show changes since my last edit",
    "Couldn't find an edit by %s\nin the last %s edits to\n%s": "Couldn't find an edit by %s\nin the last %s edits to\n%s",
    eds: "eds",
    editors: "editors",
    editorListHint: "List the users who have edited %s",
    related: "related",
    relatedChanges: "relatedChanges",
    "related changes": "related changes",
    RecentchangeslinkedHint: "Show changes in articles related to %s",
    editOld: "editOld",
    rv: "rv",
    revert: "revert",
    revertHint: "Revert to %s",
    defaultpopupReviewedSummary: "Accepted by reviewing the [[Special:diff/%s/%s|difference]] between this version and previously accepted version using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupRedlinkSummary: "Removing link to empty page [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupFixDabsSummary: "Disambiguate [[%s]] to [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupFixRedirsSummary: "Redirect bypass from [[%s]] to [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupExtendedRevertSummary: "Revert to revision dated %s by %s, oldid %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupRevertToPreviousSummary: "Revert to the revision prior to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupRevertSummary: "Revert to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupQueriedRevertToPreviousSummary: "Revert to the revision prior to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupQueriedRevertSummary: "Revert to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    defaultpopupRmDabLinkSummary: "Remove link to dab page [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
    Redirects: "Redirects",
    " to ": " to ",
    "Bypass redirect": "Bypass redirect",
    "Fix this redirect": "Fix this redirect",
    disambig: "disambig",
    disambigHint: "Disambiguate this link to [[%s]]",
    "Click to disambiguate this link to:": "Click to disambiguate this link to:",
    "remove this link": "remove this link",
    "remove all links to this page from this article": "remove all links to this page from this article",
    "remove all links to this disambig page from this article": "remove all links to this disambig page from this article",
    mainlink: "mainlink",
    wikiLink: "wikiLink",
    wikiLinks: "wikiLinks",
    "links here": "links here",
    whatLinksHere: "whatLinksHere",
    "what links here": "what links here",
    WhatlinkshereHint: "List the pages that are hyperlinked to %s",
    unwatchShort: "un",
    watchThingy: "watch",
    watchHint: "Add %s to my watchlist",
    unwatchHint: "Remove %s from my watchlist",
    "Only found one editor: %s made %s edits": "Only found one editor: %s made %s edits",
    "%s seems to be the last editor to the page %s": "%s seems to be the last editor to the page %s",
    rss: "rss",
    "Diff truncated for performance reasons": "Diff truncated for performance reasons",
    "Old revision": "Old revision",
    "New revision": "New revision",
    "Something went wrong :-(": "Something went wrong :-(",
    "Empty revision, maybe non-existent": "Empty revision, maybe non-existent",
    "Unknown date": "Unknown date",
    "Empty category": "Empty category",
    "Category members (%s shown)": "Category members (%s shown)",
    "No image links found": "No image links found",
    "File links": "File links",
    "No image found": "No image found",
    "Image from Commons": "Image from Commons",
    "Description page": "Description page",
    "Alt text:": "Alt text:",
    revdel: "Hidden revision",
    user: "user",
    "user&nbsp;page": "user&nbsp;page",
    "user talk": "user talk",
    "edit user talk": "edit user talk",
    "leave comment": "leave comment",
    email: "email",
    "email user": "email user",
    EmailuserHint: "Send an email to %s",
    space: "space",
    PrefixIndexHint: "Show pages in the userspace of %s",
    count: "count",
    "edit counter": "edit counter",
    editCounterLinkHint: "Count the contributions made by %s",
    contribs: "contribs",
    contributions: "contributions",
    deletedContribs: "deleted contributions",
    DeletedcontributionsHint: "List deleted edits made by %s",
    ContributionsHint: "List the contributions made by %s",
    log: "log",
    "user log": "user log",
    userLogHint: "Show %s's user log",
    arin: "ARIN lookup",
    "Look up %s in ARIN whois database": "Look up %s in the ARIN whois database",
    unblockShort: "un",
    block: "block",
    "block user": "block user",
    IpblocklistHint: "Unblock %s",
    BlockipHint: "Prevent %s from editing",
    "block log": "block log",
    blockLogHint: "Show the block log for %s",
    protectLogHint: "Show the protection log for %s",
    pageLogHint: "Show the page log for %s",
    deleteLogHint: "Show the deletion log for %s",
    "Invalid %s %s": "The option %s is invalid: %s",
    "No backlinks found": "No backlinks found",
    " and more": " and more",
    undo: "undo",
    undoHint: "undo this edit",
    "Download preview data": "Download preview data",
    "Invalid or IP user": "Invalid or IP user",
    "Not a registered username": "Not a registered username",
    BLOCKED: "BLOCKED",
    "Has blocks": "Has blocks",
    " edits since: ": " edits since: ",
    "last edit on ": "last edit on ",
    "Enter a non-empty edit summary or press cancel to abort": "Enter a non-empty edit summary or press cancel to abort",
    "Failed to get revision information, please edit manually.\n\n": "Failed to get revision information, please edit manually.\n\n",
    "The %s button has been automatically clicked. Please wait for the next page to load.": "The %s button has been automatically clicked. Please wait for the next page to load.",
    "Could not find button %s. Please check the settings in your javascript file.": "Could not find button %s. Please check the settings in your javascript file.",
    "Open full-size image": "Open full-size image",
    zxy: "zxy",
    autoedit_version: "np20140416",
};

// 缺译记录集合：legacy 在模块顶层即挂 window.popupNoTranslation 并顺带执行
// localStorage 清理；重写版按「模块顶层零副作用」原则由本模块持有集合，
// window 挂载与清理调用都留给装配层（boot）执行。
export const popupNoTranslation = new Set<string>();

// 〔萌百〕旧版曾把缺译记录持久化到 localStorage，此行清理该遗留键。
// legacy 的顶层语句在重写版中函数化，由 boot 装配时调用一次。
export const cleanupLegacyNoTranslationStorage = (): void => {
    localStorage.removeItem("popupNoTranslation");
};

// simplePrintf 自 legacy tools.ts 收入本模块：%s 按出现顺序取参、$N 按
// 1 起下标取参，越界或无效占位符原样保留。legacy 经
// String.prototype.parenSplit（捕获组保留分隔符的古浏览器补丁）分割，
// 现代引擎的原生 split 即同一语义，故不再附带原型补丁。
export const simplePrintf = (str: string, subs: unknown[]): string => {
    if (!str) {
        return str;
    }
    const ret: unknown[] = [];
    const parts = str.split(/(%s|\$[0-9]+)/);
    let i = 0;
    // split 产物为 [文本, 占位符, 文本, ...] 的成对结构，总长必为奇数且
    // 尾部是文本段，故按步长 2 消费 (文本, 占位符) 对、循环外补尾部文本
    for (let k = 0; k + 1 < parts.length; k += 2) {
        ret.push(parts[k]);
        const cmd = parts[k + 1];
        if (cmd === "%s") {
            if (i < subs.length) {
                ret.push(subs[i]);
            } else {
                ret.push(cmd);
            }
            ++i;
        } else {
            // 此分支 cmd 必为 $N；$0 解析得 j=-1，走原样保留
            const j = parseInt(cmd.replace("$", ""), 10) - 1;
            if (j > -1 && j < subs.length) {
                ret.push(subs[j]);
            } else {
                ret.push(cmd);
            }
        }
    }
    ret.push(parts[parts.length - 1]);
    return ret.join("");
};

export const popupString = (str: string): string => {
    // 外部覆盖链：站点/用户脚本可先设 window.popupStrings 整表改写；
    // 与 legacy 一样用 truthy 判定（空串值视同未命中）
    const override = window.popupStrings?.[str];
    if (override) {
        return override;
    }
    const translated = popupStrings[str];
    if (translated) {
        return translated;
    }
    const english = englishStrings[str];
    if (english) {
        return english;
    }
    // legacy 排除条件照搬：autoedit 动作 URL（autoimpl=np20140416&actoken=
    // 是萌百 autoedit 协议参数）与自动拼出的 *Hint 键不是待译文案，不入报告
    if (!popupNoTranslation.has(str) && !str.includes("&autoimpl=np20140416&actoken=") && !str.endsWith("Hint")) {
        popupNoTranslation.add(str);
        console.info("popupNoTranslation", popupNoTranslation);
    }
    return str;
};

export const tprintf = (str: string, subs?: unknown): string => {
    // 标量（含 undefined）包装为单元素数组——legacy 行为：tprintf("x") 的
    // %s 取到 undefined，join 时渲染为空串
    const subList = Array.isArray(subs) ? subs : [subs];
    return simplePrintf(popupString(str), subList);
};
