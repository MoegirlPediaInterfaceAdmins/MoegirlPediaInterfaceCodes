import { HC } from "../config/hotcat.ts";
import { site, state } from "../runtime.ts";
import { make, findByClass } from "../util/dom.ts";
import { evtKill } from "../util/events.ts";
import { title, wikiPagePath } from "../util/text.ts";
import { wikiTextBlankRE } from "../wikitext/patterns.ts";
import { stripCommentsAndNowiki } from "../wikitext/strip.ts";
import { findCategoryWikitext } from "../wikitext/find.ts";
import { listCategorys } from "../wikitext/list.ts";
import { CategoryEditor } from "./editor.ts";
import { checkMultiInput, setMultiInput } from "./multi.ts";
import { setPage } from "../api/page.ts";
import { getJsonCallback } from "../api/http.ts";
import type { ApiResponse, CommitForm } from "../types.ts";

/** 取分类栏容器。 */
const getCatLine = (): HTMLElement | null => site.skin === "moeskin" ? document.getElementById("catlinks") : document.getElementById("mw-normal-catlinks");

/** 还原分类名。 */
const getTitle = (span: Element): string | null => {
    if (span.firstChild?.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }
    let catTitle = title((span.firstChild as HTMLAnchorElement).href);
    if (!catTitle) {
        return null;
    }
    catTitle = catTitle.substring(catTitle.indexOf(":") + 1).replace(/_/g, " ");
    if (HC.blacklist && HC.blacklist.test(catTitle)) {
        return null;
    }
    return catTitle;
};

/** 关闭所有展开中的表单。 */
const closeForm = (): void => {
    for (let i = 0; i < state.editors.length; i++) {
        const edit = state.editors[i];
        if (edit.state === CategoryEditor.OPEN) {
            edit.cancel();
        } else if (edit.state === CategoryEditor.CHANGE_PENDING) {
            edit.sanitizeInput();
            const value = edit.text.value.split("|");
            let key: string | null = null;
            if (value.length > 1) {
                key = value[1];
            }
            const v = value[0].replace(/_/g, " ").replace(/^\s+|\s+$/g, "");
            if (!v.length) {
                edit.cancel();
            } else {
                edit.currentCategory = v;
                edit.currentKey = key;
                edit.currentExists = edit.inputExists;
                edit.close();
            }
        }
    }
};

/** 建立编辑器集合。 */
const createEditors = (_line: HTMLElement, is_hidden: boolean, has_hidden: boolean, chkCats: string[], inpIndex: Record<string, number>): Element | null => {
    let line = _line;
    let i;
    let cats: HTMLCollectionOf<Element> = line.getElementsByTagName("li");
    if (cats.length) {
        state.newDOM = true;
        line = cats[0].parentNode as HTMLElement;
    } else {
        cats = line.getElementsByTagName("span");
    }
    const copyCats: Element[] = [];
    // 键名来自页面分类链接（页面内容可控），用 Map 存放使写入不经过属性名，避免触达对象原型（CodeQL #227）
    const idxCopys = new Map<string, number>();
    let sTitle;
    for (i = 0; i < cats.length; i++) {
        copyCats[i] = cats[i];
        sTitle = getTitle(copyCats[i]);
        if (sTitle) {
            idxCopys.set(sTitle, i);
        }
    }
    const inpageCats = listCategorys();
    for (i = 0; i < inpageCats.length; i++) {
        let normalized = inpageCats[i].match[2].replace(wikiTextBlankRE, " ");
        if (HC.capitalizePageNames) {
            normalized = normalized.charAt(0).toUpperCase() + normalized.substring(1);
        }
        if (idxCopys.has(normalized)) {
            new CategoryEditor(line, copyCats[idxCopys.get(normalized)!] as HTMLElement, inpageCats[i].match[2], inpageCats[i].match[3], is_hidden);
            if (is_hidden && Reflect.has(inpIndex, normalized)) {
                chkCats.splice(chkCats.indexOf(`${HC.category_canonical}:${normalized}`), 1);
                Reflect.deleteProperty(inpIndex, normalized);
            }
        } else if (!is_hidden) {
            chkCats.push(`${HC.category_canonical}:${normalized}`);
            inpIndex[normalized] = i;
        }
    }
    if (chkCats.length && (!is_hidden && !has_hidden || is_hidden)) {
        const arg_titles = chkCats.join("|");
        getJsonCallback<ApiResponse>(`${site.conf.wgServer}${site.conf.wgScriptPath}/api.php?action=query&format=json&titles=${encodeURIComponent(arg_titles)}&redirects=1&converttitles=1`, (json) => {
            let converted = json.query && json.query.converted;
            if (!converted || converted.length < chkCats.length) {
                console.log(arg_titles);
            }
            if (!converted) {
                converted = [];
            }
            for (i = 0; i < converted.length; i++) {
                const sTitle = converted[i].to.replace(`${HC.category_canonical}:`, "");
                const sOrginal = inpIndex[converted[i].from.replace(`${HC.category_canonical}:`, "")];
                if (idxCopys.has(sTitle)) {
                    new CategoryEditor(line, copyCats[idxCopys.get(sTitle)!] as HTMLElement, [inpageCats[sOrginal].match[2], sTitle], inpageCats[sOrginal].match[3], is_hidden);
                } else {
                    console.log(sTitle);
                }
            }
        });
    }
    return copyCats.length ? copyCats[copyCats.length - 1] : null;
};

