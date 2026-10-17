// 消歧域镜像测试：makeFixDabs 的五条件门（popupFixDabs 开关、article 存在、
// isDisambig 命中、非 Special 页、talkPage 存在）负向分支与正路径
// （popupFixDab 槽写入 = listLinks/retargetDab 经 changeLinkTargetLink 的
// 参数装配、popupString/simplePrintf 译文展开），以及 popupRedlinkHTML
// （红链「移除链接」入口）。
// 行为基准 = legacy src/modules/dab.ts（commit 02c8dec）全文件；legacy 怪癖
// 逐字照搬，用例名标注「照搬勿修」。
//
// 五门的第 5 门（talkPage()）在 isDisambig 通过后恒真（isDisambig 的
// !isTalkPage() 已排除 talk 页）——legacy 冗余判定照搬，不单独构造负例。
//
// 断言形态说明：
// - 槽内容经 innerHTML 写回后读取，jsdom 按 HTML 序列化重排（<hr /> → <hr>、
//   属性值内 & → &amp;、NBSP → &nbsp;）：期望片段先过同一 DOM 往返
//   （domRoundTrip）或按重序列化形态书写。
// - popupRedlinkHTML 的返回值是 appendParamsToLink 的纯字符串手术结果：
//   generalLink 序列化段的 & 已转义为 &amp;，追加参数段保持 raw &——混合形态
//   为 legacy 原样，期望串直接按此书写（与 navlinks/links.test.ts 同款）。
// - jsdom 30 的 HTMLElement.innerText setter 不物化 DOM 文本子节点（outerHTML
//   仍为空）；generalLink 依赖真实浏览器「setter 物化为文本子节点」的语义，
//   测试内把原型补齐为 textContent 读写（对纯文本与真实浏览器等价）。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { TITLEBASE, buildTitleWikiFixtures } from "../../helpers/wikiFixtures.ts";
import type * as DabNs from "../../../src/preview/dab.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as StringsNs from "../../../src/core/strings.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type Dab = typeof DabNs;
type Namespaces = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type Popup = typeof PopupNs;
type StringsModule = typeof StringsNs;
type TitleModule = typeof TitleNs;

interface Fresh {
    dab: Dab;
    namespaces: Namespaces;
    options: OptionsModule;
    popup: Popup;
    strings: StringsModule;
    title: TitleModule;
}

// legacy options.ts 的选项默认值（本域消费的正则源）
const DAB_REGEXP_SOURCE = "disambiguation\\}\\}|\\{\\{\\s*(d(ab|isamb(ig(uation)?)?)|(((geo|hn|road?|school|number)dis)|[234][lc][acw]|(road|ship)index))\\s*(\\|[^}]*)?\\}\\}|is a .*disambiguation.*page";

// links.ts 的 currentArticleRegexBit("Foo")：首字符大小写类 + 锚点可选组，
// 前后各一段 \s*。oldTarget 传 Title 对象时经其 replace()/toString() 得 "Foo"，
// 与传字符串等价——期望命令串可用字面量钉住
const OLD_BIT = "\\s*([Ff]oo(?:#[^\\[\\|]*)?)\\s*";

// 见文件头说明：innerText 原型补齐（jsdom 30 的 setter 不物化 DOM 文本子节点，
// outerHTML 仍为空；真实浏览器对纯文本赋值等价于 textContent）
Reflect.defineProperty(HTMLElement.prototype, "innerText", {
    get(this: HTMLElement): string {
        return this.textContent;
    },
    set(this: HTMLElement, value: string): void {
        this.textContent = value;
    },
    configurable: true,
});

// 期望片段过同一 DOM 往返：调用方按 makeFixDab 的裸串书写（<hr /> 等），
// 取回 jsdom 重序列化形态（<hr>）以便与 innerHTML 逐字比较
const domRoundTrip = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.innerHTML;
};

// popupFixDab$N 槽（setPopupHTML 以 elementId + popupId 拼 id）
const slotDiv = (idNumber = 1): HTMLDivElement => {
    const div = document.createElement("div");
    div.id = `popupFixDab${String(idNumber)}`;
    document.body.appendChild(div);
    return div;
};

