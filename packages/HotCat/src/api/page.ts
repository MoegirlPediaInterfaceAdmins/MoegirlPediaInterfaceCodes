import { HC } from "../config/hotcat.ts";
import { site, state } from "../runtime.ts";
import { replaceShortcuts } from "../util/text.ts";
import { getJson } from "./http.ts";
import type { ApiPage, ApiResponse, FailureHandler } from "../types.ts";
import type { CategoryEditor } from "../ui/editor.ts";

/** 把 action=query 响应写入运行时状态。 */
const setPage = (json: ApiResponse | null): void => {
    let startTime: string | null = null;
    if (json && json.query) {
        if (json.query.pages) {
            const page = json.query.pages[!site.conf.wgArticleId ? "-1" : `${site.conf.wgArticleId}`];
            if (page) {
                if (page.revisions && page.revisions.length) {
                    state.pageText = page.revisions[0].slots.main["*"];
                    if (page.revisions[0].timestamp) {
                        state.pageTime = page.revisions[0].timestamp.replace(/\D/g, "");
                    }
                    if (page.revisions[0].revid) {
                        state.pageTextRevId = page.revisions[0].revid;
                    }
                    if (page.revisions.length > 1) {
                        state.conflictingUser = page.revisions[1].user || null;
                    }
                }
                if (page.lastrevid) {
                    state.lastRevId = page.lastrevid;
                }
                if (page.starttimestamp) {
                    startTime = page.starttimestamp.replace(/\D/g, "");
                }
                state.pageWatched = typeof page.watched === "string";
                if (json.query.tokens) {
                    state.editToken = json.query.tokens.csrftoken || null;
                }
                if (page.langlinks && (!json["query-continue"] || !json["query-continue"].langlinks)) {
                    let re = "";
                    for (let i = 0; i < page.langlinks.length; i++) {
                        re += (i > 0 ? "|" : "") + page.langlinks[i].lang.replace(/([\\^$.?*+()])/g, "\\$1");
                    }
                    if (re.length) {
                        state.interlanguageRE = new RegExp(`((^|\\n\\r?)(\\[\\[\\s*(${re})\\s*:[^\\]]+\\]\\]\\s*))+$`);
                    }
                }
            }
        }
        if (json.query.general) {
            if (json.query.general.time && !startTime) {
                startTime = json.query.general.time.replace(/\D/g, "");
            }
            if (HC.capitalizePageNames === null) {
                HC.capitalizePageNames = json.query.general.case === "first-letter";
            }
        }
        state.serverTime = startTime;
        if (json.query.userinfo && json.query.userinfo.options) {
            const options = json.query.userinfo.options;
            state.watchCreate = !HC.dont_add_to_watchlist && options.watchcreations === "1";
            state.watchCreateExpiry = typeof options[" watchcreations-expiry"] === "string" ? options[" watchcreations-expiry"] : "";
            state.watchEdit = !HC.dont_add_to_watchlist && options.watchdefault === "1";
            state.watchDefaultExpiry = typeof options["watchdefault-expiry"] === "string" ? options["watchdefault-expiry"] : "";
            state.minorEdits = options.minordefault === 1;
            if (state.minorEdits) {
                HC.single_minor = true;
            }
        }
    }
};

/** 取源码与令牌，成功后交给 doEdit。 */
const initiateEdit = async (doEdit: (failure: FailureHandler) => void, failure: FailureHandler): Promise<void> => {
    if (state.saveInProgress) {
        return;
    }
    state.saveInProgress = true;
    let oldButtonState = false;
    if (state.commitButton) {
        oldButtonState = state.commitButton.disabled;
        state.commitButton.disabled = true;
    }
    const fail: FailureHandler = (message) => {
        state.saveInProgress = false;
        if (state.commitButton) {
            state.commitButton.disabled = oldButtonState;
        }
        failure(message);
    };
    try {
        const json = await getJson<ApiResponse>(`${site.conf.wgScriptPath}/api.php?format=json&action=query&rawcontinue=&titles=${encodeURIComponent(site.conf.wgPageName)}&prop=info%7Crevisions%7Clanglinks&inprop=watched&rvprop=content%7Ctimestamp%7Cids%7Cuser&lllimit=500&rvslots=main&rvlimit=2&rvdir=newer&rvstartid=${site.conf.wgCurRevisionId}&meta=siteinfo%7Cuserinfo%7Ctokens&type=csrf&uiprop=options`);
        setPage(json);
        doEdit(fail);
    } catch (req) {
        const request = req as {
            status: number;
            statusText: string;
        };
        fail(`${request.status} ${request.statusText}`);
    }
};

