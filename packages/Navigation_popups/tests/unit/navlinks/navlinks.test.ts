// navlinks 域单元测试（阶段 4-N1）：navlink DSL（<<tag|opt=val|text>> 解析 /
// if(x){...}else{...} 条件展开与递归上限 / 嵌套 <menu>/<menurow> 深度栈渲染 /
// `*`→分隔符与伪标签展开）与 7 种弹窗结构的 navlink 槽填充器注册面。
// 行为基准 = legacy src/modules/navlinks.ts + src/modules/structures.ts 的
// navlink 段 + src/modules/domdrag.ts 的 original 槽函数（commit 02c8dec）
// 逐字照搬；legacy 怪癖用例名标注「照搬勿修」。
//
// 断言形态说明（沿用 links.test.ts / links2.test.ts 骨架）：
// - generalLink 产物经 jsdom outerHTML 序列化（属性双引号、href 中的 & 转义
//   为 &amp;），期望串用关键子串钉住关键契约（class/id 命名、href 前缀）；
//   译文相关期望统一经被测模块自身的 popupString 取值（同仓既定做法）。
// - jsdom 30 的 HTMLElement.innerText setter 不物化 DOM 文本子节点，测试内把
//   原型补齐为 textContent 读写（对纯文本与真实浏览器等价）。
// - 槽填充器经 core/structures 的注册表读取（模块求值时注册），装配路径用
//   htmlout.popupHTML + fillEmptySpans 还原。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw, type InstalledMw } from "../../helpers/mockMw.ts";
import { TITLEBASE, buildTitleWikiFixtures } from "../../helpers/wikiFixtures.ts";
import type * as EventsNs from "../../../src/core/events.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as LinksNs from "../../../src/navlinks/links.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as NavlinksNs from "../../../src/navlinks/navlinks.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as DiffpreviewNs from "../../../src/preview/diffpreview.ts";
import type * as SiteNs from "../../../src/api/siteinfo.ts";
import type * as StringsNs from "../../../src/core/strings.ts";
import type * as StructuresNs from "../../../src/core/structures.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type EventsModule = typeof EventsNs;
type HtmloutModule = typeof HtmloutNs;
type LinksModule = typeof LinksNs;
type DiffpreviewModule = typeof DiffpreviewNs;
type NamespacesModule = typeof NamespacesNs;
type NavlinksModule = typeof NavlinksNs;
type OptionsModule = typeof OptionsNs;
type SiteModule = typeof SiteNs;
type StringsModule = typeof StringsNs;
type StructuresModule = typeof StructuresNs;
type TitleModule = typeof TitleNs;
type Tag = InstanceType<typeof NavlinksNs.NavlinkTag>;
type Context = StructuresNs.StructureContext;

interface Fresh {
    navlinks: NavlinksModule;
    links: LinksModule;
    diffpreview: DiffpreviewModule;
    namespaces: NamespacesModule;
    options: OptionsModule;
    strings: StringsModule;
    title: TitleModule;
    events: EventsModule;
    site: SiteModule;
    structures: StructuresModule;
    htmlout: HtmloutModule;
    installed: InstalledMw;
}

// 见文件头说明：innerText 原型补齐
Reflect.defineProperty(HTMLElement.prototype, "innerText", {
    get(this: HTMLElement): string {
        return this.textContent;
    },
    set(this: HTMLElement, value: string): void {
        this.textContent = value;
    },
    configurable: true,
});

const SITEBASE = "zh.moegirl.org.cn";
// legacy init.ts setRegexps 的 ipUser 常量（与 links2.test.ts 同一份真值）
const IP_USER_SOURCE = "^(?::(?::|(?::[0-9A-Fa-f]{1,4}){1,7})|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6}::|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){7})|(((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9]))$";

let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw();
    const [navlinks, links, diffpreview, namespaces, options, strings, title, events, site, structures, htmlout] = await Promise.all([
        import("../../../src/navlinks/navlinks.ts"),
        import("../../../src/navlinks/links.ts"),
        import("../../../src/preview/diffpreview.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/strings.ts"),
        import("../../../src/title/title.ts"),
        import("../../../src/core/events.ts"),
        import("../../../src/api/siteinfo.ts"),
        import("../../../src/core/structures.ts"),
        import("../../../src/core/htmlout.ts"),
    ]);
    options.setOptions();
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    title.wiki.re.ipUser = RegExp(IP_USER_SOURCE);
    // Talk 名字空间：installMw 的 wgNamespaceIds 默认不含 talk（title 域
    // namespaceId 会回落 0），articleFromTalkOrArticle 的用例就地补表
    (installed.config.wgNamespaceIds as Record<string, number>).talk = 1;
    site.siteState.apiwikibase = `https://${SITEBASE}/api.php`;
    site.siteState.hostname = SITEBASE;
    site.siteState.wikimedia = true;
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { navlinks, links, diffpreview, namespaces, options, strings, title, events, site, structures, htmlout, installed };
};

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    document.body.innerHTML = "";
});

const article = (f: Fresh, name: string): TitleNs.Title => new f.title.Title(name);

interface TagSpec {
    id: string;
    // 显式含 undefined：TAG_CASES 以统一字段集合透传（exactOptionalPropertyTypes）
    article?: string | undefined;
    text?: string | undefined;
    oldid?: string | undefined;
    rcid?: string | undefined;
    diff?: string | undefined;
}

const makeTag = (f: Fresh, spec: TagSpec): Tag => {
    const t = new f.navlinks.NavlinkTag();
    t.id = spec.id;
    t.article = article(f, spec.article ?? "Foo");
    if (typeof spec.text !== "undefined") {
        t.text = spec.text;
    }
    if (typeof spec.oldid !== "undefined") {
        t.oldid = spec.oldid;
    }
    if (typeof spec.rcid !== "undefined") {
        t.rcid = spec.rcid;
    }
    if (typeof spec.diff !== "undefined") {
        t.diff = spec.diff;
    }
    return t;
};

const ctx = (f: Fresh, name: string, over: Partial<Context> = {}): Context => ({
    article: article(f, name),
    hint: null,
    oldid: undefined,
    rcid: undefined,
    navpop: { idNumber: 3, parentAnchor: null },
    params: {},
    ...over,
});

// 槽填充器返回面是 string | Node | null；navlink 域的填充器恒返回 string，
// 测试内以恒等断言收窄（与 src 的 assume 同义）
const htmlOf = (x: string | Node | null | undefined): string => x as string;

// ══ 规格串（defaultNavlinkSpec） ══

