import { HC } from "../config/hotcat.ts";
import { site, state } from "../runtime.ts";
import { make, hasClass, forceRedraw } from "../util/dom.ts";
import { capitalize, replaceShortcuts, wikiPagePath } from "../util/text.ts";
import { evtKeys, evtKill, DOWN, ESC, PGDOWN, PGUP, UP } from "../util/events.ts";
import { wikiTextBlankRE } from "../wikitext/patterns.ts";
import { filterAndSortTitles, suggestionConfigs } from "../api/suggestions.ts";
import { initiateEdit, resolveMulti } from "../api/page.ts";
import { performChanges } from "../api/summary.ts";
import { checkMultiInput, makeActive, setMultiInput, showDab } from "./multi.ts";
import { alertError } from "./dialogs.ts";
import { getSelectionRange, setSelectionRange } from "./editor/selection.ts";
import { position, scrollOffset, viewport } from "../util/layout.ts";
import { buildForm } from "./editor/form.ts";
import { fireSuggestionRequests, type SuggestionCallback } from "./editor/suggest.ts";
import type { TitleList } from "../types.ts";

class CategoryEditor {
    static UNCHANGED = 0;
    static OPEN = 1;
    static CHANGE_PENDING = 2;
    static CHANGED = 3;
    static DELETED = 4;

    callbackObj: SuggestionCallback | null = null;

    isAddCategory!: boolean;
    originalCategory!: string;
    originalKey!: string | null;
    originalExists!: boolean;
    originalHidden!: boolean;
    line!: HTMLElement;
    engine!: string;
    span!: HTMLElement;
    currentCategory!: string;
    currentExists!: boolean;
    currentHidden!: boolean;
    currentKey!: string | null;
    state!: number;
    lastSavedState!: number;
    lastSavedCategory!: string;
    lastSavedKey!: string | null;
    lastSavedExists!: boolean;
    lastSavedHidden!: boolean;

    linkSpan!: HTMLElement;
    normalLinks!: HTMLElement;
    undelLink: HTMLElement | null = null;
    catLink: HTMLAnchorElement | null = null;
    undoLink: HTMLElement | null = null;
    upDownLinks?: HTMLElement;

    form: HTMLFormElement | null = null;
    text!: HTMLInputElement;
    icon!: HTMLImageElement;
    list: HTMLSelectElement | null = null;
    engineSelector?: HTMLSelectElement;
    ok!: HTMLInputElement;
    cancelButton!: HTMLInputElement;

    ime?: boolean;
    lastKey?: number;
    usesComposition?: boolean;
    keyCount?: number;
    is_active?: boolean;
    lastInput!: string;
    lastRealInput!: string;
    inputExists!: boolean;
    lastSelection?: { start: number; end: number };
    showsList = false;
    noCommit?: boolean;
    originalState?: number;
    dab?: string[] | null;
    dabInput!: string;
    dabInputCleaned!: string;
    engineName: string | null | undefined = null;
    lastQuery: string | null | undefined = null;

