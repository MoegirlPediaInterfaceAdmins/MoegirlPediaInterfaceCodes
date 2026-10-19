import jQuery from "jquery";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryEditor } from "../src/ui/editor.ts";
import { HC } from "../src/config/hotcat.ts";
import { state } from "../src/runtime.ts";
import { CATLINKS_HTML, resetSite } from "./helpers/site.ts";
import type { TitleList } from "../src/types.ts";

const titles = (...items: string[]): TitleList => [...items] as TitleList;

/** 建立分类栏与一个已有分类的编辑器 */
const makeEditor = (category = "Foo", key: string | null = null): { editor: CategoryEditor; line: HTMLElement } => {
    document.body.innerHTML = CATLINKS_HTML;
    const line = document.getElementById("mw-normal-catlinks")!;
    const span = line.getElementsByTagName("span")[0];
    const editor = new CategoryEditor(line, span, category, key, false);
    return { editor, line };
};

beforeEach(() => {
    resetSite();
    // 编辑器用例不触网：所有建议请求在 noSuggestions 下短路
    state.noSuggestions = true;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

describe("构造", () => {
    it("新建入口生成「+」链接并加入 editors", () => {
        document.body.innerHTML = CATLINKS_HTML;
        const line = document.getElementById("mw-normal-catlinks")!;
        const editor = new CategoryEditor(line, null, null, false);
        expect(editor.isAddCategory).toBe(true);
        expect(state.editors).toContain(editor);
        expect(line.querySelector(`a[title="${HC.tooltips.add}"]`)).not.toBeNull();
    });

    it("已有分类解析出原名与索引", () => {
        const { editor } = makeEditor("Foo", "|K");
        expect(editor.isAddCategory).toBe(false);
        expect(editor.originalCategory).toBe("Foo");
        expect(editor.originalKey).toBe("K");
        expect(editor.currentCategory).toBe("Foo");
        expect(editor.state).toBe(CategoryEditor.UNCHANGED);
    });
});

describe("展开表单", () => {
    it("open 显示表单并隐藏普通链接", () => {
        const { editor } = makeEditor();
        const result = editor.open(new MouseEvent("click"));
        expect(result).toBe(false);
        expect(editor.form).not.toBeNull();
        expect(editor.form?.style.display).toBe("inline");
        expect(editor.linkSpan.style.display).toBe("none");
        expect(editor.text.value).toBe("Foo");
    });

    it("show 支持只读模式", () => {
        const { editor } = makeEditor();
        editor.show(new MouseEvent("click"), "subcat", true);
        expect(editor.text.readOnly).toBe(true);
    });

    it("引擎下拉可切换方案", () => {
        state.noSuggestions = false;
        vi.spyOn(jQuery, "ajax").mockImplementation(() => ({}) as unknown as JQuery.jqXHR);
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.selectEngine("pagelist");
        expect(editor.engineSelector?.value).toBe("pagelist");
    });

    it("确定/取消按钮与表单提交的处理器绑定到编辑器实例（拆分回归）", () => {
        const { editor } = makeEditor();
        editor.display(new MouseEvent("click"));
        // buildForm 是模块级函数：处理器必须绑定到 editor 而不是模块 this
        const invoke = (handler: unknown, type: string): void => {
            const bound = handler as (this: unknown, ev: Event) => void;
            Reflect.apply(bound, undefined, [new Event(type)]);
        };
        expect(() => {
            invoke(editor.ok.onclick, "click");
        }).not.toThrow();
        expect(() => {
            invoke(editor.cancelButton.onclick, "click");
        }).not.toThrow();
        expect(() => {
            invoke(editor.form?.onsubmit ?? null, "submit");
        }).not.toThrow();
    });

    it("display 会把普通链接收起并记录初始状态", () => {
        const { editor } = makeEditor();
        editor.display(new MouseEvent("click"));
        expect(editor.originalState).toBe(CategoryEditor.UNCHANGED);
        expect(editor.state).toBe(CategoryEditor.OPEN);
    });
});

describe("输入清洗与接受", () => {
    it("去掉命名空间前缀并大写首字母（下划线留到 acceptCheck 再转空格）", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "  Category:foo_bar ";
        editor.sanitizeInput();
        expect(editor.text.value).toBe("Foo_bar ");
        expect(editor.acceptCheck()).toBe(true);
        expect(editor.currentCategory).toBe("Foo bar");
    });

    it("接受后写入 currentCategory", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "Bar";
        expect(editor.acceptCheck()).toBe(true);
        expect(editor.currentCategory).toBe("Bar");
        expect(editor.currentExists).toBe(true);
    });

    it("空输入取消编辑", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "   ";
        expect(editor.acceptCheck()).toBe(false);
    });

    it("命中黑名单时取消", () => {
        HC.blacklist = /Bad/;
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "Bad page";
        expect(editor.acceptCheck()).toBe(false);
    });

    it("分类命名空间下不能把自己加入自己", () => {
        resetSite({ wgNamespaceNumber: 14, wgTitle: "Foo" });
        state.noSuggestions = true;
        const { editor } = makeEditor("Bar");
        editor.open(new MouseEvent("click"));
        editor.text.value = "Foo";
        expect(editor.acceptCheck()).toBe(false);
    });

    it("dontCheck 跳过当前页校验", () => {
        resetSite({ wgNamespaceNumber: 14, wgTitle: "Foo" });
        state.noSuggestions = true;
        const { editor } = makeEditor("Bar");
        editor.open(new MouseEvent("click"));
        editor.text.value = "Foo";
        expect(editor.acceptCheck(true)).toBe(true);
        expect(editor.currentCategory).toBe("Foo");
    });
});

