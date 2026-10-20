import jQuery from "jquery";
import { vi } from "vitest";
import { HC } from "../../src/config/hotcat.ts";
import { applyLocalization } from "../../src/config/i18n.ts";
import { site, state } from "../../src/runtime.ts";
import { initLocalization } from "../../src/wikitext/patterns.ts";
import type { CommitForm, SiteConfig } from "../../src/types.ts";

export const TEST_CONF: SiteConfig = {
    wgAction: "view",
    wgArticleId: 1,
    wgArticlePath: "/wiki/$1",
    wgCanonicalSpecialPageName: false,
    wgCurRevisionId: 100,
    wgDBname: "moegirl",
    skin: "moeskin",
    wgFormattedNamespaces: { 0: "", 2: "User", 10: "Template", 14: "Category" },
    wgIsArticle: true,
    wgNamespaceIds: { "": 0, user: 2, template: 10, category: 14 },
    wgNamespaceNumber: 0,
    wgPageContentModel: "wikitext",
    wgPageName: "TestPage",
    wgScript: "/index.php",
    wgScriptPath: "/w",
    wgServer: "https://zh.moegirl.org.cn",
    wgTitle: "TestPage",
    wgUserLanguage: "zh",
    wgUserName: "Alice",
};

export const CATLINKS_HTML = "<div id=\"catlinks\" class=\"catlinks noprint\"><div id=\"mw-normal-catlinks\"><a href=\"/wiki/Category:X\">X</a><span><a href=\"/wiki/Category:Foo\">Foo</a></span></div></div><a id=\"ca-edit\">edit</a>";

/** mw 的最小桩：Title 规范化、钩子、复数、配置读写 */
export const installMw = (conf: SiteConfig = TEST_CONF): void => {
    vi.stubGlobal("$", jQuery);
    vi.stubGlobal("mw", {
        config: {
            values: { ...conf },
            set: vi.fn(),
        },
        user: { getRights: vi.fn(() => Promise.resolve(["autopatrol"])) },
        hook: vi.fn(() => ({ add: vi.fn(), fire: vi.fn() })),
        language: { convertPlural: vi.fn((_count: number, forms: string[]) => forms[0]) },
        Title: {
            // 模拟 MW 的规范化：命名空间别名归一 + 首字母大写
            newFromText: (title: string) => ({
                getPrefixedText: () => {
                    const match = /^([^:]+):(.*)$/.exec(title);
                    if (!match) {
                        return title;
                    }
                    const namespace = /^category$/i.test(match[1]) ? "Category" : match[1];
                    const page = match[2].charAt(0).toUpperCase() + match[2].slice(1);
                    return `${namespace}:${page}`;
                },
            }),
        },
    });
};

/** 补上表单的具名控件属性。 */
export const hydrateNamedControls = (form: HTMLFormElement | CommitForm): void => {
    const element = form as unknown as HTMLFormElement;
    for (const control of Array.from(element.elements)) {
        if (control instanceof HTMLInputElement && control.name) {
            Reflect.defineProperty(form, control.name, { value: control, configurable: true });
        }
    }
};

/** 复位运行时状态并注入站点上下文 + 本地化 */
export const resetSite = (overrides: Partial<SiteConfig> = {}): void => {
    const conf = { ...TEST_CONF, ...overrides };
    site.conf = conf;
    site.skin = conf.skin;
    site.expandedScriptPrefix = new URL(conf.wgScript, "https://zh.moegirl.org.cn/TestPage").href;
    site.expandedArticlePrefix = new URL(conf.wgArticlePath.replace("$1", ""), "https://zh.moegirl.org.cn/TestPage").href;
    site.isWebkit = false;

    state.cat_prefix = null;
    state.noSuggestions = false;
    state.interlanguageRE = null;
    state.catLine = null;
    state.onUpload = false;
    state.editors = [];
    state.commitButton = null;
    state.commitForm = null;
    state.multiSpan = null;
    state.pageText = null;
    state.pageTime = null;
    state.pageWatched = false;
    state.watchCreate = false;
    state.watchCreateExpiry = "";
    state.watchEdit = false;
    state.watchDefaultExpiry = "";
    state.minorEdits = false;
    state.editToken = null;
    state.is_rtl = false;
    state.serverTime = null;
    state.lastRevId = null;
    state.pageTextRevId = null;
    state.conflictingUser = null;
    state.newDOM = false;
    state.saveInProgress = false;
    state.initialized = false;
    state.setupTimeout = null;
    state.cleanedText = null;

    HC.capitalizePageNames = null;
    HC.shortcuts = null;
    HC.template_categories = {};
    HC.capitalizePageNames = true;
    HC.listSize = 5;
    HC.suggestions = "combined";
    HC.use_up_down = true;
    HC.fixed_search = false;
    HC.no_autocommit = true;
    HC.del_needs_diff = true;
    HC.changeTag = "HotCat";

    installMw(conf);
    applyLocalization();
    initLocalization();
    // 生产环境由 bootstrap 赋值；addShortcuts / initialize 会读 window.HotCat
    window.HotCat = HC;
};
