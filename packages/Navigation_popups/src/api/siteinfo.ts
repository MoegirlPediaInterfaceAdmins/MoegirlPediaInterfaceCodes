// siteinfo 域：站点元数据与基址装配（setSiteInfo/setTitleBase/setRegexps）、
// specialpagealiases 拉取（萌百定制 uselang=content&maxage=3600）、用户巡查
// 权（popupReview）、mw.Api 单例（Api-User-Agent，与 downloader 头同源）。
// 行为基准 = legacy init.ts（commit 02c8dec）。
//
// 与 legacy 的结构差异：pg.wiki/pg.re 的动态域拆为 siteState（本模块自持）
// 与 title.wiki（正则与 titlebase——title 域的既有容器，由本模块装配写入）；
// setupPopups 的编排序列归 boot.ts（阶段 5），本模块只提供各 setter。
import { setDownloaderUserAgent } from "../net/downloader.ts";
import { getValueOf } from "../core/options.ts";
import { nsRe, nsReImage, nsState } from "../title/namespaces.ts";
import { wiki } from "../title/title.ts";

export interface SpecialPageAlias {
    realname: string;
    aliases: string[];
}

// legacy pg.wiki 的站点元数据面（titlebase 家族在装配后亦写入 title.wiki）
export interface SiteState {
    hostname: string;
    wikimedia: boolean;
    wikia: boolean;
    isLocal: boolean;
    commons: string | null;
    lang: string;
    sitebase: string;
    articlePath: string;
    botInterfacePath: string;
    APIPath: string;
    titlebase: string;
    wikibase: string;
    apiwikibase: string;
    articlebase: string;
    commonsbase: string;
    apicommonsbase: string;
    specialpagealiases: SpecialPageAlias[];
}

export const siteState: SiteState = {
    hostname: "",
    wikimedia: false,
    wikia: false,
    isLocal: false,
    commons: null,
    lang: "",
    sitebase: "",
    articlePath: "",
    botInterfacePath: "",
    APIPath: "",
    titlebase: "",
    wikibase: "",
    apiwikibase: "",
    articlebase: "",
    commonsbase: "",
    apicommonsbase: "",
    specialpagealiases: [],
};

// legacy pg.user 的运行时面（canReview 供 diff 域的巡查链接判定）
export const userState: { canReview: boolean } = { canReview: false };

export const setSiteInfo = (): void => {
    if (window.popupLocalDebug) {
        siteState.hostname = "en.wikipedia.org";
    } else {
        siteState.hostname = location.hostname;
    }
    siteState.wikimedia = /(wiki([pm]edia|source|books|news|quote|versity|species|voyage|data)|metawiki|wiktionary|mediawiki)[.]org/.test(siteState.hostname);
    siteState.wikia = /[.]wikia[.]com$/i.test(siteState.hostname);
    siteState.isLocal = siteState.hostname.startsWith("localhost");
    siteState.commons = siteState.wikimedia && siteState.hostname !== "commons.wikimedia.org" ? "commons.wikimedia.org" : null;
    siteState.lang = mw.config.get("wgContentLanguage");
    const port = location.port ? `:${location.port}` : "";
    siteState.sitebase = siteState.hostname + port;
};

export const setTitleBase = (): void => {
    const protocol = window.popupLocalDebug ? "http:" : location.protocol;
    siteState.articlePath = mw.config.get("wgArticlePath").replace(/\/\$1/, "");
    siteState.botInterfacePath = mw.config.get("wgScript");
    siteState.APIPath = `${mw.config.get("wgScriptPath")}/api.php`;
    const titletail = `${siteState.botInterfacePath}?title=`;
    siteState.titlebase = `${protocol}//${siteState.sitebase}${titletail}`;
    siteState.wikibase = `${protocol}//${siteState.sitebase}${siteState.botInterfacePath}`;
    siteState.apiwikibase = `${protocol}//${siteState.sitebase}${siteState.APIPath}`;
    siteState.articlebase = `${protocol}//${siteState.sitebase}${siteState.articlePath}`;
    siteState.commonsbase = `${protocol}//${String(siteState.commons)}${siteState.botInterfacePath}`;
    siteState.apicommonsbase = `${protocol}//${String(siteState.commons)}${siteState.APIPath}`;
    wiki.titlebase = siteState.titlebase;
    const esc = mw.util.escapeRegExp;
    wiki.re.basenames = RegExp(`^(${esc(siteState.titlebase)}|${esc(siteState.articlebase)})`);
};