/** 回填隐藏状态、图标与解析结果。 */
const resolveOne = (page: ApiPage, toResolve: CategoryEditor[]): void => {
    const cats = page.categories;
    const lks = page.links;
    const is_hidden = Boolean(page.categoryinfo && typeof page.categoryinfo.hidden === "string");
    const is_missing = typeof page.missing === "string";
    const pageTitle = page.title;
    const pageTitleWithoutNs = pageTitle.substring(pageTitle.indexOf(":") + 1);
    let is_dab = false;
    let is_redir = typeof page.redirect === "string";
    let i;
    for (i = 0; i < toResolve.length; i++) {
        if (i && toResolve[i].dabInputCleaned !== pageTitleWithoutNs) {
            continue;
        }
        toResolve[i].currentHidden = is_hidden;
        toResolve[i].inputExists = !is_missing;
        toResolve[i].icon.src = is_missing ? HC.existsNo : HC.existsYes;
    }
    if (is_missing) {
        return;
    }
    if (!is_redir && cats && (HC.disambig_category || HC.redir_category)) {
        for (let c = 0; c < cats.length; c++) {
            let cat = cats[c].title;
            if (cat) {
                cat = cat.substring(cat.indexOf(":") + 1).replace(/_/g, " ");
                if (cat === HC.disambig_category) {
                    is_dab = true;
                    break;
                } else if (cat === HC.redir_category) {
                    is_redir = true;
                    break;
                }
            }
        }
    }
    if (!is_redir && !is_dab) {
        return;
    }
    if (!lks || !lks.length) {
        return;
    }
    const titles: string[] = [];
    for (i = 0; i < lks.length; i++) {
        const linkTitle = lks[i].title;
        if (lks[i].ns === 14 && linkTitle && linkTitle.length) {
            const match = linkTitle.substring(linkTitle.indexOf(":") + 1);
            if (!HC.blacklist || !HC.blacklist.test(match)) {
                titles.push(match);
            }
        }
    }
    if (!titles.length) {
        return;
    }
    for (i = 0; i < toResolve.length; i++) {
        if (i && toResolve[i].dabInputCleaned !== pageTitleWithoutNs) {
            continue;
        }
        toResolve[i].inputExists = true;
        toResolve[i].icon.src = HC.existsYes;
        if (titles.length > 1) {
            toResolve[i].dab = titles;
        } else {
            const currentKey = toResolve[i].currentKey;
            toResolve[i].text.value = titles[0] + (currentKey !== null ? `|${currentKey}` : "");
        }
    }
};

const resolveRedirects = (toResolve: CategoryEditor[], params: ApiResponse | null): void => {
    if (!params || !params.query || !params.query.pages) {
        return;
    }
    for (const p in params.query.pages) {
        resolveOne(params.query.pages[p]!, toResolve);
    }
};

/** 保存前解析分类名：跟随重定向或标记消歧义。 */
const resolveMulti = async (toResolve: CategoryEditor[], callback: (resolved: CategoryEditor[]) => void): Promise<void> => {
    let i;
    for (i = 0; i < toResolve.length; i++) {
        toResolve[i].dab = null;
        toResolve[i].dabInput = toResolve[i].lastInput;
    }
    if (state.noSuggestions) {
        callback(toResolve);
        return;
    }
    let args = `action=query&prop=info%7Clinks%7Ccategories%7Ccategoryinfo&plnamespace=14&pllimit=${toResolve.length * 10}&cllimit=${toResolve.length * 10}&format=json&titles=`;
    for (i = 0; i < toResolve.length; i++) {
        let v = toResolve[i].dabInput;
        v = replaceShortcuts(v, HC.shortcuts);
        toResolve[i].dabInputCleaned = v;
        args += encodeURIComponent(`Category:${v}`);
        if (i + 1 < toResolve.length) {
            args += "%7C";
        }
    }
    try {
        const json = await getJson<ApiResponse>(`${site.conf.wgScriptPath}/api.php?${args}`);
        resolveRedirects(toResolve, json);
        callback(toResolve);
    } catch (req) {
        if (!req) {
            // eslint-disable-next-line require-atomic-updates -- 失败即全站降级
            state.noSuggestions = true;
        }
        callback(toResolve);
    }
};

export { setPage, initiateEdit, resolveOne, resolveRedirects, resolveMulti };
