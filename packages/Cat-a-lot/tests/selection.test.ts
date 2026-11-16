import jquery from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    bindPageItems,
    clearSelection,
    collectTargetLinks,
    markPageDone,
    syncSelectedTitles,
    toggleAll,
} from "../src/selection.ts";
import { installMw } from "./helpers/mw.ts";

// vitest 的 unstubGlobals 会在每个 test 运行前清掉 setupFiles 里注册的全局，
// selection.ts 依赖全局 $，因此这里逐测试重新挂载 jQuery 与 wgULS。
beforeEach(() => {
    vi.stubGlobal("$", jquery);
    vi.stubGlobal("jQuery", jquery);
    vi.stubGlobal("wgULS", (hans: string, hant?: string | null) => hant ?? hans);
});

/** 读取当前被 collectTargetLinks 打标的标题（保持 DOM 顺序）。 */
const collectedTitles = (): string[] => $(".gadget-cat_a_lot-label")
    .map((_, element) => $(element).attr("data-cal-title") ?? "")
    .get()
    .filter((title) => title.length > 0);

/** 分类页（NS14）的页面结构：画廊文件 + 页面列表 + 子分类。 */
const categoryFixture = `
<div id="mw-category-media">
    <div class="gallerybox">
        <div class="gallerytext">
            <a href="/wiki/File:A.png" title="File:A.png">A</a>
        </div>
    </div>
    <div class="gallerybox">
        <div class="gallerytext">
            <a href="/wiki/File:B.png" title="File:B.png">B</a>
        </div>
    </div>
</div>
<div id="mw-pages">
    <div class="mw-category">
        <ul>
            <li><a href="/wiki/Page_A" title="Page A">Page A</a></li>
            <li><a href="/wiki/Page_A" title="Page A">Page A（重复）</a></li>
            <li><a href="/wiki/Page_B" title="Page B" class="new">红链</a></li>
            <li><a href="/wiki/Page_C" title="Page C" class="external">外链</a></li>
            <li><a href="/wiki/Page_D?action=edit" title="Page D">特殊 action</a></li>
            <li><a href="#section" title="Page E">锚点</a></li>
        </ul>
    </div>
</div>
<div id="mw-subcategories">
    <div class="CategoryTreeItem">
        <a href="/wiki/Category:Sub" title="Category:Sub">Sub</a>
    </div>
</div>
`;

/** 特殊页的页面结构：画廊 + 列表 + 搜索/前缀索引结果。 */
const specialPageFixture = `
<div id="mw-content-text">
    <div class="gallerybox">
        <div class="gallerytext">
            <a href="/wiki/File:FromGallery.png" title="File:FromGallery.png">Gallery</a>
        </div>
    </div>
    <div class="mw-spcontent">
        <ol class="special">
            <li><a href="/wiki/File:FromList.png" title="File:FromList.png">列表文件</a></li>
            <li><a href="/wiki/From_List_Page" title="From List Page">列表页面</a></li>
        </ol>
    </div>
    <div class="TablePager">
        <table><tbody><tr>
            <td class="TablePager_col_img_name"><a href="/wiki/File:FromTable.png" title="File:FromTable.png">表格文件</a></td>
        </tr></tbody></table>
    </div>
    <div class="mw-search-results">
        <div class="mw-search-result-heading"><a href="/wiki/Search_Hit" title="Search Hit">搜索命中</a></div>
    </div>
    <ul class="mw-prefixindex-list">
        <li><a href="/wiki/Prefix_Hit" title="Prefix Hit">前缀命中</a></li>
    </ul>
</div>
`;

afterEach(() => {
    document.body.innerHTML = "";
});

describe("collectTargetLinks", () => {
    it("分类页允许非文件页面时收集文件、页面与子分类，并排除红链/外链/特殊 action/重复项", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = categoryFixture;

        collectTargetLinks(true);

        expect(collectedTitles()).toEqual([
            "File:A.png",
            "File:B.png",
            "Page A",
            "Category:Sub",
        ]);
    });

    it("关闭 editpages 时分类页只收集文件页面（NS6）", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = categoryFixture;

        collectTargetLinks(false);

        expect(collectedTitles()).toEqual(["File:A.png", "File:B.png"]);
    });

    it("文件专用特殊页即使允许非文件页面也只收 NS6", () => {
        installMw({ namespaceNumber: -1, specialPageName: "Listfiles" });
        document.body.innerHTML = specialPageFixture;

        collectTargetLinks(true);

        expect(collectedTitles()).toEqual([
            "File:FromGallery.png",
            "File:FromList.png",
            "File:FromTable.png",
        ]);
    });

    it("支持的特殊页在允许非文件页面时收集搜索与前缀索引结果", () => {
        installMw({ namespaceNumber: -1, specialPageName: "Search" });
        document.body.innerHTML = specialPageFixture;

        collectTargetLinks(true);

        expect(collectedTitles()).toEqual([
            "File:FromGallery.png",
            "File:FromList.png",
            "From List Page",
            "Search Hit",
            "Prefix Hit",
        ]);
    });

    it("支持的特殊页关闭 editpages 时只保留画廊中的文件", () => {
        installMw({ namespaceNumber: -1, specialPageName: "Search" });
        document.body.innerHTML = specialPageFixture;

        collectTargetLinks(false);

        expect(collectedTitles()).toEqual(["File:FromGallery.png"]);
    });

    it("分类页兼容 CategoryTreeBullet 前置节点与 redirect-in-category 重定向包装", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = `
            <div id="mw-pages">
                <div class="mw-category">
                    <ul>
                        <li><span class="redirect-in-category"><a href="/wiki/Redirect_Page" title="Redirect Page">Redirect Page</a></span></li>
                    </ul>
                </div>
            </div>
            <div id="mw-subcategories">
                <div class="CategoryTreeItem">
                    <span class="CategoryTreeBullet"><a href="#">[+]</a></span>
                    <a class="CategoryTreeLabel" href="/wiki/Category:Sub_With_Bullet" title="Category:Sub With Bullet">Sub With Bullet</a>
                </div>
            </div>
        `;

        collectTargetLinks(true);

        expect(collectedTitles()).toEqual([
            "Redirect Page",
            "Category:Sub With Bullet",
        ]);
    });

    it("Prefixindex 兼容 allpagesredirect 重定向包装", () => {
        installMw({ namespaceNumber: -1, specialPageName: "Prefixindex" });
        document.body.innerHTML = `
            <div id="mw-content-text">
                <ul class="mw-prefixindex-list">
                    <li><div class="allpagesredirect"><a href="/wiki/Prefix_Redirect" title="Prefix Redirect">Prefix Redirect</a></div></li>
                </ul>
            </div>
        `;

        collectTargetLinks(true);

        expect(collectedTitles()).toEqual(["Prefix Redirect"]);
    });
});

