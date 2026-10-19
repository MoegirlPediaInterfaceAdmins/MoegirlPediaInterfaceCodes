import { HC } from "../../src/config/hotcat.ts";
import { applyLocalization } from "../../src/config/i18n.ts";
import { site, state } from "../../src/runtime.ts";
import { changeCategory } from "../../src/wikitext/change.ts";
import { findCategoryWikitext } from "../../src/wikitext/find.ts";
import { autoLocalize, initLocalization, wikiTextBlank, wikiTextBlankOrBidi, wikiTextBlankRE } from "../../src/wikitext/patterns.ts";
import { listCategorys } from "../../src/wikitext/list.ts";
import { capitalize, escapeRE, param, replaceShortcuts, substitute, title, wikiPagePath } from "../../src/util/text.ts";
import { evtKeys, evtKill } from "../../src/util/events.ts";
import { filterAndSortTitles, suggestionConfigs, suggestionEngines } from "../../src/api/suggestions.ts";
import type { SiteConfig } from "../../src/types.ts";

/** 注入站点上下文 */
const configureSite = (conf: SiteConfig, baseUrl: string): void => {
    site.conf = conf;
    site.expandedScriptPrefix = new URL(conf.wgScript, baseUrl).href;
    site.expandedArticlePrefix = new URL(conf.wgArticlePath.replace("$1", ""), baseUrl).href;
};

/** 注入页面源码 */
const setPageText = (text: string | null): void => {
    state.pageText = text;
    state.cleanedText = null;
};

export {
    HC,
    applyLocalization,
    site,
    state,
    changeCategory,
    findCategoryWikitext,
    autoLocalize,
    initLocalization,
    wikiTextBlank,
    wikiTextBlankOrBidi,
    wikiTextBlankRE,
    listCategorys,
    capitalize,
    escapeRE,
    param,
    replaceShortcuts,
    substitute,
    title,
    wikiPagePath,
    evtKeys,
    evtKill,
    filterAndSortTitles,
    suggestionConfigs,
    suggestionEngines,
    configureSite,
    setPageText,
};