describe("defaultNavlinkSpec", () => {
    it("默认（popupLastEditLink 开）逐段拼接：mainlink 快捷键为空格、lastEdit 段含 lastContrib/sinceMe 与 oldid 分支", async () => {
        const f = await fresh();
        const spec = f.navlinks.defaultNavlinkSpec();
        expect(spec.startsWith("<b><<mainlink|shortcut= >></b>")).toBe(true);
        expect(spec).toContain("*<<lastEdit|shortcut=/>>|<<lastContrib>>|<<sinceMe>>if(oldid){|<<oldEdit>>|<<diffCur>>}");
        expect(spec).toContain("if(user){<br><<contribs|shortcut=c>>*<<userlog|shortcut=L|log>>");
        expect(spec).toContain("if(ipuser){*<<arin>>}if(wikimedia){*<<count|shortcut=#>>}");
        expect(spec).toContain("if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>|<<blocklog|log>>}}");
        expect(spec).toContain("<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>*<<move|shortcut=m>>");
        expect(spec).toContain("if(admin){<br><<unprotect|unprotectShort>>|<<protect|shortcut=p>>|<<protectlog|log>>*<<undelete|undeleteShort>>|<<delete|shortcut=d>>|<<deletelog|log>>}");
        // 照搬勿修：editors 的 text 选项为空串
        expect(spec).toContain("<<history|shortcut=h>>|<<editors|shortcut=E|>>");
        expect(spec).toContain("<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>");
    });

    it("popupLastEditLink 关：整段 lastEdit/lastContrib/sinceMe/oldEdit/diffCur 消失，其余照旧", async () => {
        const f = await fresh({ popupLastEditLink: false });
        const spec = f.navlinks.defaultNavlinkSpec();
        expect(spec).not.toContain("lastEdit");
        expect(spec).not.toContain("lastContrib");
        expect(spec).not.toContain("sinceMe");
        expect(spec).toContain("<b><<mainlink|shortcut= >></b>");
        expect(spec).toContain("if(user){<br><<contribs|shortcut=c>>");
    });
});

// ══ 条件展开（expandConditionalNavlinkString） ══

describe("expandConditionalNavlinkString", () => {
    it("未知条件名：整段原样保留（testResult 保持 null 的照搬勿修路径）", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("Aif(bogus){T}else{F}B", article(f, "Foo"), {})).toBe("Aif(bogus){T}else{F}B");
    });

    it("user：匿名/主名字空间条目为假，User: 页为真", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("Aif(user){T}else{F}B", article(f, "Foo"), {})).toBe("AFB");
        expect(f.navlinks.expandConditionalNavlinkString("Aif(user){T}else{F}B", article(f, "User:Example"), {})).toBe("ATB");
    });

    it("talk：主名字空间条目有讨论页为真，讨论页自身为假", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(talk){T}else{F}", article(f, "Foo"), {})).toBe("T");
        expect(f.navlinks.expandConditionalNavlinkString("if(talk){T}else{F}", article(f, "Talk:Foo"), {})).toBe("F");
    });

    it("admin：取 popupAdminLinks（默认非 sysop 为假；window 覆盖为真）", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(admin){T}else{F}", article(f, "Foo"), {})).toBe("F");
        const g = await fresh({ popupAdminLinks: true });
        expect(g.navlinks.expandConditionalNavlinkString("if(admin){T}else{F}", article(g, "Foo"), {})).toBe("T");
    });

    it("oldid：参数缺省/为假值取 else，有值为真（typeof+真值双守卫照搬）", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(oldid){T}else{F}", article(f, "Foo"), {})).toBe("F");
        expect(f.navlinks.expandConditionalNavlinkString("if(oldid){T}else{F}", article(f, "Foo"), { oldid: null })).toBe("F");
        expect(f.navlinks.expandConditionalNavlinkString("if(oldid){T}else{F}", article(f, "Foo"), { oldid: "123" })).toBe("T");
    });

    it("rcid / diff：同为参数真值判定", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(rcid){T}else{F}", article(f, "Foo"), { rcid: "9" })).toBe("T");
        expect(f.navlinks.expandConditionalNavlinkString("if(rcid){T}else{F}", article(f, "Foo"), {})).toBe("F");
        expect(f.navlinks.expandConditionalNavlinkString("if(diff){T}else{F}", article(f, "Foo"), { diff: "prev" })).toBe("T");
        expect(f.navlinks.expandConditionalNavlinkString("if(diff){T}else{F}", article(f, "Foo"), { diff: null })).toBe("F");
    });

    it("ipuser：IP 用户为真（IPv4 常量照搬）", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(ipuser){T}else{F}", article(f, "User:1.2.3.4"), {})).toBe("T");
        expect(f.navlinks.expandConditionalNavlinkString("if(ipuser){T}else{F}", article(f, "User:Example"), {})).toBe("F");
    });

    it("wikimedia：取 siteState.wikimedia（萌百为真、关掉为假）", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(wikimedia){T}else{F}", article(f, "Foo"), {})).toBe("T");
        f.site.siteState.wikimedia = false;
        expect(f.navlinks.expandConditionalNavlinkString("if(wikimedia){T}else{F}", article(f, "Foo"), {})).toBe("F");
    });

    it("mainspace_en：主名字空间 ∧ hostname === en.wikipedia.org 双条件", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(mainspace_en){T}else{F}", article(f, "Foo"), {})).toBe("F");
        f.site.siteState.hostname = "en.wikipedia.org";
        expect(f.navlinks.expandConditionalNavlinkString("if(mainspace_en){T}else{F}", article(f, "Foo"), {})).toBe("T");
        expect(f.navlinks.expandConditionalNavlinkString("if(mainspace_en){T}else{F}", article(f, "Talk:Foo"), {})).toBe("F");
    });

    it("无 else 且条件为真：真分支内容；条件为假：整段消失", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("Aif(user){T}B", article(f, "User:Example"), {})).toBe("ATB");
        expect(f.navlinks.expandConditionalNavlinkString("Aif(user){T}B", article(f, "Foo"), {})).toBe("AB");
    });

    it("else 体为空串：假分支输出空（!falseString 兜底为空的照搬勿修路径）", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("Aif(user){}else{}B", article(f, "Foo"), {})).toBe("AB");
        expect(f.navlinks.expandConditionalNavlinkString("Aif(user){T}else{}B", article(f, "Foo"), {})).toBe("AB");
    });

    it("照搬勿修：匹配段前的分号被 if 正则的前缀 ;? 一并吞掉", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("A;if(user){T}B", article(f, "User:Example"), {})).toBe("ATB");
    });

    it("照搬勿修：else 体正文两侧空白保留（只有 else 关键字侧的空白归并规则生效）", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(user){T}else{  F  }", article(f, "Foo"), {})).toBe("  F  ");
    });

    it("嵌套条件逐层递归展开（每次递归展开一层）；照搬勿修：if 前导 \\s* 吞掉上一层正文的尾空格", async () => {
        const f = await fresh();
        // "A if(wikimedia){…}" 的匹配从 if 前的空格开始，该空格随匹配段一并消失
        expect(f.navlinks.expandConditionalNavlinkString("if(user){A if(wikimedia){B if(user){C}} }", article(f, "User:Example"), {})).toBe("ABC ");
        // 正文与 if 之间无空格时无吞并，逐层展开结果完整
        expect(f.navlinks.expandConditionalNavlinkString("if(user){Aif(wikimedia){Bif(user){C}}}", article(f, "User:Example"), {})).toBe("ABC");
    });

    it("递归上限 10 层：12 层嵌套在第 11 轮停下，剩余 if( 文本原样保留", async () => {
        const f = await fresh();
        let s = "X";
        for (let i = 0; i < 12; i += 1) {
            s = `if(wikimedia){${s}}`;
        }
        expect(f.navlinks.expandConditionalNavlinkString(s, article(f, "Foo"), {})).toBe("if(wikimedia){X}");
    });

    it("照搬勿修：显式递归计数只约束「再次递归」，首次展开无条件执行", async () => {
        const f = await fresh();
        expect(f.navlinks.expandConditionalNavlinkString("if(wikimedia){X}", article(f, "Foo"), {}, 10)).toBe("X");
        // 嵌套串在计数已达上限时只展开最内层一次
        expect(f.navlinks.expandConditionalNavlinkString("if(wikimedia){if(wikimedia){X}}", article(f, "Foo"), {}, 10)).toBe("if(wikimedia){X}");
        expect(f.navlinks.expandConditionalNavlinkString("if(wikimedia){if(wikimedia){X}}", article(f, "Foo"), {}, 0)).toBe("X");
    });
});

