// 预览生成域单元测试：Previewmaker——wikitext 清洗管线（kill* 系列）、
// maxSentences/maxCharacters 摘要截取（firstBit/fixSentenceEnds/firstSentences）、
// makePreview（全文管线 / Template·File 名字空间只 killHTML）、showPreview
// （槽写入 + more 链接 + 600ms 轮询重试）、editSummaryPreview（/* 章节 */ 渲染）。
// 行为基准 = legacy src/modules/previewmaker.ts（commit 02c8dec）；期望值由
// legacy 逐行拷贝的管线模拟器 + insta 域已锁定输出组合推导。
//
// legacy 怪癖无用户可见差异的逐字照搬，用例名标注「照搬勿修」——
// - killComments 的 [^$] 字符类（本意应为 [^>]，$ 系笔误但沿袭多年）
// - killDivs 嵌套 div 只杀首个最短闭合段，外层闭标签残留
// - killBoxTemplates 的 begin/end 不对称处理（end 由第二条 infobox 规则吃掉）
// - killStuff 单花括号 { } 计深度、自闭合 ref 不匹配 kill 的 ref 正则
// - firstBit 句界分隔符含尾随空格进结果、n 归零退出时保留超长首句
// 注意：多处期望串以空格结尾（句子分隔符/insta 段落尾随空格），编辑勿误删。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { buildTitleWikiFixtures } from "../../helpers/wikiFixtures.ts";
import type * as HtmloutNs from "../../../src/core/htmlout.ts";
import type * as InstaNs from "../../../src/preview/insta.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PopupNs from "../../../src/core/popup.ts";
import type * as PreviewmakerNs from "../../../src/preview/previewmaker.ts";
import type * as StringsNs from "../../../src/core/strings.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type Htmlout = typeof HtmloutNs;
type Insta = typeof InstaNs;
type Namespaces = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type Popup = typeof PopupNs;
type PreviewmakerModule = typeof PreviewmakerNs;
type Strings = typeof StringsNs;
type TitleModule = typeof TitleNs;

interface Fresh {
    previewmaker: PreviewmakerModule;
    insta: Insta;
    namespaces: Namespaces;
    options: OptionsModule;
    htmlout: Htmlout;
    popup: Popup;
    strings: Strings;
    title: TitleModule;
}

// 站点形态对齐萌百（articlePath /wiki）；Title.fromURL（editSummaryPreview 用）
// 依赖的 wiki.re 全套按 legacy init.ts 公式装配
const BASE_URL = "https://zh.moegirl.org.cn/wiki/Foo";

// 本文件写到 window 上的选项覆盖，用例间统一摘除（getValueOf 首读固化缓存，
// 不同选项组合经 resetModules 各自重载 + 各自覆盖）
let windowOptionKeys: string[] = [];

const fresh = async (overrides: Record<string, unknown> = {}): Promise<Fresh> => {
    vi.resetModules();
    const installed = installMw({ config: { wgArticlePath: "/wiki/$1" } });
    const [previewmaker, insta, namespaces, options, htmlout, popup, strings, title] = await Promise.all([
        import("../../../src/preview/previewmaker.ts"),
        import("../../../src/preview/insta.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/core/htmlout.ts"),
        import("../../../src/core/popup.ts"),
        import("../../../src/core/strings.ts"),
        import("../../../src/title/title.ts"),
    ]);
    namespaces.setNamespaces();
    options.setOptions();
    insta.setupLivePreview({
        articlePath: "/wiki",
        interwiki: "en|ja",
        imageNamespace: "File",
        categoryNamespace: "Category",
    });
    buildTitleWikiFixtures(installed.mw, title.wiki, namespaces);
    htmlout.registerPositionChecker(null);
    htmlout.registerTooltipScanner(null);
    for (const [key, value] of Object.entries(overrides)) {
        (window as unknown as Record<string, unknown>)[key] = value;
        windowOptionKeys.push(key);
    }
    return { previewmaker, insta, namespaces, options, htmlout, popup, strings, title };
};

const make = (f: Fresh, wikiText: string, baseUrl: string | TitleNs.Title = BASE_URL): PreviewmakerNs.Previewmaker =>
    new f.previewmaker.Previewmaker(wikiText, baseUrl);