// 正路径用例：把 wiki.re.main 换成匹配 jsdom origin 的同公式形态并跳到普通条目，
// 使 Title.fromURL(location.href).namespaceId() 走真实解析（0 = 主名字空间，
// 不落 title 域的 catch 兜底，也就不会打印 console.error）
const gotoArticlePage = (f: Fresh): void => {
    f.title.wiki.re.main = RegExp(`[^:]*://${location.host}((?:/index[.]php[?]title=)|/wiki/)([^&?#]*)[^#]*(?:#(.+))?`);
    window.history.pushState(null, "", "/wiki/Article");
};

let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw({ config: { wgArticlePath: "/wiki/$1" } });
    const [dab, namespaces, options, popup, strings, title] = await Promise.all([
        import("../../../src/preview/dab.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/popup.ts"),
        import("../../../src/core/strings.ts"),
        import("../../../src/title/title.ts"),
    ]);
    namespaces.setNamespaces();
    options.setOptions();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    title.wiki.re.disambig = RegExp(DAB_REGEXP_SOURCE, "im");
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { dab, namespaces, options, popup, strings, title };
};

const ownerWith = (f: Fresh, articleName: string | null, idNumber = 1): PopupNs.Navpopup => {
    const navpop = new f.popup.Navpopup();
    navpop.idNumber = idNumber;
    if (articleName !== null) {
        navpop.article = new f.title.Title(articleName);
    }
    return navpop;
};

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
    // gotoArticlePage / Special 用例改过 location，逐用例复位
    window.history.pushState(null, "", "/");
});

describe("makeFixDabs 五条件门（负向）", () => {
    it("popupFixDabs 关（默认）：即使其余条件满足也不写槽", async () => {
        const f = await fresh();
        const div = document.createElement("div");
        div.id = "popupFixDab1";
        document.body.appendChild(div);
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        expect(() => {
            f.dab.makeFixDabs("{{dab}}", navpop);
        }).not.toThrow();
        expect(div.innerHTML).toBe("");
    });

    it("popupFixDabs 开但 article 缺：不写槽", async () => {
        const f = await fresh({ popupFixDabs: true });
        const div = document.createElement("div");
        div.id = "popupFixDab1";
        document.body.appendChild(div);
        const navpop = ownerWith(f, null);
        expect(() => {
            f.dab.makeFixDabs("{{dab}}", navpop);
        }).not.toThrow();
        expect(div.innerHTML).toBe("");
    });

    it("isDisambig 不命中（纯文本）：不写槽", async () => {
        const f = await fresh({ popupFixDabs: true });
        const div = document.createElement("div");
        div.id = "popupFixDab1";
        document.body.appendChild(div);
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        f.dab.makeFixDabs("plain article text", navpop);
        expect(div.innerHTML).toBe("");
    });

    it("当前页为 Special：Title.fromURL(location.href) 解析 ns=-1 挡下", async () => {
        const f = await fresh({ popupFixDabs: true });
        const div = document.createElement("div");
        div.id = "popupFixDab1";
        document.body.appendChild(div);
        // jsdom 的 origin 是 localhost：按同一公式装一条匹配本 origin 的
        // wiki.re.main，让 fromURL 真正解析出 Special 名字空间
        f.title.wiki.re.main = RegExp(`[^:]*://${location.host}((?:/index[.]php[?]title=)|/wiki/)([^&?#]*)[^#]*(?:#(.+))?`);
        window.history.pushState(null, "", "/wiki/Special:Foo");
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        f.dab.makeFixDabs("{{dab}}", navpop);
        expect(div.innerHTML).toBe("");
        window.history.pushState(null, "", "/");
    });
});

