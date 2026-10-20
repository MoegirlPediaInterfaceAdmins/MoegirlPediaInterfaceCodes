import { HC } from "../config/hotcat.ts";
import { site } from "../runtime.ts";

/** 读取 URL 查询参数；`uri` 省略时用当前地址 */
const param = (name: string, uri?: string): string | null => {
    const target = uri || location.href;
    const re = new RegExp(`[&?]${name}=([^&#]*)`);
    const m = re.exec(target);
    return m ? decodeURIComponent(m[1]) : null;
};

/** 把站内链接还原为页面名；不属于本站的链接返回 null */
const title = (href: string | null | undefined): string | null => {
    if (!href) {
        return null;
    }
    // href="/w/index.php?title=..."
    if (href.indexOf(site.expandedScriptPrefix) === 0) {
        return param("title", href);
    }
    // href="/wiki/..."
    if (href.indexOf(site.expandedArticlePrefix) === 0) {
        return decodeURIComponent(href.slice(site.expandedArticlePrefix.length));
    }

    return null;
};

const capitalize = (str: string): string => str.slice(0, 1).toUpperCase() + str.slice(1);

/** 页面名 → 站内路径（保留冒号与斜杠，其余百分号编码） */
const wikiPagePath = (pageName: string): string => site.conf.wgArticlePath.replace("$1", encodeURIComponent(pageName).replace(/%3A/g, ":").replace(/%2F/g, "/"));

const escapeRE = (str: string): string => str.replace(/([\\^$.?*+()[\]])/g, "\\$1");

type SubstituteValue = string | number | ((match: string, key: string) => string | undefined) | null | undefined;

/** 占位符表。 */
type SubstituteMap = Record<string, SubstituteValue>;

interface SubstituteOptions {
    /** 指示符，默认 `$` */
    indicator?: string;
    /** 花括号，默认 `{}` */
    lbrace?: string;
    rbrace?: string;
}

/** 生成占位符替换器。 */
const substituteFactory = (_options?: SubstituteOptions): (str: string, map: SubstituteMap | null) => string => {
    const options = _options || {};
    const lead = options.indicator || "$";
    const indicator = escapeRE(lead);
    const lbrace = escapeRE(options.lbrace || "{");
    const rbrace = escapeRE(options.rbrace || "}");
    const re = new RegExp(`(?:${indicator}(${indicator}))|(?:${indicator}(\\d+))|(?:${indicator}(?:${lbrace}([^${lbrace}${rbrace}]+)${rbrace}))|(?:${indicator}(?!(?:[${indicator}${lbrace}]|\\d))(\\S+?)\\b)`, "g");
    return (str, map) => {
        if (!map) {
            return str;
        }
        return str.replace(re, (match, prefix: string | undefined, idx: string | undefined, key: string | undefined, alpha: string | undefined) => {
            if (prefix === lead) {
                return lead;
            }
            const k = alpha || key || idx || "";
            const value = map[k];
            const replacement = typeof value === "function" ? value(match, k) : value;
            return typeof replacement === "string" ? replacement : String(replacement || match);
        });
    };
};

const substitute = substituteFactory();

const replaceHash = substituteFactory({
    indicator: "#",
    lbrace: "[",
    rbrace: "]",
});

/** 快捷键替换。 */
const replaceShortcuts = (str: string, map: SubstituteMap | null): string => {
    const s = replaceHash(str, map);
    return HC.capitalizePageNames ? capitalize(s) : s;
};

export { param, title, capitalize, wikiPagePath, escapeRE, substituteFactory, substitute, replaceShortcuts };
export type { SubstituteValue, SubstituteMap, SubstituteOptions };