// showPreview 槽位骨架：#popupPrePreviewSep<N> / #popupPreview<N> /
// #popupPreviewMore<N>（DOM/CSS 契约 id 形态）
const slotDivs = (id: number, names: string[]): void => {
    for (const n of names) {
        const div = document.createElement("div");
        div.id = `${n}${String(id)}`;
        document.body.appendChild(div);
    }
};

// 宿主弹窗：idNumber 槽位编号；articleName 为 null 表示「弹窗尚未装配条目」
const ownerWith = (f: Fresh, articleName: string | null, idNumber = 1): PreviewmakerNs.PreviewOwner => {
    const owner = new f.popup.Navpopup();
    owner.idNumber = idNumber;
    const ownerWithArticle = owner as PreviewmakerNs.PreviewOwner;
    if (articleName !== null) {
        ownerWithArticle.article = new f.title.Title(articleName);
    }
    return ownerWithArticle;
};

afterEach(() => {
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.innerHTML = "";
});

describe("构造与 setData", () => {
    it("默认选项：maxCharacters=600、maxSentences=5、data 为原文", async () => {
        const f = await fresh();
        const pm = make(f, "short text");
        expect(pm.maxCharacters).toBe(600);
        expect(pm.maxSentences).toBe(5);
        expect(pm.originalData).toBe("short text");
        expect(pm.data).toBe("short text");
        expect(pm.html).toBeUndefined();
        expect(pm.fullLength).toBe(0);
    });

    it("window 覆盖链：popupMaxPreviewCharacters=6000 时截断上限 12000", async () => {
        const f = await fresh({ popupMaxPreviewCharacters: 6000 });
        const pm = make(f, "x".repeat(12000));
        expect(pm.maxCharacters).toBe(6000);
        expect(pm.data).toHaveLength(12000);
    });

    it("截断上限 = max(1e4, 2*maxCharacters)：默认 600 时取 1e4", async () => {
        const f = await fresh();
        const pm = make(f, "y".repeat(11000));
        expect(pm.data).toHaveLength(10000);
    });
});

describe("killComments", () => {
    it.each<[string, string, string]>([
        ["行首注释连尾换行一起删", "<!-- c -->\nrest", "rest"],
        ["独行注释删（后随换行由 lookahead 保留）", "a\n<!-- c -->\nb", "a\nb"],
        ["行内注释删", "a<!-- c -->b", "ab"],
        ["注释含 $ 不删（[^$] 字符类笔误，照搬勿修）", "a<!-- $ -->b", "a<!-- $ -->b"],
        ["跨行注释删（[^$] 含换行）", "a<!-- x\ny -->b", "ab"],
    ])("%s", async (_name, input, expected) => {
        const f = await fresh();
        const pm = make(f, input);
        pm.killComments();
        expect(pm.data).toBe(expected);
    });
});

describe("killDivs / killGalleries", () => {
    it.each<[string, string, string]>([
        ["div 整段删", "x<div>a</div>y", "xy"],
        ["大小写与属性容忍", "x<DIV class=q>a</DIV>y", "xy"],
        ["嵌套 div 只杀首个最短闭合段（外闭标签残留，照搬勿修）", "<div>a<div>b</div>c</div>d", "c</div>d"],
        ["gallery 整段删", "x<gallery>File:a.jpg</gallery>y", "xy"],
    ])("%s", async (_name, input, expected) => {
        const f = await fresh();
        const pm = make(f, input);
        if (input.includes("gallery")) {
            pm.killGalleries();
        } else {
            pm.killDivs();
        }
        expect(pm.data).toBe(expected);
    });
});

describe("killTemplates", () => {
    it.each<[string, string, string]>([
        ["单模板删并补一个空格", "{{t}}x", " x"],
        ["嵌套模板按 { } 深度配平整体删", "{{a{{b}}c}}x", " x"],
        ["无模板原样", "plain text", "plain text"],
        ["两个模板各补空格（kill 循环二次扫描）", "{{a}}{{b}}z", "  z"],
        ["正文单花括号也计入深度", "{{a {x} b}}tail", " tail"],
        ["未闭合模板吃尽到尾（照搬勿修）", "{{unclosed", " "],
    ])("%s", async (_name, input, expected) => {
        const f = await fresh();
        const pm = make(f, input);
        pm.killTemplates();
        expect(pm.data).toBe(expected);
    });
});