    /**
     * @param line 分类栏容器
     * @param _span 已有分类的 span；为空表示创建「+」入口
     * @param _after 分类名或 [原名, 转换后名]；新建入口时为插入锚点
     * @param key 已有分类时为 `|index`；新建入口时为 true 表示带分隔符插入
     */
    constructor(line: HTMLElement, _span: HTMLElement | null, _after: HTMLElement | string[] | string | null, key?: string | boolean | null, is_hidden = false) {
        let span = _span;
        const after = _after;
        if (!span) {
            let afterNode: Node | null = after as HTMLElement | null;
            this.isAddCategory = true;
            this.originalCategory = "";
            this.originalKey = null;
            this.originalExists = false;
            if (!state.newDOM) {
                span = make("span");
                span.className = "noprint";
                if (key) {
                    span.appendChild(make(" | ", true));
                    if (afterNode) {
                        afterNode.parentNode?.insertBefore(span, afterNode.nextSibling);
                        afterNode = afterNode.nextSibling;
                    } else {
                        line.appendChild(span);
                    }
                } else if (line.firstChild) {
                    span.appendChild(make(" ", true));
                    line.appendChild(span);
                }
            }
            this.linkSpan = make("span");
            this.linkSpan.className = "noprint nopopups hotcatlink";
            const lk = make("a");
            lk.href = "#catlinks";
            lk.onclick = this.open.bind(this);
            lk.appendChild(make(HC.links.add, true));
            lk.title = HC.tooltips.add;
            this.linkSpan.appendChild(lk);
            span = make(state.newDOM ? "li" : "span");
            span.className = "noprint";
            if (state.is_rtl) {
                span.dir = "rtl";
            }
            span.appendChild(this.linkSpan);
            if (afterNode) {
                afterNode.parentNode?.insertBefore(span, afterNode.nextSibling);
            } else {
                line.appendChild(span);
            }
            this.undelLink = null;
            this.catLink = null;
        } else {
            if (state.is_rtl) {
                span.dir = "rtl";
            }
            this.isAddCategory = false;
            this.catLink = span.firstChild as HTMLAnchorElement;
            this.originalCategory = Array.isArray(after) ? after[0] : typeof after === "string" ? after : "";
            this.originalKey = typeof key === "string" && key.length > 1 ? key.substring(1) : null;
            this.originalExists = !hasClass(this.catLink, "new");
            this.makeLinkSpan();
            if (!this.originalExists && this.upDownLinks) {
                this.upDownLinks.style.display = "none";
            }
            span.appendChild(this.linkSpan);
        }
        this.originalHidden = is_hidden;
        this.line = line;
        this.engine = HC.suggestions;
        this.span = span;
        this.currentCategory = !this.isAddCategory && Array.isArray(after) ? after[1] : this.originalCategory;
        this.currentExists = this.originalExists;
        this.currentHidden = this.originalHidden;
        this.currentKey = this.originalKey;
        this.state = CategoryEditor.UNCHANGED;
        this.lastSavedState = CategoryEditor.UNCHANGED;
        this.lastSavedCategory = this.currentCategory;
        this.lastSavedKey = this.originalKey;
        this.lastSavedExists = this.originalExists;
        this.lastSavedHidden = this.originalHidden;
        if (this.catLink && this.currentKey) {
            this.catLink.title = this.currentKey;
        }
        state.editors[state.editors.length] = this;
    }

    /** 创建操作链接，返回 normalLinks 容器。 */
    makeLinkSpan(): HTMLElement {
        const normalLinks = make("span");
        this.normalLinks = normalLinks;
        let lk;
        if (this.originalCategory && this.originalCategory.length) {
            lk = make("a");
            lk.href = "#catlinks";
            lk.onclick = this.remove.bind(this);
            lk.appendChild(make(HC.links.remove, true));
            lk.title = HC.tooltips.remove;
            this.normalLinks.appendChild(make(" ", true));
            this.normalLinks.appendChild(lk);
        }
        if (!HC.template_categories[this.originalCategory]) {
            lk = make("a");
            lk.href = "#catlinks";
            lk.onclick = this.open.bind(this);
            lk.appendChild(make(HC.links.change, true));
            lk.title = HC.tooltips.change;
            this.normalLinks.appendChild(make(" ", true));
            this.normalLinks.appendChild(lk);
            if (!state.noSuggestions && HC.use_up_down) {
                this.upDownLinks = make("span");
                lk = make("a");
                lk.href = "#catlinks";
                lk.onclick = this.down.bind(this);
                lk.appendChild(make(HC.links.down, true));
                lk.title = HC.tooltips.down;
                this.upDownLinks.appendChild(make(" ", true));
                this.upDownLinks.appendChild(lk);
                lk = make("a");
                lk.href = "#catlinks";
                lk.onclick = this.up.bind(this);
                lk.appendChild(make(HC.links.up, true));
                lk.title = HC.tooltips.up;
                this.upDownLinks.appendChild(make(" ", true));
                this.upDownLinks.appendChild(lk);
                this.normalLinks.appendChild(this.upDownLinks);
            }
        }
        this.linkSpan = make("span");
        this.linkSpan.className = "noprint nopopups hotcatlink";
        this.linkSpan.appendChild(this.normalLinks);
        this.undelLink = make("span");
        this.undelLink.className = "nopopups hotcatlink";
        this.undelLink.style.display = "none";
        lk = make("a");
        lk.href = "#catlinks";
        lk.onclick = this.restore.bind(this);
        lk.appendChild(make(HC.links.restore, true));
        lk.title = HC.tooltips.restore;
        this.undelLink.appendChild(make(" ", true));
        this.undelLink.appendChild(lk);
        this.linkSpan.appendChild(this.undelLink);
        return normalLinks;
    }

