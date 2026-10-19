import jQuery from "jquery";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { state } from "../src/runtime.ts";
import { CategoryEditor } from "../src/ui/editor.ts";
import { checkMultiInput, makeActive, multiSubmit, setMultiInput, showDab } from "../src/ui/multi.ts";
import { createCommitForm, setup } from "../src/ui/setup.ts";
import { hydrateNamedControls, resetSite } from "./helpers/site.ts";

const setupPage = (): CategoryEditor[] => {
    document.body.innerHTML = "<div id=\"catlinks\"><div id=\"mw-normal-catlinks\"><a href=\"/wiki/Category:X\">X</a><span><a href=\"/wiki/Category:Foo\">Foo</a></span><span><a href=\"/wiki/Category:Bar\">Bar</a></span></div></div>";
    state.pageText = "text\n[[Category:Foo]]\n[[Category:Bar]]";
    setup();
    return state.editors.filter((editor) => !editor.isAddCategory);
};

beforeEach(() => {
    resetSite();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(jQuery, "getJSON").mockImplementation(((_url: string, data: unknown, callback?: unknown) => {
        const cb = typeof data === "function" ? data : callback;
        if (typeof cb === "function") {
            (cb as (json: unknown) => void)({ query: { converted: [] } });
        }
        return {};
    }) as unknown as typeof jQuery.getJSON);
});

describe("setMultiInput / checkMultiInput", () => {
    it("创建保存按钮并替换占位 span", () => {
        setupPage();
        setMultiInput();
        expect(state.commitButton).not.toBeNull();
        expect(state.commitButton?.value).toBe(HC.messages.commit);
        expect(state.multiSpan?.parentNode).toBeNull();
        // 重复调用不会重复创建
        const first = state.commitButton;
        setMultiInput();
        expect(state.commitButton).toBe(first);
    });

    it("有改动才启用", () => {
        const [foo] = setupPage();
        setMultiInput();
        checkMultiInput();
        expect(state.commitButton?.disabled).toBe(true);
        foo.state = CategoryEditor.CHANGED;
        checkMultiInput();
        expect(state.commitButton?.disabled).toBe(false);
    });

    it("上传页不创建保存按钮", () => {
        setupPage();
        state.onUpload = true;
        setMultiInput();
        expect(state.commitButton).toBeNull();
    });
});

describe("makeActive", () => {
    it("激活一个编辑器会停用其它", () => {
        const [foo, bar] = setupPage();
        state.noSuggestions = true;
        foo.display(new MouseEvent("click"));
        bar.display(new MouseEvent("click"));
        makeActive(foo);
        expect(foo.is_active).toBe(true);
        expect(bar.is_active).toBe(false);
        makeActive(bar);
        expect(bar.is_active).toBe(true);
        expect(foo.is_active).toBe(false);
    });

    it("输入被外部改写时重置 lastInput 并收起列表", () => {
        const [foo] = setupPage();
        state.noSuggestions = true;
        foo.display(new MouseEvent("click"));
        foo.text.value = "Changed|key";
        foo.showsList = true;
        const spy = vi.spyOn(foo, "displayList");
        makeActive(foo);
        expect(foo.lastInput).toBe("Changed");
        expect(foo.currentKey).toBe("key");
        expect(foo.showsList).toBe(false);
        expect(spy).not.toHaveBeenCalled();
    });

    it("输入未变且列表已展开时重新定位列表", () => {
        const [foo] = setupPage();
        state.noSuggestions = true;
        foo.display(new MouseEvent("click"));
        foo.showsList = true;
        const spy = vi.spyOn(foo, "displayList");
        makeActive(foo);
        expect(spy).toHaveBeenCalled();
    });
});

describe("showDab", () => {
    it("用候选列表填充下拉并清空 dab", () => {
        const [foo] = setupPage();
        state.noSuggestions = false;
        vi.spyOn(jQuery, "ajax").mockImplementation(() => ({}) as unknown as JQuery.jqXHR);
        foo.display(new MouseEvent("click"));
        foo.dab = ["A", "B"];
        showDab(foo);
        expect(foo.dab).toBeNull();
        expect(foo.list?.options.length).toBe(2);
        expect(foo.list?.options[0].text).toBe("A");
    });
});

describe("multiSubmit", () => {
    it("没有待解析编辑器时直接进入保存流程", async () => {
        setupPage();
        createCommitForm();
        const form = state.commitForm as unknown as HTMLFormElement;
        hydrateNamedControls(form);
        (form.hcCommit as HTMLInputElement).click = vi.fn();
        const pageJson = {
            query: {
                pages: { 1: { revisions: [{ slots: { main: { "*": "text\n[[Category:Foo]]\n[[Category:Bar]]" } }, revid: 100 }] } },
                general: { time: "2026-10-19T00:00:00Z" },
                tokens: { csrftoken: "tok" },
            },
        };
        vi.spyOn(jQuery, "getJSON").mockReturnValue(Promise.resolve(pageJson) as unknown as JQuery.jqXHR);

        multiSubmit();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect((form.hcCommit as HTMLInputElement).click).toHaveBeenCalled();
    });
});