describe("makeFixDabs 正路径（popupFixDab 槽写入）", () => {
    it("全门通过：槽写入 makeFixDab 产出（命令串/摘要/译文/&nbsp; 逐面钉住）", async () => {
        const f = await fresh({ popupFixDabs: true });
        gotoArticlePage(f);
        const div = slotDiv();
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        f.dab.makeFixDabs("{{disambiguation}}\n* [[Bar (disambiguation)]]", navpop);

        const target = "Bar (disambiguation)";
        const summary = f.strings.simplePrintf(f.options.getValueOf("popupFixDabsSummary") as string, ["Foo", target]);
        // changeLinkTargetLink 的 newTarget 分支命令串（alsoChangeLabel 假）
        const cmd = `s~\\[\\[${OLD_BIT}\\]\\]~[[${target}|$1]]~g;s~\\[\\[${OLD_BIT}[|]~[[${target}|~g;s~\\[\\[Bar \\(disambiguation\\)\\|Bar \\(disambiguation\\)\\]\\]~[[Bar (disambiguation)]]~g`;
        const html = div.innerHTML;

        // 头部：<hr /> + 提示译文 + <br>（经同一 DOM 往返比较）
        expect(html).toContain(domRoundTrip(`<hr />${f.strings.popupString("Click to disambiguate this link to:")}<br>`));
        // 目标链接：titledWikiLink 的编辑 URL（titleToEdit 缺省回落 wgPageName=Main_Page）
        // + 追加参数段（raw & 经 innerHTML 重序列化为 &amp;）
        expect(html).toContain(`${TITLEBASE}Main_Page&amp;action=edit&amp;wpChangeTags=Popups%2CAutomation%20tool&amp;autoedit=${encodeURIComponent(cmd)}&amp;autoclick=wpDiff&amp;actoken=mock-session-id&amp;autominor=true&amp;autosummary=${encodeURIComponent(summary)}&amp;autoimpl=np20140416`);
        // retargetDab 的 hint=disambigHint 译文；text 的空格转 &nbsp;
        expect(html).toContain(`title="${f.strings.tprintf("disambigHint", [target])}"`);
        expect(html).toContain(">Bar&nbsp;(disambiguation)</a>");
        // popupWatchDisambiggedPages 默认 null → minor=true 入参而 watch 省参
        expect(html).toContain("&amp;autominor=true");
        expect(html).not.toContain("autowatch=");
        // 条目间分隔符取 popupString("separator")
        expect(html).toContain(`</a>${f.strings.popupString("separator")}<a`);

        // 列表顺序：消歧义目标（排序去重后）→ wiktionary（popupDabWiktionary
        // 默认 "last" 走 push）→ remove this link（listLinks 恒追加）
        const barAt = html.indexOf(encodeURIComponent("[[Bar (disambiguation)|$1]]"));
        const wikAt = html.indexOf(encodeURIComponent("[[wiktionary:Foo|$1]]"));
        const removeAt = html.indexOf(f.strings.popupString("remove all links to this disambig page from this article"));
        expect(barAt).toBeGreaterThan(-1);
        expect(wikAt).toBeGreaterThan(barAt);
        expect(removeAt).toBeGreaterThan(wikAt);

        // wiktionary 目标：newTarget=`wiktionary:${条目名}`，摘要同一模板展开
        expect(html).toContain(encodeURIComponent(f.strings.simplePrintf(f.options.getValueOf("popupFixDabsSummary") as string, ["Foo", "wiktionary:Foo"])));
        expect(html).toContain(`>${f.strings.popupString("remove this link")}</a>`);
        expect(html).toContain(encodeURIComponent(f.strings.simplePrintf(f.options.getValueOf("popupRmDabLinkSummary") as string, ["Foo"])));
    });

    it("parentPopup 存在：titleToEdit 取宿主弹窗条目名（编辑目标不再是当前页）", async () => {
        const f = await fresh({ popupFixDabs: true, popupDabWiktionary: null });
        gotoArticlePage(f);
        const div = slotDiv();
        const parent = new f.popup.Navpopup();
        parent.article = new f.title.Title("Host Page");
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        navpop.parentPopup = parent;
        f.dab.makeFixDabs("{{disambiguation}}\n* [[Bar]]", navpop);

        expect(div.innerHTML).toContain("title=Host_Page&amp;action=edit&amp;wpChangeTags=Popups%2CAutomation%20tool");
        expect(div.innerHTML).not.toContain("title=Main_Page");
    });

    it("parentPopup 无 article：String(undefined) 作编辑目标进 href（照搬勿修）", async () => {
        const f = await fresh({ popupFixDabs: true, popupDabWiktionary: null });
        gotoArticlePage(f);
        const div = slotDiv();
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        navpop.parentPopup = new f.popup.Navpopup();
        f.dab.makeFixDabs("{{disambiguation}}\n* [[Bar]]", navpop);

        expect(div.innerHTML).toContain("title=undefined&amp;action=edit");
    });

    it("popupDabWiktionary=first：wiktionary 链接 unshift 到最前且条目名去尾括号（照搬勿修）", async () => {
        const f = await fresh({ popupFixDabs: true, popupDabWiktionary: "first" });
        gotoArticlePage(f);
        const div = slotDiv();
        const navpop = ownerWith(f, "Foo (disambiguation)");
        navpop.originalArticle = new f.title.Title("Foo (disambiguation)");
        f.dab.makeFixDabs("{{disambiguation}}\n* [[Bar]]", navpop);

        const html = div.innerHTML;
        const wikAt = html.indexOf(encodeURIComponent("[[wiktionary:Foo|$1]]"));
        const barAt = html.indexOf(encodeURIComponent("[[Bar|$1]]"));
        const removeAt = html.indexOf(f.strings.popupString("remove all links to this disambig page from this article"));
        expect(wikAt).toBeGreaterThan(-1);
        expect(barAt).toBeGreaterThan(wikAt);
        expect(removeAt).toBeGreaterThan(barAt);
    });

    it("重复目标去重、省略正则只挡小写名前缀/Special/Image/Category（照搬勿修）", async () => {
        const f = await fresh({ popupFixDabs: true, popupDabWiktionary: null });
        gotoArticlePage(f);
        const div = slotDiv();
        const navpop = ownerWith(f, "Foo");
        navpop.originalArticle = new f.title.Title("Foo");
        const data = "{{disambiguation}}\n"
            + "* [[Bar]]\n* [[Bar|显示名]]\n"
            + "* [[Category:Foo]]\n* [[Image:Bar.png]]\n* [[Special:Foo]]\n* [[wikt:Bar]]\n"
            + "* [[File:Bar.png]]";
        f.dab.makeFixDabs(data, navpop);

        const html = div.innerHTML;
        // 去重后 Bar 一条 + File: 一条（大写 F 不命中 ^[a-z]*:）+ remove 一条
        expect(html.match(/class="popup_change_title_link"/g) ?? []).toHaveLength(3);
        expect(html).toContain(encodeURIComponent("[[File:Bar.png|$1]]"));
        expect(html).not.toContain(encodeURIComponent("[[Category:Foo|$1]]"));
        expect(html).not.toContain(encodeURIComponent("[[Image:Bar.png|$1]]"));
        expect(html).not.toContain(encodeURIComponent("[[Special:Foo|$1]]"));
        expect(html).not.toContain(encodeURIComponent("[[wikt:Bar|$1]]"));
    });
});