    invokeSuggestions(dont_autocomplete?: boolean): void {
        if (Reflect.has(suggestionConfigs, this.engine) && suggestionConfigs[this.engine].temp && !dont_autocomplete) {
            this.engine = HC.suggestions;
        }
        this.state = CategoryEditor.CHANGE_PENDING;
        const self = this;
        window.setTimeout(() => {
            self.textchange(dont_autocomplete);
        }, HC.suggest_delay);
    }

    /** 构造内联表单。 */
    makeForm(): HTMLFormElement {
        return buildForm(this);
    }

    display(evt: Event): boolean {
        if (this.isAddCategory && !state.onUpload) {
            new CategoryEditor(this.line, null, this.span, true);
        }
        if (!state.commitButton && !state.onUpload) {
            for (let i = 0; i < state.editors.length; i++) {
                if (state.editors[i].state !== CategoryEditor.UNCHANGED) {
                    setMultiInput();
                    break;
                }
            }
        }
        const form = this.form ?? this.makeForm();
        if (this.list) {
            this.list.style.display = "none";
        }
        if (this.engineSelector) {
            this.engineSelector.style.display = "none";
        }
        this.currentCategory = this.lastSavedCategory;
        this.currentExists = this.lastSavedExists;
        this.currentHidden = this.lastSavedHidden;
        this.currentKey = this.lastSavedKey;
        this.icon.src = this.currentExists ? HC.existsYes : HC.existsNo;
        this.text.value = this.currentCategory + (this.currentKey !== null ? `|${this.currentKey}` : "");
        this.originalState = this.state;
        this.lastInput = this.currentCategory;
        this.inputExists = this.currentExists;
        this.state = this.state === CategoryEditor.UNCHANGED ? CategoryEditor.OPEN : CategoryEditor.CHANGE_PENDING;
        this.lastSelection = {
            start: this.currentCategory.length,
            end: this.currentCategory.length,
        };
        this.showsList = false;
        if (this.catLink) {
            this.catLink.style.display = "none";
        }
        this.linkSpan.style.display = "none";
        form.style.display = "inline";
        this.ok.disabled = false;
        const result = evtKill(evt);
        this.text.focus();
        this.text.readOnly = false;
        checkMultiInput();
        return result;
    }

    show(evt: Event, engine: string, readOnly?: boolean): boolean {
        const result = this.display(evt);
        const v = this.lastSavedCategory;
        if (!v.length) {
            return result;
        }
        this.text.readOnly = Boolean(readOnly);
        this.engine = engine;
        this.textchange(false, true);
        forceRedraw();
        return result;
    }

    open(evt: Event): boolean {
        return this.show(evt, this.engine && suggestionConfigs[this.engine].temp ? HC.suggestions : this.engine);
    }

    down(evt: Event): boolean {
        return this.show(evt, "subcat", true);
    }

    up(evt: Event): boolean {
        return this.show(evt, "parentcat");
    }

    cancel(): void {
        if (this.isAddCategory && !state.onUpload) {
            this.removeEditor();
            return;
        }
        this.inactivate();
        this.form!.style.display = "none";
        if (this.catLink) {
            this.catLink.style.display = "";
        }
        this.linkSpan.style.display = "";
        this.state = this.originalState ?? this.state;
        this.currentCategory = this.lastSavedCategory;
        this.currentKey = this.lastSavedKey;
        this.currentExists = this.lastSavedExists;
        this.currentHidden = this.lastSavedHidden;
        if (this.catLink) {
            if (this.currentKey && this.currentKey.length) {
                this.catLink.title = this.currentKey;
            } else {
                this.catLink.title = "";
            }
        }
        if (this.state === CategoryEditor.UNCHANGED) {
            if (this.catLink) {
                this.catLink.style.backgroundColor = "transparent";
            }
        } else {
            if (!state.onUpload) {
                if (this.catLink) {
                    this.catLink.style.backgroundColor = HC.bg_changed;
                }
            }
        }
        checkMultiInput();
        forceRedraw();
    }

