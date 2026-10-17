// InstaView wiki2html 解析引擎镜像测试：wikitext → HTML 的输入/输出逐字节
// 对照。行为基准 = legacy src/modules/livepreview.ts（commit 02c8dec），
// 期望值由对照 harness（legacy 拷贝 + 冻结时钟 2026-09-18T12:34:56Z）推导，
// 覆盖每个语法特征的正例与边界例（空输入、未闭合标记、嵌套）。
//
// 站点形态对齐萌百：articlePath=/wiki、interwiki=zh 站的 en|ja、File/Category
// 取 wgFormattedNamespaces。legacy 输出怪癖（多余空格、未闭合标签、属性丢弃、
// 转义遗漏）无用户可见差异的逐字照搬，用例名标注「照搬勿修」。
//
// 注意：期望串常以尾随空格结尾（legacy 对每个段行追加一个空格），编辑时勿
// 误删。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as InstaNs from "../../../src/preview/insta.ts";

type Insta = typeof InstaNs;

// 每用例重载模块：instaConf/BLOCK_IMAGE 是模块态，resetModules 保证用例间
// 互不渗漏（约束 9）
const load = async (): Promise<Insta> => {
    vi.resetModules();
    const insta = await import("../../../src/preview/insta.ts");
    insta.setupLivePreview({
        articlePath: "/wiki",
        interwiki: "en|ja",
        imageNamespace: "File",
        categoryNamespace: "Category",
    });
    return insta;
};