// ══ 规格串 → 标签数组（navlinkStringToArray） ══

describe("navlinkStringToArray", () => {
    it("文本段原样保留，<<>> 段解析为 NavlinkTag（奇数下标为标签）", async () => {
        const f = await fresh();
        const out = f.navlinks.navlinkStringToArray("前<<edit>>后", article(f, "Foo"), {});
        expect(out).toHaveLength(3);
        expect(out[0]).toBe("前");
        expect(out[2]).toBe("后");
        const tag = out[1] as Tag;
        expect(tag).toBeInstanceOf(f.navlinks.NavlinkTag);
        expect(tag.id).toBe("edit");
        expect(tag.article.toString()).toBe("Foo");
        expect(tag.type).toBe("navlinkTag");
    });

    it("|opt=val 写入同名字段；|text（无 =）走 popupString 取译文", async () => {
        const f = await fresh();
        const out = f.navlinks.navlinkStringToArray("<<email|shortcut=E|email user>>", article(f, "Foo"), {});
        // splice 的捕获组结构：奇数下标为标签（下标 0 是匹配点前的空文本段）
        const tag = out[1] as Tag;
        expect(tag.id).toBe("email");
        expect(tag.shortcut).toBe("E");
        expect(tag.text).toBe(f.strings.popupString("email user"));
    });

    it("照搬勿修：|opt= 形式的空文本选项产出空串，随后被 popupString(id) 兜回", async () => {
        const f = await fresh();
        const out = f.navlinks.navlinkStringToArray("<<editors|shortcut=E|>>", article(f, "Foo"), {});
        const tag = out[1] as Tag;
        expect(tag.shortcut).toBe("E");
        expect(tag.text).toBe(f.strings.popupString("editors"));
    });

    it("未给文本的标签回落 popupString(id)；mainlink 例外保持 undefined（照搬勿修）", async () => {
        const f = await fresh();
        const out = f.navlinks.navlinkStringToArray("<<contribs>><<mainlink>>", article(f, "Foo"), {});
        const contribs = out[1] as Tag;
        const mainlink = out[3] as Tag;
        expect(contribs.text).toBe(f.strings.popupString("contribs"));
        expect(mainlink.text).toBeUndefined();
    });

    it("params 的 oldid/rcid/diff 非空时注入标签，null/undefined 不注入", async () => {
        const f = await fresh();
        const full = f.navlinks.navlinkStringToArray("<<edit>>", article(f, "Foo"), { oldid: "11", rcid: "22", diff: "prev" })[1] as Tag;
        expect([full.oldid, full.rcid, full.diff]).toEqual(["11", "22", "prev"]);
        const none = f.navlinks.navlinkStringToArray("<<edit>>", article(f, "Foo"), { oldid: undefined, rcid: null, diff: undefined })[1] as Tag;
        expect(none.oldid).toBeUndefined();
        expect(none.rcid).toBeUndefined();
        expect(none.diff).toBeUndefined();
    });

    it("含分隔符/换行的多段规格串整体展开后再切分", async () => {
        const f = await fresh();
        const out = f.navlinks.navlinkStringToArray("<b><<mainlink|shortcut= >></b>*<<history>>", article(f, "Foo"), {});
        expect(out.map((x) => typeof x === "string" ? x : `<<${x.id}>>`)).toEqual(["<b>", "<<mainlink>>", "</b>*", "<<history>>", ""]);
    });
});

// ══ HTML 替换与深度（navlinkSubstituteHTML / navlinkDepth） ══

describe("navlinkSubstituteHTML / navlinkDepth", () => {
    it("`*` 全部替换为 popupNavLinkSeparator（默认 ' &sdot; '，window 覆盖生效）", async () => {
        const f = await fresh();
        expect(f.navlinks.navlinkSubstituteHTML("a*b*c")).toBe("a &sdot; b &sdot; c");
        const g = await fresh({ popupNavLinkSeparator: " | " });
        expect(g.navlinks.navlinkSubstituteHTML("a*b")).toBe("a | b");
    });

    it("<menu>/<menurow> 伪标签展开为 ul/li class 契约", async () => {
        const f = await fresh();
        expect(f.navlinks.navlinkSubstituteHTML("<menu><menurow>x</menurow></menu>")).toBe('<ul class="popup_menu"><li class="popup_menu_row">x</li></ul>');
        expect(f.navlinks.navlinkSubstituteHTML("</menurow></menu>")).toBe("</li></ul>");
    });

    it("navlinkDepth：开闭标签计数差（含嵌套与不配对）", async () => {
        const f = await fresh();
        expect(f.navlinks.navlinkDepth("menu", "<menu><menu>x</menu>")).toBe(1);
        expect(f.navlinks.navlinkDepth("menu", "</menu>")).toBe(-1);
        expect(f.navlinks.navlinkDepth("menurow", "<menurow></menurow><menurow>")).toBe(1);
        expect(f.navlinks.navlinkDepth("menurow", "x")).toBe(0);
    });
});

