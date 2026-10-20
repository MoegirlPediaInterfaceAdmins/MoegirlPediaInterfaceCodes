import { HC } from "../config/hotcat.ts";
import { site } from "../runtime.ts";

const wikiTextBlank = "[\\t _\\xA0\\u1680\\u180E\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]+";
const wikiTextBlankRE = new RegExp(wikiTextBlank, "g");
const wikiTextBlankOrBidi = "[\\t _\\xA0\\u1680\\u180E\\u2000-\\u200B\\u200E\\u200F\\u2028-\\u202F\\u205F\\u3000]*";

/** 生成命名空间别名的匹配片段。 */
const autoLocalize = (namespaceNumber: number, _fallback: string): string => {
    const formattedNamespaces = site.conf.wgFormattedNamespaces;
    const namespaceIds = site.conf.wgNamespaceIds;
    let fallback = _fallback;
    const createRegexpStr = (name: string): string => {
        if (!name || !name.length) {
            return "";
        }
        let regex_name = "";
        for (let i = 0; i < name.length; i++) {
            const initial = name.charAt(i);
            const ll = initial.toLowerCase();
            const ul = initial.toUpperCase();
            if (ll === ul) {
                regex_name += initial;
            } else {
                regex_name += `[${ll}${ul}]`;
            }
        }
        return regex_name.replace(/([\\^$.?*+()])/g, "\\$1").replace(wikiTextBlankRE, wikiTextBlank);
    };
    fallback = fallback.toLowerCase();
    const canonical = formattedNamespaces[`${namespaceNumber}`].toLowerCase();
    let regexp = createRegexpStr(canonical);
    if (fallback && canonical !== fallback) {
        regexp += `|${createRegexpStr(fallback)}`;
    }
    for (const cat_name in namespaceIds) {
        if (cat_name.toLowerCase() !== canonical && cat_name.toLowerCase() !== fallback && namespaceIds[cat_name] === namespaceNumber) {
            regexp += `|${createRegexpStr(cat_name)}`;
        }
    }
    return regexp;
};

/** 分类链接定位正则。 */
let findCatsRE: RegExp;

/** 写入 HC 正则并编译 findCatsRE。 */
const initLocalization = (): void => {
    const formattedNamespaces = site.conf.wgFormattedNamespaces;
    HC.category_canonical = formattedNamespaces["14"];
    HC.category_regexp = autoLocalize(14, "category");
    if (formattedNamespaces["10"]) {
        HC.template_regexp = autoLocalize(10, "template");
    }
    findCatsRE = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(?:${HC.category_regexp})${wikiTextBlankOrBidi}:[^\\]]+\\]\\]`, "g");
};

/** 用等长空白替换匹配段。 */
const replaceByBlanks = (match: string): string => match.replace(/(\s|\S)/g, " ");

export { wikiTextBlank, wikiTextBlankRE, wikiTextBlankOrBidi, autoLocalize, findCatsRE, initLocalization, replaceByBlanks };