    removeEditor(): void {
        if (!state.newDOM) {
            const next = this.span.nextSibling;
            if (next) {
                next.parentNode?.removeChild(next);
            }
        }
        if (this.span.parentNode) {
            this.span.parentNode.removeChild(this.span);
        }
        for (let i = 0; i < state.editors.length; i++) {
            if (state.editors[i] === this) {
                state.editors.splice(i, 1);
                break;
            }
        }
        checkMultiInput();
    }

    rollback(evt: Event): boolean {
        const undoLink = this.undoLink;
        undoLink?.parentNode?.removeChild(undoLink);
        this.undoLink = null;
        this.currentCategory = this.originalCategory;
        this.currentKey = this.originalKey;
        this.currentExists = this.originalExists;
        this.currentHidden = this.originalHidden;
        this.lastSavedCategory = this.originalCategory;
        this.lastSavedKey = this.originalKey;
        this.lastSavedExists = this.originalExists;
        this.lastSavedHidden = this.originalHidden;
        this.state = CategoryEditor.UNCHANGED;
        if (!this.currentCategory || !this.currentCategory.length) {
            this.removeEditor();
        } else {
            const catLink = this.catLink;
            if (catLink) {
                catLink.removeChild(catLink.firstChild as Node);
                catLink.appendChild(make(this.currentCategory, true));
                catLink.href = wikiPagePath(`${HC.category_canonical}:${this.currentCategory}`);
                catLink.title = this.currentKey || "";
                catLink.className = this.currentExists ? "" : "new";
                catLink.style.backgroundColor = "transparent";
            }
            if (this.upDownLinks) {
                this.upDownLinks.style.display = this.currentExists ? "" : "none";
            }
            checkMultiInput();
        }
        return evtKill(evt);
    }

    inactivate(): void {
        if (this.list) {
            this.list.style.display = "none";
        }
        if (this.engineSelector) {
            this.engineSelector.style.display = "none";
        }
        this.is_active = false;
    }

    acceptCheck(dontCheck?: boolean): boolean {
        this.sanitizeInput();
        const value = this.text.value.split("|");
        let key: string | null = null;
        if (value.length > 1) {
            key = value[1];
        }
        let v = value[0].replace(/_/g, " ").replace(/^\s+|\s+$/g, "");
        if (HC.capitalizePageNames) {
            v = capitalize(v);
        }
        this.lastInput = v;
        v = replaceShortcuts(v, HC.shortcuts);
        if (!v.length) {
            this.cancel();
            return false;
        }
        if (!dontCheck && (site.conf.wgNamespaceNumber === 14 && v === site.conf.wgTitle || HC.blacklist && HC.blacklist.test(v))) {
            this.cancel();
            return false;
        }
        this.currentCategory = v;
        this.currentKey = key;
        this.currentExists = this.inputExists;
        return true;
    }

    accept(evt: Event): boolean {
        this.noCommit = (evtKeys(evt as MouseEvent) & 1) !== 0;
        const result = evtKill(evt);
        if (this.acceptCheck()) {
            const toResolve = [this];
            const original = this.currentCategory;
            void resolveMulti(toResolve, (resolved) => {
                if (resolved[0].dab) {
                    showDab(resolved[0]);
                } else {
                    if (resolved[0].acceptCheck(true)) {
                        resolved[0].commit(resolved[0].currentCategory !== original ? HC.messages.cat_resolved.replace(/\$1/g, original) : null);
                    }
                }
            });
        }
        return result;
    }

    /** 收起表单并保存当前值。 */
    close(): void {
        const catLink = this.catLink ?? this.createHiddenCatLink();
        catLink.removeChild(catLink.firstChild as Node);
        catLink.appendChild(make(this.currentCategory, true));
        catLink.href = wikiPagePath(`${HC.category_canonical}:${this.currentCategory}`);
        catLink.className = this.currentExists ? "" : "new";
        this.lastSavedCategory = this.currentCategory;
        this.lastSavedKey = this.currentKey;
        this.lastSavedExists = this.currentExists;
        this.lastSavedHidden = this.currentHidden;
        this.inactivate();
        this.form!.style.display = "none";
        catLink.title = this.currentKey || "";
        catLink.style.display = "";
        if (this.isAddCategory) {
            if (state.onUpload) {
                new CategoryEditor(this.line, null, this.span, true);
            }
            this.isAddCategory = false;
            this.linkSpan.parentNode?.removeChild(this.linkSpan);
            this.makeLinkSpan();
            this.span.appendChild(this.linkSpan);
        }
        if (!this.undoLink) {
            const span = make("span");
            const lk = make("a");
            lk.href = "#catlinks";
            lk.onclick = this.rollback.bind(this);
            lk.appendChild(make(HC.links.undo, true));
            lk.title = HC.tooltips.undo;
            span.appendChild(make(" ", true));
            span.appendChild(lk);
            this.normalLinks.appendChild(span);
            this.undoLink = span;
            if (!state.onUpload) {
                catLink.style.backgroundColor = HC.bg_changed;
            }
        }
        if (this.upDownLinks) {
            this.upDownLinks.style.display = this.lastSavedExists ? "" : "none";
        }
        this.linkSpan.style.display = "";
        this.state = CategoryEditor.CHANGED;
        checkMultiInput();
        forceRedraw();
    }

