/**
 * Cat-a-lot (Codex UI Gadget for Moegirlpedia)
 */
"use strict";

$(() => {
    const nsNumber = mw.config.get("wgNamespaceNumber");
    const canonicalSpecial = mw.config.get("wgCanonicalSpecialPageName");
    const actionName = mw.config.get("wgAction");

    // 仅在分类页 (NS 14) 或支持的特殊列表/搜索页 (NS -1) 的浏览模式启用
    if (actionName !== "view") {
        return;
    }
    const supportedSpecials = new Set([
        "Search",
        "Listfiles",
        "Uncategorizedfiles",
        "Uncategorizedpages",
        "Unusedfiles",
        "Mostlinkedcategories",
        "Prefixindex",
    ]);
    const isSearchMode = nsNumber === -1;
    if (nsNumber !== 14 && !(isSearchMode && (!canonicalSpecial || supportedSpecials.has(canonicalSpecial)))) {
        return;
    }

    const userGroups = mw.config.get("wgUserGroups") || [];
    const userName = mw.config.get("wgUserName") || "";

    const isSysopOrStaff = userGroups.includes("sysop") || userGroups.includes("staff");
    const initialBotRight = userGroups.includes("bot") || userGroups.includes("flood");
    // 萌娘百科仅 patroller 及以上权限可获取 categorymembers
    const canFetchCategoryMembers = ["patroller", "sysop", "staff", "bot", "flood"].some((g) => userGroups.includes(g));

    const Vue = mw.loader.require("vue");
    const Codex = mw.loader.require("@wikimedia/codex");
    const uls = window.wgULS;

    const API_TAG = "Cat-a-lot";
    const PREFS_STORAGE_KEY = "ext.gadget.Cat-a-lot-prefs";
    const HEIGHT_STORAGE_KEY = "ext.gadget.Cat-a-lot-height";
    const NON_BOT_MAX_PAGES = 50;
    const NON_BOT_DELAY_MS = 20000;
    const SYSOP_FLOOD_PROMPT_THRESHOLD = 10;
    const API_TIMEOUT_MS = 30000;

    const api = new mw.Api();

    const escapeRegex = (str) => `${str ?? ""}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const normalizeCatName = (raw) => {
        let name = `${raw ?? ""}`.trim().replace(/_/g, " ");
        name = name.replace(/^(?:Category|分类|分類)\s*:\s*/i, "");
        return name.trim();
    };

    const validateCategoryTitle = (raw) => {
        const clean = normalizeCatName(raw);
        if (!clean || /[[\]{}|<>#]/.test(clean)) {
            return null;
        }
        try {
            const parsed = mw.Title.newFromText(clean, 14);
            if (!parsed || parsed.getNamespaceId() !== 14) {
                return null;
            }
            return parsed.getMainText();
        } catch {
            return null;
        }
    };

    const buildCategoryRegex = (catName) => {
        const clean = normalizeCatName(catName);
        if (!clean) {
            return null;
        }
        const first = clean.charAt(0);
        const firstPattern
            = first.toLowerCase() !== first.toUpperCase()
                ? `[${escapeRegex(first.toUpperCase())}${escapeRegex(first.toLowerCase())}]`
                : escapeRegex(first);
        const restPattern = escapeRegex(clean.slice(1)).replace(/ /g, "[ _]+");
        return new RegExp(
            `\\[\\[\\s*(?:Category|分类|分類)\\s*:\\s*${firstPattern}${restPattern}\\s*(?:(\\|[^\\]]*))?\\]\\]`,
            "gi",
        );
    };

    const loadPrefs = () => {
        const defaults = {
            watchlist: "preferences",
            minor: false,
            editpages: true,
            docleanup: false,
            subcatcount: 50,
        };
        let stored = {};
        try {
            const raw = mw.storage.get(PREFS_STORAGE_KEY);
            if (raw) {
                stored = JSON.parse(raw);
            }
        } catch {}
        const globalPrefs = window.CatALotPrefs && typeof window.CatALotPrefs === "object" ? window.CatALotPrefs : {};
        return { ...defaults, ...stored, ...globalPrefs };
    };

    const savePrefs = (prefs) => {
        try {
            mw.storage.set(PREFS_STORAGE_KEY, JSON.stringify(prefs));
        } catch {}
    };

    // ==================== 页面条目扫描与 Shift 多选 ====================
    const CLASS_LABEL = "gadget-cat_a_lot-label";
    const CLASS_SELECTED = "gadget-cat_a_lot-label--selected";
    const CLASS_LAST = "gadget-cat_a_lot-label--last-selected";
    const CLASS_DONE = "gadget-cat_a_lot-label--done";

    const collectTargetLinks = (allowNonFiles) => {
        const selectors = [];
        if (nsNumber === 14) {
            selectors.push("#mw-category-media .gallerybox .gallerytext a");
            if (allowNonFiles) {
                selectors.push("#mw-pages .mw-category a", "#mw-pages li a", "#mw-subcategories .CategoryTreeItem a");
            }
        } else {
            selectors.push("#mw-content-text .gallerybox .gallerytext a");
            if (allowNonFiles) {
                selectors.push(
                    ".mw-search-results .mw-search-result-heading a",
                    ".mw-spcontent ol.special li > a:first-child",
                    ".mw-prefixindex-list li > a:first-child",
                    ".TablePager td.TablePager_col_img_name a:first-child",
                );
            }
        }

        const seenTitles = new Set();
        const links = [];
        $(selectors.join(", ")).each((_, el) => {
            const $a = $(el);
            const href = $a.attr("href") || "";
            if (
                !href
                || href.startsWith("#")
                || $a.hasClass("external")
                || /[?&](?:action|diff|oldid|redlink)=/i.test(href)
            ) {
                return;
            }
            const titleAttr = $a.attr("title") || "";
            const rawTitle = titleAttr || $a.text().trim();
            if (!rawTitle) {
                return;
            }
            try {
                const parsed = mw.Title.newFromText(rawTitle);
                if (!parsed || parsed.getNamespaceId() < 0) {
                    return;
                }
                const prefixed = parsed.getPrefixedText();
                if (!allowNonFiles && parsed.getNamespaceId() !== 6) {
                    return;
                }
                if (seenTitles.has(prefixed)) {
                    return;
                }
                seenTitles.add(prefixed);
                $a.attr("data-cal-title", prefixed).addClass(CLASS_LABEL);
                links.push(el);
            } catch {}
        });
        return $(links);
    };

    // ==================== API 辅助 ====================
    const fetchParentAndSubCats = async (catName, subcatLimit, allowCategoryMembers) => {
        const clean = normalizeCatName(catName);
        const fullTitle = `Category:${clean}`;

        const parentReq = api.get({
            action: "query",
            prop: "categories",
            titles: fullTitle,
            cllimit: "max",
            clshow: "!hidden",
            formatversion: "2",
        }, { timeout: API_TIMEOUT_MS });

        const subReq = allowCategoryMembers
            ? api.get({
                action: "query",
                list: "categorymembers",
                cmtitle: fullTitle,
                cmtype: "subcat",
                cmlimit: Math.min(Math.max(+subcatLimit || 50, 1), 500),
                formatversion: "2",
            }, { timeout: API_TIMEOUT_MS })
            : Promise.resolve(null);

        const [parentRes, subRes] = await Promise.all([parentReq, subReq]);

        const pageNode = parentRes?.query?.pages?.[0];
        const missing = !!pageNode?.missing;
        const parents = (pageNode?.categories || []).map((c) => normalizeCatName(c.title)).filter(Boolean);
        const subs = allowCategoryMembers
            ? (subRes?.query?.categorymembers || []).map((c) => normalizeCatName(c.title)).filter(Boolean)
            : [];
        return { missing, parents, subs };
    };

    const fetchCategorySuggestions = async (query) => {
        const clean = normalizeCatName(query);
        if (!clean) {
            return [];
        }
        const res = await api.get({
            action: "opensearch",
            namespace: 14,
            search: clean,
            limit: 12,
            format: "json",
        }, { timeout: API_TIMEOUT_MS });
        const titles = Array.isArray(res?.[1]) ? res[1] : [];
        return titles.map((t) => normalizeCatName(t)).filter(Boolean);
    };

    const computeNewWikitext = ({ text, mode, sourceCat, targetCat, doCleanup }) => {
        let newText = `${text ?? ""}`;
        const targetNorm = targetCat ? validateCategoryTitle(targetCat) : "";
        const sourceNorm = normalizeCatName(sourceCat);
        if (mode !== "remove" && !targetNorm) {
            return { status: "invalid-target", text: newText };
        }
        const targetRegex = targetNorm ? buildCategoryRegex(targetNorm) : null;
        const sourceRegex = sourceNorm ? buildCategoryRegex(sourceNorm) : null;

        const alreadyInTarget = targetRegex ? targetRegex.test(newText) : false;
        if (targetRegex) {
            targetRegex.lastIndex = 0;
        }

        if (mode === "add") {
            if (alreadyInTarget) {
                return { status: "skipped-already", text: newText };
            }
            newText = `${newText.replace(/\s+$/, "")}\n[[Category:${targetNorm}]]\n`;
        } else if (mode === "copy") {
            if (alreadyInTarget) {
                return { status: "skipped-already", text: newText };
            }
            if (sourceRegex && sourceRegex.test(newText)) {
                sourceRegex.lastIndex = 0;
                let inserted = false;
                newText = newText.replace(sourceRegex, (match) => {
                    if (!inserted) {
                        inserted = true;
                        return `${match}\n[[Category:${targetNorm}]]`;
                    }
                    return match;
                });
            } else {
                newText = `${newText.replace(/\s+$/, "")}\n[[Category:${targetNorm}]]\n`;
            }
        } else if (mode === "move") {
            if (!sourceRegex || !sourceRegex.test(newText)) {
                return { status: "skipped-not-found", text: newText };
            }
            sourceRegex.lastIndex = 0;
            if (alreadyInTarget) {
                newText = newText.replace(sourceRegex, "").replace(/\n{3,}/g, "\n\n");
            } else {
                let replaced = false;
                newText = newText.replace(sourceRegex, (_, sortkey = "") => {
                    if (!replaced) {
                        replaced = true;
                        return `[[Category:${targetNorm}${sortkey || ""}]]`;
                    }
                    return "";
                });
            }
        } else if (mode === "remove") {
            if (!sourceRegex || !sourceRegex.test(newText)) {
                return { status: "skipped-not-found", text: newText };
            }
            sourceRegex.lastIndex = 0;
            newText = newText.replace(sourceRegex, "").replace(/\n{3,}/g, "\n\n");
        }

        if (doCleanup) {
            newText = newText
                .replace(/\{\{\s*(?:Check categories|Uncategorized|Uncat)\s*(?:\|[^}]*)?\}\}\s*/gi, "")
                .replace(/\n{3,}/g, "\n\n");
        }

        return { status: "ok", text: newText };
    };

    const verifyCommittedOnServer = ({ latestText, mode, sourceCat, targetCat }) => {
        const targetRegex = targetCat ? buildCategoryRegex(targetCat) : null;
        const sourceRegex = sourceCat ? buildCategoryRegex(sourceCat) : null;
        const hasTarget = targetRegex ? targetRegex.test(latestText) : false;
        const hasSource = sourceRegex ? sourceRegex.test(latestText) : false;

        if (mode === "add" || mode === "copy") {
            return hasTarget;
        }
        if (mode === "move") {
            return hasTarget && !hasSource;
        }
        if (mode === "remove") {
            return !hasSource;
        }
        return false;
    };

    // ==================== 挂载 Codex 应用 ====================
    const mountEl = document.createElement("div");
    mountEl.className = "cal-app";
    document.body.appendChild(mountEl);

    const FallbackInfoChip = {
        props: { status: { type: String, "default": "notice" } },
        template: "<span class=\"cal-chip\" :class=\"'cal-chip--' + status\"><slot /></span>",
    };

    const app = Vue.createMwApp({
        data: () => {
            const prefs = loadPrefs();
            const savedHeight = +mw.storage.get(HEIGHT_STORAGE_KEY) || 440;
            return {
                isOpen: false,
                panelHeight: Math.min(Math.max(savedHeight, 260), 760),
                currentCategory: nsNumber === 14 ? normalizeCatName(mw.config.get("wgTitle")) : "",
                searchInput: isSearchMode ? mw.util.getParamValue("search") || "" : "",
                suggestions: [],
                activeSuggestionIdx: -1,
                parentCats: [],
                subCats: [],
                catNotFound: false,
                isLoadingCats: false,
                catTreeRequestId: 0,
                suggestRequestId: 0,

                selectedTitles: [],
                prefs,
                prefsOpen: false,
                prefsDraft: { ...prefs },

                isSysopOrStaff,
                hasBotRight: initialBotRight,
                selfFloodActive: false,
                canFetchCategoryMembers,

                batchPending: false,
                activeBatchToken: 0,
                isRunning: false,
                stopRequested: false,
                progressDone: 0,
                progressTotal: 0,
                currentEditingTitle: "",
                activeRequest: null,
                delayTimer: null,
                delayResolver: null,

                resultDialog: {
                    open: false,
                    title: "Cat-a-lot",
                    summaryText: "",
                    skippedAlready: [],
                    skippedNotFound: [],
                    skippedServer: [],
                },
                confirmDialog: {
                    open: false,
                    title: "Cat-a-lot",
                    message: "",
                    showCancel: true,
                    resolver: null,
                },

                watchlistOptions: [
                    { label: uls("与系统参数设置相同", "與系統參數設置相同"), value: "preferences" },
                    { label: uls("不要更改监视状态", "不要更改監視狀態"), value: "nochange" },
                    { label: uls("监视编辑的页面", "監視編輯的頁面"), value: "watch" },
                    { label: uls("从监视列表移除", "從監視列表移除"), value: "unwatch" },
                ],
            };
        },
        computed: {
            pageCategoryName: () => nsNumber === 14 ? normalizeCatName(mw.config.get("wgTitle")) : "",
            selectedCountText() {
                return uls(
                    `已选择 ${this.selectedTitles.length} 个页面或文件`,
                    `已選擇 ${this.selectedTitles.length} 個頁面或文件`,
                );
            },
            permissionChipText() {
                if (this.selfFloodActive) {
                    return uls("临时 Flood（无速率限制）", "臨時 Flood（無速率限制）");
                }
                if (this.hasBotRight) {
                    return uls("Bot / Flood（无速率限制）", "Bot / Flood（無速率限制）");
                }
                if (this.isSysopOrStaff) {
                    return uls("管理员（>10页可自授权Flood）", "管理員（>10頁可自授權Flood）");
                }
                return uls("普通用户（≥20秒/次，≤50页）", "普通用戶（≥20秒/次，≤50頁）");
            },
            permissionChipStatus() {
                if (this.hasBotRight) {
                    return "warning";
                }
                return this.isSysopOrStaff ? "notice" : "default";
            },
            activeTagString() {
                return this.hasBotRight ? `${API_TAG}|bot` : API_TAG;
            },
            cleanInputCategory() {
                return normalizeCatName(this.searchInput);
            },
        },
        mounted() {
            this.bindPageItems();
            if (this.currentCategory) {
                this.loadCategoryTree(this.currentCategory);
            }
        },
        methods: {
            uls,
            bindPageItems() {
                $(`.${CLASS_LABEL}`)
                    .off("click.catALot")
                    .removeClass(`${CLASS_LABEL} ${CLASS_SELECTED} ${CLASS_LAST}`)
                    .removeAttr("data-cal-title");
                const $links = collectTargetLinks(this.prefs.editpages);
                let prevEl = null;

                $links.on("click.catALot", (event) => {
                    if (event.ctrlKey || event.metaKey) {
                        return;
                    }
                    event.preventDefault();
                    const currentEl = event.currentTarget;
                    const $current = $(currentEl);

                    $links.removeClass(CLASS_LAST);
                    $current.addClass(CLASS_LAST).toggleClass(CLASS_SELECTED);

                    if (prevEl && event.shiftKey) {
                        const idxA = $links.index(prevEl);
                        const idxB = $links.index(currentEl);
                        if (idxA !== -1 && idxB !== -1) {
                            const shouldSelect = $current.hasClass(CLASS_SELECTED);
                            const $range = $links.slice(Math.min(idxA, idxB), Math.max(idxA, idxB) + 1);
                            $range[shouldSelect ? "addClass" : "removeClass"](CLASS_SELECTED);
                        }
                    }
                    prevEl = currentEl;
                    this.syncSelectedTitles();
                });
                this.syncSelectedTitles();
            },
            syncSelectedTitles() {
                const titles = [];
                $(`.${CLASS_SELECTED}`).each((_, el) => {
                    const t = $(el).attr("data-cal-title");
                    if (t && !titles.includes(t)) {
                        titles.push(t);
                    }
                });
                this.selectedTitles = titles;
            },
            toggleAll(select) {
                $(`.${CLASS_LABEL}`)[select ? "addClass" : "removeClass"](CLASS_SELECTED);
                if (!select) {
                    $(`.${CLASS_LABEL}`).removeClass(CLASS_LAST);
                }
                this.syncSelectedTitles();
            },
            toggleOpen() {
                this.isOpen = !this.isOpen;
            },
            startResize(e) {
                const startY = e.clientY;
                const startH = this.panelHeight;
                const onMove = (ev) => {
                    const next = Math.min(Math.max(startH + (startY - ev.clientY), 260), 760);
                    this.panelHeight = next;
                };
                const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                    try {
                        mw.storage.set(HEIGHT_STORAGE_KEY, `${this.panelHeight}`);
                    } catch {}
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
            },
            async loadCategoryTree(catName) {
                const clean = normalizeCatName(catName);
                if (!clean) {
                    return;
                }
                const reqId = ++this.catTreeRequestId;
                this.currentCategory = clean;
                this.isLoadingCats = true;
                this.catNotFound = false;
                try {
                    const { missing, parents, subs } = await fetchParentAndSubCats(
                        clean,
                        this.prefs.subcatcount,
                        this.canFetchCategoryMembers,
                    );
                    if (reqId !== this.catTreeRequestId) {
                        return;
                    }
                    this.catNotFound = missing;
                    this.parentCats = parents;
                    this.subCats = subs;
                } catch (err) {
                    if (reqId !== this.catTreeRequestId) {
                        return;
                    }
                    this.catNotFound = false;
                    this.parentCats = [];
                    this.subCats = [];
                    mw.notify(`${uls("获取分类列表失败", "獲取分類列表失敗")}: ${err}`, { type: "error" });
                } finally {
                    if (reqId === this.catTreeRequestId) {
                        this.isLoadingCats = false;
                    }
                }
            },
            async onSearchInputChange() {
                const val = this.cleanInputCategory;
                if (!val) {
                    this.suggestRequestId += 1;
                    this.suggestions = [];
                    this.activeSuggestionIdx = -1;
                    return;
                }
                const reqId = ++this.suggestRequestId;
                try {
                    const results = await fetchCategorySuggestions(val);
                    if (reqId !== this.suggestRequestId || this.cleanInputCategory !== val) {
                        return;
                    }
                    this.suggestions = results;
                    this.activeSuggestionIdx = -1;
                } catch {
                    if (reqId === this.suggestRequestId) {
                        this.suggestions = [];
                    }
                }
            },
            onSearchKeydown(e) {
                if (this.suggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                        e.preventDefault();
                        this.activeSuggestionIdx = (this.activeSuggestionIdx + 1) % this.suggestions.length;
                        return;
                    }
                    if (e.key === "ArrowUp") {
                        e.preventDefault();
                        this.activeSuggestionIdx
                            = (this.activeSuggestionIdx - 1 + this.suggestions.length) % this.suggestions.length;
                        return;
                    }
                    if (e.key === "Escape") {
                        this.suggestions = [];
                        return;
                    }
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (this.activeSuggestionIdx >= 0 && this.suggestions[this.activeSuggestionIdx]) {
                        this.pickSuggestion(this.suggestions[this.activeSuggestionIdx]);
                    } else if (this.cleanInputCategory) {
                        this.suggestions = [];
                        this.loadCategoryTree(this.cleanInputCategory);
                    }
                }
            },
            pickSuggestion(cat) {
                this.searchInput = cat;
                this.suggestions = [];
                this.activeSuggestionIdx = -1;
                this.loadCategoryTree(cat);
            },
            openPrefs() {
                this.prefsDraft = { ...this.prefs };
                this.prefsOpen = true;
            },
            savePrefsDialog() {
                const prevEditPages = this.prefs.editpages;
                this.prefs = {
                    ...this.prefsDraft,
                    subcatcount: Math.min(Math.max(+this.prefsDraft.subcatcount || 50, 1), 500),
                };
                savePrefs(this.prefs);
                this.prefsOpen = false;
                if (prevEditPages !== this.prefs.editpages) {
                    this.bindPageItems();
                }
                if (this.currentCategory) {
                    this.loadCategoryTree(this.currentCategory);
                }
                mw.notify(uls("Cat-a-lot 设置已保存。", "Cat-a-lot 設置已保存。"), { type: "success" });
            },
            askDialog({ title = "Cat-a-lot", message, showCancel = true }) {
                if (this.confirmDialog.resolver) {
                    const prevResolve = this.confirmDialog.resolver;
                    this.confirmDialog.resolver = null;
                    prevResolve(false);
                }
                return new Promise((resolve) => {
                    this.confirmDialog = {
                        open: true,
                        title,
                        message,
                        showCancel,
                        resolver: resolve,
                    };
                });
            },
            resolveConfirmDialog(val) {
                const r = this.confirmDialog.resolver;
                this.confirmDialog.resolver = null;
                this.confirmDialog.open = false;
                if (r) {
                    r(val);
                }
            },
            trackRequest(jqPromise) {
                this.activeRequest = jqPromise;
                return jqPromise.always(() => {
                    if (this.activeRequest === jqPromise) {
                        this.activeRequest = null;
                    }
                });
            },
            stopBatch() {
                this.stopRequested = true;
                if (this.delayTimer) {
                    clearTimeout(this.delayTimer);
                    this.delayTimer = null;
                }
                if (this.delayResolver) {
                    const resolveDelay = this.delayResolver;
                    this.delayResolver = null;
                    resolveDelay();
                }
                if (this.activeRequest && typeof this.activeRequest.abort === "function") {
                    this.activeRequest.abort();
                }
            },
            async grantSelfFlood() {
                try {
                    await this.trackRequest(api.postWithToken("userrights", {
                        action: "userrights",
                        user: userName,
                        add: "flood",
                        expiry: "2 hours",
                        reason: "【[[Help:Cat-a-lot|Cat-a-lot]]】：临时启用机器用户（flood）",
                        tags: this.hasBotRight ? `${API_TAG}|bot` : API_TAG,
                        formatversion: "2",
                    }, { timeout: API_TIMEOUT_MS }));
                    this.hasBotRight = true;
                    this.selfFloodActive = true;
                    mw.notify(uls("已成功自授权 2 小时机器用户（flood）！", "已成功自授權 2 小時機器用戶（flood）！"), { type: "success" });
                    return true;
                } catch (err) {
                    await this.askDialog({
                        message: uls(
                            `自动授权机器用户失败：${err?.error?.info || err}\n将继续以当前身份受速率限制执行。`,
                            `自動授權機器用戶失敗：${err?.error?.info || err}\n將繼續以當前身份受速率限制執行。`,
                        ),
                        showCancel: false,
                    });
                    return false;
                }
            },
            async revokeSelfFlood() {
                try {
                    await api.postWithToken("userrights", {
                        action: "userrights",
                        user: userName,
                        remove: "flood",
                        reason: "【[[Help:Cat-a-lot|Cat-a-lot]]】：批量分类完成，移除临时机器用户（flood）",
                        tags: this.hasBotRight ? `${API_TAG}|bot` : API_TAG,
                        formatversion: "2",
                    }, { timeout: API_TIMEOUT_MS });
                    this.selfFloodActive = false;
                    if (!userGroups.includes("bot")) {
                        this.hasBotRight = false;
                    }
                    mw.notify(uls("已取消临时机器用户（flood）。", "已取消臨時機器用戶（flood）。"), { type: "info" });
                } catch (err) {
                    mw.notify(uls(`移除临时机器用户失败：${err?.error?.info || err}`, `移除臨時機器用戶失敗：${err?.error?.info || err}`), { type: "warn" });
                }
            },
            buildEditSummary(mode, targetCat) {
                const src = this.pageCategoryName;
                const tgt = targetCat;
                if (mode === "add") {
                    return uls(`[[Help:Cat-a-lot|Cat-a-lot]]：加入分类[[Category:${tgt}]]`, `[[Help:Cat-a-lot|Cat-a-lot]]：加入分類[[Category:${tgt}]]`);
                }
                if (mode === "copy") {
                    return uls(`[[Help:Cat-a-lot|Cat-a-lot]]：分类间复制：从[[Category:${src}]]到[[Category:${tgt}]]`, `[[Help:Cat-a-lot|Cat-a-lot]]：分類間複製：從[[Category:${src}]]到[[Category:${tgt}]]`);
                }
                if (mode === "move") {
                    return uls(`[[Help:Cat-a-lot|Cat-a-lot]]：分类间移动：从[[Category:${src}]]到[[Category:${tgt}]]`, `[[Help:Cat-a-lot|Cat-a-lot]]：分類間移動：從[[Category:${src}]]到[[Category:${tgt}]]`);
                }
                return uls(`[[Help:Cat-a-lot|Cat-a-lot]]：从分类移除：[[Category:${src}]]`, `[[Help:Cat-a-lot|Cat-a-lot]]：從分類移除：[[Category:${src}]]`);
            },
            async runBatch(mode, targetCat = "") {
                if (this.isRunning || this.batchPending) {
                    return;
                }
                this.batchPending = true;
                const batchToken = ++this.activeBatchToken;
                let grantedThisRun = false;

                try {
                    const titles = [...this.selectedTitles];
                    if (titles.length === 0) {
                        await this.askDialog({
                            message: uls("没有选择任何页面或文件！", "沒有選擇任何頁面或文件！"),
                            showCancel: false,
                        });
                        return;
                    }

                    const cleanTarget = mode === "remove" ? "" : validateCategoryTitle(targetCat);
                    if (mode !== "remove" && !cleanTarget) {
                        await this.askDialog({
                            message: uls(
                                "目标分类名称无效（不能包含 [[、]]、{{、}}、| 等特殊字符）。请检查后重试。",
                                "目標分類名稱無效（不能包含 [[、]]、{{、}}、| 等特殊字元）。請檢查後重試。",
                            ),
                            showCancel: false,
                        });
                        return;
                    }

                    // 权限与速率控制（参考 Widget:BatchEdit）
                    if (!this.hasBotRight) {
                        if (this.isSysopOrStaff) {
                            if (titles.length > SYSOP_FLOOD_PROMPT_THRESHOLD) {
                                const ok = await this.askDialog({
                                    message: uls(
                                        `您本次计划批量处理 ${titles.length} 个页面（已超过 10 页）。\n建议临时授权机器用户（flood）以避免近期更改刷屏并豁免速率限制。\n\n是否立即为您自授权 2 小时的机器用户（flood）？`,
                                        `您本次計劃批次處理 ${titles.length} 個頁面（已超過 10 頁）。\n建議臨時授權機器用戶（flood）以避免近期更改洗版並豁免速率限制。\n\n是否立即為您自授權 2 小時的機器用戶（flood）？`,
                                    ),
                                    showCancel: true,
                                });
                                if (this.activeBatchToken !== batchToken) {
                                    return;
                                }
                                if (ok) {
                                    grantedThisRun = await this.grantSelfFlood();
                                    if (this.activeBatchToken !== batchToken) {
                                        return;
                                    }
                                }
                            }
                        } else if (titles.length > NON_BOT_MAX_PAGES) {
                            await this.askDialog({
                                message: uls(
                                    `非机器用户单次最多批量处理 ${NON_BOT_MAX_PAGES} 个页面（当前已选 ${titles.length} 个）。请减少选择数量后再试。`,
                                    `非機器用戶單次最多批次處理 ${NON_BOT_MAX_PAGES} 個頁面（當前已選 ${titles.length} 個）。請減少選擇數量後再試。`,
                                ),
                                showCancel: false,
                            });
                            return;
                        }
                    }

                    const delayMs = this.hasBotRight ? 0 : NON_BOT_DELAY_MS;
                    const skippedAlready = [];
                    const skippedNotFound = [];
                    const skippedServer = [];
                    let doneCount = 0;

                    this.isRunning = true;
                    this.stopRequested = false;
                    this.progressDone = 0;
                    this.progressTotal = titles.length;
                    this.currentEditingTitle = "";

                    for (let i = 0; i < titles.length; i++) {
                        if (this.stopRequested) {
                            break;
                        }
                        const title = titles[i];
                        this.currentEditingTitle = title;
                        let editSubmitted = false;

                        try {
                            const queryRes = await this.trackRequest(api.get({
                                action: "query",
                                prop: "revisions",
                                titles: title,
                                rvprop: "content|timestamp",
                                rvslots: "main",
                                curtimestamp: 1,
                                formatversion: "2",
                            }, { timeout: API_TIMEOUT_MS }));
                            const pageObj = queryRes?.query?.pages?.[0];
                            const rev = pageObj?.revisions?.[0];
                            const content = rev?.slots?.main?.content;
                            if (!pageObj || pageObj.missing || content === undefined) {
                                skippedServer.push(`${title}（页面不存在或无法读取）`);
                            } else {
                                const computed = computeNewWikitext({
                                    text: content,
                                    mode,
                                    sourceCat: this.pageCategoryName,
                                    targetCat: cleanTarget,
                                    doCleanup: this.prefs.docleanup,
                                });

                                if (computed.status === "skipped-already") {
                                    skippedAlready.push(title);
                                } else if (computed.status === "skipped-not-found") {
                                    skippedNotFound.push(title);
                                } else {
                                    const editPayload = {
                                        action: "edit",
                                        title,
                                        text: computed.text,
                                        summary: this.buildEditSummary(mode, cleanTarget),
                                        watchlist: this.prefs.watchlist || "preferences",
                                        nocreate: true,
                                        basetimestamp: rev.timestamp,
                                        starttimestamp: queryRes.curtimestamp,
                                        tags: this.activeTagString,
                                        formatversion: "2",
                                    };
                                    if (this.prefs.minor) {
                                        editPayload.minor = true;
                                    }
                                    if (this.hasBotRight) {
                                        editPayload.bot = true;
                                    }

                                    editSubmitted = true;
                                    const editRes = await this.trackRequest(api.postWithToken("csrf", editPayload, { timeout: API_TIMEOUT_MS }));
                                    if (editRes?.edit?.result === "Success") {
                                        doneCount += 1;
                                        $(`.${CLASS_LABEL}`)
                                            .filter((_, el) => $(el).attr("data-cal-title") === title)
                                            .removeClass(CLASS_SELECTED)
                                            .addClass(CLASS_DONE);
                                    } else {
                                        skippedServer.push(`${title}（${editRes?.error?.info || "未知响应"}）`);
                                    }
                                }
                            }
                        } catch (err) {
                            const isAborted = this.stopRequested && (err === "abort" || err?.statusText === "abort");
                            let reconciled = false;
                            if (editSubmitted && !err?.error?.code) {
                                try {
                                    const verifyRes = await api.get({
                                        action: "query",
                                        prop: "revisions",
                                        titles: title,
                                        rvprop: "content",
                                        rvslots: "main",
                                        formatversion: "2",
                                    }, { timeout: API_TIMEOUT_MS });
                                    const latestText = verifyRes?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
                                    if (
                                        latestText !== undefined
                                        && verifyCommittedOnServer({
                                            latestText,
                                            mode,
                                            sourceCat: this.pageCategoryName,
                                            targetCat: cleanTarget,
                                        })
                                    ) {
                                        doneCount += 1;
                                        $(`.${CLASS_LABEL}`)
                                            .filter((_, el) => $(el).attr("data-cal-title") === title)
                                            .removeClass(CLASS_SELECTED)
                                            .addClass(CLASS_DONE);
                                        reconciled = true;
                                    }
                                } catch {}
                            }
                            if (!reconciled && !isAborted) {
                                skippedServer.push(`${title}（${err?.error?.info || err?.message || err}）`);
                            }
                        }

                        this.progressDone = i + 1;
                        if (delayMs > 0 && i < titles.length - 1 && !this.stopRequested) {
                            await new Promise((resolve) => {
                                this.delayResolver = resolve;
                                this.delayTimer = setTimeout(() => {
                                    this.delayTimer = null;
                                    this.delayResolver = null;
                                    resolve();
                                }, delayMs);
                            });
                        }
                    }

                    this.resultDialog = {
                        open: true,
                        title: this.stopRequested ? uls("已终止处理", "已終止處理") : uls("全部页面已处理", "全部頁面已處理"),
                        summaryText: uls(
                            `成功编辑 ${doneCount} 页；跳过（已在分类中）${skippedAlready.length} 页；跳过（未找到原分类）${skippedNotFound.length} 页；失败 ${skippedServer.length} 页。`,
                            `成功編輯 ${doneCount} 頁；跳過（已在分類中）${skippedAlready.length} 頁；跳過（未找到原分類）${skippedNotFound.length} 頁；失敗 ${skippedServer.length} 頁。`,
                        ),
                        skippedAlready,
                        skippedNotFound,
                        skippedServer,
                    };
                } finally {
                    if (this.activeBatchToken === batchToken) {
                        if (grantedThisRun) {
                            await this.revokeSelfFlood();
                        }
                        if (this.delayTimer) {
                            clearTimeout(this.delayTimer);
                            this.delayTimer = null;
                        }
                        this.delayResolver = null;
                        this.activeRequest = null;
                        this.isRunning = false;
                        this.batchPending = false;
                        this.currentEditingTitle = "";
                        this.syncSelectedTitles();
                    }
                }
            },
        },
        template: `
            <div class="cal-dock" :class="{ 'is-collapsed': !isOpen }">
                <div v-if="isOpen" class="cal-resize-handle" @mousedown="startResize" :title="uls('上下拖拽调整高度', '上下拖曳調整高度')"></div>
                <div class="cal-head">
                    <a class="cal-head-title" href="javascript:void(0)" @click="toggleOpen">
                        <span>Cat-a-lot</span>
                        <span v-if="selectedTitles.length > 0" class="cal-chip cal-chip--notice">{{ selectedTitles.length }}</span>
                    </a>
                    <div class="cal-head-actions">
                        <cdx-button v-if="isOpen" size="small" weight="quiet" type="button" @click="openPrefs" :title="uls('设置', '設置')">⚙</cdx-button>
                        <cdx-button size="small" weight="quiet" type="button" @click="toggleOpen">{{ isOpen ? "▾" : "▴" }}</cdx-button>
                    </div>
                </div>

                <div v-if="isOpen" class="cal-body" :style="{ '--cal-panel-height': panelHeight + 'px' }">
                    <div class="cal-status-row">
                        <cdx-info-chip :status="permissionChipStatus">{{ permissionChipText }}</cdx-info-chip>
                        <span class="cal-hint">{{ selectedCountText }}</span>
                    </div>

                    <div v-if="isRunning" style="display:flex;flex-direction:column;gap:6px;">
                        <div class="cal-status-row">
                            <span class="cal-hint">{{ uls("正在编辑：", "正在編輯：") }}{{ currentEditingTitle }}</span>
                            <span class="cal-hint">{{ progressDone }} / {{ progressTotal }}</span>
                        </div>
                        <cdx-progress-bar :aria-label="'Cat-a-lot progress'"></cdx-progress-bar>
                        <cdx-button size="small" action="destructive" type="button" @click="stopBatch">
                            {{ uls("停止", "停止") }}
                        </cdx-button>
                    </div>

                    <div class="cal-cat-list">
                        <div v-if="isLoadingCats" style="padding:10px;" class="cal-hint">{{ uls("正在加载分类…", "正在加載分類…") }}</div>
                        <div v-else-if="catNotFound" style="padding:10px;font-weight:700;" class="cal-hint">{{ uls("找不到分类。", "找不到分類。") }}</div>
                        <table v-else class="cal-cat-table">
                            <tbody>
                                <tr v-for="p in parentCats" :key="'p-' + p">
                                    <td class="cal-cat-dir">↑</td>
                                    <td class="cal-cat-name"><a @click="loadCategoryTree(p)">{{ p }}</a></td>
                                    <td class="cal-cat-acts">
                                        <a v-if="pageCategoryName" class="cal-cat-act-link" @click="runBatch('copy', p)">{{ uls("复制", "複製") }}</a>
                                        <a v-if="pageCategoryName" class="cal-cat-act-link" @click="runBatch('move', p)">{{ uls("移动", "移動") }}</a>
                                        <a v-else class="cal-cat-act-link" @click="runBatch('add', p)">{{ uls("增加", "增加") }}</a>
                                    </td>
                                </tr>
                                <tr v-if="currentCategory">
                                    <td class="cal-cat-dir">•</td>
                                    <td class="cal-cat-name cal-cat-name--current">{{ currentCategory }}</td>
                                    <td class="cal-cat-acts">
                                        <a v-if="pageCategoryName && currentCategory !== pageCategoryName" class="cal-cat-act-link" @click="runBatch('copy', currentCategory)">{{ uls("复制", "複製") }}</a>
                                        <a v-if="pageCategoryName && currentCategory !== pageCategoryName" class="cal-cat-act-link" @click="runBatch('move', currentCategory)">{{ uls("移动", "移動") }}</a>
                                        <a v-if="!pageCategoryName" class="cal-cat-act-link" @click="runBatch('add', currentCategory)">{{ uls("增加", "增加") }}</a>
                                    </td>
                                </tr>
                                <tr v-for="s in subCats" :key="'s-' + s">
                                    <td class="cal-cat-dir">↓</td>
                                    <td class="cal-cat-name"><a @click="loadCategoryTree(s)">{{ s }}</a></td>
                                    <td class="cal-cat-acts">
                                        <a v-if="pageCategoryName" class="cal-cat-act-link" @click="runBatch('copy', s)">{{ uls("复制", "複製") }}</a>
                                        <a v-if="pageCategoryName" class="cal-cat-act-link" @click="runBatch('move', s)">{{ uls("移动", "移動") }}</a>
                                        <a v-else class="cal-cat-act-link" @click="runBatch('add', s)">{{ uls("增加", "增加") }}</a>
                                    </td>
                                </tr>
                                <tr v-if="!canFetchCategoryMembers && currentCategory">
                                    <td colspan="3" class="cal-hint" style="padding:6px 8px;">
                                        {{ uls("提示：仅维护姬（patroller）及以上用户组可拉取子分类列表，您仍可直接输入目标分类进行操作。", "提示：僅維護姬（patroller）及以上用戶組可拉取子分類列表，您仍可直接輸入目標分類進行操作。") }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="cal-input-wrap">
                        <ul v-if="suggestions.length > 0" class="cal-suggestions">
                            <li
                                v-for="(item, idx) in suggestions"
                                :key="item"
                                :class="{ 'is-active': idx === activeSuggestionIdx }"
                                @mousedown.prevent="pickSuggestion(item)"
                            >{{ item }}</li>
                        </ul>
                        <cdx-text-input
                            v-model="searchInput"
                            :disabled="isRunning"
                            :placeholder="uls('输入分类名称并按回车查找…', '輸入分類名稱並按Enter查找…')"
                            @input="onSearchInputChange"
                            @keydown="onSearchKeydown"
                        ></cdx-text-input>
                    </div>

                    <div class="cal-quick-actions">
                        <div class="cal-selections">
                            <span>{{ uls("选择：", "選擇：") }}</span>
                            <a @click="toggleAll(true)">{{ uls("全部", "全部") }}</a>
                            <span>•</span>
                            <a @click="toggleAll(false)">{{ uls("无", "無") }}</a>
                        </div>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;">
                            <cdx-button
                                v-if="cleanInputCategory && pageCategoryName"
                                size="small"
                                action="progressive"
                                :disabled="isRunning"
                                @click="runBatch('move', cleanInputCategory)"
                            >{{ uls("移动到输入分类", "移動到輸入分類") }}</cdx-button>
                            <cdx-button
                                v-if="cleanInputCategory && !pageCategoryName"
                                size="small"
                                action="progressive"
                                :disabled="isRunning"
                                @click="runBatch('add', cleanInputCategory)"
                            >{{ uls("加入输入分类", "加入輸入分類") }}</cdx-button>
                            <cdx-button
                                v-if="pageCategoryName"
                                size="small"
                                action="destructive"
                                :disabled="isRunning"
                                @click="runBatch('remove')"
                            >{{ uls("从此分类移除", "從此分類移除") }}</cdx-button>
                        </div>
                    </div>
                </div>

                <!-- 设置对话框 -->
                <cdx-dialog
                    :open="prefsOpen"
                    :title="uls('Cat-a-lot 设置', 'Cat-a-lot 設置')"
                    :use-close-button="true"
                    :primary-action="{ label: uls('保存', '保存'), actionType: 'progressive' }"
                    :default-action="{ label: uls('取消', '取消') }"
                    @primary="savePrefsDialog"
                    @default="prefsOpen = false"
                    @update:open="prefsOpen = $event"
                >
                    <div class="cal-prefs-grid">
                        <cdx-field>
                            <template #label>{{ uls("监视列表选项", "監視列表選項") }}</template>
                            <cdx-select v-model:selected="prefsDraft.watchlist" :menu-items="watchlistOptions"></cdx-select>
                        </cdx-field>
                        <cdx-checkbox v-model="prefsDraft.minor">{{ uls("将编辑标记为小修改", "將編輯標記為小修改") }}</cdx-checkbox>
                        <cdx-checkbox v-model="prefsDraft.editpages">{{ uls("允许对非文件页面与子分类进行分类操作", "允許對非文件頁面與子分類進行分類操作") }}</cdx-checkbox>
                        <cdx-checkbox v-model="prefsDraft.docleanup">{{ uls("移除 {{Check categories}} 并进行细节清理", "移除 {{Check categories}} 並進行細節清理") }}</cdx-checkbox>
                        <cdx-field>
                            <template #label>{{ uls("最多显示的子分类数量", "最多顯示的子分類數量") }}</template>
                            <cdx-text-input v-model="prefsDraft.subcatcount" input-type="number"></cdx-text-input>
                        </cdx-field>
                    </div>
                </cdx-dialog>

                <!-- 确认 / 提示对话框 -->
                <cdx-dialog
                    :open="confirmDialog.open"
                    :title="confirmDialog.title"
                    :use-close-button="true"
                    :primary-action="{ label: uls('确定', '確定'), actionType: 'progressive' }"
                    :default-action="confirmDialog.showCancel ? { label: uls('取消', '取消') } : undefined"
                    @primary="resolveConfirmDialog(true)"
                    @default="resolveConfirmDialog(false)"
                    @update:open="(v) => { if (!v) resolveConfirmDialog(false); }"
                >
                    <p class="cal-dialog-text">{{ confirmDialog.message }}</p>
                </cdx-dialog>

                <!-- 结果汇总对话框 -->
                <cdx-dialog
                    :open="resultDialog.open"
                    :title="resultDialog.title"
                    :use-close-button="true"
                    :primary-action="{ label: uls('确定', '確定'), actionType: 'progressive' }"
                    @primary="resultDialog.open = false"
                    @update:open="resultDialog.open = $event"
                >
                    <p class="cal-dialog-text">{{ resultDialog.summaryText }}</p>
                    <div v-if="resultDialog.skippedAlready.length">
                        <strong>{{ uls("已在目标分类中：", "已在目標分類中：") }}</strong>
                        <ul class="cal-result-list"><li v-for="t in resultDialog.skippedAlready" :key="t">{{ t }}</li></ul>
                    </div>
                    <div v-if="resultDialog.skippedNotFound.length">
                        <strong>{{ uls("未找到原分类：", "未找到原分類：") }}</strong>
                        <ul class="cal-result-list"><li v-for="t in resultDialog.skippedNotFound" :key="t">{{ t }}</li></ul>
                    </div>
                    <div v-if="resultDialog.skippedServer.length">
                        <strong>{{ uls("编辑失败：", "編輯失敗：") }}</strong>
                        <ul class="cal-result-list"><li v-for="t in resultDialog.skippedServer" :key="t">{{ t }}</li></ul>
                    </div>
                </cdx-dialog>
            </div>
        `,
    });

    app.component("cdx-button", Codex.CdxButton);
    app.component("cdx-checkbox", Codex.CdxCheckbox);
    app.component("cdx-dialog", Codex.CdxDialog);
    app.component("cdx-field", Codex.CdxField);
    app.component("cdx-info-chip", Codex.CdxInfoChip || FallbackInfoChip);
    app.component("cdx-progress-bar", Codex.CdxProgressBar);
    app.component("cdx-select", Codex.CdxSelect);
    app.component("cdx-text-input", Codex.CdxTextInput);

    app.mount(mountEl);
});
