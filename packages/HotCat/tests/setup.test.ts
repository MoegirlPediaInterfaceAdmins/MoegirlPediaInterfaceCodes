import jQuery from "jquery";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { state } from "../src/runtime.ts";
import { CategoryEditor } from "../src/ui/editor.ts";
import { closeForm, createCommitForm, getState, setState, setup, setupUpload } from "../src/ui/setup.ts";
import { CATLINKS_HTML, hydrateNamedControls, resetSite } from "./helpers/site.ts";

/** 让 setup 里的 converted-titles 请求立即返回空转换表 */
const stubGetJson = (): void => {
    vi.spyOn(jQuery, "getJSON").mockImplementation(((_url: string, data: unknown, callback?: unknown) => {
        const cb = typeof data === "function" ? data : callback;
        if (typeof cb === "function") {
            (cb as (json: unknown) => void)({ query: { converted: [] } });
        }
        return {};
    }) as unknown as typeof jQuery.getJSON);
};

beforeEach(() => {
    resetSite();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    stubGetJson();
});

describe("setup", () => {
    it("为页面上的每个分类建立编辑器，并补一个「+」入口", () => {
        document.body.innerHTML = "<div id=\"catlinks\"><div id=\"mw-normal-catlinks\"><a href=\"/wiki/Category:X\">X</a><span><a href=\"/wiki/Category:Foo\">Foo</a></span><span><a href=\"/wiki/Category:Bar\">Bar</a></span></div></div>";
        state.pageText = "text\n[[Category:Foo]]\n[[Category:Bar]]";
        setup();
        expect(state.initialized).toBe(true);
        expect(state.editors).toHaveLength(3);
        expect(state.editors.filter((editor) => !editor.isAddCategory)).toHaveLength(2);
        expect(state.catLine).not.toBeNull();
    });

    it("重复调用只装配一次", () => {
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "[[Category:Foo]]";
        setup();
        const count = state.editors.length;
        setup();
        expect(state.editors).toHaveLength(count);
    });

    it("没有分类栏时挂到 printfooter 之后", () => {
        document.body.innerHTML = "<div class=\"printfooter\">footer</div>";
        state.pageText = "";
        setup();
        expect(state.catLine?.id).toBe("mw-normal-catlinks");
        expect(document.querySelector(".catlinks")).not.toBeNull();
    });

    it("没有 printfooter 也没有分类栏时直接返回", () => {
        document.body.innerHTML = "";
        state.pageText = "";
        setup();
        expect(state.initialized).toBe(true);
        expect(state.catLine).toBeNull();
    });

    it("Moeskin 的隐藏分类容器参与装配", () => {
        // 隐藏分类容器独立于分类栏（与 Moeskin 实际结构一致：catlinks 只含可见分类）
        document.body.innerHTML = "<div id=\"catlinks\"><div id=\"mw-normal-catlinks\"><span><a href=\"/wiki/Category:Foo\">Foo</a></span></div></div><div class=\"hidden-wrap\"><div class=\"mw-catlinks-hidden\"><span><a href=\"/wiki/Category:Hidden\">Hidden</a></span></div></div>";
        state.pageText = "[[Category:Foo]]\n[[Category:Hidden]]";
        setup();
        const hidden = state.editors.find((editor) => editor.originalCategory === "Hidden");
        expect(hidden).toBeDefined();
        expect(hidden?.originalHidden).toBe(true);
    });

    it("触发 hotcat.ready 钩子与 jQuery 事件", () => {
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "";
        const fire = vi.fn();
        const hook = vi.fn(() => ({ add: vi.fn(), fire }));
        vi.stubGlobal("mw", { ...(globalThis.mw as unknown as Record<string, unknown>), hook });
        const triggered = vi.fn();
        jQuery(document.body).on("hotcatSetupCompleted", triggered);
        setup();
        expect(hook).toHaveBeenCalledWith("hotcat.ready");
        expect(fire).toHaveBeenCalled();
        expect(triggered).toHaveBeenCalled();
        jQuery(document.body).off("hotcatSetupCompleted", triggered);
    });

    it("自定义 additionalWork 在装配完成后执行", () => {
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "";
        const work = vi.fn();
        setup(work);
        expect(work).toHaveBeenCalledTimes(1);
    });
});

describe("getState / setState", () => {
    it("按编辑器顺序输出 分类|索引", () => {
        document.body.innerHTML = "<div id=\"catlinks\"><div id=\"mw-normal-catlinks\"><span><a href=\"/wiki/Category:Foo\">Foo</a></span><span><a href=\"/wiki/Category:Bar\">Bar</a></span></div></div>";
        state.pageText = "[[Category:Foo|K]]\n[[Category:Bar]]";
        setup();
        expect(getState()).toBe("Foo|K\nBar");
    });

    it("空页面上 setState 用给定分类重建编辑器", () => {
        document.body.innerHTML = "<div id=\"catlinks\"><div id=\"mw-normal-catlinks\"><a href=\"/wiki/Category:X\">X</a></div></div>";
        state.pageText = "";
        setup();
        expect(state.editors).toHaveLength(1);
        expect(setState("A\nB")).toBeNull();
        // 原有「+」入口保留，新增两个分类编辑器
        expect(state.editors).toHaveLength(3);
        expect(getState()).toBe("A\nB");
    });
});