    /** 补一个隐藏的 catLink 占位。 */
    createHiddenCatLink(): HTMLAnchorElement {
        const catLink = make("a");
        catLink.appendChild(make("foo", true));
        catLink.style.display = "none";
        this.span.insertBefore(catLink, this.span.firstChild?.nextSibling ?? null);
        this.catLink = catLink;
        return catLink;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    commit(_msg?: string | null): void {
        if (this.currentCategory === this.originalCategory && (this.currentKey === this.originalKey || this.currentKey === null && !this.originalKey?.length) || site.conf.wgNamespaceNumber === 14 && this.currentCategory === site.conf.wgTitle || HC.blacklist && HC.blacklist.test(this.currentCategory)) {
            this.cancel();
            return;
        }
        this.close();
        if (!state.commitButton && !state.onUpload) {
            const self = this;
            void initiateEdit((failure) => {
                performChanges(failure, self);
            }, (msg) => {
                alertError(msg);
            });
        }
    }

    remove(evt: MouseEvent): boolean {
        this.doRemove((evtKeys(evt) & 1) !== 0);
        return evtKill(evt);
    }

    doRemove(noCommit: boolean): void {
        if (this.isAddCategory) {
            this.cancel();
            return;
        }
        if (!state.commitButton && !state.onUpload) {
            for (let i = 0; i < state.editors.length; i++) {
                if (state.editors[i].state !== CategoryEditor.UNCHANGED) {
                    setMultiInput();
                    break;
                }
            }
        }
        if (state.commitButton) {
            const catLink = this.catLink;
            if (catLink) {
                catLink.title = "";
                catLink.style.cssText += "; text-decoration : line-through !important;";
                catLink.style.backgroundColor = HC.bg_changed;
            }
            this.originalState = this.state;
            this.state = CategoryEditor.DELETED;
            this.normalLinks.style.display = "none";
            const undelLink = this.undelLink;
            if (undelLink) {
                undelLink.style.display = "";
            }
            checkMultiInput();
        } else {
            if (state.onUpload) {
                this.removeEditor();
            } else {
                this.originalState = this.state;
                this.state = CategoryEditor.DELETED;
                this.noCommit = noCommit || HC.del_needs_diff;
                const self = this;
                void initiateEdit((failure) => {
                    performChanges(failure, self);
                }, (msg) => {
                    self.state = self.originalState ?? self.state;
                    alertError(msg);
                });
            }
        }
    }

    restore(evt: Event): boolean {
        if (this.catLink) {
            this.catLink.title = this.currentKey || "";
            this.catLink.style.textDecoration = "";
        }
        this.state = this.originalState ?? this.state;
        if (this.state === CategoryEditor.UNCHANGED) {
            if (this.catLink) {
                this.catLink.style.backgroundColor = "transparent";
            }
        } else {
            if (this.catLink) {
                this.catLink.style.backgroundColor = HC.bg_changed;
            }
        }
        this.normalLinks.style.display = "";
        const undelLink = this.undelLink;
        if (undelLink) {
            undelLink.style.display = "none";
        }
        checkMultiInput();
        return evtKill(evt);
    }

    selectEngine(engineName: string): void {
        if (!this.engineSelector) {
            return;
        }
        for (let i = 0; i < this.engineSelector.options.length; i++) {
            this.engineSelector.options[i].selected = this.engineSelector.options[i].value === engineName;
        }
    }

    sanitizeInput(): void {
        let v = this.text.value;
        v = v.replace(/^(\s|_)+/, "");
        const re = new RegExp(`^(${HC.category_regexp}):`);
        if (re.test(v)) {
            v = v.substring(v.indexOf(":") + 1).replace(/^(\s|_)+/, "");
        }
        v = v.replace(/\u200E$/, "");
        if (HC.capitalizePageNames) {
            v = capitalize(v);
        }
        if (this.text.value !== v) {
            const cursorPos = this.text.selectionStart ?? 0;
            this.text.value = v;
            this.text.setSelectionRange(cursorPos, cursorPos);
        }
    }

    textchange(_dont_autocomplete?: boolean, force?: boolean): void {
        makeActive(this);
        this.sanitizeInput();
        let v = this.text.value;
        const pipe = v.indexOf("|");
        if (pipe >= 0) {
            this.currentKey = v.substring(pipe + 1);
            v = v.substring(0, pipe);
        } else {
            this.currentKey = null;
        }
        if (this.lastInput === v && !force) {
            return;
        }
        if (this.lastInput !== v) {
            checkMultiInput();
        }
        this.lastInput = v;
        this.lastRealInput = v;
        this.ok.disabled = Boolean(v.length && HC.blacklist && HC.blacklist.test(v));
        if (state.noSuggestions) {
            if (this.list) {
                this.list.style.display = "none";
            }
            if (this.engineSelector) {
                this.engineSelector.style.display = "none";
            }
            this.icon.style.display = "none";
            return;
        }
        if (!v.length) {
            this.showSuggestions([]);
            return;
        }
        let cleanKey = v.replace(/[\u200E\u200F\u202A-\u202E]/g, "").replace(wikiTextBlankRE, " ");
        cleanKey = replaceShortcuts(cleanKey, HC.shortcuts);
        cleanKey = cleanKey.replace(/^\s+|\s+$/g, "");
        if (!cleanKey.length) {
            this.showSuggestions([]);
            return;
        }
        if (this.callbackObj) {
            this.callbackObj.cancelled = true;
        }
        const engineName = Reflect.has(suggestionConfigs, this.engine) ? this.engine : "combined";
        const dont_autocomplete = _dont_autocomplete || suggestionConfigs[engineName].noCompletion;
        const cached = suggestionConfigs[engineName].cache[cleanKey];
        if (cached) {
            this.showSuggestions(cached, dont_autocomplete, v, engineName);
            return;
        }
        const engines = suggestionConfigs[engineName].engines;
        this.callbackObj = {
            allTitles: null,
            callsMade: 0,
            nofCalls: engines.length,
            noCompletion: dont_autocomplete,
            engineName: engineName,
        };
        this.makeCalls(engines, this.callbackObj, v, cleanKey);
    }

    makeCalls(engines: string[], cb: SuggestionCallback, v: string, cleanKey: string): void {
        fireSuggestionRequests(this, engines, cb, v, cleanKey);
    }
    showSuggestions(titles: TitleList | null, dontAutocomplete?: boolean, queryKey?: string | null, engineName?: string | null): void {
        this.text.readOnly = false;
        this.dab = null;
        this.showsList = false;
        const list = this.list;
        if (!list) {
            return;
        }
        if (state.noSuggestions) {
            list.style.display = "none";
            if (this.engineSelector) {
                this.engineSelector.style.display = "none";
            }
            this.icon.style.display = "none";
            this.inputExists = true;
            return;
        }
        this.engineName = engineName;
        if (engineName) {
            if (!this.engineSelector) {
                this.engineName = null;
            }
        } else {
            if (this.engineSelector) {
                this.engineSelector.style.display = "none";
            }
        }
        if (queryKey) {
            if (this.lastInput.indexOf(queryKey)) {
                return;
            }
            if (this.lastQuery && this.lastInput.indexOf(this.lastQuery) === 0 && this.lastQuery.length > queryKey.length) {
                return;
            }
        }
        this.lastQuery = queryKey;
        const parts = this.text.value.split("|");
        const key = parts.length > 1 ? `|${parts[1]}` : "";
        const v = HC.capitalizePageNames ? capitalize(parts[0]) : parts[0];
        let vNormalized = v;
        const knownToExist = titles && titles.exists;
        let i;
        if (titles) {
            if (titles.normalized && queryKey && v.indexOf(queryKey) === 0) {
                vNormalized = titles.normalized + v.substring(queryKey.length);
            }
            filterAndSortTitles(titles, vNormalized);
        }
        if (!titles || !titles.length) {
            list.style.display = "none";
            if (this.engineSelector) {
                this.engineSelector.style.display = "none";
            }
            if (engineName && !suggestionConfigs[engineName].temp) {
                this.icon.src = HC.existsNo;
                this.inputExists = false;
            }
            return;
        }
        const firstTitle = titles[0];
        const completed = this.autoComplete(firstTitle, v, vNormalized, key, dontAutocomplete);
        const existing = completed || Boolean(knownToExist) || firstTitle === replaceShortcuts(v, HC.shortcuts);
        if (engineName && !suggestionConfigs[engineName].temp) {
            this.icon.src = existing ? HC.existsYes : HC.existsNo;
            this.inputExists = existing;
        }
        if (completed) {
            this.lastInput = firstTitle;
            if (titles.length === 1) {
                list.style.display = "none";
                if (this.engineSelector) {
                    this.engineSelector.style.display = "none";
                }
                return;
            }
        }
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
        for (i = 0; i < titles.length; i++) {
            const opt = make("option");
            opt.appendChild(make(titles[i], true));
            opt.selected = completed && i === 0;
            list.appendChild(opt);
        }
        this.displayList();
    }

    displayList(): void {
        this.showsList = true;
        const list = this.list;
        if (!list) {
            return;
        }
        if (!this.is_active) {
            list.style.display = "none";
            if (this.engineSelector) {
                this.engineSelector.style.display = "none";
            }
            return;
        }
        let nofItems = list.options.length > HC.listSize ? HC.listSize : list.options.length;
        if (nofItems <= 1) {
            nofItems = 2;
        }
        list.size = nofItems;
        list.style.setProperty("align", state.is_rtl ? "right" : "left");
        list.style.zIndex = "5";
        list.style.position = "absolute";
        const anchor = state.is_rtl ? "right" : "left";
        let listh;
        if (list.style.display === "none") {
            list.style.top = `${this.text.offsetTop}px`;
            list.style.setProperty(anchor, "-10000px");
            list.style.display = "";
            listh = list.offsetHeight;
            list.style.display = "none";
        } else {
            listh = list.offsetHeight;
        }
        let maxListHeight = listh;
        if (nofItems < HC.listSize) {
            maxListHeight = listh / nofItems * HC.listSize;
        }
        const textPos = position(this.text);
        const nl = 0;
        const textBoxWidth = this.text.offsetWidth || this.text.clientWidth;
        const engineSelector = this.engineName ? this.engineSelector : undefined;
        let nt;
        let offset = 0;
        if (engineSelector) {
            engineSelector.style.zIndex = "5";
            engineSelector.style.position = "absolute";
            engineSelector.style.width = `${textBoxWidth}px`;
            if (engineSelector.style.display === "none") {
                engineSelector.style.setProperty(anchor, "-10000px");
                engineSelector.style.top = "0";
                engineSelector.style.display = "";
                offset = engineSelector.offsetHeight;
                engineSelector.style.display = "none";
            } else {
                offset = engineSelector.offsetHeight;
            }
            engineSelector.style.setProperty(anchor, `${nl}px`);
        }
        if (textPos.y < maxListHeight + offset + 1) {
            nt = this.text.offsetHeight + offset + 1;
            if (engineSelector) {
                engineSelector.style.top = `${this.text.offsetHeight}px`;
            }
        } else {
            nt = -listh - offset - 1;
            if (engineSelector) {
                engineSelector.style.top = `${-(offset + 1)}px`;
            }
        }
        list.style.top = `${nt}px`;
        list.style.width = "";
        list.style.setProperty(anchor, `${nl}px`);
        if (this.engineName) {
            this.selectEngine(this.engineName);
            if (engineSelector) {
                engineSelector.style.display = "";
            }
        }
        list.style.display = "block";
        if (list.offsetWidth < textBoxWidth) {
            list.style.width = `${textBoxWidth}px`;
            return;
        }
        const scroll = scrollOffset("Left");
        const view_w = viewport("Width");
        let w = list.offsetWidth;
        const l_pos = position(list);
        let left = l_pos.x;
        let right = left + w;
        if (left < scroll || right > scroll + view_w) {
            if (w > view_w) {
                w = view_w;
                list.style.width = `${w}px`;
                if (state.is_rtl) {
                    left = right - w;
                } else {
                    right = left + w;
                }
            }
            let relative_offset = 0;
            if (left < scroll) {
                relative_offset = scroll - left;
            } else if (right > scroll + view_w) {
                relative_offset = -(right - scroll - view_w);
            }
            if (state.is_rtl) {
                relative_offset = -relative_offset;
            }
            if (relative_offset) {
                list.style.setProperty(anchor, `${nl + relative_offset}px`);
            }
        }
    }

    autoComplete(newVal: string, _actVal: string, normalizedActVal: string, key: string, dontModify?: boolean): boolean {
        let actVal = _actVal;
        if (newVal === actVal) {
            return true;
        }
        if (dontModify || this.ime) {
            return false;
        }
        if (newVal.indexOf(actVal)) {
            if (normalizedActVal && newVal.indexOf(normalizedActVal) === 0) {
                if (this.lastRealInput === actVal) {
                    this.lastRealInput = normalizedActVal;
                }
                actVal = normalizedActVal;
            } else {
                return false;
            }
        }
        this.text.focus();
        this.text.value = newVal + key;
        this.setSelection(actVal.length, newVal.length);
        return true;
    }

    setSelection(from: number, to: number): void {
        setSelectionRange(this, from, to);
    }

    getSelection(): { start: number; end: number } {
        return getSelectionRange(this);
    }
    saveView(): void {
        this.lastSelection = this.getSelection();
    }

    processKey(evt: KeyboardEvent): boolean {
        let dir = 0;
        switch (this.lastKey) {
            case UP:
                dir = -1;
                break;
            case DOWN:
                dir = 1;
                break;
            case PGUP:
                dir = -HC.listSize;
                break;
            case PGDOWN:
                dir = HC.listSize;
                break;
            case ESC:
                return evtKill(evt);
        }
        if (dir) {
            if (this.list && this.list.style.display !== "none") {
                this.highlightSuggestion(dir);
                return evtKill(evt);
            } else if ((this.keyCount ?? 0) <= 1 && (!this.callbackObj || this.callbackObj.callsMade === this.callbackObj.nofCalls)) {
                this.textchange();
            }
        }
        return true;
    }

    highlightSuggestion(dir: number): boolean {
        const list = this.list;
        if (state.noSuggestions || !list || list.style.display === "none") {
            return false;
        }
        const curr = list.selectedIndex;
        let tgt;
        if (dir === 0) {
            if (curr < 0 || curr >= list.options.length) {
                return false;
            }
            tgt = curr;
        } else {
            tgt = curr < 0 ? 0 : curr + dir;
            tgt = tgt < 0 ? 0 : tgt;
            if (tgt >= list.options.length) {
                tgt = list.options.length - 1;
            }
        }
        if (tgt !== curr || dir === 0) {
            if (curr >= 0 && curr < list.options.length && dir !== 0) {
                list.options[curr].selected = false;
            }
            list.options[tgt].selected = true;
            const v = this.text.value.split("|");
            const key = v.length > 1 ? `|${v[1]}` : "";
            const completed = this.autoComplete(list.options[tgt].text, this.lastRealInput, "", key, false);
            if (!completed || list.options[tgt].text === this.lastRealInput) {
                this.text.value = list.options[tgt].text + key;
                this.setSelection(list.options[tgt].text.length, list.options[tgt].text.length);
            }
            this.lastInput = list.options[tgt].text;
            this.inputExists = true;
            this.icon.src = HC.existsYes;
            this.state = CategoryEditor.CHANGE_PENDING;
        }
        return true;
    }

    resetKeySelection(): boolean {
        const list = this.list;
        if (state.noSuggestions || !list || list.style.display === "none") {
            return false;
        }
        const curr = list.selectedIndex;
        if (curr >= 0 && curr < list.options.length) {
            list.options[curr].selected = false;
            const v = this.text.value.split("|");
            const key = v.length > 1 ? `|${v[1]}` : "";
            let result = v[0] !== this.lastInput;
            if (v[0] !== this.lastRealInput) {
                this.text.value = this.lastRealInput + key;
                result = true;
            }
            this.lastInput = this.lastRealInput;
            return result;
        }
        return false;
    }
}

export { CategoryEditor };