const setMainRegex = (): void => {
    const reStart = "[^:]*://";
    const esc = mw.util.escapeRegExp;
    let preTitles = `(?:${esc(mw.config.get("wgScript"))}|${esc(mw.config.get("wgScriptPath"))}/(?:index[.]php|wiki[.]phtml))`;
    preTitles += `[?]title=|${esc(`${siteState.articlePath}/`)}`;
    const reEnd = `(${preTitles})([^&?#]*)[^#]*(?:#(.+))?`;
    wiki.re.main = RegExp(reStart + esc(siteState.sitebase) + reEnd);
};

const buildSpecialPageGroup = (specialPageObj: SpecialPageAlias): string => {
    const variants: string[] = [];
    const esc = mw.util.escapeRegExp;
    variants.push(esc(specialPageObj.realname), esc(encodeURI(specialPageObj.realname)));
    for (const alias of specialPageObj.aliases) {
        variants.push(esc(alias), esc(encodeURI(alias)));
    }
    return variants.join("|");
};

export const setRegexps = (): void => {
    setMainRegex();
    const sp = nsRe(nsState.specialId);
    wiki.re.urlNoPopup = RegExp(`((title=|/)${sp}(?:%3A|:)|section=[0-9]|^#$)`);
    for (const specialpage of siteState.specialpagealiases) {
        if (specialpage.realname === "Contributions") {
            wiki.re.contribs = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${buildSpecialPageGroup(specialpage)})(&target=|/|/${nsRe(nsState.userId)}:)(.*)`, "i");
        } else if (specialpage.realname === "Diff") {
            wiki.re.specialdiff = RegExp(`/${sp}(?:%3A|:)(?:${buildSpecialPageGroup(specialpage)})/([^?#]*)`, "i");
        } else if (specialpage.realname === "Emailuser") {
            wiki.re.email = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${buildSpecialPageGroup(specialpage)})(&target=|/|/(?:${nsRe(nsState.userId)}:)?)(.*)`, "i");
        } else if (specialpage.realname === "Whatlinkshere") {
            wiki.re.backlinks = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${buildSpecialPageGroup(specialpage)})(&target=|/)([^&]*)`, "i");
        }
    }
    const im = nsReImage();
    wiki.re.image = RegExp(`(^|\\[\\[)${im}: *([^|\\]]*[^|\\] ])([^0-9\\]]*([0-9]+) *px)?|(?:\\n *[|]?|[|]) *(${getValueOf("popupImageVarsRegexp") as string}) *= *(?:\\[\\[ *)?(?:${im}:)?([^|]*?)(?:\\]\\])? *[|]? *\\n`, "img");
    wiki.re.imageBracketCount = 6;
    wiki.re.category = RegExp(`\\[\\[${nsRe(nsState.categoryId)}: *([^|\\]]*[^|\\] ]) *`, "i");
    wiki.re.categoryBracketCount = 1;
    wiki.re.ipUser = RegExp("^(?::(?::|(?::[0-9A-Fa-f]{1,4}){1,7})|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6}::|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){7})|(((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9]))$");
    wiki.re.stub = RegExp(getValueOf("popupStubRegexp") as string, "im");
    wiki.re.disambig = RegExp(getValueOf("popupDabRegexp") as string, "im");
    wiki.re.oldid = /[?&]oldid=([^&]*)/;
    wiki.re.diff = /[?&]diff=([^&]*)/;
};

// 萌百定制：uselang=content（别名取内容语文名而非界面语）+ maxage=3600
// （specialpagealiases 变动极少，走浏览器/API 缓存）
export const fetchSpecialPageNames = async (): Promise<void> => {
    const params = {
        action: "query",
        meta: "siteinfo",
        siprop: "specialpagealiases",
        formatversion: 2,
        uselang: "content",
        maxage: 3600,
    };
    const data = (await getMwApi().get(params)) as { query: { specialpagealiases: SpecialPageAlias[] } };
    siteState.specialpagealiases = data.query.specialpagealiases;
};

export const setUserInfo = async (): Promise<void> => {
    const params = {
        action: "query",
        list: "users",
        ususers: mw.config.get("wgUserName") ?? "",
        usprop: "rights",
    };
    userState.canReview = false;
    if (getValueOf("popupReview")) {
        const data = (await getMwApi().get(params)) as { query: { users: { rights: string[] }[] } };
        userState.canReview = data.query.users[0].rights.includes("review");
    }
};

// legacy pg.api.client 单例；Api-User-Agent 同步注入 downloader 的 XHR 头
let apiClient: mw.Api | null = null;

export const getMwApi = (): mw.Api => {
    if (!apiClient) {
        const userAgent = `Navigation popups/1.0 (${mw.config.get("wgServerName")})`;
        setDownloaderUserAgent(userAgent);
        apiClient = new mw.Api({
            ajax: {
                headers: {
                    "Api-User-Agent": userAgent,
                },
            },
        });
    }
    return apiClient;
};
