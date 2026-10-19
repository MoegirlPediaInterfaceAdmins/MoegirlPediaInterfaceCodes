import { HC } from "../config/hotcat.ts";
import { site, state } from "../runtime.ts";
import { substitute } from "../util/text.ts";
import { findCatsRE, replaceByBlanks } from "./patterns.ts";
import { findCategoryWikitext, prefixedCategoryName } from "./find.ts";
import type { ChangeResult, JsonContent, WikitextMatchList } from "../types.ts";

const changeCategory = (_wikitext: string, toRemove: string | null | undefined, toAdd: string | null | undefined, key: string | null | undefined, is_hidden: boolean): ChangeResult => {
    if (HC.jsonContentModels.includes(site.conf.wgPageContentModel)) {
        return changeCategoryJson(_wikitext, toRemove, toAdd, key);
    }
    return changeCategoryWikitext(_wikitext, toRemove, toAdd, key, is_hidden);
};

/** JSON 内容模型。 */
const changeCategoryJson = (jsontext: string, toRemove: string | null | undefined, toAdd: string | null | undefined, key: string | null | undefined): ChangeResult => {
    try {
        const jsonData = JSON.parse(jsontext) as JsonContent;
        if (!jsonData.mediawikiCategories) {
            jsonData.mediawikiCategories = [];
        }

        const summary: string[] = [];

        if (toRemove) {
            const initialLength = jsonData.mediawikiCategories.length;
            const normalizedToRemoveName = prefixedCategoryName(toRemove);
            jsonData.mediawikiCategories = jsonData.mediawikiCategories.filter((cat) => prefixedCategoryName(cat.name) !== normalizedToRemoveName);

            if (jsonData.mediawikiCategories.length < initialLength) {
                summary.push(HC.messages.cat_removed.replace(/\$1/g, toRemove));
            }
        }

        if (toAdd) {
            const normalizedToAddName = prefixedCategoryName(toAdd);
            const exists = jsonData.mediawikiCategories.some((cat) => prefixedCategoryName(cat.name) === normalizedToAddName);

            if (!exists) {
                jsonData.mediawikiCategories.push({
                    name: toAdd,
                    sort: key || "",
                });
                summary.push(HC.messages.cat_added.replace(/\$1/g, toAdd));
            } else if (key) {
                for (let i = 0; i < jsonData.mediawikiCategories.length; i++) {
                    const cat = jsonData.mediawikiCategories[i];
                    if (prefixedCategoryName(cat.name) === normalizedToAddName && (!cat.sort || cat.sort !== key)) {
                        cat.sort = key;
                        summary.push(HC.messages.cat_keychange.replace(/\$1/g, toAdd).replace(/\$2/g, key));
                        break;
                    }
                }
            }
        }

        return {
            text: JSON.stringify(jsonData, null, 2),
            summary: summary,
            error: null,
        };
    } catch (e) {
        return {
            text: jsontext,
            summary: [],
            error: `Failed to modify JSON categories: ${e instanceof Error ? e.message : String(e)}`,
        };
    }
};