describe("createCommitForm", () => {
    it("按 contentModel 生成 action / model / format", () => {
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "";
        setup();
        createCommitForm();
        const form = state.commitForm!;
        hydrateNamedControls(form);
        expect(form).not.toBeNull();
        expect(form.wpTextbox1).toBeInstanceOf(HTMLInputElement);
        expect(form.wpMinoredit.type).toBe("checkbox");
        expect(form.hcCommit.value).toBe("hcCommit");
        const container = document.getElementById("hotcatCommitForm") as HTMLFormElement;
        expect(container.getAttribute("action")).toContain("TestPage");
        expect((container.elements.namedItem("model") as HTMLInputElement).value).toBe("wikitext");
        expect((container.elements.namedItem("format") as HTMLInputElement).value).toBe("text/x-wiki");
    });

    it("重复调用不会重复插入表单", () => {
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "";
        setup();
        createCommitForm();
        createCommitForm();
        expect(document.querySelectorAll("#hotcatCommitForm")).toHaveLength(1);
    });
});

describe("closeForm", () => {
    it("关闭所有展开中的表单", () => {
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "[[Category:Foo]]";
        setup();
        const editor = state.editors.find((item) => !item.isAddCategory)!;
        editor.open(new MouseEvent("click"));
        expect(editor.form?.style.display).toBe("inline");
        closeForm();
        expect(editor.form?.style.display).toBe("none");
        expect(editor.state).toBe(CategoryEditor.UNCHANGED);
    });

    it("CHANGE_PENDING 时把输入写回编辑器并收起", () => {
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "[[Category:Foo]]";
        setup();
        const editor = state.editors.find((item) => !item.isAddCategory)!;
        editor.open(new MouseEvent("click"));
        editor.text.value = "Bar";
        editor.state = CategoryEditor.CHANGE_PENDING;
        closeForm();
        expect(editor.currentCategory).toBe("Bar");
        expect(editor.state).toBe(CategoryEditor.CHANGED);
    });

    it("CHANGE_PENDING 且输入为空时取消编辑", () => {
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "[[Category:Foo]]";
        setup();
        const editor = state.editors.find((item) => !item.isAddCategory)!;
        editor.open(new MouseEvent("click"));
        editor.text.value = "";
        editor.state = CategoryEditor.CHANGE_PENDING;
        closeForm();
        expect(editor.state).toBe(CategoryEditor.UNCHANGED);
    });
});

describe("setupUpload", () => {
    it("提交时剥离以 --!> 结束的 HTML 注释，注释里的分类不算已存在", () => {
        document.body.innerHTML = "<div id=\"catlinks\"><div id=\"mw-normal-catlinks\"><span><a href=\"/wiki/Category:Foo\">Foo</a></span></div></div><form id=\"mw-upload-form\"><table id=\"mw-htmlform-description\"><tr><td><textarea id=\"wpUploadDescription\"></textarea></td></tr></table></form>";
        state.pageText = "[[Category:Foo]]";
        setup();
        setupUpload();
        const textarea = document.getElementById("wpUploadDescription") as HTMLTextAreaElement;
        // MediaWiki 渲染时会把 <!--…--!> 整体当注释剥掉，其中的分类不生效
        textarea.value = "<!--[[Category:Foo]]--!>";
        const form = document.getElementById("mw-upload-form") as HTMLFormElement;
        const handler = form.onsubmit as unknown as (this: HTMLFormElement, evt: Event) => boolean;
        Reflect.apply(handler, form, [new Event("submit")]);
        expect(textarea.value).toBe("<!--[[Category:Foo]]--!>\n[[Category:Foo]]");
    });
});

describe("隐藏分类与模板分类的展示差异", () => {
    it("模板分类不生成「修改」链接（仍保留「移除」）", () => {
        HC.template_categories = { Foo: "Foo" };
        document.body.innerHTML = CATLINKS_HTML;
        state.pageText = "[[Category:Foo]]";
        setup();
        const editor = state.editors.find((item) => item.originalCategory === "Foo")!;
        expect(editor.normalLinks.querySelector(`a[title="${HC.tooltips.change}"]`)).toBeNull();
        expect(editor.normalLinks.querySelector(`a[title="${HC.tooltips.remove}"]`)).not.toBeNull();
    });
});