beforeEach(() => {
    // 签名时间戳的取值时钟：parse_inline_wiki 每次调用读 new Date()
    vi.useFakeTimers({ now: new Date(Date.UTC(2026, 8, 18, 12, 34, 56)) });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("段落与空行", () => {
    it.each<[string, string, string]>([
        ["空输入产出空串", "", ""],
        ["单个换行符 = 两个空行元", "\n", "<p><br>"],
        ["单行文本", "Hello world", "<p>Hello world "],
        ["相邻行合并为一段（每行尾随空格，照搬勿修）", "a\nb", "<p>a b "],
        ["CRLF 归一为 LF", "a\r\nb", "<p>a b "],
        ["尾随换行只多出一个空行元（无第二个 <br>）", "x\n", "<p>x "],
        ["空行分段：段落从不闭合（照搬勿修）", "a\n\nb", "<p>a <p>b "],
        ["连续两个空行：首个输出 <p><br>", "a\n\n\nb", "<p>a <p><br>b "],
        [" EOF 前的空行对也输出 <p><br>", "a\n\n", "<p>a <p><br>"],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("标题", () => {
    it.each<[string, string, string]>([
        ["h1", "= x =", "<h1> x </h1>"],
        ["h2", "== x ==", "<h2> x </h2>"],
        ["h3", "=== x ===", "<h3> x </h3>"],
        ["h5", "===== x =====", "<h5> x </h5>"],
        ["h6（最高级）", "====== x ======", "<h6> x </h6>"],
        ["7 个等号降级 h6 且标题含残等号（照搬勿修）", "======= x =======", "<h6>= x =</h6>"],
        ["不对称等号降级 h1 且标题含残等号（照搬勿修）", "== x =", "<h1>= x </h1>"],
        ["未闭合等号按段落处理", "= x", "<p>= x "],
        ["收尾等号后的尾文不解析原样输出（照搬勿修）", "== x == trailing [[y]]", "<h2> x </h2> trailing [[y]]"],
        ["标题内走 inline 解析（斜体 + nowiki）", "== ''a'' <nowiki>b</nowiki> ==", "<h2> <i>a</i> b </h2>"],
        ["标题后接段落", "== h ==\ntext", "<h2> h </h2><p>text "],
        ["段落 → 标题 → 段落", "text1\n= h =\ntext2", "<p>text1 <h1> h </h1><p>text2 "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("水平线", () => {
    it.each<[string, string, string]>([
        ["3 个减号不是水平线", "---", "<p>--- "],
        ["4 个减号", "----", "<hr />"],
        ["5 个减号", "-----", "<hr />"],
        ["带尾字不匹配", "-----x", "<p>-----x "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("pre 块", () => {
    it.each<[string, string, string]>([
        ["单行 pre", " a", "<pre>a\n</pre>"],
        ["两行 pre", " a\n b", "<pre>a\nb\n</pre>"],
        ["行内第二个空格保留", "  x", "<pre> x\n</pre>"],
        ["pre 后接段落", " a\nb", "<pre>a\n</pre><p>b "],
        ["pre 行内仍解析链接（legacy 原样，与真实 MW 不同）", " [[x]]", "<pre><a href='/wiki/x'>x</a>\n</pre>"],
        ["段落后接 pre", "a\n  b", "<p>a <pre> b\n</pre>"],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("列表", () => {
    it.each<[string, string, string]>([
        ["无序列表：li 不闭合（照搬勿修）", "* a\n* b", "<ul><li> a<li> b</ul>"],
        ["有序列表", "# a\n# b", "<ol><li> a<li> b</ol>"],
        ["ul 嵌套", "* a\n** b", "<ul><li> a<ul><li> b</ul></ul>"],
        ["ol 嵌套", "# a\n## b", "<ol><li> a<ol><li> b</ol></ol>"],
        ["ul → ol 切换", "* a\n# b", "<ul><li> a</ul><ol><li> b</ol>"],
        ["ol → ul 切换", "# a\n* b", "<ol><li> a</ol><ul><li> b</ul>"],
        ["ul → dt", "* a\n; b", "<ul><li> a</ul><dl><dt> b</dl>"],
        ["dd → dt（跨型切换补 </dl><dl>）", ": a\n; b", "<dd> a</dl><dl><dt> b</dl>"],
        ["dd → ul", ": a\n* b", "<dd> a</dl><ul><li> b</ul>"],
        ["dd 单独成块：dl 未开先关（照搬勿修）", ": indent", "<dd> indent</dl>"],
        ["dt 无定义项", "; term", "<dt> term</dl>"],
        ["dt + dd（定义行切分为两轮）", "; term: def", "<dt> term</dl><dl><dd> def</dl>"],
        ["dt/dd 链", ";a:b\n;c:d", "<dt>a</dl><dl><dd>b</dl><dl><dt>c</dl><dl><dd>d</dl>"],
        [": 后接 #：ol 未开先关（照搬勿修）", ":# a", "<ol><li> a</ol></dl>"],
        ["li 内续行 dd", "* a\n*: b", "<ul><li> a<dd> b</dl></ul>"],
        ["ol 的 dd 续行接 li（无 </dl>，照搬勿修）", "#: a\n# b", "<ol><dd> a<li> b</ol>"],
        ["空行分隔的两个列表块", "* a\n\n* b", "<ul><li> a</ul><ul><li> b</ul>"],
        [":: → *# 双层闭合", ":: a\n*# b", "<dd> a</dl></dl><ul><ol><li> b</ol></ul>"],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("表格", () => {
    it.each<[string, string, string]>([
        ["最小表：闭线 |} 沉入单元格渲染为段落（照搬勿修）", "{|\n|a\n|}", "<table><td>a<p>|} "],
        ["表属性恒被丢弃（模板无占位符，照搬勿修）", "{| border=1\n|a\n|}", "<table><td>a<p>|} "],
        ["行分隔 |-", "{|\n|-\n|a\n|}", "<table><tr><td>a<p>|} "],
        ["行属性恒被丢弃", "{|\n|- style\n|a\n|}", "<table><tr><td>a<p>|} "],
        ["表头 !", "{|\n!a\n!b\n|}", "<table><th>a<p>!b </table>"],
        ["caption |+", "{|\n|+ cap\n|a\n|}", "<table><caption> cap<p>|a </table>"],
        ["caption 带属性管道", "{|\n|+x|Caption\n|}", "<table><caption>Caption<p>|} "],
        ["|| 分隔的第二格沉为段落（照搬勿修）", "{|\n|a||b\n|}", "<table><td>a<p>|b </table>"],
        ["!! 分隔的第二表头沉为段落", "{|\n!a!!b\n|}", "<table><th>a<p>!b </table>"],
        ["单元格属性管道被吃掉", "{|\n|x|y\n|}", "<table><td>y<p>|} "],
        ["三行单元格：中间行沉为段落", "{|\n|a\n|b\n|c\n|}", "<table><td>a<p>|b <td>c<p>|} "],
        ["表内杂行沉为段落", "{|\n|a\njunk\n|}", "<table><td>a<p>junk </table>"],
        ["首格前的杂行被静默丢弃（与格内杂行不同，照搬勿修）", "{|\njunk\n|a\n|}", "<table><td>a<p>|} "],
        ["未闭合表", "{|\n|a", "<table><td>a"],
        ["嵌套表", "{|\n|a\n{| n\n|}\n|}", "<table><td>a<table></table><p>|} "],
        ["空单元格", "{|\n|\n|}", "<table><td><p>|} "],
        ["单元格多行内容沉为段落", "{|\n|a\nline2\n|}", "<table><td>a<p>line2 </table>"],
        ["内容收集遇 ! 停（闭线沉入表头格、表不闭合，照搬勿修）", "{|\n|a\nx\n!b\n|}", "<table><td>a<p>x <th>b<p>|} "],
        ["单元格内嵌套表（同层）", "{|\n|a\nx\n{| n\n|}\n|}", "<table><td>a<p>x <table></table></table>"],
        ["单元格内嵌套表（内含格）", "{|\n|a\nx\n{| n\n|p\n|}\n|}", "<table><td>a<p>x <table><td>p<p>|} </table>"],
        ["单元格内嵌套表（内含 |- 行）", "{|\n|a\nx\n{| n\n|-p\n|}\n|}", "<table><td>a<p>x <table><tr></table></table>"],
        ["单元格内嵌套表（内含表头）", "{|\n|a\nx\n{| n\n!h\n|}\n|}", "<table><td>a<p>x <table><th>h<p>|} </table>"],
        ["||| 三段分隔", "{|\n|a||b||c\n|}", "<table><td>a<p>|b <td>c<p>|} "],
        ["段落夹表：表后文本沉入单元格且表不闭合（照搬勿修）", "x\n{| \n|a\n|}\ny", "<p>x <table><td>a<p>|} y "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("内链", () => {
    it.each<[string, string, string]>([
        ["普通内链", "[[Foo]]", "<p><a href='/wiki/Foo'>Foo</a> "],
        ["尾词吸附进链文本", "[[Foo]]s", "<p><a href='/wiki/Foo'>Foos</a> "],
        ["管道标签", "[[Foo|bar]]", "<p><a href='/wiki/Foo'>bar</a> "],
        ["管道 + 尾词", "[[Foo|bar]]x", "<p><a href='/wiki/Foo'>barx</a> "],
        ["链文本不转义单引号（照搬勿修）", "[[It's]]", "<p><a href='/wiki/It&#39;s'>It's</a> "],
        ["命名空间内链：冒号转义为 &#58;", "[[Wikipedia:X]]", "<p><a href='/wiki/Wikipedia&#58;X'>Wikipedia&#58;X</a> "],
        ["标签含管道：首个为界", "[[a|b|c]]", "<p><a href='/wiki/a'>b|c</a> "],
        ["管道戏法（括号后缀入 href 不入文本）", "[[Foo (bar)|]]", "<p><a href='/wiki/Foo (bar)'>Foo</a> "],
        ["管道戏法（命名空间）", "[[Wikipedia:x|]]", "<p><a href='/wiki/Wikipedia&#58;x'>x</a> "],
        ["管道戏法（命名空间 + 括号）", "[[Wikipedia:x (y)|]]", "<p><a href='/wiki/Wikipedia&#58;x (y)'>x</a> "],
        ["空标签管道戏法等价普通内链", "[[Foo|]]", "<p><a href='/wiki/Foo'>Foo</a> "],
        ["管道戏法文本转义方括号", "[[Foo [bar]|]]", "<p><a href='/wiki/Foo &#91;bar&#93;'>Foo &#91;bar&#93;</a> "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("分类/文件/interwiki 冒号链接", () => {
    it.each<[string, string, string]>([
        ["[:Category:]] 渲染为链接（冒号转义，照搬勿修）", "[[:Category:X]]", "<p><a href='/wiki/Category&#58;X'>Category&#58;X</a> "],
        ["分类冒号链接 + 尾词", "[[:Category:X]]trail", "<p><a href='/wiki/Category&#58;X'>Category&#58;Xtrail</a> "],
        ["分类冒号链接 + 标签", "[[:Category:X|label]]", "<p><a href='/wiki/Category&#58;X'>label</a> "],
        ["[:File:]] 冒号链接", "[[:File:x.png]]", "<p><a href='/wiki/File&#58;x.png'>File&#58;x.png</a> "],
        ["[:File:]] 冒号链接 + 标签", "[[:File:x.png|cap]]", "<p><a href='/wiki/File&#58;x.png'>cap</a> "],
        ["[:en:]] interwiki 冒号链接", "[[:en:X]]", "<p><a href='/wiki/en&#58;X'>en&#58;X</a> "],
        ["[:en:]] interwiki 冒号链接 + 标签", "[[:en:X|y]]", "<p><a href='/wiki/en&#58;X'>y</a> "],
        ["表外 interwiki 前缀按普通内链处理", "[[minnan:x]]", "<p><a href='/wiki/minnan&#58;x'>minnan&#58;x</a> "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("分类与 interwiki 无冒号链接删除", () => {
    it.each<[string, string, string]>([
        ["[[Category:]] 整段删除", "[[Category:X]]gone", "<p>gone "],
        ["[[Category:…|排序键]] 整段删除", "[[Category:X|sortkey]]gone", "<p>gone "],
        ["[[en:]] 整段删除", "[[en:X]]gone", "<p>gone "],
        ["[[en:…|标签]] 整段删除（段落仅剩空格）", "[[en:X|y]]", "<p> "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("文件链接", () => {
    it.each<[string, string, string]>([
        ["行内文件链接移除（残留双空格，照搬勿修）", "text [[File:x.png]] end", "<p>text  end "],
        ["管道参数含 frame 子串即被当块级图片整行移除（照搬勿修）", "[[File:x.png|notframe]]", ""],
        ["无 frame 关键字的整行文件链接移除", "[[File:x.png|zzz]]", "<p> "],
        ["首个 [[ 非文件时停止扫描：后续文件链接变普通内链（照搬勿修）", "a [[Foo]] b [[File:x.png]] c", "<p>a <a href='/wiki/Foo'>Foo</a> b <a href='/wiki/File&#58;x.png'>File&#58;x.png</a> c "],
        ["嵌套括号的文件链接整体移除", "a [[File:x.png [[b]] c]] d", "<p>a  d "],
        ["未闭合文件链接原样保留", "[[File:x.png", "<p>[[File:x.png "],
        ["连续两个文件链接都移除", "[[File:a]][[File:b]]x", "<p>x "],
        ["重复文件链接：replace 首现语义下两个都移除", "[[File:a]]x[[File:a]]", "<p>x "],
        ["块级文件行整行移除（thumb）", "[[File:x.png|thumb]]", ""],
        ["Image 别名（right）", "[[Image:x.png|right]]", ""],
        ["块级文件多参数（left）", "[[File:x.png|left|cap]]", ""],
        ["小写 file 前缀同样命中（i 标志）", "[[file:x.png|thumb]]", ""],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("外链", () => {
    it.each<[string, string, string]>([
        ["带标签 http 外链", "[http://example.com label]", "<p><a class='external' href='http://example.com'>label</a> "],
        ["https + 多词标签", "[https://example.com multi word label]", "<p><a class='external' href='https://example.com'>multi word label</a> "],
        ["mailto 带标签", "[mailto:a@b.c mail me]", "<p><a class='external' href='mailto:a@b.c'>mail me</a> "],
        ["irc 带标签", "[irc://irc.x.org/chan chat]", "<p><a class='external' href='irc://irc.x.org/chan'>chat</a> "],
        ["无标签 http 渲染为 [#]", "[http://example.com]", "<p><a class='external' href='http://example.com'>[#]</a> "],
        ["无标签 mailto 以协议为文本", "[mailto:a@b.c]", "<p><a class='external' href='mailto:a@b.c'>mailto:a@b.c</a> "],
        ["ftp 带标签", "[ftp://f.x/f file]", "<p><a class='external' href='ftp://f.x/f'>file</a> "],
        ["正文裸链接（前置空格进标签前）", "foo http://example.com bar", "<p>foo <a class='external' href='http://example.com'>http://example.com</a> bar "],
        ["括号内裸链接吞掉闭括号（照搬勿修）", "(see http://example.com).", "<p>(see <a class='external' href='http://example.com)'>http://example.com)</a>. "],
        ["gopher 裸链接", "gopher://gopher.x/0item", "<p><a class='external' href='gopher://gopher.x/0item'>gopher://gopher.x/0item</a> "],
        ["句点不入链接", "visit http://example.com.", "<p>visit <a class='external' href='http://example.com'>http://example.com</a>. "],
        ["行首裸链接（^ 分支）", "http://example.com", "<p><a class='external' href='http://example.com'>http://example.com</a> "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("签名与时间戳", () => {
    it.each<[string, string, string]>([
        ["三波浪 = 用户名", "~~~", "<p>Wikipedian "],
        ["四波浪 = 用户名 + 时间戳", "~~~~", "<p>Wikipedian 12:34, 18 Sep 2026 (UTC) "],
        ["五波浪 = 时间戳", "~~~~~", "<p>12:34, 18 Sep 2026 (UTC) "],
        ["六波浪：残 ~ 后接时间戳（lookahead 回退匹配，照搬勿修）", "~~~~~~", "<p>~12:34, 18 Sep 2026 (UTC) "],
        ["正文中签名", "sig ~~~ end", "<p>sig Wikipedian end "],
        ["列表项内签名", "* ~~~", "<ul><li> Wikipedian</ul>"],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });

    it("分钟 < 10 时补零、小时不补零（照搬勿修）", async () => {
        vi.setSystemTime(new Date(Date.UTC(2026, 8, 18, 3, 5, 56)));
        const { wiki2html } = await load();
        expect(wiki2html("~~~~")).toBe("<p>Wikipedian 3:05, 18 Sep 2026 (UTC) ");
    });
});

describe("粗体与斜体", () => {
    it.each<[string, string, string]>([
        ["斜体", "''i''", "<p><i>i</i> "],
        ["粗体", "'''b'''", "<p><b>b</b> "],
        ["五引号：交叉嵌套标签（照搬勿修）", "'''''bi'''''", "<p><b><i>bi</b></i> "],
        ["粗斜体混排", "a ''b'' c '''d''' e", "<p>a <i>b</i> c <b>d</b> e "],
        ["未闭合斜体", "''unclosed", "<p><i>unclosed "],
        ["粗体包链接", "'''[[x]]'''", "<p><b><a href='/wiki/x'>x</a></b> "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("nowiki 与 math", () => {
    it.each<[string, string, string]>([
        ["nowiki 内 wiki 标记不解析", "a <nowiki>''b''</nowiki> c", "<p>a ''b'' c "],
        ["nowiki 内仅做 &<> 实体转义（引号不转义，照搬勿修）", "a <nowiki>x & y < z 'q' \"d\"</nowiki>", "<p>a x &amp; y &lt; z 'q' \"d\" "],
        ["两个 nowiki 段", "a<nowiki>1</nowiki>b<nowiki>2</nowiki>c", "<p>a1b2c "],
        ["嵌套 nowiki：从首个开标记起全部按字面转义（照搬勿修）", "a <nowiki>b<nowiki>c</nowiki>d</nowiki> e", "<p>a b&lt;nowiki&gt;c&lt;/nowiki&gt;d e "],
        ["未闭合 nowiki：余段转义且不解析", "a <nowiki>b ''c''", "<p>a b ''c'' "],
        ["math 整段移除（双空格残留，照搬勿修）", "a <math>x^2</math> b", "<p>a  b "],
        ["HTML 注释不做处理原样通过", "a <!-- c --> b", "<p>a <!-- c --> b "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("魔术字与模板", () => {
    it.each<[string, string, string]>([
        ["__NOTOC__ 非全局：只清第一处（照搬勿修）", "__NOTOC__ x __NOTOC__", "<p> x __NOTOC__ "],
        ["__NOINDEX__ 非全局", "__NOINDEX__i__NOINDEX__", "<p>i__NOINDEX__ "],
        ["__INDEX__/__NOEDITSECTION__ 各清首处", "__INDEX__x__NOEDITSECTION__y__NOEDITSECTION__", "<p>xy__NOEDITSECTION__ "],
        ["模板不展开原样通过", "{{stub}}", "<p>{{stub}} "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });
});

describe("子页面链接（baseUrl）", () => {
    it.each<[string, string, string]>([
        ["未传 baseUrl：href 前缀串化为 undefined（照搬勿修）", "[[/sub]]", "<p><a href='undefined/sub'>/sub</a> "],
        ["未传 baseUrl 的管道形态", "[[/sub|label]]", "<p><a href='undefined/sub'>label</a> "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input)).toBe(expected);
    });

    it.each<[string, string, string]>([
        ["baseUrl 前缀子页面链接", "[[/sub]]", "<p><a href='/base/sub'>/sub</a> "],
        ["baseUrl 前缀 + 标签", "[[/sub|label]]", "<p><a href='/base/sub'>label</a> "],
        ["多个子页面链接各自处理", "see [[/a]] and [[/b|lab]]", "<p>see <a href='/base/a'>/a</a> and <a href='/base/b'>lab</a> "],
        ["普通内链不吃 baseUrl（走 articles 路径）", "[[Foo]]", "<p><a href='/wiki/Foo'>Foo</a> "],
    ])("%s", async (_name, input, expected) => {
        const { wiki2html } = await load();
        expect(wiki2html(input, "/base")).toBe(expected);
    });

    it("单参调用会把上一次的 baseUrl 重置回 undefined（legacy wiki2html 语义）", async () => {
        const { wiki2html } = await load();
        expect(wiki2html("[[/a]]", "/base")).toBe("<p><a href='/base/a'>/a</a> ");
        expect(wiki2html("[[/a]]")).toBe("<p><a href='undefined/a'>/a</a> ");
    });
});

describe("综合文档", () => {
    it("标题/链接/粗体/列表/模板混排", async () => {
        const { wiki2html } = await load();
        expect(wiki2html("== Intro ==\nHello [[world]] and '''bold'''.\n\n* item 1\n* item 2\n\n{{stub}}\n")).toBe(
            "<h2> Intro </h2><p>Hello <a href='/wiki/world'>world</a> and <b>bold</b>. <ul><li> item 1<li> item 2</ul><p>{{stub}} ",
        );
    });
});

describe("导出面与配置注入", () => {
    it("setupLivePreview 注入站点配置：instaConf.paths.articles 供 previewmaker 读取", async () => {
        const insta = await load();
        expect(insta.instaConf.paths.articles).toBe("/wiki/");
        expect(insta.instaConf.user.name).toBe("Wikipedian");
    });

    it("重复 setupLivePreview 覆盖旧配置（boot 重装配场景）", async () => {
        const insta = await load();
        insta.setupLivePreview({
            articlePath: "/w",
            interwiki: undefined,
            imageNamespace: "文件",
            categoryNamespace: "分类",
        });
        expect(insta.instaConf.paths.articles).toBe("/w/");
        // interwiki 未配置时模板串化为 "undefined"，en:/ja: 链接不再被删除而
        // 落进普通内链替换（legacy 原样）
        expect(insta.wiki2html("[[en:X]]gone")).toBe("<p><a href='/w/en&#58;X'>en&#58;Xgone</a> ");
        expect(insta.wiki2html("[[minnan:x]]")).toBe("<p><a href='/w/minnan&#58;x'>minnan&#58;x</a> ");
    });

    it("本地化 File/Category 别名参与链接删除与块级图片识别", async () => {
        vi.resetModules();
        const insta = await import("../../../src/preview/insta.ts");
        insta.setupLivePreview({
            articlePath: "/wiki",
            interwiki: "en|ja",
            imageNamespace: "文件",
            categoryNamespace: "分类",
        });
        expect(insta.wiki2html("[[分类:X]]gone")).toBe("<p>gone ");
        expect(insta.wiki2html("[[:分类:X]]")).toBe("<p><a href='/wiki/分类&#58;X'>分类&#58;X</a> ");
        expect(insta.wiki2html("[[文件:x.png|thumb]]")).toBe("");
        expect(insta.wiki2html("a [[文件:x.png]] b")).toBe("<p>a  b ");
    });
});