// ══ 渲染（navlinkStringToHTML / navLinksHTML） ══

describe("navlinkStringToHTML", () => {
    it('菜单内且不在 menurow 内的标签包 <li class="popup_menu_item">，menurow 内与菜单外不包', async () => {
        const f = await fresh();
        const html = f.navlinks.navlinkStringToHTML("<menu><menurow><<edit>></menurow><<history>></menu>后<<history>>", article(f, "Foo"), {});
        expect(html).toContain('<ul class="popup_menu"><li class="popup_menu_row"><span class="popup_edit">');
        expect(html).toContain('<li class="popup_menu_item"><span class="popup_history">');
        expect(html).toContain('</ul>后<span class="popup_history">');
        expect(html.split('<li class="popup_menu_item">')).toHaveLength(2);
    });

    it("params 缺省时按空表展开（?? {} 路径）", async () => {
        const f = await fresh();
        expect(f.navlinks.navlinkStringToHTML("<b><<mainlink>></b>", article(f, "Foo"))).toContain('class="popup_mainlink"');
    });
});

describe("navLinksHTML", () => {
    it("默认选项下全量渲染：popupNavLinks 容器 + mainlink + 分隔符 + 菜单链接 href", async () => {
        const f = await fresh();
        const html = f.navlinks.navLinksHTML(article(f, "Foo"));
        expect(html.startsWith('<span class="popupNavLinks">')).toBe(true);
        expect(html.endsWith("</span>")).toBe(true);
        expect(html).toContain('<b><span class="popup_mainlink">');
        expect(html).toContain(" &sdot; ");
        expect(html).toContain('<span class="popup_history">');
        // 主名字空间条目 if(talk) 为真：走 article/editArticle 分支（非 talk 分支）
        expect(html).toContain('<span class="popup_article">');
        expect(html).toContain('<span class="popup_editArticle">');
        expect(html).not.toContain("popup_talk");
        expect(html).toContain(`${TITLEBASE}Foo&amp;action=history`);
        expect(html).toContain(`${TITLEBASE}Foo`);
        // 匿名条目（当前 fixture 无 current.link）：user 段整体消失
        expect(html).not.toContain("popup_contribs");
    });

    it("用户页：user 段展开（contribs/userlog/count/email），admin 段按选项关闭", async () => {
        const f = await fresh();
        const html = f.navlinks.navLinksHTML(article(f, "User:Example"), null, {});
        expect(html).toContain("popup_contribs");
        expect(html).toContain("popup_userlog");
        expect(html).toContain("popup_count");
        expect(html).toContain("popup_email");
        expect(html).not.toContain("popup_block");
        expect(html).toContain("popup_history");
    });

    it("admin 开：admin 段（unprotect/delete/undelete）出现", async () => {
        const f = await fresh({ popupAdminLinks: true });
        const html = f.navlinks.navLinksHTML(article(f, "Foo"), null, {});
        expect(html).toContain("popup_unprotect");
        expect(html).toContain("popup_delete");
        expect(html).toContain("popup_undelete");
    });

    it("oldid 参数：edit 段走 editOld/revert/diffCur 分支", async () => {
        const f = await fresh();
        const html = f.navlinks.navLinksHTML(article(f, "Foo"), null, { oldid: "123" });
        expect(html).toContain("popup_editOld");
        expect(html).toContain("popup_revert");
        expect(html).toContain("popup_diffCur");
    });

    it("hint 形参被忽略（legacy 未用）：传 hint 与不传产出相同", async () => {
        const f = await fresh();
        expect(f.navlinks.navLinksHTML(article(f, "Foo"), "hint")).toBe(f.navlinks.navLinksHTML(article(f, "Foo")));
    });
});

// ══ NavlinkTag：html / getNewWin / 早退守卫 ══

describe("NavlinkTag.html", () => {
    it("span.popup_<id> 包裹 print 产物（shortcut 选项关时 addPopupShortcut 原样返回）", async () => {
        const f = await fresh();
        const t = makeTag(f, { id: "history", text: "历史" });
        t.getPrintFunction();
        const inner = f.links.wikiLink(t);
        expect(t.html()).toBe(`<span class="popup_history">${String(inner)}</span>`);
    });

    it("print 非函数（id 非字符串导致 getPrintFunction 早退）：记 errlog 并输出空内容", async () => {
        const f = await fresh();
        const t = new f.navlinks.NavlinkTag();
        (t as { id: unknown }).id = 5;
        t.article = article(f, "Foo");
        expect(t.html()).toBe('<span class="popup_5"></span>');
    });

    it("print 返回非字符串（arin 对非 IP 用户返回 null）时空内容", async () => {
        const f = await fresh();
        expect(makeTag(f, { id: "arin", article: "User:Example" }).html()).toBe('<span class="popup_arin"></span>');
    });

    it("shortcut 存在且 popupShortcutKeys 开：addPopupShortcut 补 title 与 popupkey 属性", async () => {
        const f = await fresh({ popupShortcutKeys: true });
        const t = makeTag(f, { id: "history", text: "历史" });
        t.shortcut = "h";
        expect(t.html()).toContain("[h]");
    });
});

describe("NavlinkTag.getNewWin", () => {
    it("popupLinksNewWindow 表命中（lastContrib/sinceMe 默认 true）→ newWin 取表值", async () => {
        const f = await fresh();
        const t = makeTag(f, { id: "lastContrib", article: "User:Example" });
        t.getNewWin();
        expect(t.newWin).toBe(true);
    });

    it("表未命中的 id → 先置 null 再被查询结果覆盖为 undefined（照搬勿修）", async () => {
        const f = await fresh();
        const t = makeTag(f, { id: "history" });
        t.getNewWin();
        expect(t.newWin).toBeUndefined();
    });

    it("表命中的 id 取表值（含显式 false）", async () => {
        const f = await fresh({ popupLinksNewWindow: { history: false } });
        const t = makeTag(f, { id: "history" });
        t.getNewWin();
        expect(t.newWin).toBe(false);
    });

    it("窗选项整体为 null：先置 null 仍被查询结果覆盖为 undefined（照搬勿修）", async () => {
        const f = await fresh({ popupLinksNewWindow: null });
        const t = makeTag(f, { id: "history" });
        t.getNewWin();
        expect(t.newWin).toBeUndefined();
    });
});

