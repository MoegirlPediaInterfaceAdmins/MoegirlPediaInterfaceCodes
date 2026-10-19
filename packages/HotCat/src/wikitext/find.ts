import { HC } from "../config/hotcat.ts";
import { site } from "../runtime.ts";
import { escapeRE } from "../util/text.ts";
import { wikiTextBlank, wikiTextBlankOrBidi, wikiTextBlankRE, replaceByBlanks } from "./patterns.ts";
import type { CategoryMatchEntry, CategoryMatchList, JsonContent, OnceMatch, WikitextMatchList } from "../types.ts";

/** 分类名的规范化形式。 */
const prefixedCategoryName = (name: string): string => {
    const title = mw.Title.newFromText(`category:${name}`);
    if (!title) {
        throw new TypeError(`Invalid category title: ${name}`);
    }
    return title.getPrefixedText();
};

function findCategoryJson(jsontext: string, category: string, once: true): CategoryMatchEntry | null;
function findCategoryJson(jsontext: string, category: string, once?: false): CategoryMatchList;
function findCategoryJson(jsontext: string, category: string, once?: boolean): CategoryMatchEntry | CategoryMatchList | null {
    let jsonData: JsonContent;
    try {
        jsonData = JSON.parse(jsontext) as JsonContent;
    } catch (err) {
        console.error("Invalid JSON in find_category_json:", err);
        return once ? null : [];
    }
    if (!Array.isArray(jsonData.mediawikiCategories)) {
        return once ? null : [];
    }
    const matches: CategoryMatchList = [];
    const targetCategoryName = prefixedCategoryName(category);

    for (let i = 0; i < jsonData.mediawikiCategories.length; i++) {
        const catObj = jsonData.mediawikiCategories[i];
        const currentCategoryName = prefixedCategoryName(catObj.name);
        if (currentCategoryName === targetCategoryName) {
            const match: [string, string, string] = [
                "",
                "",
                catObj.sort || "",
            ];
            if (once) {
                return { match };
            }
            matches.push({ match });
        }
    }
    return once ? null : matches;
}

function findCategoryWikitext(wikitext: string, category: string, once: true): RegExpExecArray | null;
function findCategoryWikitext(wikitext: string, category: string, once?: false): WikitextMatchList;
function findCategoryWikitext(wikitext: string, category: string, once?: boolean): RegExpExecArray | WikitextMatchList | null {
    let cat_regex: RegExp;
    if (HC.template_categories[category]) {
        cat_regex = new RegExp(`\\{\\{${wikiTextBlankOrBidi}(${HC.template_regexp}(?=${wikiTextBlankOrBidi}:))?${wikiTextBlankOrBidi}(?:${HC.template_categories[category]})${wikiTextBlankOrBidi}(\\|.*?)?\\}\\}`, "g");
    } else {
        const cat_name = escapeRE(category);
        const initial = cat_name.charAt(0);
        cat_regex = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(${HC.category_regexp})${wikiTextBlankOrBidi}:${wikiTextBlankOrBidi}${initial === "\\" || !HC.capitalizePageNames ? initial : `[${initial.toUpperCase()}${initial.toLowerCase()}]`}${cat_name.substring(1).replace(wikiTextBlankRE, wikiTextBlank)}${wikiTextBlankOrBidi}(\\|.*?)?\\]\\]`, "g");
    }
    if (once) {
        return cat_regex.exec(wikitext);
    }
    const copiedtext = wikitext.replace(/<!--(\s|\S)*?-->/g, replaceByBlanks).replace(/<nowiki>(\s|\S)*?<\/nowiki>/g, replaceByBlanks);
    const result: WikitextMatchList = [];
    let curr_match: RegExpExecArray | null;
    while ((curr_match = cat_regex.exec(copiedtext)) !== null) {
        result.push({
            match: curr_match,
        });
    }
    result.re = cat_regex;
    return result;
}

/** 按内容模型分派。 */
function findCategory(text: string, category: string, once: true): OnceMatch | null;
function findCategory(text: string, category: string, once?: false): CategoryMatchList;
function findCategory(text: string, category: string, once?: boolean): OnceMatch | CategoryMatchList | null {
    const isJson = HC.jsonContentModels.includes(site.conf.wgPageContentModel);
    if (once) {
        return isJson ? findCategoryJson(text, category, true) : findCategoryWikitext(text, category, true);
    }
    return isJson ? findCategoryJson(text, category) : findCategoryWikitext(text, category);
}

export { prefixedCategoryName, findCategoryJson, findCategoryWikitext, findCategory };