describe("killBoxTemplates", () => {
    it.each<[string, string, string]>([
        ["begin/end 都被吃（end 由第二条 infobox 规则匹配，照搬勿修）", "{{Infobox float begin}}content{{Infobox float end}}rest", "contentrest"],
        ["infobox 前缀模板删", "a{{infobox x}}b", "ab"],
        ["elementbox 前缀模板删", "{{elementbox thing}}c", "c"],
        ["无 box 前缀模板不动", "{{plain}}x", "{{plain}}x"],
    ])("%s", async (_name, input, expected) => {
        const f = await fresh();
        const pm = make(f, input);
        pm.killBoxTemplates();
        expect(pm.data).toBe(expected);
    });
});

describe("killTables", () => {
    it.each<[string, string, string]>([
        ["wiki 表整体删", "{|a|}x", "x"],
        ["嵌套 wiki 表按 {| 深度配平删", "{|o{|i|}|}t", "t"],
        ["html 表整体删", "<table><tr>x</table>y", "y"],
        ["行首 | 的行删", "a\n|row\nb", "a\n\nb"],
    ])("%s", async (_name, input, expected) => {
        const f = await fresh();
        const pm = make(f, input);
        pm.killTables();
        expect(pm.data).toBe(expected);
    });
});

describe("killImages", () => {
    it.each<[string, string, string]>([
        ["File 链接删（闭括号吞尾随空白）", "[[File:x.png]]tail", "tail"],
        ["Category 链接删", "[[Category:Y]]tail", "tail"],
        ["本地化别名（档案）", "[[档案:f.jpg]]t", "t"],
        ["两个文件链接都删", "[[File:a]][[File:b]]z", "z"],
        ["非 File/Category 命名空间链接不动", "[[Template:X]]y", "[[Template:X]]y"],
    ])("%s", async (_name, input, expected) => {
        const f = await fresh();
        const pm = make(f, input);
        pm.killImages();
        expect(pm.data).toBe(expected);
    });
});

describe("killHTML", () => {
    it.each<[string, string, string]>([
        ["ref 整段删", "a<ref>r</ref>b", "ab"],
        ["行首标签行折叠为换行（该行余文丢弃，照搬勿修）", "x\n<b>bold</b>", "x\n"],
        ["nowiki 标记保留", "a <nowiki>x</nowiki> b", "a <nowiki>x</nowiki> b"],
        ["nowiki 闭标记也保留", "x </nowiki> y", "x </nowiki> y"],
        ["其余标签清空（内容保留）", "a <b>c</b> d", "a c d"],
        ["自闭合 ref 不匹配 kill 正则、由标签清空兜住（照搬勿修）", "a <ref name=x/> b", "a  b"],
        ["行首 blockquote 先被行折叠吃掉（照搬勿修）", "<blockquote>q</blockquote>r", "\n"],
        ["行中 blockquote 标记保留", "a <blockquote>q</blockquote> r", "a <blockquote>q</blockquote> r"],
    ])("%s", async (_name, input, expected) => {
        const f = await fresh();
        const pm = make(f, input);
        pm.killHTML();
        expect(pm.data).toBe(expected);
    });
});

describe("killChunks", () => {
    it("长斜体块（内文 20+ 单元）整块删", async () => {
        const f = await fresh();
        const pm = make(f, `keep\n''${"a".repeat(21)}''\nafter`);
        pm.killChunks();
        expect(pm.data).toBe("keep\nafter");
    });

    it("短斜体不动", async () => {
        const f = await fresh();
        const pm = make(f, "''ab''");
        pm.killChunks();
        expect(pm.data).toBe("''ab''");
    });
});

describe("mopup", () => {
    it.each<[string, string, string]>([
        ["行首 4+ 减号删", "----x", "x"],
        ["冒号引导的行删（前导换行一并删、后随换行保留）", "a\n:b\nc", "a\nc"],
        ["整行魔术字删（留空行）", "x\n__NOTOC__\ny", "x\n\ny"],
    ])("%s", async (_name, input, expected) => {
        const f = await fresh();
        const pm = make(f, input);
        pm.mopup();
        expect(pm.data).toBe(expected);
    });
});

