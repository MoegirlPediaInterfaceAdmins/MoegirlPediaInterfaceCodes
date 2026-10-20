import { beforeEach, describe, expect, it } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { applyLocalization } from "../src/config/i18n.ts";
import { site } from "../src/runtime.ts";
import { initialize } from "../src/core/initialize.ts";
import { suggestionConfigs } from "../src/api/suggestions.ts";
import { resetSite } from "./helpers/site.ts";

beforeEach(() => {
    resetSite();
    Reflect.deleteProperty(window, "hotcat_no_autocommit");
    Reflect.deleteProperty(window, "hotcat_del_needs_diff");
    Reflect.deleteProperty(window, "hotcat_list_size");
    Reflect.deleteProperty(window, "hotcat_suggestions");
    Reflect.deleteProperty(window, "hotcat_suggestions_fixed");
    Reflect.deleteProperty(window, "hotcat_use_category_links");
    Reflect.deleteProperty(window, "hotcat_suggestion_delay");
    Reflect.deleteProperty(window, "hotcat_editbox_width");
    Reflect.deleteProperty(window, "hotcat_single_changes_are_minor");
    Reflect.deleteProperty(window, "hotcat_dont_add_to_watchlist");
    Reflect.deleteProperty(window, "hotcat_changed_background");
});

describe("HC 默认值", () => {
    it("保留英文默认文案与 URL 之外的运行期配置", () => {
        // resetSite 已经应用中文覆盖，这里只校验不受覆盖影响的字段
        expect(HC.links).toEqual({
            change: "(±)",
            remove: "(−)",
            add: "(+)",
            restore: "(×)",
            undo: "(×)",
            down: "(↓)",
            up: "(↑)",
        });
        expect(HC.automationChangeTag).toBe("Automation tool");
        expect(HC.existsYes).toContain("P_yes.svg");
        expect(HC.existsNo).toContain("P_no.svg");
        expect(HC.wikitextContentModels).toEqual(["wikitext"]);
    });

    it("isSupportedContentModel 按当前页面的 contentModel 判定", () => {
        site.conf.wgPageContentModel = "wikitext";
        expect(HC.isSupportedContentModel()).toBe(true);
        site.conf.wgPageContentModel = "Map.JsonConfig";
        expect(HC.isSupportedContentModel()).toBe(false);
        site.conf.wgPageContentModel = "css";
        expect(HC.isSupportedContentModel()).toBe(false);
    });

    it("disable() 覆盖模板/模块/界面消息/用户 JS 等命名空间", () => {
        site.conf.wgNamespaceIds = { ...site.conf.wgNamespaceIds, module: 828, mediawiki: 8, user: 2, template: 10 };
        site.conf.wgNamespaceNumber = 828;
        expect(HC.disable()).toBe(true);
        site.conf.wgNamespaceNumber = 8;
        expect(HC.disable()).toBe(true);
        site.conf.wgNamespaceNumber = 2;
        site.conf.wgTitle = "Alice/common.js";
        expect(HC.disable()).toBe(true);
        site.conf.wgTitle = "Alice";
        expect(HC.disable()).toBe(false);
        site.conf.wgNamespaceNumber = -1;
        expect(HC.disable()).toBe(true);
    });

    it("File 命名空间只在新页面（无 articleId）时禁用", () => {
        site.conf.wgNamespaceIds = { ...site.conf.wgNamespaceIds, file: 6 };
        site.conf.wgNamespaceNumber = 6;
        site.conf.wgArticleId = 0;
        expect(HC.disable()).toBe(true);
        site.conf.wgArticleId = 1;
        expect(HC.disable()).toBe(false);
    });
});

describe("简体中文覆盖层", () => {
    it("默认值即为简体中文文案", () => {
        expect(HC.messages.cat_added).toBe("添加[[分类:$1]]");
        expect(HC.messages.commit).toBe("保存");
        expect(HC.categories).toBe("分类");
        expect(HC.multi_tooltip).toBe("修改多个分类");
        expect(HC.engine_names.searchindex).toBe("搜索索引");
        expect(HC.blacklist).toBeInstanceOf(RegExp);
    });

    it("浅拷贝不会清掉未覆盖的块（links / existsYes）", () => {
        expect(HC.links.add).toBe("(+)");
        expect(HC.existsYes).toContain("P_yes.svg");
    });

    it("繁体变体应用繁体覆盖（覆盖为单向合并，简体默认值无需覆盖）", () => {
        site.conf.wgUserLanguage = "zh-hans";
        applyLocalization();
        expect(HC.messages.commit).toBe("保存");
        site.conf.wgUserLanguage = "zh-hant";
        applyLocalization();
        expect(HC.categories).toBe("分類");
        expect(HC.messages.commit).toBe("儲存");
    });
});

