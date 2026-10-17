// wiki 基址 fixtures：按 legacy init.ts 的 setTitleBase/setMainRegex/
// setRegexps/setMisc 公式构造 title 域的 wiki 状态（events/集成测试共用）。
// 捕获序契约：wiki.re.main 的组1=前缀、组2=title、组3=锚点
// （Title.fromURL 按 m[2]/m[3] 取值，前缀组必须是捕获组）。
import type { MockMw } from "./mockMw.ts";
import type * as TitleNs from "../../src/title/title.ts";
import type * as NamespacesNs from "../../src/title/namespaces.ts";

// namespace import 不能直接作类型（TS2709），先经 typeof 取模块类型
type Title = typeof TitleNs;
type Namespaces = typeof NamespacesNs;

export const SITEBASE = "zh.moegirl.org.cn";
export const TITLEBASE = `https://${SITEBASE}/index.php?title=`;

// legacy init.ts fetchSpecialPageNames 取回的萌百 specialpagealiases 子集
export const SPECIAL_PAGE_ALIASES: { realname: string; aliases: string[] }[] = [
    { realname: "Contributions", aliases: ["Contributions", "贡献"] },
    { realname: "Diff", aliases: ["diff"] },
    { realname: "Emailuser", aliases: ["Emailuser"] },
    { realname: "Whatlinkshere", aliases: ["Whatlinkshere"] },
];

export const buildTitleWikiFixtures = (mw: MockMw, wiki: Title["wiki"], nsMod: Namespaces): void => {
    const esc = mw.util.escapeRegExp;
    nsMod.setNamespaces();
    const sp = nsMod.nsRe(nsMod.nsState.specialId);
    const userRe = nsMod.nsRe(nsMod.nsState.userId);
    wiki.titlebase = TITLEBASE;
    const articleBase = `https://${SITEBASE}`;
    wiki.re.basenames = RegExp(`^(${esc(TITLEBASE)}|${esc(articleBase)})`);
    const articlePath = String(mw.config.get("wgArticlePath")).replace(/\/\$1/, "");
    const preTitles = `(?:${esc(String(mw.config.get("wgScript")))}|${esc(String(mw.config.get("wgScriptPath")))}/(?:index[.]php|wiki[.]phtml))`;
    wiki.re.main = RegExp(`[^:]*://${esc(SITEBASE)}(${preTitles}[?]title=|${esc(`${articlePath}/`)})` + "([^&?#]*)[^#]*(?:#(.+))?");
    wiki.re.urlNoPopup = RegExp(`((title=|/)${sp}(?:%3A|:)|section=[0-9]|^#$)`);
    const buildSpecialPageGroup = (realname: string, aliases: readonly string[]): string => {
        const variants = [esc(realname), esc(encodeURI(realname))];
        for (const alias of aliases) {
            variants.push(esc(alias), esc(encodeURI(alias)));
        }
        return variants.join("|");
    };
    for (const { realname, aliases } of SPECIAL_PAGE_ALIASES) {
        const group = buildSpecialPageGroup(realname, aliases);
        if (realname === "Contributions") {
            wiki.re.contribs = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${group})(&target=|/|/${userRe}:)(.*)`, "i");
        } else if (realname === "Diff") {
            wiki.re.specialdiff = RegExp(`/${sp}(?:%3A|:)(?:${group})/([^?#]*)`, "i");
        } else if (realname === "Emailuser") {
            wiki.re.email = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${group})(&target=|/|/(?:${userRe})?:)(.*)`, "i");
        } else if (realname === "Whatlinkshere") {
            wiki.re.backlinks = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${group})(&target=|/)([^&]*)`, "i");
        }
    }
    wiki.misc.decodeExtras = [
        { from: "%2C", to: "," },
        { from: "_", to: " " },
        { from: "%24", to: "$" },
        { from: "%26", to: "&" },
    ];
};