describe("NavlinkTag.getPrintFunction 早退守卫", () => {
    it("id 非字符串或 article 非对象：不进入 id 分派，print 保持未定义", async () => {
        const f = await fresh();
        const noId = new f.navlinks.NavlinkTag();
        (noId as { id: unknown }).id = null;
        noId.article = article(f, "Foo");
        noId.getPrintFunction();
        expect(noId.print).toBeUndefined();

        const noArticle = new f.navlinks.NavlinkTag();
        noArticle.id = "history";
        (noArticle as { article: unknown }).article = "not-a-title";
        noArticle.getPrintFunction();
        expect(noArticle.print).toBeUndefined();
    });
});

interface TagCase {
    id: string;
    article?: string;
    oldid?: string;
    rcid?: string;
    diff?: string;
    check: (f: Fresh, tag: Tag) => void;
}

// getPrintFunction 的 switch 全集：逐 id 断言 print 归属与关键参数
const TAG_CASES: TagCase[] = [
    {
        id: "undelete",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("Undelete");
            expect(t.sep).toBe("/");
        },
    },
    {
        id: "whatLinksHere",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("Whatlinkshere");
            expect(t.sep).toBeUndefined();
            expect(t.noPopup).toBeNull();
        },
    },
    {
        id: "relatedChanges",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("Recentchangeslinked");
            expect(t.noPopup).toBe(1);
        },
    },
    {
        id: "move",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("Movepage");
        },
    },
    {
        id: "contribs", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("Contributions");
            expect(t.article.toString()).toBe("Example");
            expect(t.noPopup).toBeNull();
        },
    },
    {
        id: "deletedContribs", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("Deletedcontributions");
        },
    },
    {
        id: "email", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("EmailUser");
            expect(t.sep).toBe("/");
        },
    },
    {
        id: "block", article: "User:Example",
        check: (_f, t) => {
            expect(t.print).toBe(_f.links.specialLink);
            expect(t.specialpage).toBe("Blockip");
            expect(t.sep).toBe("&ip=");
        },
    },
    {
        id: "unblock", article: "User:Example",
        check: (_f, t) => {
            expect(t.print).toBe(_f.links.specialLink);
            expect(t.specialpage).toBe("Ipblocklist");
            expect(t.sep).toBe("&action=unblock&ip=");
        },
    },
    {
        id: "userlog", article: "User:Example",
        check: (_f, t) => {
            expect(t.print).toBe(_f.links.specialLink);
            expect(t.specialpage).toBe("Log");
            expect(t.sep).toBe("&user=");
        },
    },
    {
        id: "blocklog", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("Log");
            expect(t.sep).toBe("&type=block&page=");
        },
    },
    {
        id: "pagelog", oldid: "5",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.sep).toBe("&page=");
            expect(t.oldid).toBeUndefined();
        },
    },
    {
        id: "protectlog", oldid: "5",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.sep).toBe("&type=protect&page=");
            expect(t.oldid).toBeUndefined();
        },
    },
    {
        id: "deletelog", oldid: "5",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.sep).toBe("&type=delete&page=");
            expect(t.oldid).toBeUndefined();
        },
    },
    {
        id: "userSpace", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("PrefixIndex");
            expect(t.sep).toBe("&namespace=2&prefix=");
        },
    },
    {
        id: "search",
        check: (f, t) => {
            expect(t.print).toBe(f.links.specialLink);
            expect(t.specialpage).toBe("Search");
            expect(t.sep).toBe("&fulltext=Search&search=");
        },
    },
    {
        id: "thank", diff: "222", oldid: "111",
        check: (_f, t) => {
            expect(t.print).toBe(_f.links.specialLink);
            expect(t.specialpage).toBe("Thanks");
            expect(t.article.value).toBe("222");
        },
    },
    {
        id: "thank", diff: "prev", oldid: "111",
        check: (_f, t) => {
            expect(t.specialpage).toBe("Thanks");
            expect(t.article.value).toBe("111");
        },
    },
    {
        id: "thank", diff: "prev",
        check: (_f, t) => {
            expect(t.article.value).toBeNull();
        },
    },
    {
        id: "thank",
        check: (_f, t) => {
            expect(t.specialpage).toBe("Thanks");
            expect(t.article.value).toBeNull();
        },
    },
    {
        id: "unwatch",
        check: (f, t) => {
            expect(t.print).toBe(f.links.magicWatchLink);
            expect(t.action).toBe(`unwatch&autowatchlist=1&autoimpl=${f.strings.popupString("autoedit_version")}&actoken=mock-session-id`);
        },
    },
    {
        id: "watch",
        check: (f, t) => {
            expect(t.print).toBe(f.links.magicWatchLink);
            expect(t.action).toContain("watch&autowatchlist=1&autoimpl=");
        },
    },
    {
        id: "history",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("history");
        },
    },
    {
        id: "historyfeed",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("historyfeed");
        },
    },
    {
        id: "unprotect",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("unprotect");
        },
    },
    {
        id: "protect",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("protect");
        },
    },
    {
        id: "delete",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("delete");
        },
    },
    {
        id: "delete", article: "File:Example.png",
        check: (_f, t) => {
            expect(t.action).toBe("delete&image=Example.png");
        },
    },
    {
        id: "markpatrolled", oldid: "7", rcid: "9",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("markpatrolled");
            expect(t.oldid).toBeUndefined();
        },
    },
    {
        id: "edit", oldid: "7",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit");
            expect(t.oldid).toBeUndefined();
        },
    },
    {
        id: "view",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("view");
        },
    },
    {
        id: "purge",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("purge");
        },
    },
    {
        id: "render",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("render");
        },
    },
    {
        id: "raw",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("raw");
        },
    },
    {
        id: "new",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit&section=new");
        },
    },
    {
        id: "userPage", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("view");
            expect(t.article.toString()).toBe("User:Example");
            expect(t.noPopup).toBeNull();
        },
    },
    {
        id: "article", article: "Talk:Foo",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("view");
            expect(t.article.toString()).toBe("Foo");
        },
    },
    {
        id: "monobook", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("view");
            expect(t.article.toString()).toBe("User:Example/monobook.js");
        },
    },
    {
        id: "editMonobook", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit");
            expect(t.article.toString()).toBe("User:Example/monobook.js");
        },
    },
    {
        id: "editArticle", article: "Talk:Foo",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit");
            expect(t.article.toString()).toBe("Foo");
        },
    },
    {
        id: "userTalk", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("view");
            expect(t.article.toString()).toBe("User_talk:Example");
        },
    },
    {
        id: "talk",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("view");
            expect(t.article.toString()).toBe("Talk:Foo");
        },
    },
    {
        id: "arin", article: "User:1.2.3.4",
        check: (f, t) => {
            expect(t.print).toBe(f.links.arinLink);
        },
    },
    {
        id: "count", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.editCounterLink);
        },
    },
    {
        id: "google",
        check: (_f, t) => {
            expect(t.print).toBe(_f.links.googleLink);
        },
    },
    {
        id: "editors",
        check: (f, t) => {
            expect(t.print).toBe(f.links.editorListLink);
        },
    },
    {
        id: "globalsearch",
        check: (f, t) => {
            expect(t.print).toBe(f.links.globalSearchLink);
        },
    },
    {
        id: "lastEdit",
        check: (f, t) => {
            expect(t.print).toBe(f.diffpreview.titledDiffLink);
            expect(t.title).toBe(f.strings.popupString("Show the last edit"));
            expect(t.from).toBe("prev");
            expect(t.to).toBe("cur");
            expect(t.noPopup).toBeNull();
        },
    },
    {
        id: "oldEdit", oldid: "42",
        check: (f, t) => {
            expect(t.print).toBe(f.diffpreview.titledDiffLink);
            expect(t.title).toBe(`${f.strings.popupString("Show the edit made to get revision")} 42`);
            expect(t.from).toBe("prev");
            expect(t.to).toBe("42");
        },
    },
    {
        id: "editOld",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit");
        },
    },
    {
        id: "undo",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit&undo=");
        },
    },
    {
        id: "revert",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("revert");
        },
    },
    {
        id: "nullEdit",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("nullEdit");
        },
    },
    {
        id: "diffCur", oldid: "42",
        check: (f, t) => {
            expect(t.print).toBe(f.diffpreview.titledDiffLink);
            expect(t.from).toBe("42");
            expect(t.to).toBe("cur");
        },
    },
    {
        id: "diffCur",
        check: (_f, t) => {
            expect(t.from).toBeNull();
            expect(t.to).toBe("cur");
        },
    },
    {
        id: "editUserTalk", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit");
            expect(t.article.toString()).toBe("User_talk:Example");
        },
    },
    {
        id: "editTalk",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit");
            expect(t.article.toString()).toBe("Talk:Foo");
        },
    },
    {
        id: "newUserTalk", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit&section=new");
            expect(t.article.toString()).toBe("User_talk:Example");
        },
    },
    {
        id: "newTalk",
        check: (f, t) => {
            expect(t.print).toBe(f.links.wikiLink);
            expect(t.action).toBe("edit&section=new");
            expect(t.article.toString()).toBe("Talk:Foo");
        },
    },
    {
        id: "lastContrib", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.magicHistoryLink);
        },
    },
    {
        id: "sinceMe", article: "User:Example",
        check: (f, t) => {
            expect(t.print).toBe(f.links.magicHistoryLink);
        },
    },
    {
        id: "togglePreviews",
        check: (f, t) => {
            expect(t.print).toBe(f.links.popupMenuLink);
            expect(t.text).toBe(f.strings.popupString("disable previews"));
        },
    },
    {
        id: "disablePopups",
        check: (f, t) => {
            expect(t.print).toBe(f.links.popupMenuLink);
        },
    },
    {
        id: "purgePopups",
        check: (f, t) => {
            expect(t.print).toBe(f.links.popupMenuLink);
        },
    },
    {
        id: "unknownTag",
        check: (_f, t) => {
            expect(t.html()).toBe('<span class="popup_unknownTag">Unknown navlink type: unknownTag</span>');
        },
    },
];