describe("popupRedlinkHTML", () => {
    it("newTarget=null：else 分支解链命令 + 文本空格转 &nbsp;（照搬勿修：minor/watch 未传 → undefined 入参）", async () => {
        const f = await fresh({ popupStrings: { "remove this link": "remove this link" } });
        const out = f.dab.popupRedlinkHTML(new f.title.Title("Foo"));

        const cmd = `s~\\[\\[${OLD_BIT}\\]\\]~$1~g;s~\\[\\[${OLD_BIT}[|](.*?)\\]\\]~$2~g`;
        const summary = f.strings.simplePrintf(f.options.getValueOf("popupRedlinkSummary") as string, ["Foo"]);
        expect(out).toContain(`${TITLEBASE}Main_Page&amp;action=edit&amp;wpChangeTags=Popups%2CAutomation%20tool&autoedit=${encodeURIComponent(cmd)}&autoclick=wpDiff&actoken=mock-session-id&autominor=undefined&autowatch=undefined&autosummary=${encodeURIComponent(summary)}&autoimpl=np20140416`);
        expect(out).toContain(`title="${f.strings.popupString("remove all links to this page from this article")}"`);
        expect(out).toContain('class="popup_change_title_link"');
        expect(out).toContain(">remove&nbsp;this&nbsp;link</a>");
    });

    it("article 含空格：oldTarget 的空格展开为 (?:[_ ]+|%20) 备选组", async () => {
        const f = await fresh();
        const out = f.dab.popupRedlinkHTML(new f.title.Title("Foo Bar"));

        const bit = "\\s*([Ff]oo(?:[_ ]+|%20)Bar(?:#[^\\[\\|]*)?)\\s*";
        const cmd = `s~\\[\\[${bit}\\]\\]~$1~g;s~\\[\\[${bit}[|](.*?)\\]\\]~$2~g`;
        const summary = f.strings.simplePrintf(f.options.getValueOf("popupRedlinkSummary") as string, ["Foo Bar"]);
        expect(out).toContain(`autoedit=${encodeURIComponent(cmd)}&autoclick=wpDiff&actoken=mock-session-id`);
        expect(out).toContain(`autosummary=${encodeURIComponent(summary)}`);
        expect(out).toContain(`>${f.strings.popupString("remove this link")}</a>`);
        expect(out).toContain(`title="${f.strings.popupString("remove all links to this page from this article")}"`);
    });
});