/** wikitext 内容模型。 */
const changeCategoryWikitext = (_wikitext: string, toRemove: string | null | undefined, toAdd: string | null | undefined, _key: string | null | undefined, is_hidden: boolean): ChangeResult => {
    let key = _key;
    let wikitext = _wikitext;
    const find_insertionpoint = (text: string): { idx: number; onCat: boolean } => {
        const copiedtext = text.replace(/<!--(\s|\S)*?-->/g, replaceByBlanks).replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, replaceByBlanks);
        let index = -1;
        findCatsRE.lastIndex = 0;
        while (findCatsRE.exec(copiedtext) !== null) {
            index = findCatsRE.lastIndex;
        }
        if (index < 0) {
            let match: RegExpExecArray | null;
            if (!state.interlanguageRE) {
                match = /((^|\n\r?)(\[\[\s*(([a-z]{2,3}(-[a-z]+)*)|simple|tokipona)\s*:[^\]]+\]\]\s*))+$/.exec(copiedtext);
            } else {
                match = state.interlanguageRE.exec(copiedtext);
            }
            if (match) {
                index = match.index;
            }
            return {
                idx: index,
                onCat: false,
            };
        }
        return {
            idx: index,
            onCat: index >= 0,
        };
    };
    const summary: string[] = [];
    const nameSpace = HC.category_canonical;
    const keyChange = Boolean(toRemove && toAdd && toRemove === toAdd && toAdd.length);
    let cat_point = -1;
    let matches: WikitextMatchList | null;
    if (key) {
        key = `|${key}`;
    }
    if (toRemove && toRemove.length) {
        matches = findCategoryWikitext(wikitext, toRemove);
        if (!matches.length) {
            return {
                text: wikitext,
                summary: summary,
                error: HC.messages.cat_notFound.replace(/\$1/g, toRemove),
            };
        }
        let before = wikitext.substring(0, matches[0].match.index);
        let after = wikitext.substring(matches[0].match.index + matches[0].match[0].length);
        if (matches.length > 1) {
            if (matches.re) {
                matches.re.lastIndex = 0;
                after = after.replace(matches.re, "");
            }
        }
        if (toAdd) {
            if (key === null) {
                key = matches[0].match[2];
            }
        }
        let i = before.length - 1;
        while (i >= 0 && before.charAt(i) !== "\n" && before.charAt(i).search(/\s/) >= 0) {
            i--;
        }
        let j = 0;
        while (j < after.length && after.charAt(j) !== "\n" && after.charAt(j).search(/\s/) >= 0) {
            j++;
        }
        if (i >= 0 && before.charAt(i) === "\n" && (!after.length || j < after.length && after.charAt(j) === "\n")) {
            i--;
        }
        if (i >= 0) {
            before = before.substring(0, i + 1);
        } else {
            before = "";
        }
        if (j < after.length) {
            after = after.substring(j);
        } else {
            after = "";
        }
        if (before.length && before.charAt(before.length - 1).search(/\S/) >= 0 && after.length && after.charAt(0).search(/\S/) >= 0) {
            before += " ";
        }
        cat_point = before.length;
        if (cat_point === 0 && after.length && after.charAt(0) === "\n") {
            after = after.substring(1);
        }
        wikitext = before + after;
        if (!keyChange) {
            if (HC.template_categories[toRemove]) {
                summary.push(HC.messages.template_removed.replace(/\$1/g, toRemove));
            } else {
                summary.push(HC.messages.cat_removed.replace(/\$1/g, toRemove));
            }
        }
    }
    if (toAdd && toAdd.length) {
        matches = findCategoryWikitext(wikitext, toAdd);
        if (matches.length) {
            return {
                text: wikitext,
                summary: summary,
                error: HC.messages.cat_exists.replace(/\$1/g, toAdd),
            };
        }
        let onCat: boolean;
        if (cat_point < 0) {
            const point = find_insertionpoint(wikitext);
            cat_point = point.idx;
            onCat = point.onCat;
        } else {
            onCat = true;
        }
        const newcatstring = `[[${nameSpace}:${toAdd}${key || ""}]]`;
        if (cat_point >= 0) {
            const suffix = wikitext.substring(cat_point);
            wikitext = wikitext.substring(0, cat_point) + (cat_point > 0 ? "\n" : "") + newcatstring + (!onCat ? "\n" : "");
            if (suffix.length && suffix.charAt(0) !== "\n") {
                wikitext += `\n${suffix}`;
            } else {
                wikitext += suffix;
            }
        } else {
            if (wikitext.length && wikitext.charAt(wikitext.length - 1) !== "\n") {
                wikitext += "\n";
            }
            wikitext += (wikitext.length ? "\n" : "") + newcatstring;
        }
        if (keyChange) {
            let k = key || "";
            if (k.length) {
                k = k.substring(1);
            }
            summary.push(substitute(HC.messages.cat_keychange, { 1: toAdd, 2: k }));
        } else {
            summary.push(HC.messages.cat_added.replace(/\$1/g, toAdd));
        }
        if (HC.uncat_regexp && !is_hidden) {
            const txt = wikitext.replace(HC.uncat_regexp, "");
            if (txt.length !== wikitext.length) {
                wikitext = txt;
                summary.push(HC.messages.uncat_removed);
            }
        }
    }
    return {
        text: wikitext,
        summary: summary,
        error: null,
    };
};

export { changeCategory, changeCategoryJson, changeCategoryWikitext };
