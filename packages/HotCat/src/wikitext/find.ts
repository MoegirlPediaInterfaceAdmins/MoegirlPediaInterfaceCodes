import { HC } from "../config/hotcat.ts";
import { escapeRE } from "../util/text.ts";
import { wikiTextBlank, wikiTextBlankOrBidi, wikiTextBlankRE } from "./patterns.ts";
import { blankCommentsAndNowiki } from "./strip.ts";
import type { WikitextMatchEntry, WikitextMatchList } from "../types.ts";

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
    const copiedtext = blankCommentsAndNowiki(wikitext);
    const result: WikitextMatchEntry[] = [];
    let curr_match: RegExpExecArray | null;
    while ((curr_match = cat_regex.exec(copiedtext)) !== null) {
        result.push({
            match: curr_match,
        });
    }
    return Object.assign(result, { re: cat_regex });
}

export { findCategoryWikitext };