describe("NavlinkTag.getPrintFunction 全 id 分派", () => {
    for (const c of TAG_CASES) {
        it(`${c.id}${c.article ? `（${c.article}）` : ""}${c.diff ? ` diff=${c.diff}` : ""}`, async () => {
            const f = await fresh();
            const t = makeTag(f, { id: c.id, article: c.article, oldid: c.oldid, rcid: c.rcid, diff: c.diff });
            t.getPrintFunction();
            c.check(f, t);
        });
    }

    it("togglePreviews 在 simplePopups 缓存为真时文案为 enable previews（直读 optionStore 照搬）", async () => {
        const f = await fresh({ simplePopups: true });
        f.options.getValueOf("simplePopups");
        const t = makeTag(f, { id: "togglePreviews" });
        t.getPrintFunction();
        expect(t.text).toBe(f.strings.popupString("enable previews"));
    });
});

describe("NavlinkTag mainlink 专段", () => {
    it("text 未给：取 entify(文章名)；可剥离名字空间下按 / 简化（末段为空则回退前一段）", async () => {
        const f = await fresh();
        const t = makeTag(f, { id: "mainlink", article: "User:Foo/" });
        t.getPrintFunction();
        expect(t.text).toBe("User:Foo");
        expect(t.print).toBe(f.links.titledWikiLink);
        expect(t.action).toBe("view");
    });

    it("popupSimplifyMainLink 关：text 不简化（entify 全名）", async () => {
        const f = await fresh({ popupSimplifyMainLink: false });
        const t = makeTag(f, { id: "mainlink", article: "User:Foo/" });
        t.getPrintFunction();
        expect(t.text).toBe("User:Foo/");
    });

    it("主名字空间（不可剥离）不简化", async () => {
        const f = await fresh();
        const t = makeTag(f, { id: "mainlink", article: "Foo" });
        t.getPrintFunction();
        expect(t.text).toBe("Foo");
    });

    it("显式 text 不被覆盖；title 缺省时取 current.link 的 originalTitle", async () => {
        const f = await fresh();
        const a = document.createElement("a");
        a.href = `${TITLEBASE}Foo`;
        a.originalTitle = "原始标题";
        f.events.eventsState.current.link = a;
        const t = makeTag(f, { id: "mainlink", text: "自定" });
        t.getPrintFunction();
        expect(t.text).toBe("自定");
        expect(t.title).toBe("原始标题");
    });

    it("无 originalTitle 时回落 article 串（照搬勿修：三元而非 || 归并，空串同样回落）", async () => {
        const f = await fresh();
        const a = document.createElement("a");
        a.href = `${TITLEBASE}Foo`;
        f.events.eventsState.current.link = a;
        const plain = makeTag(f, { id: "mainlink", article: "Foo" });
        plain.getPrintFunction();
        expect(plain.title).toBe("Foo");

        a.originalTitle = "";
        const g = await fresh();
        const b = document.createElement("a");
        b.href = `${TITLEBASE}Foo`;
        b.originalTitle = "";
        g.events.eventsState.current.link = b;
        const empty = makeTag(g, { id: "mainlink", article: "Foo" });
        empty.getPrintFunction();
        expect(empty.title).toBe("Foo");
    });

    it("current.link 缺失：title 保持未定义", async () => {
        const f = await fresh();
        f.events.eventsState.current.link = null;
        const t = makeTag(f, { id: "mainlink", article: "Foo" });
        t.getPrintFunction();
        expect(t.title).toBeUndefined();
    });

    it("携带 oldid：title 换成 Revision %s of %s 修订串", async () => {
        const f = await fresh();
        const a = document.createElement("a");
        a.href = `${TITLEBASE}Foo`;
        f.events.eventsState.current.link = a;
        const t = makeTag(f, { id: "mainlink", article: "Foo", oldid: "12345" });
        t.getPrintFunction();
        expect(t.title).toBe(f.strings.tprintf("Revision %s of %s", ["12345", "Foo"]));
    });

    it("mainlink 不走 removeAnchor（照搬勿修：仅非 mainlink 去锚点）", async () => {
        const f = await fresh();
        const t = new f.navlinks.NavlinkTag();
        t.id = "mainlink";
        t.article = new f.title.Title("Foo#Section");
        t.getPrintFunction();
        expect(t.article.toString()).toBe("Foo#Section");
    });
});