describe("bindPageItems / 选择", () => {
    it("单击切换选中，Shift 点击选择范围，并同步标题", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = categoryFixture;
        let selected: string[] = [];

        bindPageItems({
            allowNonFiles: true,
            isBusy: () => false,
            onSelectionChange: () => {
                selected = syncSelectedTitles();
            },
        });

        const links = $(".gadget-cat_a_lot-label");
        $(links[0]).trigger("click");
        expect(selected).toEqual(["File:A.png"]);

        $(links[2]).trigger($.Event("click", { shiftKey: true }));
        expect(selected).toEqual(["File:A.png", "File:B.png", "Page A"]);

        $(links[2]).trigger("click");
        expect(selected).toEqual(["File:A.png", "File:B.png"]);
    });

    it("isBusy 时忽略选择点击", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = categoryFixture;
        let calls = 0;

        bindPageItems({
            allowNonFiles: true,
            isBusy: () => true,
            onSelectionChange: () => {
                calls += 1;
            },
        });
        const initialCalls = calls;
        $(".gadget-cat_a_lot-label").first().trigger("click");

        expect(calls).toBe(initialCalls);
        expect(syncSelectedTitles()).toEqual([]);
    });

    it("重新绑定时清除旧的 label/selected/last/done 状态（A15）", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = categoryFixture;
        const binding = {
            allowNonFiles: true,
            isBusy: () => false,
            onSelectionChange: () => {
                // 本用例只验证重新绑定时的清理，选择集合由 syncSelectedTitles 直接读取
            },
        };

        bindPageItems(binding);
        const pageLink = $(".gadget-cat_a_lot-label")
            .filter((_, element) => $(element).attr("data-cal-title") === "Page A")
            .first();
        pageLink.trigger("click");
        markPageDone("Page A");
        expect(syncSelectedTitles()).toEqual([]);
        expect(pageLink.hasClass("gadget-cat_a_lot-label--done")).toBe(true);

        bindPageItems({ ...binding, allowNonFiles: false });

        // 关闭 editpages 后页面条目不再被收集，旧标记必须全部清除
        expect(pageLink.hasClass("gadget-cat_a_lot-label")).toBe(false);
        expect(pageLink.hasClass("gadget-cat_a_lot-label--done")).toBe(false);
        expect(pageLink.attr("data-cal-title")).toBeUndefined();
        expect(collectedTitles()).toEqual(["File:A.png", "File:B.png"]);
    });
});

describe("markPageDone / clearSelection / toggleAll", () => {
    it("markPageDone 移除 selected/last 并加 done", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = `${categoryFixture}<div id="extra"></div>`;
        const link = $("#mw-pages a").first();
        link.addClass("gadget-cat_a_lot-label gadget-cat_a_lot-label--selected gadget-cat_a_lot-label--last-selected")
            .attr("data-cal-title", "Page A");

        markPageDone("Page A");

        expect(link.hasClass("gadget-cat_a_lot-label--selected")).toBe(false);
        expect(link.hasClass("gadget-cat_a_lot-label--last-selected")).toBe(false);
        expect(link.hasClass("gadget-cat_a_lot-label--done")).toBe(true);
    });

    it("clearSelection 清除 selected/last 但保留 done", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = categoryFixture;
        const links = $("#mw-pages a");
        links.addClass("gadget-cat_a_lot-label gadget-cat_a_lot-label--selected");
        links.eq(0).addClass("gadget-cat_a_lot-label--last-selected gadget-cat_a_lot-label--done");

        clearSelection();

        expect($(".gadget-cat_a_lot-label--selected").length).toBe(0);
        expect($(".gadget-cat_a_lot-label--last-selected").length).toBe(0);
        expect($(".gadget-cat_a_lot-label--done").length).toBe(1);
        expect(syncSelectedTitles()).toEqual([]);
    });

    it("toggleAll 全选与清空后返回同步标题", () => {
        installMw({ namespaceNumber: 14 });
        document.body.innerHTML = categoryFixture;
        collectTargetLinks(true);

        expect(toggleAll(true)).toEqual(["File:A.png", "File:B.png", "Page A", "Category:Sub"]);
        expect(toggleAll(false)).toEqual([]);
        expect($(".gadget-cat_a_lot-label--selected").length).toBe(0);
    });
});