describe("firstBit", () => {
    it("非首段误判句界时前段原样保留（fixSentenceEnds 的 j<i 分支，照搬勿修）", async () => {
        const f = await fresh();
        const pm = make(f, "x");
        // 按句切分后的形态：[正文, 分隔符, ...]；第二正文段以 etc 收尾触发
        // 误判合并，其前的正文/分隔符段保持原样（j<i 拷贝路径）
        const notSentenceEnds = /([^.][a-z][.] *[a-z]|etc|sic|Dr|Mr|Mrs|Ms|St|no|op|cit|\[[^\]]*|\s[A-Zvclm])$/i;
        const out = pm.fixSentenceEnds(
            ["One", ". ", "Two etc", ". ", "Three", ". ", "Four."],
            notSentenceEnds,
        );
        expect(out).toEqual(["One", ". ", "Two etc. Three", ". ", "Four."]);
    });

    it("默认（5 句 / 600 字符）全保留", async () => {
        const f = await fresh();
        const pm = make(f, "Hello world. Another sentence here. Third one. Fourth.");
        pm.firstBit();
        expect(pm.data).toBe("Hello world. Another sentence here. Third one. Fourth.");
        expect(pm.fullLength).toBe(54);
    });

    it("maxCharacters=20 时按句递减到 2 句（句界分隔符含尾随空格进结果，照搬勿修）", async () => {
        const f = await fresh({ popupMaxPreviewCharacters: 20 });
        const pm = make(f, "Hello world. Another sentence here. Third one. Fourth.");
        pm.firstBit();
        expect(pm.data).toBe("Hello world. ");
    });

    it("maxSentences=1 且首句超 maxCharacters：n 归零退出保留超长（照搬勿修）", async () => {
        const f = await fresh({ popupMaxPreviewSentences: 1, popupMaxPreviewCharacters: 20 });
        const pm = make(f, "One really long sentence stays. Second.");
        pm.firstBit();
        expect(pm.data).toBe("One really long sentence stays. ");
        expect(pm.fullLength).toBe(39);
    });

    it("popupPreviewFirstParOnly=false 时不截首段", async () => {
        const f = await fresh({ popupPreviewFirstParOnly: false });
        const pm = make(f, "First para\n\nSecond para here.");
        pm.firstBit();
        expect(pm.data).toBe("First para\n\nSecond para here.");
    });

    it("popupPreviewCutHeadings=false 时跳过标题重排与首段提取", async () => {
        const f = await fresh({ popupPreviewCutHeadings: false });
        const pm = make(f, "a\n\nb c. d.");
        pm.firstBit();
        expect(pm.data).toBe("a\n\nb c. d.");
    });

    it("标题重排为首行并补空行分隔", async () => {
        const f = await fresh();
        const pm = make(f, "== H ==\nText more.");
        pm.firstBit();
        expect(pm.data).toBe("== H ==\n\nText more.");
    });

    it("缩写 Dr. 不当句尾（合并进下一句）", async () => {
        const f = await fresh();
        const pm = make(f, "Dr. Smith is here. Second.");
        pm.firstBit();
        expect(pm.data).toBe("Dr. Smith is here. Second.");
    });

    it("缩写 etc. 合并", async () => {
        const f = await fresh();
        const pm = make(f, "etc. merged sentence. Next.");
        pm.firstBit();
        expect(pm.data).toBe("etc. merged sentence. Next.");
    });

    it("未闭合方括号吞并后续句界", async () => {
        const f = await fresh();
        const pm = make(f, "see [note. also. end.");
        pm.firstBit();
        expect(pm.data).toBe("see [note. also. end.");
    });

    it("冒号后连续空行折叠为单换行（定义列表续行）", async () => {
        const f = await fresh();
        const pm = make(f, "def:\n\n\nx. y.");
        pm.firstBit();
        expect(pm.data).toBe("def:\nx. y.");
    });

    it("首段提取：无空行分隔的相邻行属同段，空行后的段落丢弃", async () => {
        const f = await fresh();
        const pm = make(f, "First line\nsecond line.\n\nThird para.");
        pm.firstBit();
        expect(pm.data).toBe("First line\nsecond line.");
    });
});

describe("killBadWhitespace", () => {
    it("纯引号行删除", async () => {
        const f = await fresh();
        const pm = make(f, "a\n''\nb");
        pm.killBadWhitespace();
        expect(pm.data).toBe("a\n\nb");
    });
});

