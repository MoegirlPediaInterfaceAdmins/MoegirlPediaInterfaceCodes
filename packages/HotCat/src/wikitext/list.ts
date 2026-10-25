import { HC } from "../config/hotcat.ts";
import { state } from "../runtime.ts";
import { wikiTextBlankOrBidi } from "./patterns.ts";
import { stripCommentsAndNowiki } from "./strip.ts";
import type { WikitextMatchEntry } from "../types.ts";

interface CategoryList extends Array<WikitextMatchEntry> {
    re?: RegExp;
}

const listCategorys = (): CategoryList => {
    if (state.pageText === null) {
        return [];
    }
    if (state.cleanedText === null) {
        state.cleanedText = stripCommentsAndNowiki(state.pageText);
    }
    const cat_regex = new RegExp(`\\[\\[${wikiTextBlankOrBidi}(${HC.category_regexp})${wikiTextBlankOrBidi}:${wikiTextBlankOrBidi}([^\\[\\]]+?)${wikiTextBlankOrBidi}(\\|.*?)?\\]\\]`, "g");

    const result: CategoryList = [];
    let curr_match: RegExpExecArray | null;
    while ((curr_match = cat_regex.exec(state.cleanedText)) !== null) {
        result.push({
            match: curr_match,
        });
    }
    result.re = cat_regex;
    return result; // An array containing all matches, with positions, in result[ i ].match
};

export { listCategorys };
export type { CategoryList };