// ══ 槽填充器注册与装配路径 ══

describe("槽填充器注册面", () => {
    const NAVLINK_KEYS = [
        "original.popupTitle",
        "original.popupTopLinks",
        "nostalgia.popupTopLinks",
        "fancy.popupTitle",
        "fancy.popupTopLinks",
        "fancy.popupOtherLinks",
        "fancy2.popupTopLinks",
        "menus.popupTopLinks",
        "shortmenus.popupTopLinks",
        "lite.popupTitle",
    ];

    it("10 个 navlink 槽键在模块求值时全部注册", async () => {
        const f = await fresh();
        for (const key of NAVLINK_KEYS) {
            expect(f.structures.getSlotFiller(key), key).toBeTypeOf("function");
        }
    });

    it("结构表引用的槽键全部就位（阶段 5 后原留给 preview 域的 original.popupImage 亦已注册）", async () => {
        const f = await fresh();
        const wanted = new Set<string>();
        for (const structure of Object.values(f.structures.structures)) {
            for (const key of Object.values(structure.slots)) {
                if (typeof key === "string") {
                    wanted.add(key);
                }
            }
        }
        // 阶段 5 前此断言为 ["original.popupImage"]（唯一空缺槽，待 preview 域
        // 注册）；preview/images.ts 现于模块顶层注册该键——本文件的模块图经
        // events → dispatch → images 传递引入，注册随之可见
        expect([...wanted].filter((key) => typeof f.structures.getSlotFiller(key) === "undefined")).toEqual([]);
    });

    it("经 htmlout 装配（original）：TopLinks 槽写入 popupNavLinks 渲染，Title 槽在 navlinks 开时为空", async () => {
        const f = await fresh({ popupStructure: "original" });
        const a = document.createElement("a");
        a.href = `${TITLEBASE}Foo`;
        const pop = { idNumber: 3, parentAnchor: a };
        document.body.innerHTML = f.htmlout.popupHTML({ navpopup: pop });
        f.htmlout.fillEmptySpans({ navpopup: pop });
        expect(document.getElementById("popupTopLinks3")?.innerHTML).toContain('class="popupNavLinks"');
        expect(document.getElementById("popupTitle3")?.innerHTML).toBe("");
        expect(document.getElementById("popupOtherLinks3")?.innerHTML).toBe("");
    });

    it("经 htmlout 装配（original + popupNavLinks 关）：TopLinks 槽为空、Title 槽回落 mainlink 标题串", async () => {
        const f = await fresh({ popupStructure: "original", popupNavLinks: false });
        const a = document.createElement("a");
        a.href = `${TITLEBASE}Foo`;
        const pop = { idNumber: 4, parentAnchor: a };
        document.body.innerHTML = f.htmlout.popupHTML({ navpopup: pop });
        f.htmlout.fillEmptySpans({ navpopup: pop });
        expect(document.getElementById("popupTopLinks4")?.innerHTML).toBe("");
        expect(document.getElementById("popupTitle4")?.innerHTML).toContain('<span class="popup_mainlink">');
    });

    it("默认 shortmenus 的 TopLinks 走 menus 渲染（不受 popupNavLinks 门控，照搬勿修）", async () => {
        const f = await fresh();
        const a = document.createElement("a");
        a.href = `${TITLEBASE}Foo`;
        const pop = { idNumber: 5, parentAnchor: a };
        document.body.innerHTML = f.htmlout.popupHTML({ navpopup: pop });
        f.htmlout.fillEmptySpans({ navpopup: pop });
        expect(document.getElementById("popupTopLinks5")?.innerHTML).toContain('<ul class="popup_menu">');
        expect(document.getElementById("popupTopLinks5")?.innerHTML).not.toContain('class="popupNavLinks"');
        expect(document.getElementById("popupTitle5")?.innerHTML).toBe("");
    });
});