describe("makeRegexp", () => {
    it("字符串入参按字面量化（点号不任意匹配）", async () => {
        const f = await fresh();
        const pm = make(f, "");
        const re = pm.makeRegexp("a.b");
        expect(re.test("a.b")).toBe(true);
        expect(re.test("axb")).toBe(false);
    });

    it("正则入参重建保留标志、前缀内插在源前（toString 拆解，照搬勿修）", async () => {
        const f = await fresh();
        const pm = make(f, "");
        const re = pm.makeRegexp(/q/i, "^");
        expect(re.source).toBe("^q");
        expect(re.ignoreCase).toBe(true);
        expect(re.test("Q")).toBe(true);
        expect(re.test("xQ")).toBe(false);
    });
});

describe("makePreview", () => {
    it("无 owner：全文清洗管线 + wiki2html", async () => {
        const f = await fresh();
        const pm = make(f, "Hello [[world]].");
        pm.makePreview();
        expect(pm.data).toBe("Hello [[world]].");
        expect(pm.html).toBe("<p>Hello <a href='/wiki/world'>world</a>. ");
    });

    it("综合管线：注释/模板/图片清洗 + 标题保留", async () => {
        const f = await fresh();
        const pm = make(f, "<!-- c -->\n{{stub}}\n== S ==\nText [[File:x.png]] here.");
        pm.makePreview();
        expect(pm.data).toBe("== S ==\n\nText here.");
        expect(pm.html).toBe("<h2> S </h2><p>Text here. ");
    });

    it("baseUrl 透传 wiki2html（子页面链接前缀）", async () => {
        const f = await fresh();
        const pm = make(f, "[[/sub]] x");
        pm.makePreview();
        expect(pm.html).toBe("<p><a href='https://zh.moegirl.org.cn/wiki/Foo/sub'>/sub</a> x ");
    });

    it("owner.article 为 Template 名字空间：只 killHTML，模板保留进 html", async () => {
        const f = await fresh();
        const pm = new f.previewmaker.Previewmaker("{{Infobox|x=y}}<ref>r</ref>", BASE_URL, ownerWith(f, "Template:Foo"));
        pm.makePreview();
        expect(pm.data).toBe("{{Infobox|x=y}}");
        expect(pm.html).toBe("<p>{{Infobox|x=y}} ");
    });

    it("owner.article 为 File 名字空间：同 Template 路径", async () => {
        const f = await fresh();
        const pm = new f.previewmaker.Previewmaker("desc [[x]]", BASE_URL, ownerWith(f, "File:x.png"));
        pm.makePreview();
        expect(pm.data).toBe("desc [[x]]");
        expect(pm.html).toBe("<p>desc <a href='/wiki/x'>x</a> ");
    });

    it("owner 无 article（尚未装配条目）：走全文管线", async () => {
        const f = await fresh();
        const pm = new f.previewmaker.Previewmaker("Hello [[world]].", BASE_URL, ownerWith(f, null));
        pm.makePreview();
        expect(pm.html).toBe("<p>Hello <a href='/wiki/world'>world</a>. ");
    });

    it("popupPreviewKillTemplates=false：走 killMultilineTemplates，单行模板保留", async () => {
        const f = await fresh({ popupPreviewKillTemplates: false });
        const pm = make(f, "{{stub}}\nkeep");
        pm.makePreview();
        expect(pm.data).toBe("{{stub}}\nkeep");
        expect(pm.html).toBe("<p>{{stub}} keep ");
    });

    it("fixHTML 经管线生效：条目名内 ? 转义为 %3F", async () => {
        const f = await fresh();
        const pm = make(f, "See [[Foo?bar]] now.");
        pm.makePreview();
        expect(pm.html).toBe("<p>See <a href='/wiki/Foo%3Fbar'>Foo?bar</a> now. ");
    });

    it("空数据：html 为空串（fixHTML 空值守卫返回）", async () => {
        const f = await fresh();
        const pm = make(f, "");
        pm.makePreview();
        expect(pm.html).toBe("");
    });
});