/** 装配分类栏与隐藏分类。 */
const setup = (additionalWork?: () => void): void => {
    if (state.initialized) {
        return;
    }
    state.initialized = true;
    if (state.setupTimeout) {
        window.clearTimeout(state.setupTimeout);
        state.setupTimeout = null;
    }
    state.catLine ||= getCatLine();
    const hiddenCats = site.skin === "moeskin" ? document.querySelector(".mw-catlinks-hidden")?.parentElement ?? null : document.getElementById("mw-hidden-catlinks");
    if (!state.catLine) {
        let footer: Element | null = null;
        if (!hiddenCats) {
            footer = findByClass(document, "div", "printfooter");
            if (!footer) {
                return;
            }
        }
        state.catLine = make("div");
        state.catLine.id = "mw-normal-catlinks";
        state.catLine.style.textAlign = state.is_rtl ? "right" : "left";
        const label = make("a");
        label.href = site.conf.wgArticlePath.replace("$1", "Special:Categories");
        label.title = HC.categories;
        label.appendChild(make(HC.categories, true));
        state.catLine.appendChild(label);
        state.catLine.appendChild(make(":", true));
        let container = hiddenCats ? hiddenCats.parentNode as HTMLElement : getCatLine();
        if (!container) {
            container = make("div");
            container.id = "catlinks";
            footer?.parentNode?.insertBefore(container, footer.nextSibling);
        }
        container.className = "catlinks noprint";
        container.style.display = "";
        if (!hiddenCats) {
            container.appendChild(state.catLine);
        } else {
            container.insertBefore(state.catLine, hiddenCats);
        }
    }
    if (state.is_rtl) {
        state.catLine.dir = "rtl";
    }
    const catLine = state.catLine;
    const chkCats: string[] = [];
    const inpIndex: Record<string, number> = {};
    const lastSpan = createEditors(catLine, false, Boolean(hiddenCats), chkCats, inpIndex);
    const catList = catLine.getElementsByTagName("ul")[0] as HTMLElement | undefined;
    new CategoryEditor(state.newDOM && catList ? catList : catLine, null, null, lastSpan !== null, false);
    if (!state.onUpload) {
        if (state.pageText !== null && hiddenCats) {
            if (state.is_rtl) {
                hiddenCats.dir = "rtl";
            }
            createEditors(hiddenCats, true, true, chkCats, inpIndex);
        }
        const enableMulti = make("span");
        enableMulti.className = "noprint";
        if (state.is_rtl) {
            enableMulti.dir = "rtl";
        }
        catLine.insertBefore(enableMulti, catLine.firstChild?.nextSibling ?? null);
        enableMulti.appendChild(make("\u00A0", true));
        state.multiSpan = make("span");
        enableMulti.appendChild(state.multiSpan);
        state.multiSpan.innerHTML = `(<a>${HC.addmulti}</a>)`;
        const lk = state.multiSpan.getElementsByTagName("a")[0];
        lk.onclick = (evt) => {
            setMultiInput();
            checkMultiInput();
            return evtKill(evt);
        };
        lk.title = HC.multi_tooltip;
        lk.style.cursor = "pointer";
    }
    state.cleanedText = null;
    additionalWork?.();
    mw.hook("hotcat.ready").fire();
    $("body").trigger("hotcatSetupCompleted");
};