describe("original / nostalgia / fancy / fancy2 / lite 填充器直调", () => {
    it("original.popupTitle：popupNavLinks 开为空串、关为 <b>mainlink</b> 串", async () => {
        const f = await fresh();
        expect(f.structures.getSlotFiller("original.popupTitle")?.(ctx(f, "Foo"))).toBe("");
        const g = await fresh({ popupNavLinks: false });
        const html = htmlOf(g.structures.getSlotFiller("original.popupTitle")?.(ctx(g, "Foo")));
        expect(html.startsWith("<b>")).toBe(true);
        expect(html.endsWith("</b>")).toBe(true);
        expect(html).toContain('<span class="popup_mainlink">');
        expect(html).toContain(`${TITLEBASE}Foo`);
    });

    it("original.popupTopLinks：params 透传给 navLinksHTML（oldid 影响输出）", async () => {
        const f = await fresh();
        const filler = f.structures.getSlotFiller("original.popupTopLinks");
        expect(htmlOf(filler?.(ctx(f, "Foo", { params: { oldid: "9" } })))).toContain("popup_editOld");
        expect(htmlOf(filler?.(ctx(f, "Foo", { params: {} })))).not.toContain("popup_editOld");
    });

    it("original.popupTopLinks：popupNavLinks 关时为空串", async () => {
        const f = await fresh({ popupNavLinks: false });
        expect(f.structures.getSlotFiller("original.popupTopLinks")?.(ctx(f, "Foo"))).toBe("");
    });

    it("nostalgia.popupTopLinks：admin 开时 move 段用换行、admin 段含 unprotect/undelete；无 editors", async () => {
        const f = await fresh({ popupAdminLinks: true });
        const html = htmlOf(f.structures.getSlotFiller("nostalgia.popupTopLinks")?.(ctx(f, "Foo")));
        expect(html).toContain('<br><span class="popup_move">');
        expect(html).toContain("popup_unprotect");
        expect(html).toContain("popup_undelete");
        expect(html).not.toContain("popup_editors");
        expect(html).toContain('<span class="popup_history">');
    });

    it("nostalgia 非 admin：if(admin) 全被展开掉，move 前是 else 分支的分隔符", async () => {
        const f = await fresh();
        const html = htmlOf(f.structures.getSlotFiller("nostalgia.popupTopLinks")?.(ctx(f, "Foo")));
        expect(html).not.toContain("if(admin)");
        expect(html).not.toContain("popup_unprotect");
        expect(html).toContain(' &sdot; <span class="popup_move">');
    });

    it("fancy.popupTitle：font size=+0 包裹 mainlink", async () => {
        const f = await fresh();
        const html = htmlOf(f.structures.getSlotFiller("fancy.popupTitle")?.(ctx(f, "Foo")));
        expect(html.startsWith("<font size=+0>")).toBe(true);
        expect(html.endsWith("</font>")).toBe(true);
        expect(html).toContain('<span class="popup_mainlink">');
    });

    it("fancy.popupTopLinks / popupOtherLinks：hist/watch/move 段与 user+admin 组合", async () => {
        const f = await fresh({ popupAdminLinks: true });
        const top = htmlOf(f.structures.getSlotFiller("fancy.popupTopLinks")?.(ctx(f, "Foo")));
        expect(top).toContain('<span class="popup_lastEdit">');
        expect(top).toContain('<span class="popup_editors">');
        expect(top.endsWith("<br>")).toBe(true);
        const other = htmlOf(f.structures.getSlotFiller("fancy.popupOtherLinks")?.(ctx(f, "User:Example")));
        expect(other).toContain("popup_contribs");
        expect(other).toContain("popup_delete");
        expect(other).toContain("popup_whatLinksHere");
    });

    it("fancy2.popupTopLinks：fancy 串加前导 <br> 并剥掉尾部 <br>", async () => {
        const f = await fresh();
        const fancy = htmlOf(f.structures.getSlotFiller("fancy.popupTopLinks")?.(ctx(f, "Foo")));
        expect(htmlOf(f.structures.getSlotFiller("fancy2.popupTopLinks")?.(ctx(f, "Foo")))).toBe(`<br>${fancy.replace(/<br>$/, "")}`);
    });

    it("lite.popupTitle：不经 DSL 的纯 HTML 标题", async () => {
        const f = await fresh();
        expect(f.structures.getSlotFiller("lite.popupTitle")?.(ctx(f, "Foo"))).toBe('<div><span class="popup_mainlink"><b>Foo</b></span></div>');
    });
});

describe("menus / shortmenus 填充器", () => {
    it("menus：下拉菜单骨架（popup_drop 标题 + ul.popup_menu + menurow 行），并置 hasPopupMenu", async () => {
        const f = await fresh();
        const x = ctx(f, "Foo");
        const html = htmlOf(f.structures.getSlotFiller("menus.popupTopLinks")?.(x));
        expect(html).toContain('<div class="popup_drop" style="--navpop-m-len:');
        expect(html).toContain('<a href="#" noPopup=1>');
        expect(html).toContain('<ul class="popup_menu">');
        expect(html).toContain('<li class="popup_menu_row">');
        expect(html).toContain("popup_historyfeed");
        expect(html).toContain("popup_lastContrib");
        expect(html).toContain("popup_purge");
        expect(html).toContain("popup_togglePreviews");
        expect(x.navpop.hasPopupMenu).toBe(true);
    });

    it("menus：hasPopupMenu 已置位后不再追加 popupsMenu 段（单弹窗只建一次菜单）", async () => {
        const f = await fresh();
        const filler = f.structures.getSlotFiller("menus.popupTopLinks");
        const first = htmlOf(filler?.(ctx(f, "Foo")));
        const second = htmlOf(filler?.(ctx(f, "Foo", { navpop: { idNumber: 4, parentAnchor: null, hasPopupMenu: true } })));
        expect(first).toContain("popup_togglePreviews");
        expect(second).not.toContain("popup_togglePreviews");
    });

    it("popupSetupMenu 关：不建 popupsMenu 段也不置标记", async () => {
        const f = await fresh({ popupSetupMenu: false });
        const x = ctx(f, "Foo");
        expect(htmlOf(f.structures.getSlotFiller("menus.popupTopLinks")?.(x))).not.toContain("popup_togglePreviews");
        expect(x.navpop.hasPopupMenu).toBeUndefined();
    });

    it("popupActionsMenu 关：主链不用 popup_drop 标题包裹（直出 div.popup_drop + mainlink）", async () => {
        const f = await fresh({ popupActionsMenu: false });
        const html = htmlOf(f.structures.getSlotFiller("menus.popupTopLinks")?.(ctx(f, "Foo")));
        expect(html.startsWith('<div class="popup_drop"><span class="popup_mainlink">')).toBe(true);
        expect(html).not.toContain(`>${f.strings.popupString("actions")}</a>`);
    });

    it("shortmenus（shorter=true）：无 historyfeed/lastContrib/viewOptions/nullPurge/search 等长段", async () => {
        const f = await fresh();
        const html = htmlOf(f.structures.getSlotFiller("shortmenus.popupTopLinks")?.(ctx(f, "Foo")));
        expect(html).toContain('<ul class="popup_menu">');
        expect(html).not.toContain("popup_historyfeed");
        expect(html).not.toContain("popup_lastContrib");
        expect(html).not.toContain("popup_view");
        expect(html).not.toContain("popup_search");
        expect(html).toContain("popup_history");
        // 匿名条目无 user 段（if(user) 整段消失），email 只在 user 段内出现
        expect(html).not.toContain("popup_email");
        expect(html).toContain("popup_article");
    });

    it("shortmenus：用户页与 admin 组合段（deletedContribs/unblock/blocklog）", async () => {
        const f = await fresh({ popupAdminLinks: true });
        const html = htmlOf(f.structures.getSlotFiller("shortmenus.popupTopLinks")?.(ctx(f, "User:Example")));
        expect(html).toContain("popup_userPage");
        expect(html).toContain("popup_deletedContribs");
        expect(html).toContain("popup_unblock");
        expect(html).toContain("popup_blocklog");
    });
});