describe("删除与恢复", () => {
    it("多选模式下删除只改状态，restore 可撤销", () => {
        const { editor } = makeEditor();
        state.commitButton = document.createElement("input");
        editor.doRemove(false);
        expect(editor.state).toBe(CategoryEditor.DELETED);
        expect(editor.normalLinks.style.display).toBe("none");
        expect(editor.undelLink?.style.display).toBe("");
        editor.restore(new Event("click"));
        expect(editor.state).toBe(CategoryEditor.UNCHANGED);
        expect(editor.normalLinks.style.display).toBe("");
        expect(editor.undelLink?.style.display).toBe("none");
    });

    it("新建入口删除等价于取消（移除编辑器）", () => {
        document.body.innerHTML = CATLINKS_HTML;
        const line = document.getElementById("mw-normal-catlinks")!;
        const editor = new CategoryEditor(line, null, null, false);
        editor.doRemove(false);
        expect(state.editors).not.toContain(editor);
    });
});

describe("收起与回退", () => {
    it("close 把当前值写回链接并标记 CHANGED", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "Bar";
        editor.acceptCheck();
        editor.close();
        expect(editor.state).toBe(CategoryEditor.CHANGED);
        expect(editor.catLink?.textContent).toBe("Bar");
        expect(editor.catLink?.className).toBe("");
        expect(editor.undoLink).not.toBeNull();
    });

    it("rollback 回到原始分类", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "Bar";
        editor.acceptCheck();
        editor.close();
        editor.rollback(new Event("click"));
        expect(editor.state).toBe(CategoryEditor.UNCHANGED);
        expect(editor.currentCategory).toBe("Foo");
        expect(editor.catLink?.textContent).toBe("Foo");
    });

    it("commit 在分类未变化时走取消", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.acceptCheck();
        editor.commit();
        expect(editor.state).toBe(CategoryEditor.UNCHANGED);
    });
});

describe("建议列表", () => {
    beforeEach(() => {
        state.noSuggestions = false;
        // 打桩建议请求
        vi.spyOn(jQuery, "ajax").mockImplementation(() => ({}) as unknown as JQuery.jqXHR);
    });

    it("唯一候选自动补全并收起列表", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "Fo";
        editor.showSuggestions(titles("Foo"), false, "Fo", "combined");
        expect(editor.text.value).toBe("Foo");
        expect(editor.lastInput).toBe("Foo");
    });

    it("多候选按前缀排序并选中第一个", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "Fo";
        editor.showSuggestions(titles("Foobar", "Foo"), false, "Fo", "combined");
        expect(editor.list?.options.length).toBe(2);
        expect(editor.list?.options[0].text).toBe("Foo");
        expect(editor.list?.options[0].selected).toBe(true);
    });

    it("highlightSuggestion / resetKeySelection 在列表中移动", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.text.value = "Fo";
        editor.showSuggestions(titles("Foo", "Foobar"), false, "Fo", "combined");
        expect(editor.highlightSuggestion(1)).toBe(true);
        expect(editor.text.value).toBe("Foobar");
        expect(editor.resetKeySelection()).toBe(true);
        // 回到「上一次真实输入」——此时它已被首个候选的自动补全改写为 Foo
        expect(editor.text.value).toBe("Foo");
    });

    it("engine 配置失效时回落到 combined", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        HC.suggestions = "bogus";
        editor.engine = "bogus";
        editor.text.value = "Foo";
        expect(() => {
            editor.textchange(false, true);
        }).not.toThrow();
        HC.suggestions = "combined";
    });

    it("noSuggestions 时隐藏图标与列表", () => {
        const { editor } = makeEditor();
        editor.open(new MouseEvent("click"));
        editor.showSuggestions(titles("Foo"), false, "Fo", "combined");
        state.noSuggestions = true;
        editor.showSuggestions(titles("Foo"), false, "Fo", "combined");
        expect(editor.icon.style.display).toBe("none");
    });
});
