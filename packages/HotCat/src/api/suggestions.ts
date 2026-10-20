import { HC } from "../config/hotcat.ts";
import { site, state } from "../runtime.ts";
import type { ApiResponse, OpenSearchResponse, TitleList } from "../types.ts";

interface SuggestionEngine {
    /** API 路径，$1 为查询串 */
    uri: string;
    handler: (json: unknown, queryKey?: string) => TitleList | null;
}

const suggestionEngines: Record<string, SuggestionEngine> = {
    opensearch: {
        uri: "/api.php?format=json&action=opensearch&namespace=14&limit=30&search=Category:$1",
        handler: (json, queryKey) => {
            const queryResult = json as OpenSearchResponse | null | undefined;
            const first = queryResult?.[0];
            const second = queryResult?.[1];
            if (typeof first === "string" && Array.isArray(second)) {
                const key = first.substring(first.indexOf(":") + 1);
                const titles = second as TitleList;
                let exists = false;
                state.cat_prefix ??= new RegExp(`^(${HC.category_regexp}):`);
                const catPrefix = state.cat_prefix;
                for (let i = 0; i < titles.length; i++) {
                    catPrefix.lastIndex = 0;
                    const m = catPrefix.exec(titles[i]);
                    if (m && m.length > 1) {
                        titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
                        if (key === titles[i]) {
                            exists = true;
                        }
                    } else {
                        titles.splice(i, 1);
                        i--;
                    }
                }
                titles.exists = exists;
                if (queryKey !== key) {
                    titles.normalized = key;
                }
                return titles;
            }
            return null;
        },
    },
    internalsearch: {
        uri: "/api.php?format=json&action=query&list=allpages&apnamespace=14&aplimit=30&apfrom=$1&apprefix=$1",
        handler: (json) => {
            const queryResult = json as ApiResponse | null;
            if (queryResult && queryResult.query && queryResult.query.allpages) {
                const titles = queryResult.query.allpages.map((page) => page.title) as TitleList;
                for (let i = 0; i < titles.length; i++) {
                    titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
                }
                return titles;
            }
            return null;
        },
    },
    exists: {
        uri: "/api.php?format=json&action=query&prop=info&titles=Category:$1",
        handler: (json, queryKey) => {
            const queryResult = json as ApiResponse | null;
            if (queryResult && queryResult.query && queryResult.query.pages && !queryResult.query.pages[-1]) {
                for (const p in queryResult.query.pages) {
                    const page = queryResult.query.pages[p]!;
                    const title = page.title.substring(page.title.indexOf(":") + 1);
                    const titles: TitleList = [title];
                    titles.exists = true;
                    if (queryKey !== title) {
                        titles.normalized = title;
                    }
                    return titles;
                }
            }
            return null;
        },
    },
    subcategories: {
        uri: "/api.php?format=json&action=query&list=categorymembers&cmtype=subcat&cmlimit=max&cmtitle=Category:$1",
        handler: (json) => {
            const queryResult = json as ApiResponse | null;
            if (queryResult && queryResult.query && queryResult.query.categorymembers) {
                const titles = queryResult.query.categorymembers.map((member) => member.title) as TitleList;
                for (let i = 0; i < titles.length; i++) {
                    titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
                }
                return titles;
            }
            return null;
        },
    },
    parentcategories: {
        uri: "/api.php?format=json&action=query&prop=categories&titles=Category:$1&cllimit=max",
        handler: (json) => {
            const queryResult = json as ApiResponse | null;
            if (queryResult && queryResult.query && queryResult.query.pages) {
                for (const p in queryResult.query.pages) {
                    const page = queryResult.query.pages[p]!;
                    if (page.categories) {
                        const titles = page.categories.map((category) => category.title) as TitleList;
                        for (let i = 0; i < titles.length; i++) {
                            titles[i] = titles[i].substring(titles[i].indexOf(":") + 1);
                        }
                        return titles;
                    }
                }
            }
            return null;
        },
    },
};

interface SuggestionConfig {
    name: string;
    engines: string[];
    cache: Record<string, TitleList | undefined>;
    show: boolean;
    /** 临时方案（子分类 / 父分类） */
    temp: boolean;
    noCompletion: boolean;
}

const suggestionConfigs: Record<string, SuggestionConfig> = {
    searchindex: {
        name: "Search index",
        engines: ["opensearch"],
        cache: {},
        show: true,
        temp: false,
        noCompletion: false,
    },
    pagelist: {
        name: "Page list",
        engines: ["internalsearch", "exists"],
        cache: {},
        show: true,
        temp: false,
        noCompletion: false,
    },
    combined: {
        name: "Combined search",
        engines: ["opensearch", "internalsearch"],
        cache: {},
        show: true,
        temp: false,
        noCompletion: false,
    },
    subcat: {
        name: "Subcategories",
        engines: ["subcategories"],
        cache: {},
        show: true,
        temp: true,
        noCompletion: true,
    },
    parentcat: {
        name: "Parent categories",
        engines: ["parentcategories"],
        cache: {},
        show: true,
        temp: true,
        noCompletion: true,
    },
};

/** 过滤、排序并去重建议列表（原地修改）。 */
const filterAndSortTitles = (titles: TitleList, vNormalized: string): void => {
    const vLow = vNormalized.toLowerCase();
    if (HC.blacklist) {
        for (let i = 0; i < titles.length; i++) {
            if (HC.blacklist.test(titles[i])) {
                titles.splice(i, 1);
                i--;
            }
        }
    }
    titles.sort((a, b) => {
        if (a === b) {
            return 0;
        }
        if (a.indexOf(b) === 0) {
            return 1;
        }
        if (b.indexOf(a) === 0) {
            return -1;
        }
        let prefixMatchA = a.indexOf(vNormalized) === 0 ? 1 : 0;
        let prefixMatchB = b.indexOf(vNormalized) === 0 ? 1 : 0;
        if (prefixMatchA !== prefixMatchB) {
            return prefixMatchB - prefixMatchA;
        }
        const aLow = a.toLowerCase();
        const bLow = b.toLowerCase();
        prefixMatchA = aLow.indexOf(vLow) === 0 ? 1 : 0;
        prefixMatchB = bLow.indexOf(vLow) === 0 ? 1 : 0;
        if (prefixMatchA !== prefixMatchB) {
            return prefixMatchB - prefixMatchA;
        }
        if (a < b) {
            return -1;
        }
        if (b < a) {
            return 1;
        }
        return 0;
    });
    for (let i = 0; i < titles.length; i++) {
        if (i + 1 < titles.length && titles[i] === titles[i + 1] || site.conf.wgNamespaceNumber === 14 && titles[i] === site.conf.wgTitle) {
            titles.splice(i, 1);
            i--;
        }
    }
};

export { suggestionEngines, suggestionConfigs, filterAndSortTitles };
export type { SuggestionEngine, SuggestionConfig };