describe("addShortcuts", () => {
    it("写入 window.HotCat.shortcuts 并去掉首尾空白", () => {
        HC.addShortcuts({ " foo ": "  Alpha  ", bar: "Beta" });
        expect(window.HotCat).toBe(HC);
        expect(HC.shortcuts).toEqual({ foo: "Alpha", bar: "Beta" });
    });

    it("忽略非字符串值与空白键", () => {
        HC.shortcuts = null;
        HC.addShortcuts({ a: 1 as unknown as string, "  ": "X", b: "  ", c: "C" });
        expect(HC.shortcuts).toEqual({ c: "C" });
    });

    it("map 为空时直接返回", () => {
        HC.shortcuts = null;
        HC.addShortcuts(null);
        expect(HC.shortcuts).toBeNull();
    });
});

describe("initialize：window 覆盖与边界", () => {
    it("读取 window.hotcat_* 并规范化 listSize", () => {
        window.hotcat_list_size = "10";
        window.hotcat_no_autocommit = false;
        window.hotcat_use_category_links = false;
        initialize();
        expect(HC.listSize).toBe(10);
        expect(HC.no_autocommit).toBe(false);
        expect(HC.use_up_down).toBe(false);
    });

    it("listSize 落在 [5, 30]", () => {
        window.hotcat_list_size = "3";
        initialize();
        expect(HC.listSize).toBe(5);
        window.hotcat_list_size = "100";
        initialize();
        expect(HC.listSize).toBe(30);
    });

    it("listSize 按 parseInt 解析", () => {
        window.hotcat_list_size = "10px";
        initialize();
        expect(HC.listSize).toBe(10);
    });

    it("非法 suggestions 回落到 combined", () => {
        window.hotcat_suggestions = "nope";
        initialize();
        expect(HC.suggestions).toBe("combined");
    });

    it("合法 suggestions 保留", () => {
        window.hotcat_suggestions = "pagelist";
        initialize();
        expect(HC.suggestions).toBe("pagelist");
    });

    it("把 engine_names 写进建议方案", () => {
        HC.engine_names = { ...HC.engine_names, searchindex: "自定义搜索" };
        initialize();
        expect(suggestionConfigs.searchindex.name).toBe("自定义搜索");
        // 复原
        suggestionConfigs.searchindex.name = "搜索索引";
    });

    it("从 body 计算 rtl", () => {
        document.body.dir = "rtl";
        document.body.className = "rtl";
        initialize();
        expect(HC.listSize).toBeGreaterThanOrEqual(5);
        document.body.className = "";
        document.body.dir = "";
    });
});

describe("initialize：changeTag 分支", () => {
    it("非 commons 站点无配置时清空 changeTag", () => {
        HC.changeTag = "HotCat";
        initialize();
        expect(HC.changeTag).toBe("");
    });

    it("JSconfig 配置的 changeTag 会保留", () => {
        window.JSconfig = { keys: { HotCatChangeTag: "HC" } };
        initialize();
        expect(HC.changeTag).toBe("HC");
        Reflect.deleteProperty(window, "JSconfig");
    });

    it("编辑页提交时给 wpAutoSummary 打散并注入 wpChangeTags", () => {
        window.JSconfig = { keys: { HotCatChangeTag: "HC" } };
        document.body.innerHTML = "<form id=\"editform\"><input name=\"wpTextbox1\" value=\"text\"><input name=\"wpSummary\" value=\"x\"><input name=\"wpAutoSummary\" value=\"HC\"><input id=\"wpSave\" type=\"submit\"></form><div id=\"wikiDiff\"></div>";
        const form = document.getElementById("editform") as HTMLFormElement;
        const summary = form.elements.namedItem("wpSummary") as HTMLInputElement;
        const autoSummary = form.elements.namedItem("wpAutoSummary") as HTMLInputElement;
        const textbox = form.elements.namedItem("wpTextbox1") as HTMLInputElement;
        // 补上表单的具名控件
        Object.defineProperties(form, {
            wpTextbox1: { value: textbox, configurable: true },
            wpSummary: { value: summary, configurable: true },
            wpAutoSummary: { value: autoSummary, configurable: true },
        });
        (document as unknown as { editform: HTMLFormElement }).editform = form;
        site.conf.wgAction = "submit";
        site.conf.wgArticleId = 1;
        initialize();
        expect(autoSummary.value).toBe("d41d8cd98f00b204e9800998ecf8427e");
        expect(summary.value).toBe("x");
        // 注入的隐藏字段
        expect(form.querySelector('input[name="wpChangeTags"]')).not.toBeNull();
        Reflect.deleteProperty(document, "editform");
        Reflect.deleteProperty(window, "JSconfig");
    });
});