describe("editSummaryPreview", () => {
    it("/* 章节 */ 摘要：章节锚点链接 + autocomment 包裹", async () => {
        const f = await fresh();
        const pm = make(f, "/* Section */ comment");
        // eslint-disable-next-line @stylistic/quotes -- 期望串锁定 legacy 的 <span class='autocomment'> 单引号输出
        expect(pm.editSummaryPreview()).toBe(`<span class='autocomment'><a href="/wiki/Foo#Section">&rarr;</a> Section: </span> comment`);
    });

    it("前缀非空：前缀渲染后接「- 」", async () => {
        const f = await fresh();
        const pm = make(f, "pref /* S */ post");
        // eslint-disable-next-line @stylistic/quotes -- 期望串锁定 legacy 的 <span class='autocomment'> 单引号输出
        expect(pm.editSummaryPreview()).toBe(`pref <span class='autocomment'>- <a href="/wiki/Foo#S">&rarr;</a> S: </span> post`);
    });

    it("后缀为空：无「: 」尾注", async () => {
        const f = await fresh();
        const pm = make(f, "/* S */");
        // eslint-disable-next-line @stylistic/quotes -- 期望串锁定 legacy 的 <span class='autocomment'> 单引号输出
        expect(pm.editSummaryPreview()).toBe(`<span class='autocomment'><a href="/wiki/Foo#S">&rarr;</a> S</span>`);
    });

    it("中文章节名锚点按 anchorFromUtf 百分号点化编码", async () => {
        const f = await fresh();
        const pm = make(f, "/* 章节 */ x");
        // eslint-disable-next-line @stylistic/quotes -- 期望串锁定 legacy 的 <span class='autocomment'> 单引号输出
        expect(pm.editSummaryPreview()).toBe(`<span class='autocomment'><a href="/wiki/Foo#.E7.AB.A0.E8.8A.82">&rarr;</a> 章节: </span> x`);
    });

    it("无章节标记：esWiki2HtmlPart 直渲染（管道与无管道链接 + 尾词吸附）", async () => {
        const f = await fresh();
        const pm = make(f, "see [[Foo|bar]] and [[Baz]]x");
        // eslint-disable-next-line @stylistic/quotes -- 期望串锁定含双引号属性的 legacy 输出
        expect(pm.editSummaryPreview()).toBe(`see <a href="/wiki/Foo">bar</a> and <a href="/wiki/Baz">Bazx</a>`);
    });

    it("无标记路径的 HTML 转义（& < \" 四字符）", async () => {
        const f = await fresh();
        const pm = make(f, 'a & b <c> "d"');
        expect(pm.editSummaryPreview()).toBe("a &amp; b &lt;c&gt; &quot;d&quot;");
    });
});

describe("fixHTML（直接调用）", () => {
    it("双引号 href 内的 ? 转义为 %3F", async () => {
        const f = await fresh();
        const pm = make(f, "");
        pm.html = '<a href="/wiki/Foo?bar">x</a>';
        pm.fixHTML();
        expect(pm.html).toBe('<a href="/wiki/Foo%3Fbar">x</a>');
    });

    it("单引号 href 同样处理", async () => {
        const f = await fresh();
        const pm = make(f, "");
        pm.html = "<a href='/wiki/Foo?bar'>x</a>";
        pm.fixHTML();
        expect(pm.html).toBe("<a href='/wiki/Foo%3Fbar'>x</a>");
    });

    it("空 html 早退", async () => {
        const f = await fresh();
        const pm = make(f, "");
        pm.html = "";
        pm.fixHTML();
        expect(pm.html).toBe("");
    });
});

describe("stripLongTemplates（直接调用）", () => {
    it("开头长模板（2+ 相邻 p/br 标签）剥除", async () => {
        const f = await fresh();
        const pm = make(f, "");
        pm.html = "<p>{{x <p><br><p>y}} ";
        pm.stripLongTemplates();
        expect(pm.html).toBe(" ");
    });

    it("含 <pre> 的模板剥除（换行先被压平）", async () => {
        const f = await fresh();
        const pm = make(f, "");
        pm.html = "<p>{{x <pre>y\n</pre><p>}} ";
        pm.stripLongTemplates();
        expect(pm.html).toBe("<p> ");
    });

    it("换行压平为空格", async () => {
        const f = await fresh();
        const pm = make(f, "");
        pm.html = "a\nb";
        pm.stripLongTemplates();
        expect(pm.html).toBe("a b");
    });
});

