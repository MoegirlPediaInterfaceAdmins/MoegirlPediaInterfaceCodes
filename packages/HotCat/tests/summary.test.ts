import jQuery from "jquery";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HC } from "../src/config/hotcat.ts";
import { site, state } from "../src/runtime.ts";
import { CategoryEditor } from "../src/ui/editor.ts";
import { createCommitForm, setup } from "../src/ui/setup.ts";
import { currentTimestamp, multiChangeMsg, performChanges } from "../src/api/summary.ts";
import { hydrateNamedControls, resetSite } from "./helpers/site.ts";
import type { CommitForm } from "../src/types.ts";

/** 装配一页并按需把编辑器推进到指定状态 */
const setupPage = (pageText: string): CategoryEditor[] => {
    document.body.innerHTML = "<div id=\"catlinks\"><div id=\"mw-normal-catlinks\"><a href=\"/wiki/Category:X\">X</a><span><a href=\"/wiki/Category:Foo\">Foo</a></span><span><a href=\"/wiki/Category:Bar\">Bar</a></span></div></div>";
    state.pageText = pageText;
    setup();
    return state.editors.filter((editor) => !editor.isAddCategory);
};

const makeCommitForm = (): CommitForm => {
    createCommitForm();
    const form = state.commitForm!;
    hydrateNamedControls(form);
    form.hcCommit.click = vi.fn();
    return form;
};

beforeEach(() => {
    resetSite();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // setup 的 converted-titles 请求
    vi.spyOn(jQuery, "getJSON").mockImplementation(((_url: string, data: unknown, callback?: unknown) => {
        const cb = typeof data === "function" ? data : callback;
        if (typeof cb === "function") {
            (cb as (json: unknown) => void)({ query: { converted: [] } });
        }
        return {};
    }) as unknown as typeof jQuery.getJSON);
});

describe("multiChangeMsg", () => {
    it("替换 $1 占位符", () => {
        HC.messages.multi_change = "$1个分类";
        expect(multiChangeMsg(3)).toBe("3个分类");
    });

    it("数组形态交给 mw.language.convertPlural", () => {
        HC.messages.multi_change = ["$1个分类"];
        expect(multiChangeMsg(2)).toBe("2个分类");
        expect(mw.language.convertPlural).toHaveBeenCalledWith(2, ["$1个分类"]);
    });
});

describe("currentTimestamp", () => {
    it("输出 14 位 UTC 时间戳", () => {
        expect(currentTimestamp()).toMatch(/^\d{14}$/);
        expect(currentTimestamp().slice(0, 4)).toBe(String(new Date().getUTCFullYear()));
    });
});

describe("performChanges：单编辑器", () => {
    it("把改动写进隐藏表单并生成摘要", () => {
        const [editor] = setupPage("text\n[[Category:Foo]]");
        editor.currentCategory = "Bar";
        editor.state = CategoryEditor.CHANGED;
        const form = makeCommitForm();
        const failure = vi.fn();

        performChanges(failure, editor);

        expect(failure).not.toHaveBeenCalled();
        expect(form.wpTextbox1.value).toBe("text\n[[Category:Bar]]");
        expect(form.wpSummary.value).toBe("移除[[分类:Foo]]; 添加[[分类:Bar]]——[[Help:HotCat小工具|HotCat]]");
        expect(form.wpMinoredit.checked).toBe(true);
        expect(form.wpAutoSummary.value).toBe("HotCat");
        expect(form.hcCommit.click).toHaveBeenCalledTimes(1);
        expect(form.wpStarttime.value).toMatch(/^\d{14}$/);
    });

    it("自动提交分支打上 change tag 并清空 using/prefix", () => {
        const [editor] = setupPage("text\n[[Category:Foo]]");
        editor.currentCategory = "Bar";
        editor.state = CategoryEditor.CHANGED;
        HC.no_autocommit = false;
        state.editToken = "token";
        const form = makeCommitForm();

        performChanges(vi.fn(), editor);

        expect(form.wpChangeTags.value).toBe("HotCat,Automation tool");
        expect(form.wpDiff.name).toBe("wpSave");
        expect(form.wpDiff.value).toBe("wpSave");
        expect(form.wpSummary.value).toBe("移除[[分类:Foo]]; 添加[[分类:Bar]]");
        // 被清空后影响全局：用例结束前复原
        HC.messages.using = "——[[Help:HotCat小工具|HotCat]]";
        HC.messages.prefix = "";
    });

    it("自我编辑冲突时退回 diff", () => {
        const [editor] = setupPage("text\n[[Category:Foo]]");
        editor.currentCategory = "Bar";
        editor.state = CategoryEditor.CHANGED;
        HC.no_autocommit = false;
        state.editToken = "token";
        state.lastRevId = 99;
        state.conflictingUser = site.conf.wgUserName;
        const form = makeCommitForm();

        performChanges(vi.fn(), editor);

        expect(form.wpDiff.name).toBe("wpDiff");
        expect(form.wpDiff.value).toBe("wpDiff");
    });

    it("源码未取到时回调错误且不提交", () => {
        const form = makeCommitForm();
        state.pageText = null;
        const failure = vi.fn();

        performChanges(failure);

        expect(failure).toHaveBeenCalledWith(HC.messages.multi_error);
        expect(form.hcCommit.click).not.toHaveBeenCalled();
    });
});

describe("performChanges：多编辑器", () => {
    it("汇总删除/新增为短摘要", () => {
        const [foo, bar] = setupPage("text\n[[Category:Foo]]\n[[Category:Bar]]");
        foo.state = CategoryEditor.DELETED;
        bar.currentCategory = "Baz";
        bar.state = CategoryEditor.CHANGED;
        const form = makeCommitForm();

        performChanges(vi.fn());

        expect(form.wpTextbox1.value).toBe("text\n[[Category:Baz]]");
        // short_catchange 用 canonical 命名空间（Category），不走本地化文案
        expect(form.wpSummary.value).toContain("-[[Category:Foo]]");
        expect(form.wpSummary.value).toContain("±[[Category:Bar]]→[[Category:Baz]]");
    });

    it("摘要超过 200 字符时改用短摘要", () => {
        const names = ["长分类甲".repeat(12), "长分类乙".repeat(12), "长分类丙".repeat(12)];
        document.body.innerHTML = `<div id="catlinks"><div id="mw-normal-catlinks">${names.map((name) => `<span><a href="/wiki/Category:${name}">${name}</a></span>`).join("")}</div></div>`;
        state.pageText = `text\n${names.map((name) => `[[Category:${name}]]`).join("\n")}`;
        setup();
        for (const editor of state.editors) {
            if (!editor.isAddCategory) {
                editor.state = CategoryEditor.DELETED;
            }
        }
        const form = makeCommitForm();

        performChanges(vi.fn());

        // 短摘要形如 "- 3个分类" + using
        expect(form.wpSummary.value).toBe("- 3个分类——[[Help:HotCat小工具|HotCat]]");
    });

    it("找不到要删除的分类时记录错误但仍走 diff", () => {
        const [foo] = setupPage("text\n[[Category:Foo]]");
        foo.originalCategory = "Missing";
        foo.state = CategoryEditor.DELETED;
        const form = makeCommitForm();

        performChanges(vi.fn());

        expect(form.wpDiff.name).toBe("wpDiff");
        expect(form.wpTextbox1.value).toBe("text\n[[Category:Foo]]");
    });
});