/** 上传页装配。 */
const setupUpload = (): void => {
    state.onUpload = true;
    const ip = document.getElementById("mw-htmlform-description") || document.getElementById("wpDestFile");
    if (!ip) {
        return;
    }
    const reupload = document.getElementById("wpForReUpload") as HTMLInputElement | null;
    const destFile = document.getElementById("wpDestFile") as HTMLInputElement | null;
    if (reupload && Boolean(reupload.value) || destFile && (destFile.disabled || destFile.readOnly)) {
        return;
    }
    const labelCell = make("td");
    const lineCell = make("td");
    const catLine = make("div");
    catLine.className = "catlinks";
    catLine.id = "catlinks";
    catLine.style.textAlign = state.is_rtl ? "right" : "left";
    catLine.style.margin = "0";
    catLine.style.border = "none";
    lineCell.appendChild(catLine);
    state.catLine = catLine;
    let label: Node | null = null;
    if (window.UFUI && window.UIElements && window.UFUI.getLabel instanceof Function) {
        try {
            label = window.UFUI.getLabel("wpCategoriesUploadLbl");
        } catch {
            label = null;
        }
    }
    if (!label) {
        labelCell.id = "hotcatLabel";
        labelCell.appendChild(make(HC.categories, true));
    } else {
        labelCell.id = "hotcatLabelTranslated";
        labelCell.appendChild(label);
    }
    labelCell.className = "mw-label";
    labelCell.style.textAlign = "right";
    labelCell.style.verticalAlign = "middle";
    const form = (document.getElementById("upload") || document.getElementById("mw-upload-form")) as HTMLFormElement | null;
    const table = ip as HTMLTableElement;
    if (form && typeof table.insertRow === "function") {
        const newRow = table.insertRow(-1);
        newRow.appendChild(labelCell);
        newRow.appendChild(lineCell);
        form.onsubmit = ((oldSubmit: ((...args: unknown[]) => boolean) | null) => (...args: unknown[]): boolean => {
            let do_submit = true;
            if (oldSubmit) {
                do_submit = oldSubmit.bind(form)(...args);
            }
            if (!do_submit) {
                return false;
            }
            closeForm();
            const eb = (document.getElementById("wpUploadDescription") || document.getElementById("wpDesc")) as HTMLTextAreaElement;
            let addedOne = false;
            for (let i = 0; i < state.editors.length; i++) {
                const t = state.editors[i].currentCategory;
                if (!t) {
                    continue;
                }
                const key = state.editors[i].currentKey;
                const new_cat = `[[${HC.category_canonical}:${t}${key ? `|${key}` : ""}]]`;
                // 剥注释与 nowiki 后再判断分类是否已存在，否则注释里的分类会被误判为已存在而漏写
                const cleanedText = stripCommentsAndNowiki(eb.value);
                if (!findCategoryWikitext(cleanedText, t, true)) {
                    eb.value += `\n${new_cat}`;
                    addedOne = true;
                }
            }
            if (addedOne) {
                eb.value = eb.value.replace(/\{\{subst:unc\}\}/g, "");
            }
            return true;
        })(form.onsubmit as unknown as ((...args: unknown[]) => boolean) | null);
    }
};

