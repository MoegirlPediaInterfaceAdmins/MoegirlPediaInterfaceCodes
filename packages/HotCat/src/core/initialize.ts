import { HC } from "../config/hotcat.ts";
import { site, state } from "../runtime.ts";
import { hasClass } from "../util/dom.ts";
import { suggestionConfigs } from "../api/suggestions.ts";

/** 转布尔。 */
const toBool = (value: unknown): boolean => Boolean(value);

/** 取字符串配置值。 */
const toText = (value: unknown, fallback: string): string => typeof value === "string" ? value : fallback;

/** 取可交给 parseInt 的字符串。 */
const toNumberSource = (value: unknown): string => typeof value === "string" ? value : typeof value === "number" ? `${value}` : "";

/** 编辑页旧接口面（document.editform）。 */
interface LegacyEditForm {
    wpTextbox1?: HTMLInputElement;
    wpSummary?: HTMLInputElement;
    wpAutoSummary?: HTMLInputElement;
}

const getEditForm = (): LegacyEditForm | undefined => (document as unknown as { editform?: LegacyEditForm }).editform;

const configValue = (key: string): unknown => window.JSconfig?.keys?.[key];

/** 应用站点级配置覆盖。 */
const initialize = (): void => {
    HC.dont_add_to_watchlist = window.hotcat_dont_add_to_watchlist !== undefined ? toBool(window.hotcat_dont_add_to_watchlist) : configValue("HotCatDontAddToWatchlist") !== undefined ? toBool(configValue("HotCatDontAddToWatchlist")) : HC.dont_add_to_watchlist;
    HC.no_autocommit = window.hotcat_no_autocommit !== undefined ? toBool(window.hotcat_no_autocommit) : configValue("HotCatNoAutoCommit") !== undefined ? toBool(configValue("HotCatNoAutoCommit")) : site.conf.wgNamespaceNumber % 2 ? true : HC.no_autocommit;
    HC.del_needs_diff = window.hotcat_del_needs_diff !== undefined ? toBool(window.hotcat_del_needs_diff) : configValue("HotCatDelNeedsDiff") !== undefined ? toBool(configValue("HotCatDelNeedsDiff")) : HC.del_needs_diff;
    HC.suggest_delay = Number(window.hotcat_suggestion_delay || configValue("HotCatSuggestionDelay") || HC.suggest_delay);
    HC.editbox_width = Number(window.hotcat_editbox_width || configValue("HotCatEditBoxWidth") || HC.editbox_width);
    const suggestions = window.hotcat_suggestions || configValue("HotCatSuggestions") || HC.suggestions;
    HC.suggestions = typeof suggestions === "string" ? suggestions : "combined";
    if (!Reflect.has(suggestionConfigs, HC.suggestions)) {
        HC.suggestions = "combined";
    }
    HC.fixed_search = window.hotcat_suggestions_fixed !== undefined ? toBool(window.hotcat_suggestions_fixed) : configValue("HotCatFixedSuggestions") !== undefined ? toBool(configValue("HotCatFixedSuggestions")) : HC.fixed_search;
    HC.single_minor = window.hotcat_single_changes_are_minor !== undefined ? toBool(window.hotcat_single_changes_are_minor) : configValue("HotCatMinorSingleChanges") !== undefined ? toBool(configValue("HotCatMinorSingleChanges")) : HC.single_minor;
    HC.bg_changed = toText(window.hotcat_changed_background || configValue("HotCatChangedBackground"), HC.bg_changed);
    HC.use_up_down = window.hotcat_use_category_links !== undefined ? toBool(window.hotcat_use_category_links) : configValue("HotCatUseCategoryLinks") !== undefined ? toBool(configValue("HotCatUseCategoryLinks")) : HC.use_up_down;
    HC.listSize = parseInt(toNumberSource(window.hotcat_list_size || configValue("HotCatListSize") || HC.listSize), 10);
    if (site.conf.wgDBname !== "commonswiki") {
        HC.changeTag = toText(configValue("HotCatChangeTag"), "");
    }
    if (HC.changeTag) {
        const eForm = getEditForm();
        const catRegExp = new RegExp(`^\\[\\[(${HC.category_regexp}):`);
        let oldTxt: string | undefined;
        const isMinorChange = (): boolean => {
            const newTxt = eForm?.wpTextbox1;
            if (!newTxt) {
                return false;
            }
            const newText = newTxt.value;
            const oldLines = oldTxt?.match(/^.*$/gm) ?? [];
            const newLines = newText.match(/^.*$/gm) ?? [];
            const except = (aArr: string[], bArr: string[]): string[] => {
                const result: string[] = [];
                let lArr: string[];
                let sArr: string[];
                if (aArr.length < bArr.length) {
                    lArr = bArr;
                    sArr = aArr;
                } else {
                    lArr = aArr;
                    sArr = bArr;
                }
                for (let i = 0; i < lArr.length; i++) {
                    const item = lArr[i];
                    const ind = sArr.indexOf(item);
                    if (ind === -1) {
                        result.push(item);
                    } else {
                        sArr.splice(ind, 1);
                    }
                }
                return result.concat(sArr);
            };
            let cArr = except(oldLines, newLines);
            if (cArr.length) {
                cArr = cArr.filter((_c) => {
                    const c = _c.trim();
                    return Boolean(c) && !catRegExp.test(c);
                });
            }
            if (!cArr.length) {
                oldTxt = newText;
                return true;
            }
            return false;
        };
        const wpSummary = eForm?.wpSummary;
        const wpAutoSummary = eForm?.wpAutoSummary;
        const wpTextbox1 = eForm?.wpTextbox1;
        if (site.conf.wgAction === "submit" && site.conf.wgArticleId && wpSummary && wpAutoSummary && wpTextbox1 && document.getElementById("wikiDiff")) {
            const sum = wpSummary;
            const sumA = wpAutoSummary;
            if (sum.value && sumA.value === HC.changeTag) {
                sumA.value = sumA.value.replace(HC.changeTag, "d41d8cd98f00b204e9800998ecf8427e");
                const $ct = $('<input type="hidden" name="wpChangeTags">').val(HC.changeTag);
                $(eForm).append($ct);
                oldTxt = wpTextbox1.value;
                $("#wpSave").one("click", () => {
                    if ($ct.val()) {
                        sum.value = sum.value.replace(HC.messages.using || HC.messages.prefix, "");
                    }
                });
                const removeChangeTag = (): void => {
                    $(wpTextbox1).add(sum).one("input", () => {
                        window.setTimeout(() => {
                            if (!isMinorChange()) {
                                $ct.val("");
                            } else {
                                removeChangeTag();
                            }
                        }, 500);
                    });
                };
                removeChangeTag();
            }
        }
    }
    if (isNaN(HC.listSize) || HC.listSize < 5) {
        HC.listSize = 5;
    }
    HC.listSize = Math.min(HC.listSize, 30);
    for (const key in HC.engine_names) {
        if (Reflect.has(suggestionConfigs, key) && HC.engine_names[key]) {
            suggestionConfigs[key].name = HC.engine_names[key];
        }
    }
    let isRtl = hasClass(document.body, "rtl");
    if (!isRtl) {
        isRtl = document.defaultView!.getComputedStyle(document.body, null).getPropertyValue("direction") === "rtl";
    }
    state.is_rtl = isRtl;
};

export { initialize };
