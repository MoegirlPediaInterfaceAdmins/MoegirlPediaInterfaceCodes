import { site, state } from "../../runtime.ts";
import { ajaxGetJson } from "../../api/http.ts";
import { suggestionConfigs, suggestionEngines, type SuggestionEngine } from "../../api/suggestions.ts";
import type { TitleList } from "../../types.ts";
import type { CategoryEditor } from "../editor.ts";

/** 建议请求的批次状态。 */
interface SuggestionCallback {
    allTitles: TitleList | null;
    callsMade: number;
    nofCalls: number;
    noCompletion: boolean;
    engineName: string;
    exists?: boolean;
    normalized?: string;
    dontCache?: boolean;
    cancelled?: boolean;
}

/** 依次向各引擎发出建议请求；全部返回后回填缓存并显示建议。 */
const fireSuggestionRequests = (editor: CategoryEditor, engines: string[], cb: SuggestionCallback, v: string, cleanKey: string): void => {
    const makeCall = (url: string, engine: SuggestionEngine): void => {
        ajaxGetJson<unknown>(url, {
            success: (json) => {
                const titles = engine.handler(json, cleanKey);
                if (titles && titles.length) {
                    if (cb.allTitles === null) {
                        cb.allTitles = titles;
                    } else {
                        cb.allTitles = cb.allTitles.concat(titles);
                    }
                    if (titles.exists) {
                        cb.exists = true;
                    }
                    if (titles.normalized) {
                        cb.normalized = titles.normalized;
                    }
                }
            },
            error: (req) => {
                if (!req) {
                    state.noSuggestions = true;
                }
                cb.dontCache = true;
            },
            complete: () => {
                cb.callsMade++;
                if (cb.callsMade === cb.nofCalls) {
                    const allTitles = cb.allTitles ?? [];
                    if (cb.exists) {
                        allTitles.exists = true;
                    }
                    if (cb.normalized) {
                        allTitles.normalized = cb.normalized;
                    }
                    if (!cb.dontCache && !suggestionConfigs[cb.engineName].cache[cleanKey]) {
                        suggestionConfigs[cb.engineName].cache[cleanKey] = allTitles;
                    }
                    editor.text.readOnly = false;
                    if (!cb.cancelled) {
                        editor.showSuggestions(allTitles, cb.noCompletion, v, cb.engineName);
                    }
                    if (cb === editor.callbackObj) {
                        editor.callbackObj = null;
                    }
                }
            },
        });
    };
    for (let j = 0; j < engines.length; j++) {
        const engine = suggestionEngines[engines[j]];
        const url = `${site.conf.wgScriptPath}${engine.uri.replace(/\$1/g, encodeURIComponent(cleanKey))}`;
        makeCall(url, engine);
    }
};

export { fireSuggestionRequests };
export type { SuggestionCallback };