/** 建立隐藏提交表单。 */
const createCommitForm = (): void => {
    if (state.commitForm) {
        return;
    }
    const format = "text/x-wiki";
    const formContainer = make("div");
    formContainer.style.display = "none";
    document.body.appendChild(formContainer);
    formContainer.innerHTML = `<form id="hotcatCommitForm" method="post" enctype="multipart/form-data" action="${site.conf.wgScript}?title=${encodeURIComponent(site.conf.wgPageName)}&action=submit"><input type="hidden" name="wpTextbox1"><input type="hidden" name="model" value="${site.conf.wgPageContentModel}"><input type="hidden" name="format" value="${format}"><input type="hidden" name="wpSummary" value=""><input type="checkbox" name="wpMinoredit" value="1"><input type="checkbox" name="wpWatchthis" value="1"><input type="hidden" name="wpWatchlistExpiry" value=""><input type="hidden" name="wpAutoSummary" value="d41d8cd98f00b204e9800998ecf8427e"><input type="hidden" name="wpEdittime"><input type="hidden" name="wpStarttime"><input type="hidden" name="wpDiff" value="wpDiff"><input type="hidden" name="oldid" value="0"><input type="hidden" name="wpIgnoreBlankSummary" value="1"><input type="submit" name="hcCommit" value="hcCommit"><input type="hidden" name="wpEditToken"><input type="hidden" name="wpUltimateParam" value="1"><input type="hidden" name="wpChangeTags"><input type="hidden" value="ℳ𝒲♥𝓊𝓃𝒾𝒸ℴ𝒹ℯ" name="wpUnicodeCheck"></form>`;
    state.commitForm = document.getElementById("hotcatCommitForm") as unknown as CommitForm | null;
};

/** 取页面源码。 */
const getPage = (): void => {
    if (!site.conf.wgArticleId) {
        if (site.conf.wgNamespaceNumber === 2) {
            return;
        }
        state.pageText = "";
        state.pageTime = null;
        setup(createCommitForm);
    } else {
        const url = `${site.conf.wgScriptPath}/api.php?format=json&callback=HotCat.start&action=query&rawcontinue=&titles=${encodeURIComponent(site.conf.wgPageName)}&prop=info%7Crevisions&rvprop=content%7Ctimestamp%7Cids&meta=siteinfo&rvslots=main&rvlimit=1&rvstartid=${site.conf.wgCurRevisionId}`;
        getJsonCallback<ApiResponse>(url.replace("&callback=HotCat.start", ""), (json) => {
            setPage(json);
            setup(createCommitForm);
        });
        state.setupTimeout = window.setTimeout(() => {
            setup(createCommitForm);
        }, 4e3);
    }
};

/** 用逐行文本替换当前编辑器集合。 */
const setState = (value: string): null => {
    const cats = value.split("\n");
    const catLine = state.catLine;
    if (state.initialized && state.editors.length === 1 && state.editors[0].isAddCategory && catLine) {
        const newSpans: { element: HTMLElement; title: string; key: string | null }[] = [];
        const before = state.editors[0].span;
        let i;
        for (i = 0; i < cats.length; i++) {
            if (!cats[i].length) {
                continue;
            }
            const parts = cats[i].split("|");
            const key = parts.length > 1 ? parts[1] : null;
            const cat = parts[0];
            const lk = make("a");
            lk.href = wikiPagePath(`${HC.category_canonical}:${cat}`);
            lk.appendChild(make(cat, true));
            lk.title = cat;
            const span = make("span");
            span.appendChild(lk);
            if (!i) {
                catLine.insertBefore(make(" ", true), before);
            }
            catLine.insertBefore(span, before);
            if (i + 1 < cats.length) {
                catLine.insertBefore(make(" | ", true), before);
            }
            newSpans.push({
                element: span,
                title: cat,
                key: key,
            });
        }
        before.parentNode?.insertBefore(make(" | ", true), before);
        for (i = 0; i < newSpans.length; i++) {
            new CategoryEditor(catLine, newSpans[i].element, newSpans[i].title, newSpans[i].key);
        }
    }
    return null;
};

/** 当前编辑器集合的逐行快照。 */
const getState = (): string | null => getStateWikitext();

const getStateWikitext = (): string | null => {
    let result: string | null = null;
    for (let i = 0; i < state.editors.length; i++) {
        let text = state.editors[i].currentCategory;
        const key = state.editors[i].currentKey;
        if (text.length) {
            if (key !== null) {
                text += `|${key}`;
            }
            if (result === null) {
                result = text;
            } else {
                result += `\n${text}`;
            }
        }
    }
    return result;
};

export { closeForm, setup, setupUpload, createCommitForm, getPage, setState, getState };