describe("showPreview", () => {
    beforeEach(() => {
        // setPopupHTML 的 600ms 轮询重试 + popTipsSoonFn 的 250ms 扫描均走定时器
        vi.useFakeTimers();
    });

    // 槽位断言说明：setPopupHTML 经 innerHTML 写入，jsdom 的 getter 会把未闭合
    // 的 <p>（legacy 输出从不闭合段落）再序列化补上 </p>——断言按序列化形态
    // 写；未闭合怪癖本身由 makePreview 的 pm.html 断言锁定
    it("写入分隔线与预览槽；无截断时不产 more 链接", async () => {
        const f = await fresh();
        slotDivs(1, ["popupPrePreviewSep", "popupPreview", "popupPreviewMore"]);
        const pm = new f.previewmaker.Previewmaker("Hello world.", BASE_URL, ownerWith(f, "Foo"));
        pm.showPreview();
        // 实现注入 "<hr />"（legacy 原样）；jsdom 读回把 void 元素规范化为 "<hr>"
        expect(document.getElementById("popupPrePreviewSep1")?.innerHTML).toBe("<hr>");
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("<p>Hello world. </p>");
        expect(document.getElementById("popupPreviewMore1")?.innerHTML).toBe("");
    });

    it("owner 缺省：槽位 id 取 htmlout 当前弹窗号", async () => {
        const f = await fresh();
        f.htmlout.setPopupIdNumber(3);
        slotDivs(3, ["popupPrePreviewSep", "popupPreview", "popupPreviewMore"]);
        const pm = make(f, "Hello world.");
        pm.showPreview();
        expect(document.getElementById("popupPreview3")?.innerHTML).toBe("<p>Hello world. </p>");
        // 同上：jsdom 对 void 元素去自闭合斜杠
        expect(document.getElementById("popupPrePreviewSep3")?.innerHTML).toBe("<hr>");
    });

    it("空预览不写任何槽", async () => {
        const f = await fresh();
        slotDivs(1, ["popupPrePreviewSep", "popupPreview", "popupPreviewMore"]);
        const pm = new f.previewmaker.Previewmaker("", BASE_URL, ownerWith(f, "Foo"));
        pm.showPreview();
        expect(document.getElementById("popupPrePreviewSep1")?.innerHTML).toBe("");
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
    });

    it("截断发生时产出 more 链接（文案走 popupString）", async () => {
        const f = await fresh({ popupMaxPreviewSentences: 1 });
        slotDivs(1, ["popupPrePreviewSep", "popupPreview", "popupPreviewMore"]);
        const pm = new f.previewmaker.Previewmaker("One. Two words here. Three.", BASE_URL, ownerWith(f, "Foo"));
        pm.showPreview();
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("<p>One.  </p>");
        const more = document.getElementById("popupPreviewMore1")?.firstChild as HTMLAnchorElement;
        expect(more.tagName).toBe("A");
        expect(more.className).toBe("popupMoreLink");
        expect(more.innerHTML).toBe(f.strings.popupString("more..."));
    });

    it("点击 more：+2000 字符/+20 句重算，预览变长且 more 消失", async () => {
        const f = await fresh({ popupMaxPreviewSentences: 1 });
        slotDivs(1, ["popupPrePreviewSep", "popupPreview", "popupPreviewMore"]);
        const pm = new f.previewmaker.Previewmaker("One. Two words here. Three.", BASE_URL, ownerWith(f, "Foo"));
        pm.showPreview();
        const anchor = document.getElementById("popupPreviewMore1")?.firstChild as HTMLAnchorElement;
        expect(anchor.onclick).toBeTypeOf("function");
        anchor.click();
        expect(pm.maxCharacters).toBe(2600);
        expect(pm.maxSentences).toBe(21);
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("<p>One. Two words here. Three. </p>");
        expect(document.getElementById("popupPreviewMore1")?.innerHTML).toBe("");
    });

    it("目标槽不存在时 600ms 轮询重试（fake timers 推进后写入）", async () => {
        const f = await fresh();
        slotDivs(1, ["popupPrePreviewSep", "popupPreviewMore"]);
        const pm = new f.previewmaker.Previewmaker("Hello world.", BASE_URL, ownerWith(f, "Foo"));
        pm.showPreview();
        // 此刻 #popupPreview1 尚不存在：写入挂起，只等轮询
        slotDivs(1, ["popupPreview"]);
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("");
        vi.advanceTimersByTime(600);
        expect(document.getElementById("popupPreview1")?.innerHTML).toBe("<p>Hello world. </p>");
    });
});
